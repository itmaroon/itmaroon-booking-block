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
} from "./createTableSource"; // 上で作った共通関数
import { SlotRow, DayObject, userBooking, HolidayData } from "./types";

const normalizeDateYYYYMMDD = (
	v: string | number | undefined | null,
): string => (v ? String(v).slice(0, 10) : "");

const mapSlotsByDay = (
	slots: SlotRow[] | undefined,
	ym: string,
): Map<number, Partial<DayObject>> => {
	// Mapの型を <number, DayObjectの一部> として定義
	const map = new Map<number, Partial<DayObject>>();

	(slots || []).forEach((row) => {
		const ymd = normalizeDateYYYYMMDD(row.slot_date);
		if (!ymd.startsWith(`${ym}-`)) return;
		const day = Number(ymd.slice(8, 10));
		map.set(day, {
			slotId: Number(row.id),
			slotStatus: row.status || "open",
			slotCapacity: Number(row.capacity_total),
		});
	});
	return map;
};

const mergeSlotsIntoCalendar = (
	calendar: DayObject[] | undefined,
	slotMap: Map<number, Partial<DayObject>>,
): DayObject[] => {
	return (calendar || []).map((d) => {
		const hit = slotMap.get(Number(d.date));
		return hit
			? { ...d, ...hit }
			: { ...d, slotId: 0, slotStatus: null, slotCapacity: null };
	});
};

