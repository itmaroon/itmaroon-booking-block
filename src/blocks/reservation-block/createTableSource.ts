import {
	generateGridAreas,
	getMonthRangeYmd,
	normalizeDateYYYYMMDD,
} from "itmar-block-packages";
import {
	TableSource,
	TableCell,
	DayObject,
	BuildCalendarOptions,
	userBooking,
	SlotUsing,
	SlotRow,
} from "./types";

// -------------------------
// tableSource -> DOM(tbody) 再描画
// -------------------------
export const renderTableFromTableSource = (
	tableRoot: HTMLElement | null,
	tableSource: TableSource,
): void => {
	if (!tableRoot || !Array.isArray(tableSource)) return;

	const table = tableRoot.querySelector("table");

	if (!table) return;

	table.style.width = "100%";
	table.style.tableLayout = "fixed";

	// tbodyは毎回作り直す（残骸対策）
	table.querySelectorAll("tbody").forEach((tb) => tb.remove());
	const tbody = document.createElement("tbody");
	table.appendChild(tbody);

	const frag = document.createDocumentFragment();

	for (const row of tableSource) {
		if (!row || !Array.isArray(row.cells)) continue;

		const tr = document.createElement("tr");

		for (const cell of row.cells) {
			const tag = cell?.tag === "th" ? "th" : "td";
			const el = document.createElement(tag);

			const span = document.createElement("span");
			const content = cell?.content;
			//属性を記録する
			if (cell.attributes) {
				Object.entries(cell.attributes).forEach(([key, value]) => {
					// 値が存在する場合のみセット（null や undefined を避ける）
					if (value !== undefined && value !== null) {
						el.setAttribute(key, String(value));
					}
				});
			}
			//追加のスタイルを追加
			if (cell.style) {
				Object.entries(cell.style).forEach(([key, value]) => {
					if (value !== undefined && value !== null) {
						// el.style["backgroundColor"] = "red" のような形で直接セット
						// CSSのプロパティ名（kebab-case）でも、JSのプロパティ名（camelCase）でも動作します
						(el.style as any)[key] = String(value);
					}
				});
			}

			if (content == null) {
				// noop
			} else if (content instanceof Node) {
				span.appendChild(content);
			} else if (typeof content === "string") {
				// ✅ 今回は常にHTML文字列前提でOK
				span.innerHTML = content;
			} else {
				span.textContent = String(content);
			}

			el.appendChild(span);
			tr.appendChild(el);
		}

		frag.appendChild(tr);
	}

	tbody.appendChild(frag);
};

/**
 * calendar: [{date:number, weekday:number, holiday?:string, slotStatus?, slotCapacity?, slotId?}, ...]
 * renderCell: (dayObj, dayNum) => string|Node|any  // editorならReactNode、viewならHTML文字列
 */

