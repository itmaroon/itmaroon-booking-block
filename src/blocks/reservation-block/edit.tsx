import { __, sprintf } from "@wordpress/i18n";
import { BlockEditProps, TemplateArray } from "@wordpress/blocks";
import { store as blockEditorStore } from "@wordpress/block-editor";
import type {
	BookingAttributes,
	SlotRow,
	DayObject,
	TableRow,
	TableSource,
	userBooking,
	SlotUsing,
} from "./types";
import {
	PanelBody,
	Notice,
	TextControl,
	ToggleControl,
	Button,
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
	toYmdFromMonthAndDay,
	flattenBlocks,
	displayFormated,
} from "itmar-block-packages";

import {
	buildCalendarTableSource,
	renderBookingCellHtml,
	buildBookingListTableSource,
	buildTimeTableSource,
	renderCancelButtonHtml,
	slotInfoCalendar,
} from "./createTableSource";

import { buildDateNote } from "./dateNote";

import "./editor.scss";

export default function Edit(props: BlockEditProps<BookingAttributes>) {
	const { attributes, setAttributes, clientId, isSelected } = props;
	const {
		resourceId,
		resourceSlug,
		resourceRest,
		selectedSlug,
		selectedRest,
		calendarTableId,
		bookingTableId,
		timeTableId,
		infoMessages,
		dispUniqueIds,
		confirmModal,
		reserveForm,
		cancelModForm,
		buttonIDs,
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
		selectedDatePlaceholder,
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
		[clientId, calendarTableId, timeTableId, bookingTableId],
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

	// =====状態変数 =====
	const [isInitialized, setIsInitialized] = useState(false); // 初期化完了フラグ

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

	//選んだ日の曜日と祝日名（祝日でなければ曜日だけ）を、「Weekday and Holiday」に設定されたタイトルへ映す。
	//日付が選ばれていない間は空にする。祝日名は、カレンダーブロックの日付データ（dateValues）から取る。
	useEffect(() => {
		if (!dispUniqueIds?.selectedDateNote) return;
		let targetId = "";
		try {
			targetId = JSON.parse(dispUniqueIds.selectedDateNote).id;
		} catch {
			return;
		}
		const titleBlock = (targetTitleBlock ?? []).find(
			(b: any) => b.attributes?.uniqueID === targetId,
		);
		if (!titleBlock) return;

		const day = Number(calendarFromInner?.attributes?.selectedValue);
		const holiday = (
			(calendarFromInner?.attributes?.dateValues ?? []) as {
				date: number;
				holiday?: string;
			}[]
		).find((item) => Number(item.date) === day)?.holiday;
		const content =
			day > 0 && selectedDateYmd ? buildDateNote(selectedDateYmd, holiday) : "";

		if ((titleBlock.attributes.headingContent ?? "") !== content) {
			updateBlockAttributes(titleBlock.clientId, { headingContent: content });
		}
	}, [
		selectedDateYmd,
		calendarFromInner?.attributes?.selectedValue,
		calendarFromInner?.attributes?.dateValues,
		dispUniqueIds?.selectedDateNote,
		targetTitleBlock,
	]);

	//リソース名（投稿のタイトル）を取得する。エディターのプレビューで、タイトルへ映すために使う。
	const [resourceName, setResourceName] = useState<string>("");
	useEffect(() => {
		const restBase = resourceRest || selectedRest;
		if (!resourceId || !restBase) {
			setResourceName("");
			return;
		}
		let alive = true;
		apiFetch<{ title?: { rendered?: string } }>({
			path: `/wp/v2/${restBase}/${resourceId}`,
		})
			.then((post) => {
				if (!alive) return;
				//タイトルの HTML エンティティ（&amp; など）を文字に戻す
				const box = document.createElement("textarea");
				box.innerHTML = post?.title?.rendered ?? "";
				setResourceName(box.value);
			})
			.catch(() => {
				if (alive) setResourceName("");
			});
		return () => {
			alive = false;
		};
	}, [resourceId, resourceRest, selectedRest]);

	//リソース名を、「Resource Title」に設定されたタイトルへ映す（フロントと同じ動きをエディターでも確認できる）
	useEffect(() => {
		if (!dispUniqueIds?.resourceTitle) return;
		let targetId = "";
		try {
			targetId = JSON.parse(dispUniqueIds.resourceTitle).id;
		} catch {
			return;
		}
		const titleBlock = (targetTitleBlock ?? []).find(
			(b: any) => b.attributes?.uniqueID === targetId,
		);
		if (!titleBlock) return;
		if ((titleBlock.attributes.headingContent ?? "") !== resourceName) {
			updateBlockAttributes(titleBlock.clientId, { headingContent: resourceName });
		}
	}, [dispUniqueIds?.resourceTitle, resourceName, targetTitleBlock]);

	//選択した日付を、「Selected Date」に設定されたタイトルへ映す（フロントと同じ動きをエディターでも確認できる）。
	//日付が選ばれていない間（読み込み直後や月の切り替え後）は中身を空にする。
	useEffect(() => {
		if (!dispUniqueIds?.selectedDate) return;
		let targetId = "";
		try {
			targetId = JSON.parse(dispUniqueIds.selectedDate).id;
		} catch {
			return;
		}
		const titleBlock = (targetTitleBlock ?? []).find(
			(b: any) => b.attributes?.uniqueID === targetId,
		);
		if (!titleBlock) return;

		const hasDay = Number(calendarFromInner?.attributes?.selectedValue) > 0;
		const ymd = hasDay && selectedDateYmd ? selectedDateYmd : "";
		//日付が選ばれていない間は、設定された文言（なければ空）を出す
		const { titleType, userFormat, freeStrFormat, decimal } =
			titleBlock.attributes;
		const content = !ymd
			? selectedDatePlaceholder ?? ""
			: titleType === "date"
			? `${ymd}T00:00:00`
			: String(displayFormated(ymd, userFormat, freeStrFormat, decimal));

		if ((titleBlock.attributes.headingContent ?? "") !== content) {
			updateBlockAttributes(titleBlock.clientId, { headingContent: content });
		}
	}, [
		selectedDateYmd,
		calendarFromInner?.attributes?.selectedValue,
		dispUniqueIds?.selectedDate,
		selectedDatePlaceholder,
		targetTitleBlock,
	]);

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
		// 終日予約など、時間テーブルを使用しない構成では何もしない
		if (!timeFromInner) return;

		const selDay = calendarFromInner?.attributes?.selectedValue;

		//時間別集計未了の場合はテーブルをクリア
		if (
			!dailyStatsMap[selDay] ||
			Object.keys(dailyStatsMap).length === 0 ||
			selDay === 0
		) {
			updateBlockAttributes(timeFromInner.clientId, {
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

		updateBlockAttributes(timeFromInner.clientId, {
			tableLayout: "fixed",
			tableSource: timetableSource,
		});
	}, [
		isInitialized,
		timeFromInner?.clientId,
		dailyStatsMap,
		calendarFromInner?.attributes?.selectedValue,
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

	//予約済みテーブルの列見出しを、時間テーブルの有無に合わせて補完する
	useEffect(() => {
		if (!reservatedInner) return;

		const expectedHeadings = timeFromInner
			? ["日付", "時間", "人数", "操作"]
			: ["日付", "人数", "操作"];
		const currentHeadings = (reservatedInner.attributes?.tableHeading ??
			[]) as string[];

		if (
			reservatedInner.attributes?.is_heading !== true ||
			tableSig(currentHeadings) !== tableSig(expectedHeadings)
		) {
			updateBlockAttributes(reservatedInner.clientId, {
				is_heading: true,
				tableHeading: expectedHeadings,
			});
		}
	}, [
		reservatedInner?.clientId,
		reservatedInner?.attributes?.is_heading,
		reservatedInner?.attributes?.tableHeading,
		timeFromInner?.clientId,
	]);

	//予約済みテーブルのデザイン用に、サンプルの3行を入れる。データベースは読まない。
	//実際の予約は、管理画面「予約管理」の予約一覧で確認・削除する。
	useEffect(() => {
		if (!reservatedInner) return;

		//サンプルの日付は、カレンダーで選んでいる月に合わせる
		const selectedMonth = calendarFromInner?.attributes?.selectedMonth as
			| string
			| undefined;
		const now = new Date();
		const month = selectedMonth
			? selectedMonth.replace("/", "-")
			: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

		//時間テーブルを使うときは時間つき、使わないとき（終日予約）は時間なしにする
		const spanOf = (start: string, end: string) =>
			timeFromInner
				? { reserve_time: start, end_time: end }
				: { reserve_time: "00:00:00", end_time: "23:59:59" };

		const sampleBookings: userBooking[] = [
			{
				booking_id: 1,
				guest_count: 2,
				slot_ids: "1",
				booking_status: "confirmed",
				reserve_date: `${month}-10`,
				...spanOf("18:00:00", "19:00:00"),
			},
			{
				booking_id: 2,
				guest_count: 4,
				slot_ids: "2",
				booking_status: "confirmed",
				reserve_date: `${month}-17`,
				...spanOf("19:00:00", "20:00:00"),
			},
			{
				booking_id: 3,
				guest_count: 3,
				slot_ids: "3",
				booking_status: "cancelled",
				reserve_date: `${month}-24`,
				...spanOf("20:00:00", "21:00:00"),
			},
		];

		const reservation_data = buildBookingListTableSource(
			sampleBookings,
			{ renderActions: renderCancelButtonHtml },
			false,
		);

		// ★ 変化があるときだけ tableSource 更新（無限更新防止）
		const prev = (reservatedInner.attributes?.tableSource ?? []) as TableSource;
		if (tableSig(prev) !== tableSig(reservation_data)) {
			updateBlockAttributes(reservatedInner.clientId, {
				tableLayout: "fixed",
				tableSource: reservation_data,
			});
		}
	}, [
		reservatedInner?.clientId,
		reservatedInner?.attributes?.tableHeading,
		calendarFromInner?.attributes?.selectedMonth,
		timeFromInner?.clientId,
	]);

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

	// tableSourceの変化検知（必要ならもっと軽くしてOK）
	const tableSig = (arr: TableRow[] | undefined): string =>
		JSON.stringify(arr || []);

	// ★ コンポーネント外に置かず、Edit 内で useRef で保持
	const requestSeqRef = useRef<number>(0);

	//テーブルのIdentification ID
	const tableOptions = [
		{
			label: __("Not used", "itmaroon-booking-block"),
			value: "",
		},
		...(displayTables
			?.filter((table) => Boolean(table.attributes.defineID))
			.map((table) => ({
				label: table.attributes.defineID,
				value: table.attributes.defineID,
			})) || []),
	];
	const availableTableIds = new Set(
		tableOptions.map((option) => option.value).filter(Boolean),
	);
	const selectedTableId = (value: string): string =>
		availableTableIds.has(value) ? value : "";

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

	const { confirmFormOptions, buttonOptions } = useMemo(() => {
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

		const buttonOptions = [
			{ label: __("Please Select...", "itmaroon-booking-block"), value: "" },
			...inputFigure.reduce((acc: SelectOption[], block: any) => {
				const buttonBlocks = flattenBlocks(block.innerBlocks || []).filter(
					(innerBlock: any) =>
						innerBlock.name === "itmar/design-button" &&
						innerBlock.attributes?.buttonKey,
				);

				buttonBlocks.forEach((buttonBlock: any) => {
					const { buttonKey } = buttonBlock.attributes;

					if (!buttonKey || acc.some((option) => option.value === buttonKey)) {
						return;
					}

					acc.push({
						label: buttonKey,
						value: buttonKey,
					});
				});

				return acc;
			}, []),
		];

		return { confirmFormOptions, buttonOptions };
	}, [targetGroupBlock, confirmModal]);

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={__("Slots and bookings", "itmaroon-booking-block")}
					initialOpen={true}
				>
					<p>
						{__(
							"Slots, units and bookings are not edited in the block editor. Manage them in the Reservation Management menu of the admin screen.",
							"itmaroon-booking-block",
						)}
					</p>
					<Button
						variant="secondary"
						href="admin.php?page=itmar-booking"
						target="_blank"
					>
						{__("Open Reservation Management", "itmaroon-booking-block")}
					</Button>
				</PanelBody>
				<PanelBody
					title={__("Setting Display Table", "itmaroon-booking-block")}
					initialOpen={true}
				>
					<SelectControl
						label={__("Calendar Identification", "itmaroon-booking-block")}
						value={selectedTableId(calendarTableId)}
						options={tableOptions}
						onChange={(val) => {
							setAttributes({ calendarTableId: val });
						}}
					/>

					<SelectControl
						label={__("Time Table Identification", "itmaroon-booking-block")}
						value={selectedTableId(timeTableId)}
						options={tableOptions}
						onChange={(val) => {
							setAttributes({ timeTableId: val });
						}}
					/>

					<SelectControl
						label={__("Booking Identification", "itmaroon-booking-block")}
						value={selectedTableId(bookingTableId)}
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
				</PanelBody>

				{/* 選択日（例外）編集 */}
				<PanelBody
					title={__("User setteing Display Disp", "itmaroon-booking-block")}
					initialOpen={true}
				>
					<PanelBody
						title={__("Setting Confirm Modal", "itmaroon-booking-block")}
						initialOpen={false}
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
						<SelectControl
							label={__("Reseve Button", "itmaroon-booking-block")}
							value={buttonIDs.reserve}
							options={buttonOptions}
							onChange={(val) => {
								setAttributes({ buttonIDs: { ...buttonIDs, reserve: val } });
							}}
						/>
						<SelectControl
							label={__("Modify Button", "itmaroon-booking-block")}
							value={buttonIDs.modify}
							options={buttonOptions}
							onChange={(val) => {
								setAttributes({ buttonIDs: { ...buttonIDs, modify: val } });
							}}
						/>
						<SelectControl
							label={__("Cancel Button", "itmaroon-booking-block")}
							value={buttonIDs.cancel}
							options={buttonOptions}
							onChange={(val) => {
								setAttributes({ buttonIDs: { ...buttonIDs, cancel: val } });
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
							label={__("Resource Title (outside the dialog)", "itmaroon-booking-block")}
							value={dispUniqueIds.resourceTitle}
							options={titleBlockOptions}
							onChange={(val) => {
								setAttributes({
									dispUniqueIds: {
										...dispUniqueIds,
										resourceTitle: val,
									},
								});
							}}
							help={__(
								"Shows the name of the selected resource in this title, outside the reservation dialog, so that visitors can tell what they are booking.",
								"itmaroon-booking-block",
							)}
						/>
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
							label={__("Reserve Time", "itmaroon-booking-block")}
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
						<SelectControl
							label={__("Selected Date (calendar)", "itmaroon-booking-block")}
							value={dispUniqueIds.selectedDate}
							options={titleBlockOptions}
							onChange={(val) => {
								setAttributes({
									dispUniqueIds: {
										...dispUniqueIds,
										selectedDate: val,
									},
								});
							}}
							help={__(
								"Shows the date chosen in the calendar in this title, outside the reservation dialog.",
								"itmaroon-booking-block",
							)}
						/>
						<SelectControl
							label={__("Weekday and Holiday (selected date)", "itmaroon-booking-block")}
							value={dispUniqueIds.selectedDateNote}
							options={titleBlockOptions}
							onChange={(val) => {
								setAttributes({
									dispUniqueIds: {
										...dispUniqueIds,
										selectedDateNote: val,
									},
								});
							}}
							help={__(
								"Shows the weekday of the date chosen in the calendar, followed by the holiday name if it is a holiday. Hidden until a date is chosen.",
								"itmaroon-booking-block",
							)}
						/>
						<TextControl
							label={__("Text before a date is selected", "itmaroon-booking-block")}
							value={selectedDatePlaceholder ?? ""}
							onChange={(val: string) =>
								setAttributes({ selectedDatePlaceholder: val || undefined })
							}
							help={__(
								"Shown in the Selected Date title until a date is chosen in the calendar. A date-format title cannot be typed into directly, so set the text here.",
								"itmaroon-booking-block",
							)}
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

			<div
				{...innerBlocksProps}
				style={{
					...innerBlocksProps.style,
					//日付の色は、design-calender の休日・土曜の色に合わせる
					...(calendarFromInner?.attributes?.holidayColor && {
						"--itmar-cal-holiday": calendarFromInner.attributes.holidayColor,
					}),
					...(calendarFromInner?.attributes?.staturdayColor && {
						"--itmar-cal-saturday": calendarFromInner.attributes.staturdayColor,
					}),
				}}
			/>
		</>
	);
}
