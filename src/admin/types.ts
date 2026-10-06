/**
 * 管理画面「予約管理」で使う型。
 * REST の戻り値は SlotsAPI / BookingAPI / AdminAPI の PHP に対応している。
 */

export type AdminView = "slots" | "units" | "bookings" | "settings";

export interface Resource {
	id: number;
	title: string;
	status: string;
}

export interface SettingsResponse {
	/** 保存されている投稿タイプ（未設定なら空） */
	post_type: string;
	/** 実際に使われる投稿タイプ（未設定のときの既定を含む） */
	effective: string;
	post_types: { slug: string; label: string }[];
}

export interface Unit {
	id?: number;
	name: string;
	min: number;
	max: number;
}

/** GET /itmar/v1/slots の1行（日付 × 時間 × ユニット） */
export interface SlotRow {
	slot_id: number;
	slot_date: string;
	detail_id: number | null;
	unit_id: number | null;
	unit_name: string | null;
	capacity: { min: number; max: number };
	start_time: string | null;
	end_time: string | null;
	is_booked: boolean;
	status: "open" | "closed" | "maintenance" | null;
}

/** 日付ごとの集計（カレンダーの1マス） */
export interface DaySummary {
	/** 枠の行がある（時間 × ユニットの組み合わせが1つ以上ある） */
	hasSlots: boolean;
	/** 受け付けている（open の）枠の数 */
	total: number;
	/** そのうち、まだ予約が入っていない枠の数 */
	available: number;
	/** 時間帯の数 */
	timeSpans: number;
}

export interface AdminBooking {
	booking_id: number;
	resource_id: number;
	resource_title: string;
	user_id: number;
	user_name: string;
	user_email: string;
	guest_count: number;
	status: "confirmed" | "cancelled" | string;
	reserve_date: string;
	start_time: string;
	end_time: string;
	unit_names: string[];
	created_at: string;
}

export interface BookingsResponse {
	items: AdminBooking[];
	total: number;
	total_pages: number;
}

/** 日付 × 時間 × ユニットの1枠（詳細編集モーダルで扱う） */
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
