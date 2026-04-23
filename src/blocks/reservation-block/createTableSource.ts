import { generateGridAreas, getMonthRangeYmd } from "itmar-block-packages";
import {
	TableSource,
	TableCell,
	DayObject,
	BuildCalendarOptions,
	userBooking,
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
export const buildCalendarTableSource = (
	selectedMonth: string,
	calendar: DayObject[],
	{
		isMonday = false,
		headerFormatter = (w) => w.charAt(0).toUpperCase() + w.slice(1),
		renderCell,
	}: BuildCalendarOptions,
): TableSource => {
	if (!selectedMonth || !Array.isArray(calendar) || calendar.length === 0)
		return [];

	const { year, month, lastDay } = getMonthRangeYmd(selectedMonth);
	if (!year || !month || !lastDay) return [];

	const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0..6

	const areasStr = generateGridAreas(firstDayOfMonth, lastDay, isMonday);
	const lines = areasStr
		.split("\n")
		.map((l) => l.replace(/"/g, "").trim())
		.filter(Boolean);

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

	// header row
	tableSource.push({
		cells: headerTokens.map(
			(w): TableCell => ({
				tag: "th" as const,
				content: headerFormatter(w),
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

				return {
					tag: "td" as const, // string ではなく "td" 型として明示
					content: renderCell(dayObj, dayNum),
					// ✅ ここに data 属性用のオブジェクトを追加
					attributes: {
						"data-date": dayObj.date,
						"data-slot-id": dayObj.slotId || "",
						"data-capacity": dayObj.slotCapacity || 0,
						"data-status": dayObj.slotStatus || "",
					},
				};
			}),
		});
	}

	return tableSource;
};

export const buildBookingListTableSource = (
	bookings: userBooking[],
	{
		renderActions, // キャンセルボタンなどを描画するコールバック
	}: { renderActions: (booking: userBooking) => string },
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
		tableSource.push({
			cells: [
				{ tag: "td", content: booking.slot_date },
				{ tag: "td", content: booking.resource_name },
				{ tag: "td", content: `${booking.guest_count} 名` },
				{
					tag: "td",
					content: renderActions(booking),
					attributes: {
						"data-booking-id": booking.booking_id,
						"data-status": booking.booking_status,
					},
				},
			],
		});
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
): string => {
	const status = dayObj?.slotStatus ? escapeHtml(dayObj.slotStatus) : "";
	const cap = Number.isFinite(Number(dayObj?.slotCapacity))
		? Number(dayObj.slotCapacity)
		: 0;

	// 「holiday」文字は出さない
	const holiday =
		dayObj?.holiday && dayObj.holiday !== "holiday"
			? escapeHtml(dayObj.holiday)
			: "";

	return `
		<div style="line-height:1.3;">
			<div style="font-weight:600;">${dayNum}</div>
			${
				status
					? `<div style="font-size:12px;opacity:0.9;">Status: ${status}</div>`
					: ""
			}
			<div style="font-size:12px;opacity:0.9;">Cap: ${cap}</div>
			${holiday ? `<div style="font-size:12px;opacity:0.9;">★ ${holiday}</div>` : ""}
		</div>
	`.trim();
};

export const renderCancelButtonHtml = (booking: userBooking): string => {
	// 既にキャンセル済みの場合はボタンを出さない、または無効化する
	if (booking.booking_status === "cancelled") {
		return `<span style="color: #999;">キャンセル済み</span>`;
	}

	return `
        <button 
            type="button" 
            class="itmar-cancel-button" 
            style="background:#e53935; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;"
        >
            キャンセル
        </button>
    `.trim();
};
