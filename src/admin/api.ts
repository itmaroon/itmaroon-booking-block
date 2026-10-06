import apiFetch from "@wordpress/api-fetch";
import type {
	AdminBooking,
	BookingsResponse,
	Resource,
	SettingsResponse,
	SlotRow,
	Unit,
} from "./types";

/**
 * 管理画面から呼ぶ REST。ルートはすべて itmar/v1。
 * 権限は PHP 側（can_manage_slots）が判定する。
 */

export const getSettings = () =>
	apiFetch<SettingsResponse>({ path: "/itmar/v1/admin/settings" });

export const saveSettings = (post_type: string) =>
	apiFetch<{ post_type: string; effective: string }>({
		path: "/itmar/v1/admin/settings",
		method: "POST",
		data: { post_type },
	});

export const getResources = () =>
	apiFetch<Resource[]>({ path: "/itmar/v1/admin/resources" });

export const getSlots = (resourceId: number, from: string, to: string) =>
	apiFetch<SlotRow[]>({
		path:
			`/itmar/v1/slots?resource_id=${encodeURIComponent(resourceId)}` +
			`&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
	});

export interface BulkSlotsPayload {
	resource_id: number;
	dates: string[];
	isAllday: boolean;
	startTime: string;
	endTime: string;
	timeTravel: number;
}

export const bulkCreateSlots = (data: BulkSlotsPayload) =>
	apiFetch({ path: "/itmar/v1/slots/bulk", method: "POST", data });

export const deleteMonthSlots = (resourceId: number, month: string) =>
	apiFetch<{ success: boolean; deleted_count: number; deleted_days: number }>({
		path:
			`/itmar/v1/slots/month?resource_id=${encodeURIComponent(resourceId)}` +
			`&month=${encodeURIComponent(month)}`,
		method: "DELETE",
	});

export const getUnits = (resourceId: number) =>
	apiFetch<Unit[]>({ path: `/itmar/v1/resource-units/${resourceId}` });

export const addUnits = (resourceId: number, units: Unit[]) =>
	apiFetch({
		path: "/itmar/v1/resource-units",
		method: "POST",
		data: { resource_id: resourceId, units },
	});

export const updateUnit = (unitId: number, unit: Unit) =>
	apiFetch({
		path: `/itmar/v1/resource-units/${unitId}`,
		method: "PUT",
		data: { name: unit.name, min: unit.min, max: unit.max },
	});

export const deleteUnit = (unitId: number) =>
	apiFetch({ path: `/itmar/v1/resource-units/${unitId}`, method: "DELETE" });

export interface BookingsQuery {
	resource_id?: number;
	status?: string;
	from?: string;
	to?: string;
	page: number;
	per_page: number;
}

export const getBookings = (query: BookingsQuery) => {
	const params = new URLSearchParams();
	Object.entries(query).forEach(([key, value]) => {
		if (value !== undefined && value !== "" && value !== 0) {
			params.set(key, String(value));
		}
	});
	return apiFetch<BookingsResponse>({
		path: `/itmar/v1/admin/bookings?${params.toString()}`,
	});
};

export const deleteBookings = (ids: AdminBooking["booking_id"][]) =>
	apiFetch<{ success: boolean; deleted_count: number; message: string }>({
		path: "/itmar/v1/bookings",
		method: "DELETE",
		data: { ids },
	});
