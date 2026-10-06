import { __ } from "@wordpress/i18n";
import {
	Modal,
	Button,
	CheckboxControl,
	SelectControl,
} from "@wordpress/components";
import { useState } from "@wordpress/element";
import apiFetch from "@wordpress/api-fetch";
import type { SlotDetail } from "./types";

/** 行（時間 × ユニット）を、時間の縦軸・ユニットの横軸の表にする */
const prepareMatrix = (rows: SlotDetail[]) => {
	const timeLabels = Array.from(
		new Map(
			rows.map((r) => [r.start_time, { start: r.start_time, end: r.end_time }]),
		).values(),
	).sort((a, b) => (a.start || "").localeCompare(b.start || ""));

	const units = Array.from(
		new Map(
			rows.map((r) => [
				Number(r.unit_id),
				{ id: Number(r.unit_id), name: r.unit_name },
			]),
		).values(),
	).sort((a, b) => a.name.localeCompare(b.name, "ja"));

	const matrix: { [time: string]: { [unitId: number]: SlotDetail } } = {};
	timeLabels.forEach((t) => {
		const startTime = t.start || "";
		matrix[startTime] = {};
		units.forEach((unit) => {
			const match = rows.find(
				(r) => r.start_time === startTime && Number(r.unit_id) === unit.id,
			);
			if (match) {
				matrix[startTime][unit.id] = match;
			}
		});
	});

	return { timeLabels, units, matrix };
};

interface Props {
	resourceId: number;
	selDate: string;
	rows: SlotDetail[];
	onClose: () => void;
	onSaveSuccess: () => void;
}

interface RestError {
	code?: string;
	message?: string;
}

/** 1日分の枠（時間 × ユニット）の、予約済み・状態を編集する */
export default function SlotEditModal({
	resourceId,
	selDate,
	rows,
	onClose,
	onSaveSuccess,
}: Props) {
	const [localRows, setLocalRows] = useState(rows);
	const [isSaving, setIsSaving] = useState(false);

	const { timeLabels, units, matrix } = prepareMatrix(localRows);

	const updateCell = (
		detailId: number,
		key: "is_booked" | "status",
		value: boolean | string,
	) => {
		setLocalRows((prev) =>
			prev.map((row) =>
				row.detail_id === detailId ? { ...row, [key]: value } : row,
			),
		);
	};

	// 変更のあった枠だけをまとめて保存する
	const handleSave = async () => {
		setIsSaving(true);
		try {
			const diff = localRows.filter((localRow) => {
				const original = rows.find((r) => r.detail_id === localRow.detail_id);
				return (
					original &&
					(original.is_booked !== localRow.is_booked ||
						original.status !== localRow.status)
				);
			});

			await apiFetch({
				path: "/itmar/v1/slot-details/bulk-update",
				method: "POST",
				data: {
					updates: diff.map((row) => ({
						id: row.detail_id,
						is_booked: row.is_booked,
						status: row.status,
					})),
				},
			});

			alert(
				`${diff.length} ` +
					__("items saved successfully.", "itmaroon-booking-block"),
			);
			onSaveSuccess();
			onClose();
		} catch (e) {
			alert(__("Save failed.", "itmaroon-booking-block"));
		} finally {
			setIsSaving(false);
		}
	};

	// その日の枠をすべて削除する（休業日にする）。予約が入っている枠があれば、サーバーが断る
	const handleDeleteDay = async () => {
		if (
			!window.confirm(
				__(
					"Are you sure you want to delete all slots for this day? This will make it a closed day.",
					"itmaroon-booking-block",
				),
			)
		) {
			return;
		}

		setIsSaving(true);
		try {
			const result = await apiFetch<{ success: boolean; deleted_count: number }>({
				path: "/itmar/v1/slot-details/bulk-delete",
				method: "DELETE",
				data: {
					resource_id: resourceId,
					sel_date: selDate,
					detail_ids: rows.map((r) => r.detail_id),
				},
			});
			onSaveSuccess();
			alert(
				`${result.deleted_count} ` +
					__("items deleted successfully.", "itmaroon-booking-block"),
			);
		} catch (err) {
			const error = err as RestError;
			if (error.code === "has_bookings" && error.message) {
				alert(error.message);
			} else {
				alert(__("An unexpected error occurred.", "itmaroon-booking-block"));
			}
		} finally {
			setIsSaving(false);
			onClose();
		}
	};

	return (
		<Modal
			title={`${__("Detailed Edit", "itmaroon-booking-block")} : ${selDate}`}
			onRequestClose={onClose}
			className="itmar-booking-slot-modal"
		>
			<div className="itmar-booking-matrix-wrapper">
				<table className="itmar-booking-matrix">
					<thead>
						<tr>
							{timeLabels.length > 1 && (
								<th>{__("Time / Unit", "itmaroon-booking-block")}</th>
							)}
							{units.map((unit) => (
								<th key={unit.id}>{unit.name}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{timeLabels.map((t) => (
							<tr key={t.start}>
								{timeLabels.length > 1 && (
									<td className="time-label">
										{t.start}
										<br />
										<small>〜 {t.end}</small>
									</td>
								)}
								{units.map((unit) => {
									const cell = matrix[t.start || ""][unit.id];
									if (!cell) return <td key={unit.id}>-</td>;
									return (
										<td key={cell.detail_id} className="edit-cell">
											<CheckboxControl
												label={__("Booked", "itmaroon-booking-block")}
												checked={cell.is_booked}
												onChange={(val) =>
													updateCell(cell.detail_id, "is_booked", val)
												}
												__nextHasNoMarginBottom
											/>
											<SelectControl
												value={cell.status}
												options={[
													{ label: "Open", value: "open" },
													{ label: "Closed", value: "closed" },
													{ label: "Maintenance", value: "maintenance" },
												]}
												onChange={(val) =>
													updateCell(cell.detail_id, "status", val)
												}
												__nextHasNoMarginBottom
											/>
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="itmar-booking-modal-footer">
				<Button variant="primary" onClick={handleSave} disabled={isSaving}>
					{isSaving
						? __("Saving...", "itmaroon-booking-block")
						: __("Save All Changes", "itmaroon-booking-block")}
				</Button>
				<Button isDestructive onClick={handleDeleteDay} disabled={isSaving}>
					{__("Delete All Slots (Set as Closed)", "itmaroon-booking-block")}
				</Button>
				<Button variant="tertiary" onClick={onClose}>
					{__("Cancel", "itmaroon-booking-block")}
				</Button>
			</div>
		</Modal>
	);
}
