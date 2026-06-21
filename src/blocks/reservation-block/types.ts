// src/types.ts

/**
 * block.json の定義に基づく属性の型
 *
 */
interface InfoMessages {
	successBooking: string;
	cancelSuccess: string;
	changeSuccess: string;
	noChange: string;
	errorLogin: string;
	errorNoSlot: string;
	errorNoUnit: string;
	errorFull: string;
	seetFull: string;
	errorNoTarget: string;
	errorInside: string;
}

interface TargetTite {
	resourceName: string;
	guestCount: string;
	reserveDate: string;
	reserveTime: string;
}

interface ButtonId {
	reserve: string;
	modify: string;
	cancel: string;
}

export interface BookingAttributes {
	resourceId: number;
	resourceSlug: string;
	resourceRest: string;
	selectedSlug: string;
	selectedRest: string;
	calendarTableId: string;
	bookingTableId: string;
	timeTableId: string;
	capacityDefault: number;
	closedWeekdays: number[];
	confirmThings: unknown[];
	isHoliday: boolean;
	infoMessages: InfoMessages;
	dispUniqueIds: TargetTite;
	confirmModal: string;
	reserveForm: string;
	buttonIDs: ButtonId;
	cancelModForm: string;
	enoughBorder: number;
	enoughBgColor: string;
	enoughGradient: string;
	lowBgColor: string;
	lowGradient: string;
	emptyBgColor: string;
	emptyGradient: string;
	closeBgColor: string;
	closeGradient: string;
	remainDisp: string;
	restDisp: string;
}

/**
 * API (itmar/v1/slots) のレスポンス型
 */
export interface SlotRow {
	detail_id: number;
	slot_date: string;
	capacity_total: number | string;
	status: "open" | "closed" | "maintenance";
	slot_id: number;
	unit_id: number;
	unit_name: string;
	capacity: {
		min: number;
		max: number;
	};
	start_time: string;
	end_time: string;
	is_booked: boolean;
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
	slot_ids: string;
	booking_status: string;
	reserve_date: string;
	reserve_time: string;
	end_time: string;
}

/**
 * カレンダーの各日付オブジェクト
 * パッケージから取得する基本データ + 予約システムの拡張データ
 */
export interface DayObject {
	date: number | string;
	weekday: number | string;
	holiday?: string;
	slotStatus?: "open" | "closed" | "maintenance" | null;
	slotCapacity?: number | string | null;
	slotAvailable?: number | string | null;
	slotId?: number | string;
	[key: string]: unknown; // その他拡張用
}

// 1日分のデータ
// キーは "09:00" などの時間文字列
export type SlotUsing = Record<
	string,
	{
		avail: number;
		total: number;
	}
>;

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
	style?: {
		[key: string]: string | number;
	};
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
	renderCell: (dayObj: DayObject, dayNum: number, extra?: any) => any;
	renderStyle?: any;
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

//予約の結果を返す型
export interface BookingResponse {
	success: boolean;
	// info_code は InfoMessages のキーのいずれかであることを保証する
	info_code: keyof InfoMessages;
}
