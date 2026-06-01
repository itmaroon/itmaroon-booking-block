import { __, sprintf } from "@wordpress/i18n";
import { BlockEditProps, TemplateArray } from "@wordpress/blocks";
import { store as blockEditorStore } from "@wordpress/block-editor";
import type {
	BookingAttributes,
	SlotRow,
	DayObject,
	TableRow,
	TableSource,
	BulkResult,
	userBooking,
	SlotDetail,
	SlotUsing,
} from "./types";
import {
	PanelBody,
	PanelRow,
	Notice,
	TextControl,
	ToggleControl,
	Button,
	BaseControl,
	SelectControl,
	RangeControl,
	RadioControl,
} from "@wordpress/components";
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	__experimentalPanelColorGradientSettings as PanelColorGradientSettings,
} from "@wordpress/block-editor";

import { useState, useMemo, useEffect, useRef } from "@wordpress/element";
import { useSelect, useDispatch } from "@wordpress/data";
import apiFetch from "@wordpress/api-fetch";

import {
	ArchiveSelectControl,
	PostSelectControl,
	getMonthRangeYmd,
	generateMonthCalendar,
	normalizeDateYYYYMMDD,
	toYmdFromMonthAndDay,
	flattenBlocks,
} from "itmar-block-packages";

import {
	buildCalendarTableSource,
	renderBookingCellHtml,
	buildBookingListTableSource,
	buildTimeTableSource,
	renderCancelButtonHtml,
	slotInfoCalendar,
} from "./createTableSource";

import SlotEditModal from "./SlotEditModal";

import "./editor.scss";

const WEEKDAYS = [
	{ key: 0, label: __("Sun", "itmaroon-booking-block") },
	{ key: 1, label: __("Mon", "itmaroon-booking-block") },
	{ key: 2, label: __("Tue", "itmaroon-booking-block") },
	{ key: 3, label: __("Wed", "itmaroon-booking-block") },
	{ key: 4, label: __("Thu", "itmaroon-booking-block") },
	{ key: 5, label: __("Fri", "itmaroon-booking-block") },
	{ key: 6, label: __("Sat", "itmaroon-booking-block") },
];