export const slotInfoCalendar = (
	slots: SlotRow[],
	ym: string,
	dateValues: DayObject[],
) => {
	// 日付ごとに「時間帯別の集計」を一時保持する場所
	// { [day]: { [time]: { avail: number, total: number } } }
	const tempDailyStats: Record<
		number,
		Record<string, { avail: number; total: number }>
	> = {};

	(slots ?? []).forEach((row: SlotRow) => {
		const ymd = normalizeDateYYYYMMDD(row.slot_date);
		if (!ymd.startsWith(`${ym}-`)) return;

		const day = Number(ymd.slice(8, 10));
		const time = `${row.start_time}～${row.end_time}`; // "09:00～10:00" など

		if (!tempDailyStats[day]) tempDailyStats[day] = {};
		if (!tempDailyStats[day][time])
			tempDailyStats[day][time] = { avail: 0, total: 0 };

		// その時間帯の合計を算出
		if (row.status === "open") {
			tempDailyStats[day][time].total += Number(row.capacity.max);
			if (!row.is_booked) {
				tempDailyStats[day][time].avail += Number(row.capacity.max);
			}
		}
	});

	// 2段階目：カレンダー表示用の判定ロジック
	// dateValues（カレンダーの枠組み）に対してマッピング
	const newDateValues = dateValues.map((dv) => {
		const day = Number(dv.date);
		const timeSlots = tempDailyStats[day]; // その日の時間枠リスト

		// A. データそのものがない場合 -> Closed（休業）
		if (!timeSlots || Object.keys(timeSlots).length === 0) {
			return {
				...dv,
				slotStatus: "closed",
				slotCapacity: 0,
				capacityNum: 0,
			};
		}
		const timeKeys = Object.keys(timeSlots);

		// B. 単一の時間枠のみ存在する場合 -> 数字を表示
		if (timeKeys.length === 1) {
			const stats = timeSlots[timeKeys[0]];
			return {
				...dv,
				slotStatus: "open", // 状態を表示
				slotCapacity: stats.avail,
				capacityNum: stats.total,
			};
		}
		// C. 複数の時間枠がある場合 -> カレンダー上は数字を表示しない（空文字や特定の記号）
		return {
			...dv,
			slotStatus: "mixed", // 内部的な判定用
			slotCapacity: null, // renderBookingCellHtml で null なら非表示にする
			capacityNum: null,
		};
	});

	return { dataVal: newDateValues, dailyStats: tempDailyStats };
};
export const buildCalendarTableSource = (
	selectedMonth: string,
	calendar: DayObject[],
	{
		isMonday = false,
		headerFormatter = (w) => w.charAt(0).toUpperCase() + w.slice(1),
		renderCell,
		renderStyle,
	}: BuildCalendarOptions,
): TableSource => {
	if (!selectedMonth || !Array.isArray(calendar) || calendar.length === 0)
		return [];
	//selectedMonthから年、月、最終日を取り出す
	const { year, month, lastDay } = getMonthRangeYmd(selectedMonth);
	if (!year || !month || !lastDay) return [];
	//その年月の初日の曜日を割り出す
	const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0..6
	//カレンダーのグリッドを作る
	const areasStr = generateGridAreas(firstDayOfMonth, lastDay, isMonday);
	const lines = areasStr
		.split("\n")
		.map((l) => l.replace(/"/g, "").trim())
		.filter(Boolean);

	//最初の行は予備の行にする
	const headerTokens = (lines[0] || "").split(/\s+/);
	let weekLines = lines.slice(1);

	// 末尾の不要週（dayN が1つも無い行）を削除
	let lastUseful = -1;
	for (let i = 0; i < weekLines.length; i++) {
		if (/\bday\d+\b/.test(weekLines[i])) lastUseful = i;
	}
	weekLines = lastUseful >= 0 ? weekLines.slice(0, lastUseful + 1) : [];

	const dayMap = new Map(calendar.map((d) => [Number(d.date), d]));

	const tableSource = [];

	// header row(曜日の表示)
	tableSource.push({
		cells: headerTokens.map(
			(w): TableCell => ({
				tag: "th" as const,
				content: headerFormatter(w), //最初の文字を大文字にするフォーマット
			}),
		),
	});

	// body rows
	for (const line of weekLines) {
		const tokens = line.split(/\s+/);

		tableSource.push({
			cells: tokens.map((token): TableCell => {
				const m = token.match(/^day(\d+)$/);
				if (!m) return { tag: "td" as const, content: "" };

				const dayNum = Number(m[1]);
				const foundDay = dayMap.get(dayNum);
				const dayObj: DayObject = foundDay
					? foundDay
					: {
							date: dayNum,
							weekday: "", // DayObjectで必須なら空文字等で初期化
					  };
				//その日の空き具合による背景色の設定
				const cellBackground =
					dayObj.slotStatus === "closed"
						? renderStyle.close_bg
						: dayObj.slotCapacity === 0
						? renderStyle.empty_bg
						: Number(dayObj.slotCapacity) / Number(dayObj.capacityNum) <
						  renderStyle.enoughBorder / 100
						? renderStyle.low_bg
						: renderStyle.enough_bg;
				//カーソルの設定
				const cursorDisp =
					dayObj.slotStatus === "closed" ? "default" : "pointer";

				return {
					tag: "td" as const, // string ではなく "td" 型として明示
					content: renderCell(dayObj, dayNum, renderStyle),
					style: { background: cellBackground, cursor: cursorDisp },
					// ✅ ここに data 属性用のオブジェクトを追加
					attributes: {
						"data-date": dayObj.date,
						"data-slotStatus": dayObj.slotStatus || "",
					},
				};
			}),
		});
	}

	return tableSource;
};

export const buildTimeTableSource = (
	dailyStats: SlotUsing,
	renderStyle: any,
): TableSource => {
	const tableSource: TableSource = [];

	// 時間（Key）を昇順に並べてループを回す
	const sortedTimes = Object.keys(dailyStats).sort();

	sortedTimes.forEach((time) => {
		const stats = dailyStats[time];

		//その日の空き具合による背景色の設定
		const cellBackground =
			stats.avail === 0
				? renderStyle.empty_bg
				: Number(stats.avail) / Number(stats.total) <
				  renderStyle.enoughBorder / 100
				? renderStyle.low_bg
				: renderStyle.enough_bg;
		//空き状況記号
		const remaindMark =
			stats.avail === 0
				? "✕"
				: Number(stats.avail) / Number(stats.total) <
				  renderStyle.enoughBorder / 100
				? "△"
				: "〇";

		const renderContent =
			renderStyle.remainDisp === "number"
				? `remain: ${stats.avail}`
				: remaindMark;

		const cursorDisp = !stats.avail ? "default" : "pointer";

		tableSource.push({
			cells: [
				{ tag: "td", content: time },
				{
					tag: "td",
					content: renderContent,
					style: {
						background: cellBackground,
						textAlign: "center",
						cursor: cursorDisp,
					},
					attributes: {
						"data-time": time,
						"data-avail": stats.avail,
					},
				},
			],
		});
	});
	return tableSource;
};

export const buildBookingListTableSource = (
	bookings: userBooking[],
	{
		renderActions, // キャンセルボタンなどを描画するコールバック
	}: {
		renderActions: (booking: userBooking, showCheckbox: boolean) => string;
	},
	showCheckbox: boolean = false,
): TableSource => {
	if (!Array.isArray(bookings) || bookings.length === 0) {
		// データがない場合は「予約がありません」という1行を返す
		return [
			{
				cells: [
					{
						tag: "td",
						content: "予約データが見つかりません。",
						attributes: { colspan: 4 },
					},
				],
			},
		];
	}

	const tableSource: TableSource = [];

	// データ行
	bookings.forEach((booking) => {
		// 1. まず日付セルを入れた配列を作成
		const cells: TableCell[] = [
			{ tag: "td" as const, content: booking.reserve_date },
		];
		// 2. 時間を表示すべきリソースか判定して push する
		// ここで is_time_resource（仮）などのフラグで判定
		if (
			!(booking.reserve_time === "00:00:00" && booking.end_time === "23:59:59")
		) {
			cells.push({
				tag: "td" as const,
				content: `${booking.reserve_time.substring(
					0,
					5,
				)}～${booking.end_time.substring(0, 5)}`,
				attributes: {
					class: "reservation_time_cell", // ここにクラス名を追加
				},
			});
		}

		// 3. 残りのセルを push
		cells.push(
			{ tag: "td" as const, content: `${booking.guest_count} 名` },
			{
				tag: "td" as const,
				content: renderActions(booking, showCheckbox),
				attributes: {
					"data-booking-id": booking.booking_id,
					"data-slot-ids": booking.slot_ids,
					"data-status": booking.booking_status,
					"data-reserve-date": booking.reserve_date,
					"data-guest-count": booking.guest_count,
				},
			},
		);

		tableSource.push({ cells });
	});

	return tableSource;
};

const escapeHtml = (s: string | number): string =>
	String(s)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");

export const renderBookingCellHtml = (
	dayObj: DayObject,
	dayNum: number,
	renderStyle: any,
): string => {
	const status = dayObj?.slotStatus || "";
	// null の場合は空文字、数字がある場合はそのまま表示
	const capDisplay =
		dayObj.slotCapacity !== null && dayObj.slotCapacity !== undefined
			? `remain: ${dayObj.slotCapacity} `
			: "";
	//空き状況記号
	const remaindMark =
		dayObj.slotCapacity === 0
			? "✕"
			: Number(dayObj.slotCapacity) / Number(dayObj.capacityNum) <
			  renderStyle.enoughBorder / 100
			? "△"
			: dayObj.slotCapacity !== null && dayObj.slotCapacity !== undefined
			? "〇"
			: "";

	// 「holiday」文字
	const holiday =
		dayObj?.holiday && dayObj.holiday !== "holiday"
			? escapeHtml(dayObj.holiday)
			: "";

	return `
		<div style="line-height:1.3; min-height: 50px;">
            <div style="font-weight:600;">${dayNum}</div>
			${
				renderStyle.isDispHoliday
					? `<div style="font-size:11px; opacity:0.8;">${holiday}</div>`
					: ""
			}
            ${
							status === "closed"
								? `<div style="color:red; font-size:10px;">${renderStyle.restDisp}</div>`
								: ""
						}
            ${
							renderStyle.remainDisp === "number" && status != "closed"
								? `<div style="font-size:11px; opacity:0.8;">${capDisplay}</div>`
								: ""
						}
			${
				renderStyle.remainDisp === "sign" && status != "closed"
					? `<div style="font-size:14px;text-align: center;padding-top:3px">${remaindMark}</div>`
					: ""
			}
        </div>
	`.trim();
};

export const renderCancelButtonHtml = (
	booking: userBooking,
	showCheckbox: boolean = false,
): string => {
	// 既にキャンセル済みの場合はボタンを出さない、または無効化する
	if (booking.booking_status === "cancelled") {
		let html = `<span style="color: #999;">キャンセル済み</span>`;

		// 管理者モード等で、右側にチェックボックスを配置
		if (showCheckbox) {
			html += ` 
				<input 
					type="checkbox" 
					class="itmar-delete-checkbox" 
					value="${booking.booking_id}" 
					style="margin-left: 8px; vertical-align: middle; cursor: pointer;"
					onclick="event.stopPropagation();" 
				>
			`;
		}
		return html.trim();
	}

	return `
        <button 
            type="button" 
            class="itmar-cancel-button" 
            style="background:#e53935; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;"
        >
            変更・キャンセル
        </button>
    `.trim();
};
