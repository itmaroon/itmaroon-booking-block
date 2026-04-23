import { __ } from "@wordpress/i18n";
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
} from "@wordpress/components";
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
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
	renderCancelButtonHtml,
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
	const { attributes, setAttributes, clientId } = props;
	const {
		resourceId,
		resourceSlug,
		selectedSlug,
		selectedRest,
		calendarTableId,
		bookingTableId,
		capacityDefault,
		closedWeekdays,
		confirmThings,
	} = attributes;

	// dispatch関数を取得
	const { updateBlockAttributes } = useDispatch(blockEditorStore.name) as any;
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

			const reservatedTable = allBlocks.find(
				(b: any) =>
					b.name === "itmar/design-table" &&
					b.attributes?.defineID === bookingTableId,
			);

			const displayTables = allBlocks.filter(
				(b: any) => b.name === "itmar/design-table",
			);

			return {
				innerBlocksData: {
					calendarFromInner: calendarBlock || null,
					tableFromInner: calendarTable || null,
					reservatedInner: reservatedTable || null,
					displayTables: displayTables || null,
				},
			};
		},
		[clientId, calendarTableId, bookingTableId],
	);

	// 使うときは分割代入で
	const { calendarFromInner, tableFromInner, reservatedInner, displayTables } =
		innerBlocksData;

	const selectedDateYmd = useMemo<string | null>(() => {
		return toYmdFromMonthAndDay(
			calendarFromInner?.attributes?.selectedMonth,
			calendarFromInner?.attributes?.selectedValue,
		);
	}, [
		calendarFromInner?.attributes?.selectedMonth,
		calendarFromInner?.attributes?.selectedValue,
	]);

	// 週休日のセット
	const closedSet = useMemo<Set<number>>(
		() => new Set<number>(closedWeekdays ?? []),
		[closedWeekdays],
	);

	// ===== 日別編集UIの状態 =====
	const [dayLoading, setDayLoading] = useState<boolean>(false);
	const [dayError, setDayError] = useState<string>("");
	const [daySlotId, setDaySlotId] = useState<number>(0);
	const [dayCapacity, setDayCapacity] = useState<number>(0);
	const [dayStatus, setDayStatus] = useState<SlotRow["status"]>("open");
	const [slotRows, setSlotRows] = useState<SlotDetail[]>([]);
	const [daySaving, setDaySaving] = useState<boolean>(false);
	const [dayNotice, setDayNotice] = useState<{
		status: "error" | "success" | "warning" | "info" | undefined;
		message: string;
	}>({ status: undefined, message: "" });

	const [monthSaving, setMonthSaving] = useState<boolean>(false);
	const [monthNotice, setMonthNotice] = useState<{
		status: "error" | "success" | "warning" | "info" | undefined;
		message: string;
	}>({ status: undefined, message: "" });
	const [unitSaving, setUnitSaving] = useState<boolean>(false);
	const [addNum, setAddnum] = useState<number>(1);
	const [unitNotice, setUnitNotice] = useState<{
		status: "error" | "success" | "warning" | "info" | undefined;
		message: string;
	}>({ status: undefined, message: "" });
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
	const [spanList, setSpanList] = useState<TypeSpan[]>([]); // 保存済みユニットのリスト
	const [travel, setTravel] = useState<number>(60);

	//スロット編集Modal表示フラグ
	const [isModalOpen, setIsModalOpen] = useState(false);

	// 選択日 or resourceId が変わったら、その日の slot を DB から取得
	useEffect(() => {
		const fetchDaySlot = async (): Promise<void> => {
			setDayError("");
			setDayNotice({ status: undefined, message: "" });
			setDaySlotId(0);

			// 条件が揃わないならフォーム初期化だけ
			if (!resourceId || !selectedDateYmd) {
				setDayCapacity(Number(capacityDefault || 0));
				setDayStatus("open");
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
				setDayError(
					error?.message ??
						__("Failed to load selected day slot.", "itmaroon-booking-block"),
				);
			} finally {
				setDayLoading(false);
			}
		};

		fetchDaySlot();
	}, [resourceId, selectedDateYmd, monthNotice]);

	const saveSelectedDay = async (): Promise<void> => {
		setDayNotice({ status: undefined, message: "" });
		setDayError("");

		if (!resourceId) {
			setDayNotice({
				status: "error",
				message: __("Resource is not selected.", "itmaroon-booking-block"),
			});
			return;
		}
		if (!selectedDateYmd) {
			setDayNotice({
				status: "error",
				message: __("No date selected on calendar.", "itmaroon-booking-block"),
			});
			return;
		}

		setDaySaving(true);
		try {
			const payload: Omit<SlotRow, "id"> & { id: number } = {
				id: daySlotId ? Number(daySlotId) : 0,
				resource_id: Number(resourceId),
				slot_date: selectedDateYmd,
				capacity_total: Number(dayCapacity || 0),
				status: dayStatus,
			};
			const saved = await apiFetch<SlotRow>({
				path: "/itmar/v1/slots",
				method: "POST",
				data: payload,
			});

			setDaySlotId(Number(saved.id));
			setDayCapacity(Number(saved.capacity_total));
			setDayStatus(saved.status || "open");

			setDayNotice({
				status: "success",
				message: __("Saved.", "itmaroon-booking-block"),
			});
		} catch (e) {
			const error = e as { message?: string };
			setDayNotice({
				status: "error",
				message: error?.message ?? __("Save failed.", "itmaroon-booking-block"),
			});
		} finally {
			setDaySaving(false);
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
	//枠を作る日付を生成
	const pad2 = (n: number) => String(n).padStart(2, "0");

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

	//枠のデータをカスタムテーブルから取得
	// dateValuesの変化を検知するための軽い署名（必要な要素だけ）
	const dateValuesSig = (arr: DayObject[] | undefined): string =>
		JSON.stringify(
			(arr || []).map((d: DayObject) => [d.date, d.weekday, d.holiday || ""]),
		);

	// tableSourceの変化検知（必要ならもっと軽くしてOK）
	const tableSig = (arr: TableRow[] | undefined): string =>
		JSON.stringify(arr || []);

	// ★ コンポーネント外に置かず、Edit 内で useRef で保持
	const requestSeqRef = useRef<number>(0);

	useEffect(() => {
		//日単位更新フラグも、月単位更新フラグもオン状態なら処理しない。
		if (daySaving && monthSaving) return;

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

			const path =
				`/itmar/v1/slots?resource_id=${encodeURIComponent(resourceId)}` +
				`&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

			const data = await apiFetch<SlotRow[]>({ path });

			// 途中で月が切り替わっていたら破棄
			if (mySeq !== requestSeqRef.current) return;

			interface DaySlot {
				id: number;
				status: SlotRow["status"];
				capacity: number;
			}

			const mapByDay = new Map<number, DaySlot>();
			(data ?? []).forEach((row: SlotRow) => {
				const ymd = normalizeDateYYYYMMDD(row.slot_date);
				if (!ymd.startsWith(`${ym}-`)) return;
				const day = Number(ymd.slice(8, 10));
				mapByDay.set(day, {
					id: Number(row.id),
					status: row.status ?? "open",
					capacity: Number(row.capacity_total),
				});
			});

			const newDateValues = dateValues.map((dv) => {
				const day = Number(dv.date);
				const hit = mapByDay.get(day);
				return hit
					? {
							...dv,
							slotId: hit.id,
							slotStatus: hit.status,
							slotCapacity: hit.capacity,
					  }
					: { ...dv, slotId: 0, slotStatus: null, slotCapacity: null };
			});

			const booking_data = buildCalendarTableSource(
				calendarFromInner?.attributes?.selectedMonth as string,
				newDateValues,
				{
					isMonday: false,
					renderCell: renderBookingCellHtml,
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
		calendarFromInner?.clientId,
		resourceId,
		daySaving,
		monthSaving,
		//calendarFromInner?.attributes?.selectedMonth,
		useMemo(
			() => dateValuesSig(calendarFromInner?.attributes?.dateValues),
			[calendarFromInner?.attributes?.dateValues],
		),
		tableFromInner?.clientId,
		reservatedInner?.clientId,
	]);

	//予約済みデータの表示
	useEffect(() => {
		//予約済みデータの取得
		const runReservationDataGet = async (): Promise<void> => {
			if (!reservatedInner) return;
			if (!resourceId) return;

			const path = "/itmar/v1/get_user_bookings";
			const bookings = await apiFetch<userBooking[]>({ path });

			// 予約一覧用の Source を作成
			const reservation_data = buildBookingListTableSource(bookings, {
				renderActions: renderCancelButtonHtml,
			});

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

		// エラーは握りつぶさずログ（必要なら Notice 表示に変更）
		runReservationDataGet().catch((e: unknown) =>
			console.error("get reservation -> get reservation data failed:", e),
		);
	}, [resourceId, reservatedInner?.clientId]);

	//予定表上のテーブルをクリックしたときの処理
	useEffect(() => {
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
		if (!row || !col) return;

		// 通し番号（セル番号）を計算
		const cellIndex = (row - 1) * 7 + col;

		// 日付の計算
		// (セル番号 - 第1週の空白数) + 1
		const day = cellIndex - firstDayOfMonth + 1;

		// 4. 有効な日付範囲内かチェック
		if (day >= 1 && day <= lastDay) {
			//カレンダーコントロールの属性を変更
			updateBlockAttributes(calendarFromInner?.clientId, {
				selectedValue: day,
			});
			//スロット編集用モーダルの表示
			setIsModalOpen(true);
		}
	}, [
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
				newUnits.push({
					name: `${currentUnit.name} ${newUnits.length + 1}`,
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
			label: __("Select a unit to delete", "itmaroon-booking-block"),
		},
		...unitList.map((unit) => ({
			value: unit.id?.toString() || "", // IDを文字列にする必要があります
			label: `${unit.name} (${unit.min}-${unit.max}名)`,
		})),
	];

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

				{isModalOpen && (
					<SlotEditModal
						rows={slotRows}
						onClose={() => setIsModalOpen(false)}
					/>
				)}
			</InspectorControls>

			<div {...innerBlocksProps} />
		</>
	);
}