export default function Edit(props: BlockEditProps<BookingAttributes>) {
	const { attributes, setAttributes, clientId, isSelected } = props;
	const {
		resourceId,
		resourceSlug,
		selectedSlug,
		selectedRest,
		calendarTableId,
		bookingTableId,
		timeTableId,
		closedWeekdays,
		infoMessages,
		dispUniqueIds,
		confirmModal,
		reserveForm,
		cancelModForm,
		isHoliday,
		enoughBorder,
		enoughBgColor,
		enoughGradient,
		lowBgColor,
		lowGradient,
		emptyBgColor,
		emptyGradient,
		closeBgColor,
		closeGradient,
		remainDisp,
		restDisp,
	} = attributes;

	// dispatch関数を取得
	const { updateBlockAttributes, selectBlock } = useDispatch(
		blockEditorStore.name,
	) as any;
	//インナーブロックのひな型を用意
	const TEMPLATE: TemplateArray = [];
	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		allowedBlocks: [
			"itmar/design-group",
			"itmar/design-title",
			"core/image",
			"core/paragraph",
			"itmar/design-button",
			"itmar/design-calender",
			"itmar/design-table",
		],
		template: TEMPLATE,
		templateLock: false,
	});

	//各インナーブロックを取得
	const { innerBlocksData } = useSelect(
		(select) => {
			const { getBlocks } = select(blockEditorStore) as any;

			// 1. 直下の子を取得して平坦化（一回だけでOK）
			const rootInnerBlocks = getBlocks(clientId) || [];
			const allBlocks = flattenBlocks(rootInnerBlocks);

			// 2. 各ブロックを探索
			const calendarBlock = allBlocks.find(
				(b) => b.name === "itmar/design-calender",
			);

			const calendarTable = allBlocks.find(
				(b: any) =>
					b.name === "itmar/design-table" &&
					b.attributes?.defineID === calendarTableId,
			);

			const timeTable = allBlocks.find(
				(b: any) =>
					b.name === "itmar/design-table" &&
					b.attributes?.defineID === timeTableId,
			);

			const reservatedTable = allBlocks.find(
				(b: any) =>
					b.name === "itmar/design-table" &&
					b.attributes?.defineID === bookingTableId,
			);

			const displayTables = allBlocks.filter(
				(b: any) => b.name === "itmar/design-table",
			);

			const targetTitle = allBlocks.filter(
				(b: any) => b.name === "itmar/design-title" && b.attributes?.uniqueID,
			);

			const targetGroup = allBlocks.filter(
				(b: any) => b.name === "itmar/design-group" && b.attributes?.formID,
			);

			const targetInput = allBlocks.filter(
				(b: any) =>
					b.name === "itmar/design-text-ctrl" && b.attributes?.inputName,
			);

			return {
				innerBlocksData: {
					calendarFromInner: calendarBlock || null,
					tableFromInner: calendarTable || null,
					timeFromInner: timeTable || null,
					reservatedInner: reservatedTable || null,
					displayTables: displayTables || null,
					targetTitleBlock: targetTitle || null,
					targetGroupBlock: targetGroup || null,
					targetInputBlock: targetInput || null,
				},
			};
		},
		[clientId, calendarTableId, bookingTableId],
	);

	// 使うときは分割代入で
	const {
		calendarFromInner,
		tableFromInner,
		timeFromInner,
		reservatedInner,
		displayTables,
		targetTitleBlock,
		targetGroupBlock,
		targetInputBlock,
	} = innerBlocksData;

	//カレンダーテーブルで選択された年月日
	const selectedDateYmd = useMemo<string | null>(() => {
		return toYmdFromMonthAndDay(
			calendarFromInner?.attributes?.selectedMonth,
			calendarFromInner?.attributes?.selectedValue,
		);
	}, [
		calendarFromInner?.attributes?.selectedMonth,
		calendarFromInner?.attributes?.selectedValue,
	]);

	//枠を作る日付を生成
	const pad2 = (n: number) => String(n).padStart(2, "0");

	//iframeの取得のための参照
	const containerRef = useRef<HTMLDivElement>(null);

	// 週休日のセット
	const closedSet = useMemo<Set<number>>(
		() => new Set<number>(closedWeekdays ?? []),
		[closedWeekdays],
	);

	const datesToCreate = useMemo<string[]>(() => {
		const selectedMonth = calendarFromInner?.attributes?.selectedMonth; // "YYYY/MM"
		if (!selectedMonth) return [];

		const [yStr, mStr] = String(selectedMonth).split("/");
		const year = Number(yStr);
		const month = Number(mStr);
		if (!year || !month) return [];

		return generateMonthCalendar(selectedMonth)
			.filter((d) => !closedSet.has(Number(d.weekday)))
			.map((d) => `${year}-${pad2(month)}-${pad2(Number(d.date))}`); // "YYYY-MM-DD"
	}, [calendarFromInner?.attributes?.selectedMonth, closedSet]);

	// 予約レコード削除のチェックボックスがクリックされた時に呼ぶ関数
	const onTableClick = (e: React.MouseEvent) => {
		const target = e.target as HTMLInputElement;

		// クリックされたのがチェックボックスだったら
		if (target.classList.contains("itmar-delete-checkbox")) {
			// 1. 現在のチェック状態を一時的に保持
			const isChecked = target.checked;
			const targetValue = target.value;

			// 2.ブロックを選択状態にする
			selectBlock(reservatedInner?.clientId);
			// 3. 次のレンダリングサイクルでチェックを強制的に戻す
			setTimeout(() => {
				if (containerRef.current) {
					const blockDocument = containerRef.current.ownerDocument;
					// Valueなどをキーに、再描画された後の新しいDOM要素を探す
					const checkbox = blockDocument.querySelector(
						`.itmar-delete-checkbox[value="${targetValue}"]`,
					) as HTMLInputElement;

					if (checkbox) {
						checkbox.checked = isChecked;
						// 必要に応じて change イベントを発火させておく
						checkbox.dispatchEvent(new Event("change", { bubbles: true }));
					}
				}
			}, 0);
		}
	};

	// =====状態変数 =====
	const [isInitialized, setIsInitialized] = useState(false); // 初期化完了フラグ

	const [lastUpdated, setLastUpdated] = useState(Date.now()); // 保存が成功するたびに更新するカウンター
	const [dayLoading, setDayLoading] = useState<boolean>(false);

	const [slotRows, setSlotRows] = useState<SlotDetail[]>([]);

	const [monthSaving, setMonthSaving] = useState<boolean>(false);
	const [monthNotice, setMonthNotice] = useState<{
		status: "error" | "success" | "warning" | "info" | undefined;
		message: string;
	}>({ status: undefined, message: "" });
	const [unitSaving, setUnitSaving] = useState<boolean>(false);
	const [addNum, setAddnum] = useState<number>(1);

	//unitの管理ステート
	interface ResourceUnit {
		id?: number;
		name: string;
		min: number;
		max: number;
	}
	const [currentUnit, setCurrentUnit] = useState<ResourceUnit>({
		name: "",
		min: 1,
		max: 2,
	});
	const [unitList, setUnitList] = useState<ResourceUnit[]>([]); // 保存済みユニットのリスト
	const [selectedUnitId, setSelectedUnitId] = useState<string>("");
	//Spanの管理ステート
	interface TypeSpan {
		id?: number;
		startTime: string;
		endTime: string;
	}
	const [isAllday, setIsAllday] = useState<boolean>(false);
	const [currentSpan, setTimeSpan] = useState<TypeSpan>({
		startTime: "00:00",
		endTime: "00:00",
	});

	const [travel, setTravel] = useState<number>(60);

	//スロット編集Modal表示フラグ
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

	// 日付ごとの詳細データを保持するステート
	const [dailyStatsMap, setDailyStatsMap] = useState<Record<number, SlotUsing>>(
		{},
	);

	//各ブロックの初期化
	useEffect(() => {
		if (!isInitialized && calendarFromInner && tableFromInner) {
			// 命令を出す（ここでのawaitは、あくまで命令の送信完了まで）
			updateBlockAttributes(calendarFromInner.clientId, { selectedValue: 0 });

			updateBlockAttributes(tableFromInner.clientId, { clickCellPos: {} });
		}
		//時間テーブルがない場合は初期化しない
		if (!isInitialized && timeFromInner) {
			updateBlockAttributes(timeFromInner.clientId, { tableSource: [] });
		}
	}, [
		isInitialized,
		calendarFromInner?.clientId,
		timeFromInner?.clientId,
		tableFromInner?.clientId,
	]);
	useEffect(() => {
		// すべての値が「初期値」に戻ったことを確認できたら、初めて準備完了とする
		const isReset =
			calendarFromInner?.attributes?.selectedValue === 0 &&
			(!timeFromInner ||
				timeFromInner?.attributes?.tableSource?.length === 0) &&
			Object.keys(tableFromInner?.attributes?.clickCellPos || {}).length === 0;

		if (isReset && !isInitialized) {
			setIsInitialized(true);
		}
	}, [
		calendarFromInner?.attributes?.selectedValue,
		timeFromInner?.attributes?.tableSource,
		tableFromInner?.attributes?.clickCellPos,
	]);
	//選択月が変ったら一旦初期化
	useEffect(() => {
		setIsInitialized(false);
	}, [calendarFromInner?.attributes?.selectedMonth]);

	// 選択日 or resourceId が変わったら、その日の slot を DB から取得
	useEffect(() => {
		const fetchDaySlot = async (): Promise<void> => {
			// 条件が揃わないなら終了
			if (!resourceId || !selectedDateYmd) {
				return;
			}

			setDayLoading(true);
			try {
				const path = `/itmar/v1/slots?resource_id=${encodeURIComponent(
					resourceId,
				)}&from=${encodeURIComponent(selectedDateYmd)}&to=${encodeURIComponent(
					selectedDateYmd,
				)}`;

				const rows = await apiFetch({ path });

				//データベースから取ってきたデータをステータスにセット
				setSlotRows(rows as SlotDetail[]);
			} catch (e) {
				const error = e as { message?: string };
				console.error(
					error?.message ??
						__("Failed to load selected day slot.", "itmaroon-booking-block"),
				);
			} finally {
				setDayLoading(false);
			}
		};

		fetchDaySlot();
	}, [resourceId, selectedDateYmd, monthNotice]);

	//slotRows(選択された日付に対応するスロット)が変化したとき
	useEffect(() => {
		// 【重要】初期化が終わっていなければ、ここで即座に引き返す（早期リターン）
		if (!isInitialized) return;

		const selDay = calendarFromInner?.attributes?.selectedValue;

		//その日のスロットデータなければ終了
		if (!dailyStatsMap[selDay]) return;
		//スロット編集用モーダルの表示
		setIsModalOpen(true);
	}, [slotRows]);

	//カレンダーテーブルのレンダリング
	useEffect(() => {
		// 【重要】初期化が終わっていなければ、ここで即座に引き返す（早期リターン）
		if (!isInitialized) return;

		const runSlotDataGet = async (): Promise<void> => {
			if (!calendarFromInner) return;
			if (!tableFromInner) return;
			if (!resourceId) return;

			const selectedMonth = calendarFromInner?.attributes?.selectedMonth as
				| string
				| undefined;
			const dateValues = calendarFromInner?.attributes?.dateValues ?? [];

			if (!selectedMonth) return;
			if (!Array.isArray(dateValues) || dateValues.length === 0) return;

			// ★ 非同期レース防止：このeffect実行の通し番号
			const mySeq = ++requestSeqRef.current;

			const { from, to, ym } = getMonthRangeYmd(selectedMonth) as {
				from: string;
				to: string;
				ym: string;
			};
			if (!from || !to) return;

			const slotPath =
				`/itmar/v1/slots?resource_id=${encodeURIComponent(resourceId)}` +
				`&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

			const slots = await apiFetch<SlotRow[]>({ path: slotPath });

			// 途中で月が切り替わっていたら破棄

			if (mySeq !== requestSeqRef.current) return;

			//カレンダーテーブルレンダリング用のデータを生成
			const calendarInfoObj = slotInfoCalendar(slots, ym, dateValues);

			//日毎の詳細を保存
			setDailyStatsMap(calendarInfoObj.dailyStats);

			//テーブル表示用のソースを生成

			const booking_data = buildCalendarTableSource(
				calendarFromInner?.attributes?.selectedMonth as string,
				calendarInfoObj.dataVal as DayObject[],
				{
					isMonday: false,
					renderCell: renderBookingCellHtml,
					renderStyle: {
						isDispHoliday: isHoliday,
						enoughBorder: enoughBorder,
						enough_bg: enoughBgColor || enoughGradient,
						low_bg: lowBgColor || lowGradient,
						empty_bg: emptyBgColor || emptyGradient,
						close_bg: closeBgColor || closeGradient,
						remainDisp: remainDisp,
						restDisp: restDisp,
					},
				},
			);

			// ★ 変化があるときだけ tableSource 更新（無限更新防止）
			const prev = (tableFromInner.attributes?.tableSource ??
				[]) as TableSource;
			if (tableSig(prev) !== tableSig(booking_data)) {
				updateBlockAttributes(tableFromInner.clientId, {
					tableLayout: "fixed",
					tableSource: booking_data,
				});
			}
		};

		// エラーは握りつぶさずログ（必要なら Notice 表示に変更）
		runSlotDataGet().catch((e: unknown) =>
			console.error("sync slots -> calendar dateValues failed:", e),
		);
	}, [
		isInitialized,
		calendarFromInner?.clientId,
		calendarFromInner?.attributes,
		resourceId,
		tableFromInner?.clientId,
		reservatedInner?.clientId,
		lastUpdated,
		isHoliday,
		enoughBorder,
		enoughBgColor,
		enoughGradient,
		lowBgColor,
		lowGradient,
		emptyBgColor,
		emptyGradient,
		closeBgColor,
		closeGradient,
		remainDisp,
		restDisp,
	]);

	//時間別のテーブルレンダリング
	useEffect(() => {
		// 【重要】初期化が終わっていなければ、ここで即座に引き返す（早期リターン）
		if (!isInitialized) return;

		const selDay = calendarFromInner?.attributes?.selectedValue;

		//時間別集計未了の場合はテーブルをクリア
		if (
			!dailyStatsMap[selDay] ||
			Object.keys(dailyStatsMap).length === 0 ||
			selDay === 0
		) {
			updateBlockAttributes(timeFromInner?.clientId, {
				tableLayout: "fixed",
				tableSource: [],
			});
			return;
		}

		//時間別のテーブルを更新
		const renderStyle = {
			isDispHoliday: isHoliday,
			enoughBorder: enoughBorder,
			enough_bg: enoughBgColor || enoughGradient,
			low_bg: lowBgColor || lowGradient,
			empty_bg: emptyBgColor || emptyGradient,
			close_bg: closeBgColor || closeGradient,
			remainDisp: remainDisp,
			restDisp: restDisp,
		};

		const timetableSource = buildTimeTableSource(
			dailyStatsMap[selDay],
			renderStyle,
		);

		updateBlockAttributes(timeFromInner?.clientId, {
			tableLayout: "fixed",
			tableSource: timetableSource,
		});
	}, [
		isInitialized,
		dailyStatsMap,
		calendarFromInner?.attributes?.selectedValue,
	]);

	//予約済みデータの表示
	useEffect(() => {
		//予約済みデータの取得
		const runReservationDataGet = async (): Promise<void> => {
			if (!reservatedInner) return;
			if (!resourceId) return;

			const path = `/itmar/v1/get_user_bookings?resource_id=${resourceId}`;
			const bookings = await apiFetch<userBooking[]>({ path });

			// 予約一覧用の Source を作成
			const reservation_data = buildBookingListTableSource(
				bookings,
				{
					renderActions: renderCancelButtonHtml,
				},
				true,
			);

			// ★ 変化があるときだけ tableSource 更新（無限更新防止）
			const prev = (reservatedInner.attributes?.tableSource ??
				[]) as TableSource;
			if (tableSig(prev) !== tableSig(reservation_data)) {
				updateBlockAttributes(reservatedInner.clientId, {
					tableLayout: "fixed",
					tableSource: reservation_data,
				});
			}
		};

		// containerRef.current が属している document (iframe内) を取得
		const blockDocument = containerRef.current?.ownerDocument;
		const blockWrapper = blockDocument?.getElementById(
			`block-${reservatedInner?.clientId}`,
		);
		//削除実行ボタンを配置
		if (blockWrapper) {
			// そのブロック内にあるテーブルの、最後のthを特定
			const lastTh = blockWrapper.querySelector("thead th:last-child");

			// 二重追加防止：既にボタンがないか確認
			if (lastTh && !lastTh.querySelector("#itmar-bulk-delete-button")) {
				const btn = document.createElement("button");
				btn.id = "itmar-bulk-delete-button";
				btn.type = "button";
				btn.innerText = "削除実行";

				// デザイン調整（インラインでスッキリ配置）
				Object.assign(btn.style, {
					background: "#db4949",
					color: "#fff",
					border: "none",
					padding: "2px 8px",
					borderRadius: "3px",
					cursor: "pointer",
					fontSize: "11px",
					marginLeft: "8px",
					verticalAlign: "middle",
				});

				// 削除実行ボタンのクリックイベント
				btn.addEventListener("click", async (e) => {
					// クリックイベントが親要素（詳細表示など）に伝播しないようにガード
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();

					// チェックされているIDを収集
					const checkedInputs = blockWrapper.querySelectorAll(
						".itmar-delete-checkbox:checked",
					);

					const bookingIds = Array.from(checkedInputs).map(
						(input) => (input as HTMLInputElement).value,
					);

					if (bookingIds.length === 0) {
						alert(
							__(
								"Please check the data you want to delete.",
								"itmaroon-booking-block",
							),
						);
						return;
					}

					const confirmMessage = sprintf(
						/* translators: %d: 削除する件数 */
						__(
							"Do you want to completely delete %d data items? \nThis operation cannot be undone.",
							"itmaroon-booking-block",
						),
						bookingIds.length,
					);

					if (!confirm(confirmMessage)) {
						return;
					}

					// 戻り値の型定義
					interface DeleteBookingsResponse {
						success: boolean;
						deleted_count: number;
						message: string;
					}

					try {
						const result = await apiFetch<DeleteBookingsResponse>({
							path: "/itmar/v1/bookings",
							method: "DELETE",
							data: { ids: bookingIds },
						});

						if (result.success) {
							alert(result.message);
							// bookingsデータを再取得して画面を更新
							setIsInitialized(false);
						}
					} catch (error: any) {
						// apiFetchはHTTPエラー時に例外を投げるため、ここでキャッチ
						console.error("Delete failed:", error.message);
						alert(__("Deletion failed.", "itmaroon-booking-block"));
					}
				});

				lastTh.appendChild(btn);
			}
		}

		// エラーは握りつぶさずログ（必要なら Notice 表示に変更）
		runReservationDataGet().catch((e: unknown) =>
			console.error("get reservation -> get reservation data failed:", e),
		);
	}, [isInitialized, resourceId, reservatedInner?.clientId]);

	//予定表上のテーブルをクリックしたときの処理
	useEffect(() => {
		// 【重要】初期化が終わっていなければ、ここで即座に引き返す（早期リターン）
		if (!isInitialized) return;

		//選択した月
		const selectedMonth = calendarFromInner?.attributes?.selectedMonth as
			| string
			| undefined;
		//１日の位置を計算
		const { year, month, lastDay } = getMonthRangeYmd(selectedMonth);

		const firstDayOfMonth = new Date(year, month - 1, 1).getDay();

		// 子ブロックから取得したクリック位置
		const row = tableFromInner?.attributes?.clickCellPos?.row;
		const col = tableFromInner?.attributes?.clickCellPos?.col;
		//if (!row || !col) return;

		// 通し番号（セル番号）を計算
		const cellIndex = (row - 1) * 7 + col;

		// 日付の計算
		// (セル番号 - 第1週の空白数) + 1
		const day = cellIndex - firstDayOfMonth + 1;

		// 4. 有効な日付範囲内かチェック
		if (day >= 1 && day <= lastDay) {
			//カレンダーコントロールの属性（選択日付）を変更
			updateBlockAttributes(calendarFromInner?.clientId, {
				selectedValue: day,
			});

			//ブロックを選択状態にする
			if (!isSelected) {
				selectBlock(clientId);
			}
		}
	}, [
		isInitialized,
		calendarFromInner?.attributes?.selectedMonth,
		tableFromInner?.attributes?.clickCellPos,
	]);

	//一月分の枠を一括で登録
	const addMonthSlots = async () => {
		setMonthNotice({ status: undefined, message: "" });

		if (!resourceId) {
			setMonthNotice({
				status: "error",
				message: __("Resource is not selected.", "itmaroon-booking-block"),
			});
			return;
		}
		if (!calendarFromInner?.attributes?.selectedMonth) {
			setMonthNotice({
				status: "error",
				message: __(
					"Month is not selected in calendar block.",
					"itmaroon-booking-block",
				),
			});
			return;
		}
		if (datesToCreate.length === 0) {
			setMonthNotice({
				status: "warning",
				message: __(
					"No dates to create (maybe all weekdays are closed).",
					"itmaroon-booking-block",
				),
			});
			return;
		}

		setMonthSaving(true);
		try {
			const payload = {
				resource_id: Number(resourceId),
				dates: datesToCreate, // ["YYYY-MM-DD", ...] （定休日除外後）
				isAllday: isAllday,
				startTime: currentSpan.startTime,
				endTime: currentSpan.endTime,
				timeTravel: travel,
			};

			const result = await apiFetch<BulkResult>({
				path: "/itmar/v1/slots/bulk",
				method: "POST",
				data: payload,
			});

			setMonthNotice({
				status: "success",
				message: __(
					`Processed: ${result.processed} (inserted: ${result.inserted}, updated: ${result.updated}, unchanged: ${result.unchanged})`,
					"itmaroon-booking-block",
				),
			});
		} catch (e: any) {
			const errorMessage =
				e?.message || __("Bulk create failed.", "itmaroon-booking-block");
			setMonthNotice({
				status: "error",
				message: errorMessage,
			});
		} finally {
			setMonthSaving(false);
		}
	};

	// --- ユニットの読み込み処理 ---
	useEffect(() => {
		if (resourceId) {
			apiFetch<ResourceUnit[]>({
				path: `/itmar/v1/resource-units/${resourceId}`,
			}).then((data) => {
				setUnitList(data);
			});
		}
	}, [resourceId, unitSaving]);

	// --- ユニットの追加（保存） ---
	const addUnitInfo = async () => {
		if (!currentUnit.name) {
			alert(__("Please enter a unit name.", "itmaroon-booking-block"));
			return;
		}

		setUnitSaving(true); //保存処理の開始フラグ
		try {
			// 現在のリストに新しい設定を追加した配列を作成
			const newUnits: ResourceUnit[] = [];
			//同じ種類の席数を一括で入力
			for (let i = 0; i < addNum; i++) {
				// 3桁で0埋めする（例: 1 -> 001, 12 -> 012）
				const unitNumber = (newUnits.length + 1).toString().padStart(3, "0");

				newUnits.push({
					name: `${currentUnit.name} ${unitNumber}`,
					min: currentUnit.min,
					max: currentUnit.max,
					// quantity は持たせず、1レコード 1ユニットとして扱う
				});
			}
			//格納処理
			await apiFetch({
				path: "/itmar/v1/resource-units",
				method: "POST",
				data: {
					resource_id: attributes.resourceId,
					units: newUnits,
				},
			});

			alert(__("Unit saved successfully.", "itmaroon-booking-block"));
		} catch (error) {
			console.error(error);
			alert(__("Failed to save unit.", "itmaroon-booking-block"));
		} finally {
			setUnitSaving(false); //保存処理の開始フラグを解除
		}
	};

	// --- ユニットの更新（保存） ---
	const handleUpdateUnit = async () => {
		if (!selectedUnitId) return;

		setUnitSaving(true);

		try {
			await apiFetch({
				path: `/itmar/v1/resource-units/${selectedUnitId}`,
				method: "PUT",
				data: {
					name: currentUnit.name,
					min: currentUnit.min,
					max: currentUnit.max,
				},
			});

			// ローカルの unitList も更新して、画面表示を最新にする
			setUnitList((prev) =>
				prev.map((u) =>
					u.id === currentUnit.id ? { ...u, ...currentUnit } : u,
				),
			);

			alert(__("Unit updated successfully.", "itmaroon-booking-block"));
		} catch (error) {
			console.error(error);
			alert(__("Failed to update unit.", "itmaroon-booking-block"));
		} finally {
			setUnitSaving(false);
		}
	};

	// --- ユニットの削除 ---
	const delUnitInfo = async () => {
		if (!selectedUnitId) {
			alert(
				__("Please select a saved unit to delete.", "itmaroon-booking-block"),
			);
			return;
		}

		if (
			!confirm(
				__(
					"Are you sure you want to delete this unit? This may affect existing slots.",
					"itmaroon-booking-block",
				),
			)
		) {
			return;
		}

		try {
			setUnitSaving(true); //削除処理の開始フラグ
			await apiFetch({
				path: `/itmar/v1/resource-units/${selectedUnitId}`,
				method: "DELETE",
			});
			setCurrentUnit({
				name: "",
				min: 1,
				max: 2,
			});
			alert(__("Unit Delete successfully.", "itmaroon-booking-block"));
		} catch (error: any) {
			const message =
				error.message ||
				__("An unknown error occurred.", "itmaroon-booking-block");

			alert(message);
			console.error(error);
		} finally {
			setUnitSaving(false); //削除処理の開始フラグを解除
		}
	};

	//トグルボタンのイベントドリブン
	const onToggleClosed = (dow: number): void => {
		const cur: number[] = Array.isArray(closedWeekdays) ? closedWeekdays : [];
		if (cur.includes(dow)) {
			setAttributes({ closedWeekdays: cur.filter((x) => x !== dow) });
		} else {
			setAttributes({ closedWeekdays: [...cur, dow].sort((a, b) => a - b) });
		}
	};

	// tableSourceの変化検知（必要ならもっと軽くしてOK）
	const tableSig = (arr: TableRow[] | undefined): string =>
		JSON.stringify(arr || []);

	// ★ コンポーネント外に置かず、Edit 内で useRef で保持
	const requestSeqRef = useRef<number>(0);

	//テーブルのIdentification ID
	const tableOptions =
		displayTables?.map((table) => ({
			label: table.attributes.defineID || "No ID", // 表示名（空の場合のフォールバック）
			value: table.attributes.defineID, // 保存される値
		})) || [];

	// unitList から SelectControl 用の options を作成
	const unitOptions = [
		{
			value: "",
			label: __("Select a unit to delete or edit", "itmaroon-booking-block"),
		},
		// unitListをコピーしてソートしてからmapに繋げます
		...[...unitList]
			.sort((a, b) => a.name.localeCompare(b.name, "ja")) // 日本語の昇順（あいうえお順）
			.map((unit) => ({
				value: unit.id?.toString() || "",
				label: `${unit.name} (${unit.min}-${unit.max}名)`,
			})),
	];

	// 予約情報表示のブロックを選択するためのオプション
	interface SelectOption {
		label: string;
		value: string;
	}
	const targetBlocks = [
		...(targetTitleBlock || []),
		...(targetInputBlock || []),
	];

	const titleBlockOptions = [
		{ label: __("Please Select...", "itmaroon-booking-block"), value: "" },
		...targetBlocks.reduce((acc, block) => {
			const { uniqueID, inputName } = block.attributes;

			// ラベルの決定（Title系ならresourceName、Input系ならinputName）
			const label = uniqueID || inputName;
			const valueId = uniqueID || inputName;

			// 識別子がない、または既に同じラベルが登録済みの場合はスキップ
			if (!valueId || !label || acc.some((option) => option.label === label)) {
				return acc;
			}

			// オプションを追加
			acc.push({
				label: label,
				value: JSON.stringify({
					type: block.name,
					id: valueId,
				}),
			});

			return acc;
		}, [] as SelectOption[]),
	];

	const modalBlockOptions = useMemo(
		() => [
			{ label: __("Please Select...", "itmaroon-booking-block"), value: "" },
			...targetGroupBlock.reduce((acc, block) => {
				const { formID } = block.attributes;

				// ラベルの決定（Title系ならresourceName、Input系ならinputName）
				const label = formID;
				const valueId = formID;

				// 識別子がない、または既に同じラベルが登録済みの場合はスキップ
				if (
					!valueId ||
					!label ||
					acc.some((option) => option.label === label)
				) {
					return acc;
				}

				// オプションを追加
				acc.push({
					label: label,
					value: valueId,
				});

				return acc;
			}, [] as SelectOption[]),
		],
		targetGroupBlock,
	);

	const confirmFormOptions = useMemo(() => {
		const modalInner = targetGroupBlock.find(
			(b: any) => b.attributes?.formID === confirmModal,
		)?.innerBlocks;

		const inputFigure = modalInner
			? flattenBlocks(modalInner).filter(
					(b: any) =>
						b.name === "itmar/input-figure-block" && b.attributes.form_name,
			  )
			: [];

		const confirmFormOptions = [
			{ label: __("Please Select...", "itmaroon-booking-block"), value: "" },
			...inputFigure.reduce((acc: SelectOption[], block: any) => {
				const { form_name } = block.attributes;
				if (!form_name || acc.some((option) => option.label === form_name)) {
					return acc;
				}
				acc.push({ label: form_name, value: form_name });
				return acc;
			}, []),
		];

		return confirmFormOptions;
	}, [targetGroupBlock, confirmModal]);

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={__("Setting Display Table", "itmaroon-booking-block")}
					initialOpen={true}
				>
					<SelectControl
						label={__("Calendar Identification", "itmaroon-booking-block")}
						value={calendarTableId}
						options={tableOptions}
						onChange={(val) => {
							setAttributes({ calendarTableId: val });
						}}
					/>

					<SelectControl
						label={__("TaimTable Identification", "itmaroon-booking-block")}
						value={timeTableId}
						options={tableOptions}
						onChange={(val) => {
							setAttributes({ timeTableId: val });
						}}
					/>

					<SelectControl
						label={__("Booking Identification", "itmaroon-booking-block")}
						value={bookingTableId}
						options={tableOptions}
						onChange={(val) => setAttributes({ bookingTableId: val })}
					/>
				</PanelBody>
				<PanelBody
					title={__("Slots Resource", "itmaroon-booking-block")}
					initialOpen={true}
				>
					<ArchiveSelectControl
						selectedSlug={selectedSlug}
						label={__("Select Post Type", "itmar-reservation")}
						homeUrl={itmar_option.home_url}
						onChange={(postTypeInfo) => {
							if (postTypeInfo) {
								setAttributes({
									selectedSlug: postTypeInfo.slug,
									selectedRest: postTypeInfo.rest_base,
								});
							}
						}}
					/>

					<PostSelectControl
						label={__("Resource Name", "itmaroon-booking-block")}
						homeUrl={itmar_option.home_url}
						restBase={selectedRest || ""}
						selectedSlug={resourceSlug || ""}
						onChange={(info) => {
							if (!info) return;
							setAttributes({
								resourceId: info.post_id,
								resourceSlug: info.slug,
								resourceRest: info.rest_base,
							});
						}}
					/>
					<PanelBody
						title={__("Unit Setting", "itmaroon-booking-block")}
						initialOpen={true}
					>
						<SelectControl
							label={__("Resource Units", "itmaroon-booking-block")}
							value={selectedUnitId}
							options={unitOptions}
							onChange={(value) => {
								// 1. 選択されたIDをステートに保存
								setSelectedUnitId(value);

								// 2. unitList から一致するオブジェクトを検索
								const unitId = Number(value);
								const selectedUnit = unitList.find(
									(u) => Number(u.id) === unitId,
								);
								if (selectedUnit) {
									// 3. 見つかったオブジェクトを currentUnit にセット
									// これで下の TextControl 類に現在の値が自動で入ります
									setCurrentUnit({
										name: selectedUnit.name,
										min: selectedUnit.min,
										max: selectedUnit.max,
									});
								} else {
									// 未選択（空）が選ばれた場合はリセット
									setCurrentUnit({ name: "", min: 1, max: 2 });
								}
							}}
							help={__(
								"Select a unit to remove or modify from the master list.If not selected, it will be added.",
								"itmaroon-booking-block",
							)}
						/>
						<TextControl
							label={__("Unit Name", "itmaroon-booking-block")}
							value={currentUnit.name}
							onChange={(val) => {
								setCurrentUnit({ ...currentUnit, name: val });
							}}
						/>

						<PanelRow className="distance_row">
							<TextControl
								label={__("Capacity (min)", "itmaroon-booking-block")}
								type="number"
								min={0}
								value={currentUnit.min.toString()}
								onChange={(v) =>
									setCurrentUnit({ ...currentUnit, min: Number(v) || 0 })
								}
							/>
							<TextControl
								label={__("Capacity (max)", "itmaroon-booking-block")}
								type="number"
								min={0}
								value={currentUnit.max.toString()}
								onChange={(v) =>
									setCurrentUnit({ ...currentUnit, max: Number(v) || 0 })
								}
							/>
						</PanelRow>
						{!selectedUnitId && (
							<PanelRow className="addNum_row">
								<Button
									variant="primary"
									onClick={addUnitInfo}
									disabled={unitSaving}
								>
									{unitSaving
										? __("Creating...", "itmaroon-booking-block")
										: __("Add Unit", "itmaroon-booking-block")}
								</Button>

								<TextControl
									label={__("Add Num", "itmaroon-booking-block")}
									type="number"
									value={addNum.toString()}
									onChange={(v) => setAddnum(Number(v) || 0)}
								/>
							</PanelRow>
						)}
						{selectedUnitId && (
							<PanelRow className="distance_row">
								<Button
									variant="secondary"
									onClick={handleUpdateUnit}
									disabled={unitSaving}
								>
									{unitSaving
										? __("Creating...", "itmaroon-booking-block")
										: __("Modify Unit", "itmaroon-booking-block")}
								</Button>
								<Button
									variant="secondary"
									onClick={delUnitInfo}
									disabled={unitSaving}
								>
									{unitSaving
										? __("Creating...", "itmaroon-booking-block")
										: __("Delete Unit", "itmaroon-booking-block")}
								</Button>
							</PanelRow>
						)}
					</PanelBody>
				</PanelBody>

				{/* 月設定 */}
				<PanelBody
					title={__("Monthly slots", "itmaroon-booking-block")}
					initialOpen={true}
				>
					<BaseControl
						label={__(
							"Selected month (from calendar)",
							"itmaroon-booking-block",
						)}
						help={__(
							"This value is synced from the inner calendar block (YYYY/MM).",
							"itmaroon-booking-block",
						)}
					>
						<div
							style={{
								padding: "8px 10px",
								border: "1px solid #ddd",
								borderRadius: "6px",
								background: "#f7f7f7",
								fontFamily: "monospace",
							}}
						>
							{calendarFromInner?.attributes?.selectedMonth || "-"}
						</div>
					</BaseControl>

					{/* Closed weekdays：太字をやめ、2列グリッド */}
					<div style={{ marginTop: "10px" }}>
						<div style={{ marginBottom: "6px" }}>
							{__("Closed weekdays", "itmaroon-booking-block")}
						</div>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "6px 12px",
							}}
						>
							{WEEKDAYS.map((d) => (
								<ToggleControl
									key={d.key}
									label={d.label}
									checked={(closedWeekdays || []).includes(d.key)}
									onChange={() => onToggleClosed(d.key)}
								/>
							))}
						</div>
					</div>
					<PanelBody
						title={__("Time Span Setting", "itmaroon-booking-block")}
						initialOpen={true}
					>
						<ToggleControl
							label="Is All Day"
							checked={isAllday}
							onChange={() => setIsAllday(!isAllday)}
						/>
						{!isAllday && (
							<>
								<SelectControl
									label={__("Time Spans", "itmaroon-booking-block")}
									value={""}
									options={[]}
									onChange={() => {}}
								/>

								<PanelRow className="distance_row">
									<TextControl
										label={__("Start Time", "itmaroon-booking-block")}
										type="time"
										value={currentSpan.startTime} // "09:00" 形式
										onChange={(val) =>
											setTimeSpan({ ...currentSpan, startTime: val })
										}
									/>
									<TextControl
										label={__("End Time", "itmaroon-booking-block")}
										type="time"
										value={currentSpan.endTime} // "09:00" 形式
										onChange={(val) =>
											setTimeSpan({ ...currentSpan, endTime: val })
										}
									/>
								</PanelRow>
								<TextControl
									label={__("Time travel(minutes)", "itmaroon-booking-block")}
									type="number"
									value={travel.toString()}
									onChange={(v) => setTravel(Number(v) || 0)}
								/>
							</>
						)}
					</PanelBody>
					<div style={{ marginTop: "10px" }}>
						<Button
							variant="primary"
							onClick={addMonthSlots}
							disabled={monthSaving}
						>
							{monthSaving
								? __("Creating...", "itmaroon-booking-block")
								: __("Add slots (this month)", "itmaroon-booking-block")}
						</Button>

						{monthNotice.message && (
							<div style={{ marginTop: "8px" }}>
								<Notice
									status={monthNotice.status}
									onRemove={() =>
										setMonthNotice({ status: undefined, message: "" })
									}
								>
									{monthNotice.message}
								</Notice>
							</div>
						)}
					</div>
					<div style={{ marginTop: "8px", fontSize: 12 }}>
						{__("Dates to be created:", "itmaroon-booking-block")}{" "}
						{datesToCreate.length}
					</div>
				</PanelBody>
				{/* 選択日（例外）編集 */}
				<PanelBody
					title={__("User setteing Display Disp", "itmaroon-booking-block")}
					initialOpen={true}
				>
					<PanelBody
						title={__("Setting Confirm Modal", "itmaroon-booking-block")}
						initialOpen={true}
					>
						<SelectControl
							label={__("Modal ID", "itmaroon-booking-block")}
							value={confirmModal}
							options={modalBlockOptions}
							onChange={(val) => {
								setAttributes({ confirmModal: val });
							}}
						/>
						<SelectControl
							label={__("Reserve Form", "itmaroon-booking-block")}
							value={reserveForm}
							options={confirmFormOptions}
							onChange={(val) => {
								setAttributes({ reserveForm: val });
							}}
						/>
						<SelectControl
							label={__("Cancel Modify Form", "itmaroon-booking-block")}
							value={cancelModForm}
							options={confirmFormOptions}
							onChange={(val) => {
								setAttributes({ cancelModForm: val });
							}}
						/>
					</PanelBody>
					<PanelBody
						title={__("Message Content", "itmaroon-booking-block")}
						initialOpen={false}
					>
						<TextControl
							label={__("Success Booking", "itmaroon-booking-block")}
							value={infoMessages.successBooking}
							onChange={(val: string) => {
								setAttributes({
									infoMessages: {
										...infoMessages,
										successBooking: val,
									},
								});
							}}
						/>
						<TextControl
							label={__("Success Cancel Booking", "itmaroon-booking-block")}
							value={infoMessages.cancelSuccess}
							onChange={(val: string) => {
								setAttributes({
									infoMessages: {
										...infoMessages,
										cancelSuccess: val,
									},
								});
							}}
						/>
						<TextControl
							label={__("Success Booking Change", "itmaroon-booking-block")}
							value={infoMessages.changeSuccess}
							onChange={(val: string) => {
								setAttributes({
									infoMessages: {
										...infoMessages,
										changeSuccess: val,
									},
								});
							}}
						/>
						<TextControl
							label={__("Booking No Change", "itmaroon-booking-block")}
							value={infoMessages.noChange}
							onChange={(val: string) => {
								setAttributes({
									infoMessages: {
										...infoMessages,
										noChange: val,
									},
								});
							}}
						/>
						<TextControl
							label={__("Login Error", "itmaroon-booking-block")}
							value={infoMessages.errorLogin}
							onChange={(val: string) => {
								setAttributes({
									infoMessages: {
										...infoMessages,
										errorLogin: val,
									},
								});
							}}
						/>
						<TextControl
							label={__("Day Slot Nothing", "itmaroon-booking-block")}
							value={infoMessages.errorNoSlot}
							onChange={(val: string) => {
								setAttributes({
									infoMessages: {
										...infoMessages,
										errorNoSlot: val,
									},
								});
							}}
						/>
						<TextControl
							label={__("Enough Slot Nothing", "itmaroon-booking-block")}
							value={infoMessages.errorNoUnit}
							onChange={(val: string) => {
								setAttributes({
									infoMessages: {
										...infoMessages,
										errorNoUnit: val,
									},
								});
							}}
						/>
						<TextControl
							label={__("The Day Full ", "itmaroon-booking-block")}
							value={infoMessages.errorFull}
							onChange={(val: string) => {
								setAttributes({
									infoMessages: {
										...infoMessages,
										errorFull: val,
									},
								});
							}}
						/>
						<TextControl
							label={__("Reserve Seet Full ", "itmaroon-booking-block")}
							value={infoMessages.seetFull}
							onChange={(val: string) => {
								setAttributes({
									infoMessages: {
										...infoMessages,
										seetFull: val,
									},
								});
							}}
						/>
						<TextControl
							label={__("Target Nothing", "itmaroon-booking-block")}
							value={infoMessages.errorNoTarget}
							onChange={(val: string) => {
								setAttributes({
									infoMessages: {
										...infoMessages,
										errorNoTarget: val,
									},
								});
							}}
						/>
						<TextControl
							label={__("Inside Error", "itmaroon-booking-block")}
							value={infoMessages.errorInside}
							onChange={(val: string) => {
								setAttributes({
									infoMessages: {
										...infoMessages,
										errorInside: val,
									},
								});
							}}
						/>
					</PanelBody>
					<PanelBody
						title={__("Setting Target Title", "itmaroon-booking-block")}
						initialOpen={false}
					>
						<SelectControl
							label={__("Resource Name", "itmaroon-booking-block")}
							value={dispUniqueIds.resourceName}
							options={titleBlockOptions}
							onChange={(val) => {
								setAttributes({
									dispUniqueIds: {
										...dispUniqueIds,
										resourceName: val,
									},
								});
							}}
						/>
						<SelectControl
							label={__("Guest Count", "itmaroon-booking-block")}
							value={dispUniqueIds.guestCount}
							options={titleBlockOptions}
							onChange={(val) => {
								setAttributes({
									dispUniqueIds: {
										...dispUniqueIds,
										guestCount: val,
									},
								});
							}}
						/>
						<SelectControl
							label={__("Reserve Date", "itmaroon-booking-block")}
							value={dispUniqueIds.reserveDate}
							options={titleBlockOptions}
							onChange={(val) => {
								setAttributes({
									dispUniqueIds: {
										...dispUniqueIds,
										reserveDate: val,
									},
								});
							}}
						/>
						<SelectControl
							label={__("Guest Count", "itmaroon-booking-block")}
							value={dispUniqueIds.reserveTime}
							options={titleBlockOptions}
							onChange={(val) => {
								setAttributes({
									dispUniqueIds: {
										...dispUniqueIds,
										reserveTime: val,
									},
								});
							}}
						/>
					</PanelBody>
				</PanelBody>
			</InspectorControls>

			<InspectorControls group="styles">
				<PanelBody
					title={__("Calendar settings", "itmaroon-booking-block")}
					initialOpen={true}
					className="check_design_ctrl"
				>
					<ToggleControl
						label={__("Show Holiday", "itmaroon-booking-block")}
						checked={isHoliday}
						onChange={(newValue: boolean) =>
							setAttributes({ isHoliday: newValue })
						}
					/>
					<RangeControl
						value={enoughBorder}
						label={__("Enough Border", "itmaroon-booking-block")}
						max={100}
						min={10}
						step={10}
						onChange={(val) => setAttributes({ enoughBorder: val })}
					/>
					<PanelColorGradientSettings
						title={__("Choose Enough Remaind Cell", "itmaroon-booking-block")}
						settings={[
							{
								colorValue: enoughBgColor,
								gradientValue: emptyGradient,

								label: __("Background color", "itmaroon-booking-block"),
								onColorChange: (newValue?: string) => {
									setAttributes({ enoughBgColor: newValue });
								},
								onGradientChange: (newValue?: string) => {
									setAttributes({ emptyGradient: newValue });
								},
							},
						]}
					/>
					<PanelColorGradientSettings
						title={__("Choose Low Remaind Cell", "itmaroon-booking-block")}
						settings={[
							{
								colorValue: lowBgColor,
								gradientValue: lowGradient,

								label: __("Background color", "itmaroon-booking-block"),
								onColorChange: (newValue?: string) =>
									setAttributes({ lowBgColor: newValue }),
								onGradientChange: (newValue?: string) =>
									setAttributes({ lowGradient: newValue }),
							},
						]}
					/>
					<PanelColorGradientSettings
						title={__("Choose Empty Cell", "itmaroon-booking-block")}
						settings={[
							{
								colorValue: emptyBgColor,
								gradientValue: emptyGradient,

								label: __("Background color", "itmaroon-booking-block"),
								onColorChange: (newValue?: string) =>
									setAttributes({ emptyBgColor: newValue }),
								onGradientChange: (newValue?: string) =>
									setAttributes({ emptyGradient: newValue }),
							},
						]}
					/>
					<PanelColorGradientSettings
						title={__("Choose Close Cell", "itmaroon-booking-block")}
						settings={[
							{
								colorValue: closeBgColor,
								gradientValue: closeGradient,

								label: __("Background color", "itmaroon-booking-block"),
								onColorChange: (newValue?: string) =>
									setAttributes({ closeBgColor: newValue }),
								onGradientChange: (newValue?: string) =>
									setAttributes({ closeGradient: newValue }),
							},
						]}
					/>
					<RadioControl
						label={__("Remaind Display type", "itmaroon-booking-block")}
						selected={remainDisp}
						options={[
							{
								label: __("Number Display", "itmaroon-booking-block"),
								value: "number",
							},
							{
								label: __("Sign", "itmaroon-booking-block"),
								value: "sign",
							},
						]}
						onChange={(changeOption) => {
							setAttributes({ remainDisp: changeOption });
						}}
						help={
							remainDisp === "number"
								? __(
										"The remaining number of available reservations will be displayed as a number.",
										"block-collections",
								  )
								: remainDisp === "sign"
								? __(
										"The remaining number of available reservations will be displayed as ○✕△.",
										"block-collections",
								  )
								: ""
						}
					/>
					<TextControl
						label={__("Rest Display", "itmaroon-booking-block")}
						value={restDisp}
						onChange={(val) => {
							setAttributes({ restDisp: val });
						}}
					/>
				</PanelBody>
			</InspectorControls>

			{isModalOpen && (
				<SlotEditModal
					resourceId={resourceId}
					selDate={selectedDateYmd || ""}
					rows={slotRows}
					onClose={() => setIsModalOpen(false)}
					onSaveSuccess={() => setLastUpdated(Date.now())} // 保存成功時に現在時刻をセット
				/>
			)}

			<div
				{...innerBlocksProps}
				ref={containerRef}
				onClickCapture={onTableClick}
			/>
		</>
	);
}
