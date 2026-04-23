// src/types.ts

/**
 * block.json の定義に基づく属性の型
 */
export interface BookingAttributes {
	resourceId: number;
	resourceSlug: string;
	resourceRest: string;
	selectedSlug: string;
	selectedRest: string;
	calendarTableId: string;
	bookingTableId: string;
	capacityDefault: number;
	closedWeekdays: number[];
	confirmThings: unknown[];
}

/**
 * API (itmar/v1/slots) のレスポンス型
 */
export interface SlotRow {
	id: number | string;
	resource_id: number;
	slot_date: string;
	capacity_total: number | string;
	status: "open" | "closed" | "holiday";
}

export interface SlotDetail {
	slot_id: number;
	slot_date: string;
	detail_id: number;
	unit_id: number;
	unit_name: string;
	capacity: { min: number; max: number };
	start_time: string;
	end_time: string;
	is_booked: boolean;
	status: "open" | "closed" | "maintenance";
}

export interface userBooking {
	booking_id: number;
	guest_count: number;
	booking_status: string;
	slot_date: string;
	resource_name: string;
}

/**
 * カレンダーの各日付オブジェクト
 * パッケージから取得する基本データ + 予約システムの拡張データ
 */
export interface DayObject {
	date: number | string;
	weekday: number | string;
	holiday?: string;
	slotStatus?: "open" | "closed" | "holiday" | null;
	slotCapacity?: number | string | null;
	slotId?: number | string;
	[key: string]: unknown; // その他拡張用
}

export interface cellPos {
	row: number;
	col: number;
}

/**
 * インナーブロック（カレンダー/テーブル）から取得する属性の型
 */
export interface InnerBlockAttributes {
	selectedMonth?: string; // "YYYY/MM"
	selectedValue?: string;
	clickCellPos?: cellPos;
	dateValues?: DayObject[]; // 上記の DayObject を再利用
	tableSource?: TableRow[];
}

/**
 * テーブルデータ構造の型
 */
export interface TableCell {
	tag: "th" | "td";
	content: string | Node | null | undefined | any;
	attributes?: {
		[key: string]: string | number;
	};
}

export interface TableRow {
	cells: TableCell[];
}

/**
 * テーブル全体のデータ構造（行の配列）
 */
export type TableSource = TableRow[];

/**
 * buildCalendarTableSource 関数のオプション引数用
 */
export interface BuildCalendarOptions {
	isMonday?: boolean;
	headerFormatter?: (weekdayName: string) => string;
	renderCell: (dayObj: DayObject, dayNum: number) => any;
}

/**
 * バルク登録時のレスポンス型
 */
export interface BulkResult {
	processed: number;
	inserted: number;
	updated: number;
	unchanged: number;
}

// 祝日データの型定義
export interface HolidayData {
	date: string;
	name: string;
}