jQuery(function ($) {
	// ✅ 「1つの予約ブロック」ごとに初期化したいので、親ラッパーを推奨
	// 例: save.js の wrapper に class="wp-block-itmaroon-booking-block" を付ける
	$(".wp-block-itmar-reservation-block").each((_index, element) => {
		const $root = $(element);
		//カレンダーブロックは最初の一つだけ取得
		const $calendar = $root.find(".wp-block-itmar-design-calender").first();
		//テーブルブロックはすべて取得
		const $table = $root.find(".wp-block-itmar-design-table");
		//設定された表示用テーブルの識別ID
		const calendarTableId = $root.data("calendar-table-id");
		const bookingTableId = $root.data("booking-table-id");
		//テーブルブロック
		const $calendarTable = $table.filter(
			`[data-define_id="${calendarTableId}"]`,
		);
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
		//ResourceIdの取得
		const getResourceIdFromRoot = ($root: JQuery): number => {
			// まず自分（念のため）
			let v = $root.data("resourceId");
			if (v != null) {
				const n = Number(v);
				if (Number.isFinite(n) && n > 0) return n;
			}

			// 次に配下（最初に見つかったもの）
			const $hit = $root.find("[data-resource-id]").first();
			if ($hit.length) {
				v = $hit.attr("data-resource-id"); // data()より確実（DOM差し替えにも強い）
				const n = Number(v);
				if (Number.isFinite(n) && n > 0) return n;
			}

			return 0;
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

		async function refresh() {
			const selectedMonth = $calendar.find(MONTH_SELECT).val() as string; // "YYYY/MM"
			if (!selectedMonth) return;

			const { from, to, ym, year, month } = getMonthRangeYmd(selectedMonth);

			if (!from || !to) return;

			// resourceId は save.js で data-resource-id を出すのが最も安定
			const resourceId = getResourceIdFromRoot($root);

			if (!resourceId) return;

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

			const slotMap = mapSlotsByDay(slots, ym);
			const mergedCalendar = mergeSlotsIntoCalendar(baseCalendar, slotMap);

			// ✅ 共通 buildCalendarTableSource を使用（renderCellだけview用に注入）
			const calendarSource = buildCalendarTableSource(
				selectedMonth,
				mergedCalendar,
				{
					isMonday: false,
					renderCell: renderBookingCellHtml,
				},
			);

			const bookingPath = "/itmar/v1/get_user_bookings";
			const bookings = await apiFetch<userBooking[]>({ path: bookingPath });

			// 予約一覧用の Source を作成
			const bookingSource = buildBookingListTableSource(bookings, {
				renderActions: renderCancelButtonHtml,
			});

			//テーブルの再レンダリング
			const calendarTableElement = $calendarTable[0] || null;
			renderTableFromTableSource(calendarTableElement, calendarSource);

			const bookingTableElement = $bookingTable[0] || null;
			renderTableFromTableSource(bookingTableElement, bookingSource);
		}

		//Design Titleの中味にデータ流し込むヘルパ
		const enterTitle = (
			$dateElm: JQuery<HTMLElement>,
			formatedValue: string,
		) => {
			const $targetDiv = $dateElm.find("h1, h2, h3, h4, h5, h6").find("div");
			if ($targetDiv.length) {
				// テキストを流し込む
				$targetDiv.text(formatedValue);
			}
		};

		// 「親の親」にある #reservation_modal を探して表示させる
		const $reservation_modal = $root
			.find("#reservation_modal")
			.parent()
			.parent();

		// $calendarTable 内のセル（td）がクリックされた時のイベント（予約登録）
		$calendarTable.on("click", "td", function () {
			//選択された月を取得
			const selectedMonth = $calendar.find(MONTH_SELECT).val() as string; // "YYYY/MM"
			if (!selectedMonth) return;

			const $clickedCell = $(this);
			const selDate = `${selectedMonth}/${$clickedCell.data("date")}`;
			const slotId = $clickedCell.data("slot-id");
			const slotCapa = $clickedCell.data("capacity");

			//モーダル内の日付表示要素を取得
			const $dateElm = $reservation_modal.find(
				'[data-unique_id="reservation_date"]',
			);

			//フォーマットを当てて表示
			const formatedValue = displayFormated(
				selDate,
				$dateElm.data("user_format"),
				$dateElm.data("free_format"),
				$dateElm.data("decimal"),
			);

			enterTitle($dateElm, formatedValue);

			if ($reservation_modal.length) {
				//
				$reservation_modal.data("slot-id", slotId);
				// 人数入力の上限だけは反映させておく
				$reservation_modal
					.find('input[name="guest_count"]')
					.attr("max", slotCapa);
				// モーダルを表示（CSSで display: none になっている場合）
				$reservation_modal.fadeIn();
			} else {
				console.error("モーダルが見つかりません。IDを確認してください。");
			}
		});

		//キャンセル確認のモーダルを出す
		const $cancel_modal = $root.find("#cancel_modal").parent().parent();

		// $bookingTable 内のキャンセルボタンがクリックされた時のイベント（予約キャンセル）
		$bookingTable.on("click", ".itmar-cancel-button", async function (e) {
			// 1. クリックされたボタンから見て、所属している「行(tr)」を取得
			const $td = $(e.currentTarget).closest("td");
			const bookingId = $td.data("booking-id");
			console.log(bookingId);
			// 1. クリックされたボタンから見て、所属している「行(tr)」を取得
			const $row = $(e.currentTarget).closest("tr");
			// 2. その行にあるすべての td 要素からテキストを抽出して配列にする
			// .map() を使うと1行で綺麗に取得できます
			const rowData: string[] = $row
				.find("td")
				.map(function () {
					return $(this).text().trim(); // 余計な改行や空白を除去
				})
				.get(); // jQueryオブジェクトを純粋な配列に変換

			//モーダル内の日付表示要素を取得
			const $dateElm = $cancel_modal.find(
				'[data-unique_id="reservation_date"]',
			);
			//フォーマットを当てて表示
			const formatedValue = displayFormated(
				rowData[0],
				$dateElm.data("user_format"),
				$dateElm.data("free_format"),
				$dateElm.data("decimal"),
			);
			enterTitle($dateElm, formatedValue);

			const $slotNameElm = $cancel_modal.find('[data-unique_id="slot_name"]');
			enterTitle($slotNameElm, rowData[1]);

			const $gestCountElm = $cancel_modal.find(
				'[data-unique_id="guest_count"]',
			);
			enterTitle($gestCountElm, rowData[2]);

			$cancel_modal.data("booking-id", bookingId);

			$cancel_modal.fadeIn();
		});

		//確認モーダルのサブミット
		$reservation_modal.on("submit", "form", async function (e) {
			e.preventDefault(); // ページ遷移を止める

			const $form = $(this);
			const $submitBtn = $form.find('button[type="submit"]');
			const $modalElement = $form.closest($reservation_modal);

			// ✅ モーダルに保存しておいた ID を取得
			const slotId = $modalElement.data("slot-id");

			// フォーム内の「人数」を取得
			const guestCount = $form.find('input[name="guest_count"]').val();

			// 送信データを作成
			const data = {
				slot_id: slotId,
				guest_count: guestCount,
			};
			// ボタンを無効化して連打防止
			$submitBtn.prop("disabled", true).text("送信中...");

			try {
				await apiFetch({
					path: "/itmar/v1/bookings",
					method: "POST",
					data: data,
				});
				alert("予約が完了しました！");

				// ✅ 予約が成功したので、カレンダーの残数を最新にするために再描画
				if (typeof refresh === "function") {
					refresh();
				}
			} catch (error) {
				// error が Error オブジェクトかどうかをチェック
				if (error instanceof Error) {
					console.error("予約エラー:", error.message);
					alert("予約に失敗しました: " + error.message);
				} else {
					// 文字列などが投げられた場合のフォールバック
					console.error("予期せぬエラー:", error);
					alert("不明なエラーが発生しました");
				}
			} finally {
				$submitBtn.prop("disabled", false).text("予約を確定する");
				$reservation_modal.fadeOut();
			}
		});

		//キャンセルのサブミット処理
		$cancel_modal.on("submit", "form", async function (e) {
			e.preventDefault(); // ページ遷移を止める

			const $form = $(this);
			const $submitBtn = $form.find('button[type="submit"]');
			const $modalElement = $form.closest($cancel_modal);

			// ✅ モーダルに保存しておいた ID を取得
			const bookingId = $modalElement.data("booking-id");

			// ボタンを無効化して連打防止
			$submitBtn.prop("disabled", true).text("送信中...");

			// 送信データを作成
			const data = {
				id: bookingId,
			};
			try {
				await apiFetch({
					path: "/itmar/v1/cancel_booking",
					method: "POST",
					data: data,
				});
				alert("キャンセルしました！");

				if (typeof refresh === "function") {
					refresh();
				}
			} catch (error) {
				// error が Error オブジェクトかどうかをチェック
				if (error instanceof Error) {
					console.error("予約エラー:", error.message);
					alert("予約に失敗しました: " + error.message);
				} else {
					// 文字列などが投げられた場合のフォールバック
					console.error("予期せぬエラー:", error);
					alert("不明なエラーが発生しました");
				}
			} finally {
				$submitBtn.prop("disabled", false).text("キャンセル");
				$cancel_modal.fadeOut();
			}
		});
	});
});
