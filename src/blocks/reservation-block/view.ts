import { __ } from "@wordpress/i18n";
import apiFetch from "@wordpress/api-fetch";
import {
	generateMonthCalendar,
	getMonthRangeYmd,
	displayFormated,
} from "itmar-block-packages";
import {
	buildCalendarTableSource,
	renderTableFromTableSource,
	buildBookingListTableSource,
	renderBookingCellHtml,
	renderCancelButtonHtml,
	slotInfoCalendar,
	buildTimeTableSource,
} from "./createTableSource"; // 上で作った共通関数
import { SlotRow, DayObject, userBooking, BookingResponse } from "./types";
import { buildDateNote } from "./dateNote";

jQuery(function ($) {
	// ✅ 「1つの予約ブロック」ごとに初期化したいので、親ラッパーを推奨
	// 例: save.js の wrapper に class="wp-block-itmaroon-booking-block" を付ける
	$(".wp-block-itmar-reservation-block").each((_index, element) => {
		const $root = $(element);
		//カレンダーブロックは最初の一つだけ取得
		const $calendar = $root.find(".wp-block-itmar-design-calender").first();
		//テーブルブロックはすべて取得
		const $table = $root.find(".wp-block-itmar-design-table");

		//オブジェクトに変換
		const rawAttributes = $root.attr("data-attributes");
		if (!rawAttributes) {
			return;
		}
		const attributes = JSON.parse(rawAttributes);

		// 必要な変数に割り当て
		// 分割代入（Destructuring）を使うと非常にスッキリします
		const {
			resourceRest,
			resourceId,
			calendarTableId,
			timeTableId,
			bookingTableId,
			infoMessages,
			dispUniqueIds,
			confirmModal,
			reserveForm,
			cancelModForm,
			buttonIDs,
			...renderStyle
		} = attributes;

		//テーブルブロック
		const $calendarTable = $table.filter(
			`[data-define_id="${calendarTableId}"]`,
		);
		const $timeTable = $table.filter(`[data-define_id="${timeTableId}"]`);

		const $bookingTable = $table.filter(`[data-define_id="${bookingTableId}"]`);

		//要素の存在チェック
		if (!$calendar.length || !$table.length) return;

		const MONTH_SELECT = ".itmar_block_selectSingle select";

		let timer = 0;
		let seq = 0;

		const schedule = () => {
			window.clearTimeout(timer);
			timer = window.setTimeout(refresh, 50);
		};

		// ✅ select が差し替わってもOK（イベント委譲）
		$calendar
			.off("change input", MONTH_SELECT) // 既存のリスナーを一度消す
			.on("change input", MONTH_SELECT, schedule);

		// 特定の属性（祝日データ）が書き換わったかチェック
		const obs = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (
					mutation.type === "attributes" &&
					mutation.attributeName === "data-holiday_array"
				) {
					//祝日データの書き込みを検知, 再描画します
					schedule();
				}
			});
		});

		// $calendarの生の DOM 要素を監視
		const calendarEl = $calendar.get(0);
		if (calendarEl) {
			obs.observe(calendarEl, {
				attributes: true, // 属性の変化を監視
				attributeFilter: ["data-holiday_array"], // この属性名だけをターゲットにする
				// もし子要素の構造変化も追いたい場合は以下も残す
				childList: false,
				subtree: false,
			});
		}

		//日付の色は、design-calender の休日・土曜の色に合わせる
		const calendarColors = ($calendar.data("attributes") ?? {}) as {
			holidayColor?: string;
			staturdayColor?: string;
		};
		if (calendarColors.holidayColor) {
			element.style.setProperty("--itmar-cal-holiday", calendarColors.holidayColor);
		}
		if (calendarColors.staturdayColor) {
			element.style.setProperty("--itmar-cal-saturday", calendarColors.staturdayColor);
		}

		//Design Titleの中味にデータ流し込むヘルパ
		const enterTitle = (
			$dateElm: JQuery<HTMLElement>,
			formatedValue: string,
		) => {
			const $targetDiv = $dateElm.find("h1, h2, h3, h4, h5, h6");
			if ($targetDiv.length) {
				// テキストを流し込む
				$targetDiv.text(formatedValue);
			}
		};

		//日毎データを定義
		let monthDailyObj: any = {};

		//祝日の名前（日付 → 名前）。選んだ日の曜日・祝日名の表示に使う
		let monthHolidays: Record<number, string> = {};

		//リソース名
		let resourceName: string = "";

		async function refresh() {
			const selectedMonth = $calendar.find(MONTH_SELECT).val() as string; // "YYYY/MM"
			if (!selectedMonth) return;
			// リソースが選ばれていない（テンプレートのパーツなど）ときは、何も取得しない
			if (!resourceId) return;
			//timeTableはいったん非表示
			$timeTable.hide();

			//リソース名を取得
			resourceName = (await fetchResourceTitle(resourceId)) || "";

			const { from, to, ym } = getMonthRangeYmd(selectedMonth);

			if (!from || !to) return;

			// resourceId は save.js で data-attributesを出すのが最も安定
			if (!resourceId) return;

			//リソース名を、予約確認モーダルの外のタイトル（Resource Title）へ表示
			if (dispUniqueIds.resourceTitle) {
				const { id: resourceTitleId } = JSON.parse(dispUniqueIds.resourceTitle);
				$root
					.find(`[data-unique_id="${resourceTitleId}"]`)
					.filter((_i, el) => !$reservation_modal.has(el).length)
					.each(function () {
						enterTitle($(this), resourceName);
					});
			}

			//リソース名の表示
			if (dispUniqueIds.resourceName) {
				const { type, id } = JSON.parse(dispUniqueIds.resourceName);
				if (type === "itmar/design-title") {
					const $resourceElm = $root.find(`[data-unique_id=${id}]`);
					enterTitle($resourceElm, resourceName);
				}
			}

			const mySeq = ++seq;
			//$calendarに祝日情報があれば配列を作る
			const holidayString = $calendar.attr("data-holiday_array");
			const holidays = holidayString ? JSON.parse(holidayString) : [];

			// ✅ 月の基本配列（祝日込み）
			const baseCalendar = generateMonthCalendar(
				selectedMonth,
				holidays,
			) as DayObject[];

			// ✅ slots取得
			const slotPath =
				`/itmar/v1/slots?resource_id=${encodeURIComponent(resourceId)}` +
				`&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

			const slots = await apiFetch<SlotRow[]>({ path: slotPath });

			if (mySeq !== seq) return;

			//カレンダーテーブルレンダリング用のデータを生成
			const calendarInfoObj = slotInfoCalendar(slots, ym, baseCalendar);

			// ✅ 共通 buildCalendarTableSource を使用（renderCellだけview用に注入）
			const calendarSource = buildCalendarTableSource(
				selectedMonth,
				calendarInfoObj.dataVal as DayObject[],
				{
					isMonday: false,
					compactBlanks: true,
					renderCell: renderBookingCellHtml,
					renderStyle: {
						isDispHoliday: renderStyle.isHoliday,
						enoughBorder: renderStyle.enoughBorder,
						enough_bg: renderStyle.enoughBgColor || renderStyle.enoughGradient,
						low_bg: renderStyle.lowBgColor || renderStyle.lowGradient,
						empty_bg: renderStyle.emptyBgColor || renderStyle.emptyGradient,
						close_bg: renderStyle.closeBgColor || renderStyle.closeGradient,
						remainDisp: renderStyle.remainDisp,
						restDisp: renderStyle.restDisp,
					},
				},
			);
			//日毎データを確保
			monthDailyObj = calendarInfoObj.dailyStats;
			//祝日の名前を控える
			monthHolidays = {};
			(calendarInfoObj.dataVal as DayObject[]).forEach((dayObj) => {
				if (dayObj.holiday) {
					monthHolidays[Number(dayObj.date)] = String(dayObj.holiday);
				}
			});

			//カレンダーテーブルの再レンダリング
			const calendarTableElement = $calendarTable[0] || null;
			renderTableFromTableSource(calendarTableElement, calendarSource);
			//描き直すと日付の選択は外れるので、日付を選ぶ前の文言へ戻し、時間管理のパネルも閉じる
			showSelectedDate();
			showSelectedDateNote();
			toggleTimePanel(false);

			//予約済みテーブルの処理
			if (itmar_option.isLoggedIn) {
				try {
					//予約済みデータの取得
					const bookingPath = `/itmar/v1/get_user_bookings?resource_id=${resourceId}`;
					const bookings = await apiFetch<userBooking[]>({ path: bookingPath });
					// 予約一覧用の Source を作成
					const bookingSource = buildBookingListTableSource(bookings, {
						renderActions: renderCancelButtonHtml,
					});
					//テーブルの再レンダリング
					const bookingTableElement = $bookingTable[0] || null;
					renderTableFromTableSource(bookingTableElement, bookingSource);
				} catch (err: any) {
					console.error(err.message);
				}
			}
		}

		// リソース情報を取得する関数
		interface WPPostResource {
			title: {
				rendered: string;
			};
			// 他にも使いたい項目があればここに追加
		}
		const fetchResourceTitle = async (id: number) => {
			try {
				// resourceId を使って投稿情報を取得
				const post = (await apiFetch({
					path: `/wp/v2/${resourceRest}/${id}`,
				})) as WPPostResource;
				return post.title.rendered;
			} catch (error) {
				console.error("リソース名の取得に失敗しました:", error);
			}
		};

		// 「親の親」にある #reservation_modal を探して表示させる
		const $reservation_modal = $root.find(`#${confirmModal}`).parent().parent();

		// 選択した日付を表示するタイトル（「Selected Date」の設定先）へ、日付か、日付を選ぶ前の文言を出す。
		// date を渡さないときは、設定された文言（なければ空）にする。予約確認モーダルの中の同じIDのタイトルは対象外。
		const showSelectedDate = (date?: string) => {
			if (!dispUniqueIds.selectedDate) return;
			const { id: selectedDateId } = JSON.parse(dispUniqueIds.selectedDate);
			const $selectedDateElm = $root
				.find(`[data-unique_id="${selectedDateId}"]`)
				.filter((_i, el) => !$reservation_modal.has(el).length);
			$selectedDateElm.each(function () {
				const $elm = $(this);
				const text = date
					? displayFormated(
							date,
							$elm.data("user_format"),
							$elm.data("free_format"),
							$elm.data("decimal"),
					  )
					: renderStyle.selectedDatePlaceholder ?? "";
				enterTitle($elm, text);
				$elm.attr("data-value", date ?? "");
			});
		};
		//日付を選ぶ前の文言を初期表示にする
		if (renderStyle.selectedDatePlaceholder) {
			showSelectedDate();
		}

		// 選んだ日の曜日と祝日名（祝日でなければ曜日だけ）を、「Selected Date Note」の設定先のタイトルへ出す。
		// ymd を渡さないときは空にして、タイトルごと隠す。予約確認モーダルの中の同じIDのタイトルは対象外。
		const showSelectedDateNote = (ymd?: string, holiday?: string) => {
			if (!dispUniqueIds.selectedDateNote) return;
			const { id: noteId } = JSON.parse(dispUniqueIds.selectedDateNote);
			const text = ymd ? buildDateNote(ymd, holiday) : "";
			$root
				.find(`[data-unique_id="${noteId}"]`)
				.filter((_i, el) => !$reservation_modal.has(el).length)
				.each(function () {
					const $elm = $(this);
					enterTitle($elm, text);
					$elm.toggleClass("itmar_is_empty", !text);
				});
		};
		showSelectedDateNote();

		// 時間管理のパネル（時間帯テーブルを含むメニューのグループ）を開閉する。
		// モバイル幅でだけ開く（開閉の処理は design-group が持っていて、デスクトップでは何もしない）。
		const toggleTimePanel = (open: boolean) => {
			const panelId = $timeTable.closest(".itmar-wrap[id]").attr("id");
			if (!panelId) return;
			document.dispatchEvent(
				new CustomEvent(open ? "itmar:menu-open" : "itmar:menu-close", {
					detail: { id: panelId },
				}),
			);
		};

		// $calendarTable 内のセル（td）がクリックされた時のイベント（予約登録）
		$calendarTable.on("click", "td", function () {
			//選択された月を取得
			const selectedMonth = $calendar.find(MONTH_SELECT).val() as string; // "YYYY/MM"
			if (!selectedMonth) return;

			const $clickedCell = $(this);

			const selDateNum = Number($clickedCell.data("date"));

			//その日の予定がなければ終了
			if (!monthDailyObj[selDateNum]) return;

			// 1. テーブル内のすべての td から "currentSel" クラスを一旦削除
			$calendarTable.find("td").removeClass("currentSel");

			// 2. クリックされたセル（this）だけに "currentSel" クラスを追加
			$clickedCell.addClass("currentSel");

			//選択した日付を、設定されたタイトル（時間帯パネルの日付表示など）へ流し込む
			const selectedDateStr = `${selectedMonth.replace(/\//g, "-")}-${String(
				selDateNum,
			).padStart(2, "0")}`;
			showSelectedDate(selectedDateStr);
			//曜日と祝日名（祝日でなければ曜日だけ）を、時間管理の日付の下へ
			showSelectedDateNote(selectedDateStr, monthHolidays[selDateNum]);

			//時間単位の情報が複数あるなら時間テーブルを表示して終了
			if (Object.keys(monthDailyObj[selDateNum]).length > 1) {
				const timeStyle = {
					isDispHoliday: renderStyle.isHoliday,
					enoughBorder: renderStyle.enoughBorder,
					enough_bg: renderStyle.enoughBgColor || renderStyle.enoughGradient,
					low_bg: renderStyle.lowBgColor || renderStyle.lowGradient,
					empty_bg: renderStyle.emptyBgColor || renderStyle.emptyGradient,
					close_bg: renderStyle.closeBgColor || renderStyle.closeGradient,
					remainDisp: renderStyle.remainDisp,
				};

				const timetableSource = buildTimeTableSource(
					monthDailyObj[selDateNum],
					timeStyle,
				);

				//テーブルの再レンダリング
				const timeTableElement = $timeTable[0] || null;

				renderTableFromTableSource(timeTableElement, timetableSource);
				//timeTableを表示
				$timeTable.show();
				//モバイルでは、時間管理のパネル（メニューのグループ）を引き出す
				toggleTimePanel(true);
				return;
			} else {
				//結合して YYYY-MM-DD 完成
				const yearMonth = selectedMonth.replace(/\//g, "-");
				const selDay = $calendarTable.find("td.currentSel").data("date");
				const dayPadded = String(selDay).padStart(2, "0");
				const formattedDate = `${yearMonth}-${dayPadded}`;
				//モーダルを出す
				comfirm_modal_disp(formattedDate);
			}
		});

		// $timeTable 内のセル（td）がクリックされた時のイベント（予約登録）
		$timeTable.on("click", "td", function () {
			//選択された月を取得
			const selectedMonth = $calendar.find(MONTH_SELECT).val() as string; // "YYYY/MM"
			if (!selectedMonth) return;
			//選択された日付
			if (!$calendarTable.find("td.currentSel").length) return;
			const selDay = $calendarTable.find("td.currentSel").data("date");
			//空きがないときは終了
			const $clickedCell = $(this);
			if ($clickedCell.data("avail") < 1) return;

			//日付文字列の生成
			// 1. スラッシュをハイフンに置換 (2026/05 -> 2026-05)
			const yearMonth = selectedMonth.replace(/\//g, "-");

			// 2. 日付を2桁にパディング (5 -> 05)
			const dayPadded = String(selDay).padStart(2, "0");

			// 3. 結合して YYYY-MM-DD 完成
			const formattedDate = `${yearMonth}-${dayPadded}`;
			//確認モーダルより手前に重なるので、時間管理のパネルは先に閉じる
			toggleTimePanel(false);
			//モーダルを出す
			comfirm_modal_disp(formattedDate, $clickedCell.data("time"));
		});

		//予約確認のモーダルを出す
		const comfirm_modal_disp = async (
			selDate: string,
			timeValue: string = "",
		) => {
			//モーダル内の日付表示要素を取得
			if (dispUniqueIds.reserveDate) {
				const dateId = JSON.parse(dispUniqueIds.reserveDate).id;
				const $dateElm = $reservation_modal.find(`[data-unique_id=${dateId}]`);

				//フォーマットを当てて表示
				const formatedValue = displayFormated(
					selDate,
					$dateElm.data("user_format"),
					$dateElm.data("free_format"),
					$dateElm.data("decimal"),
				);
				if ($dateElm) {
					enterTitle($dateElm, formatedValue);
					$dateElm.attr("data-value", selDate);
				}
			}

			//モーダル内の時間表示要素を取得
			if (dispUniqueIds.reserveTime) {
				const timeId = JSON.parse(dispUniqueIds.reserveTime).id;
				const $timeElm = $reservation_modal.find(`[data-unique_id=${timeId}]`);
				if ($timeElm) {
					enterTitle($timeElm, timeValue);
					$timeElm.attr("data-value", timeValue);
				}
			}

			//リソース名を表示
			if (dispUniqueIds.resourceName) {
				const resourceId = JSON.parse(dispUniqueIds.resourceName).id;
				const $resouceElm = $reservation_modal.find(
					`[data-unique_id=${resourceId}]`,
				);

				if ($resouceElm) {
					enterTitle($resouceElm, resourceName);
				}
			}

			//予約人数の初期値をinputboxの値に入れる
			if (dispUniqueIds.guestCount) {
				const guestCountId = JSON.parse(dispUniqueIds.guestCount).id;
				const $guestCountInput = $reservation_modal.find(`#${guestCountId}`);

				$guestCountInput.val(1);
			}

			//ログインのチェック
			if (!itmar_option.isLoggedIn) {
				alert("予約にはログインが必要です。");
				// 必要ならログインページへリダイレクト
				// window.location.href = wpApiSettings.login_url;
				return;
			}

			if ($reservation_modal.length) {
				//メール送信ブロックがあるか検証
				const mailSenderBlock = $reservation_modal.find(
					".wp-block-itmar-contactmail-sender",
				);
				// メールセンダーブロックにイベントを送信
				if (mailSenderBlock) {
					mailSenderBlock.trigger("fieldset:action", {
						type: cancelModForm,
					});
				}
				// モーダルを表示（CSSで display: none になっている場合）
				$reservation_modal.fadeIn();
			} else {
				console.error("モーダルが見つかりません。IDを確認してください。");
			}
		};

		// $bookingTable 内のキャンセルボタンがクリックされた時のイベント（キャンセル確認のモーダルを出す）
		$bookingTable.on("click", ".itmar-cancel-button", async function (e) {
			//メール送信ブロックがあるか検証
			if ($reservation_modal.length < 1) {
				console.error("モーダルが見つかりません。IDを確認してください。");
				return;
			}

			const mailSenderBlock = $reservation_modal.find(
				".wp-block-itmar-contactmail-sender",
			);
			// 一つ目を表示、それ以外を非表示にしてリセット
			if (mailSenderBlock) {
				mailSenderBlock.trigger("fieldset:action", { type: reserveForm });
			}

			// 1. クリックされたボタンから見て、所属している「行(tr)」を取得
			const $td = $(e.currentTarget).closest("td");
			const bookingId = $td.data("booking-id");
			const slotIds = $td.data("slot-ids");
			const reserveDate = $td.data("reserve-date");
			const guestCount = $td.data("guest-count");

			// クリックされたボタンから見て、所属している「行(tr)」を取得
			const $row = $(e.currentTarget).closest("tr");

			//モーダル内の表示要素を取得して表示
			if (dispUniqueIds.reserveDate) {
				const dateId = JSON.parse(dispUniqueIds.reserveDate).id;
				const $dateElm = $reservation_modal.find(`[data-unique_id=${dateId}]`);

				//フォーマットを当てて表示
				const formatedValue = displayFormated(
					reserveDate,
					$dateElm.data("user_format"),
					$dateElm.data("free_format"),
					$dateElm.data("decimal"),
				);
				enterTitle($dateElm, formatedValue);
			}
			if (dispUniqueIds.reserveTime) {
				const timeId = JSON.parse(dispUniqueIds.reserveTime).id;
				const $timeElm = $reservation_modal.find(`[data-unique_id=${timeId}]`);

				const timeText = $row.find("td.reservation_time_cell").text().trim();
				enterTitle($timeElm, timeText);
			}

			//予約人数をinputboxの値に入れる
			if (dispUniqueIds.guestCount) {
				const guestCountId = JSON.parse(dispUniqueIds.guestCount).id;
				const $guestCountInput = $reservation_modal.find(`#${guestCountId}`);

				// 正規表現で数字以外（\D）をすべて空文字に置換し、数値型に変換
				const guestCountInt = parseInt(guestCount, 10);
				$guestCountInput.val(guestCountInt);
				$guestCountInput.data("prev_value", guestCountInt); //初期値をデータ属性で確保しておく
			}

			//キャンセル処理に必要なIDをモーダルに記録
			$reservation_modal.data("booking-id", bookingId);
			$reservation_modal.data("slot-ids", slotIds);

			$reservation_modal.fadeIn();
		});

		//確認モーダルのサブミット
		let click_key = "";
		$reservation_modal.on("submit", "form", async function (e: any) {
			e.preventDefault(); // ページ遷移を止める
			//サブミッタがないときは処理しない
			if (!e.originalEvent) return;
			//submitボタンの取得
			const $form = $(this);
			const $submitBtn = $form.find('button[type="submit"]');
			const keepBtnTexts = $submitBtn
				.map(function () {
					return $(this).text();
				})
				.get();

			//ボタンのキー属性によって処理する
			//予約の実行
			if ($form.attr("id") === "to_confirm_form") {
				//確認前のフォームでクリックされたボタンIDをキープ
				click_key = e.originalEvent?.submitter?.dataset.key;
			} else if ($form.attr("id") === "itmar_send_exec") {
				//戻るの処理
				const pageDirection = e.originalEvent.submitter?.dataset.back;

				if (pageDirection === "back") {
					return;
				}

				// ✅ モーダルに保存しておいた ID を取得
				const $modalElement = $form.closest($reservation_modal);
				const bookingId = $modalElement.data("booking-id");

				// ボタンを無効化して連打防止
				//const keepBtnText = $submitBtn.text();
				$submitBtn
					.prop("disabled", true)
					.text(__("Sending...", "itmaroon-booking-block"));

				// const $data_form = $(this)
				// 	.closest(".wp-block-itmar-contactmail-sender")
				// 	.find("#to_confirm_form");
				// フォーム内のデータを取得
				let guestCount: string | number = 0;
				let reserveDate: string | undefined = "";
				let reserveTime: string | undefined = "";

				if (dispUniqueIds.guestCount) {
					const guestCountId = JSON.parse(dispUniqueIds.guestCount).id;
					guestCount = $(`input[name=${guestCountId}]`).val() as
						| string
						| number;
				}

				const isSameUnit =
					$('input[name="same_table"]').prop("checked") || false;

				if (dispUniqueIds.reserveDate) {
					const dateId = JSON.parse(dispUniqueIds.reserveDate).id;

					reserveDate = $(`[data-unique_id=${dateId}]`)?.attr("data-value");
				}
				if (dispUniqueIds.reserveTime) {
					const timeId = JSON.parse(dispUniqueIds.reserveTime).id;
					reserveTime =
						$(`[data-unique_id=${timeId}]`)?.attr("data-value") || "00:00";
				}

				//予約実行の結果を入れる
				let message = {
					code: "error",
					text: infoMessages["error"],
				};

				try {
					// ボタンを無効化して連打防止
					$submitBtn
						.prop("disabled", true)
						.text(__("Sending...", "itmaroon-booking-block"));

					//予約の実行
					if (click_key === buttonIDs.reserve) {
						// 送信データを作成
						const data = {
							resource_id: resourceId,
							guest_count: guestCount,
							is_same_unit: isSameUnit,
							reserveDate: reserveDate,
							reserveTime: reserveTime,
						};

						const response = await apiFetch<BookingResponse>({
							path: "/itmar/v1/bookings",
							method: "POST",
							data: data,
						});
						message = {
							code: response.info_code,
							text: infoMessages[response.info_code],
						};

						if (message.text) {
							alert(message.text);
						} else {
							// 万が一、該当するコードのメッセージが定義されていない場合のフォールバック
							alert(__("Operation Complete", "itmaroon-booking-block"));
						}

						//修正の実行
					} else if (click_key === buttonIDs.modify) {
						// 送信データを作成
						const data = {
							id: bookingId,
							is_same_unit: isSameUnit,
							guest_count: guestCount,
						};
						const response = await apiFetch<BookingResponse>({
							path: "/itmar/v1/change_booking",
							method: "POST",
							data: data,
						});
						message = {
							code: response.info_code,
							text: infoMessages[response.info_code],
						};

						if (message.text) {
							alert(message.text);
						} else {
							// 万が一、該当するコードのメッセージが定義されていない場合のフォールバック
							alert(__("Operation Complete", "itmaroon-booking-block"));
						}

						//キャンセルの実行
					} else if (click_key === buttonIDs.cancel) {
						// 送信データを作成
						const data = {
							id: bookingId,
							is_same_unit: isSameUnit,
							guest_count: guestCount,
						};
						const response = await apiFetch<BookingResponse>({
							path: "/itmar/v1/cancel_booking",
							method: "POST",
							data: data,
						});
						message = {
							code: response.info_code,
							text: infoMessages[response.info_code],
						};

						if (message.text) {
							alert(message.text);
						} else {
							// 万が一、該当するコードのメッセージが定義されていない場合のフォールバック
							alert(__("Operation Complete", "itmaroon-booking-block"));
						}
					}
				} catch (error: any) {
					console.error("予約エラー:", error.message);
					message = {
						code: error.info_code,
						text: infoMessages[error.info_code]
							? infoMessages[error.info_code]
							: error.message,
					};

					// error が Error オブジェクトかどうかをチェック
					if (message) {
						alert(message.text);
					} else {
						alert("不明なエラーが発生しました");
					}
				} finally {
					// 送信後：各ボタンのテキストを個別に復元
					$submitBtn.each(function (index) {
						$(this).prop("disabled", false).text(keepBtnTexts[index]);
					});
					//再レンダリングの実行
					if (typeof refresh === "function") {
						refresh();
					}
					if (message.code === "noChange") {
						//モーダルの消去
						$reservation_modal.fadeOut();
					} else {
						console.log(message);
						//通知メールの送信トリガー発行
						$("#itmar_send_exec").trigger("submit", { message: message });
					}
				}
			}
		});
	});
});
