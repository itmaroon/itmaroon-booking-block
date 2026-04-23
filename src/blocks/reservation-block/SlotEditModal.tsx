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

// 2次元配列に組み替える関数
const prepareMatrix = (rows: SlotDetail[]) => {
	// 1. ユニークな時間軸（縦軸）とユニット軸（横軸）を抽出してソート
	const times = [...new Set(rows.map((r) => r.start_time))].sort();
	const units = Array.from(
		new Map(
			rows.map((r) => [r.unit_id, { id: r.unit_id, name: r.unit_name }]),
		).values(),
	);

	// 2. マトリックスの生成 { [time]: { [unit_id]: SlotDetail } }
	const matrix: { [time: string]: { [unitId: number]: SlotDetail } } = {};

	times.forEach((time) => {
		matrix[time] = {};
		units.forEach((unit) => {
			const match = rows.find(
				(r) => r.start_time === time && r.unit_id === unit.id,
			);
			if (match) {
				matrix[time][unit.id] = match;
			}
		});
	});

	return { times, units, matrix };
};

interface SlotEditModalProps {
	rows: SlotDetail[];
	onClose: () => void; // 引数なし、戻り値なしの関数
}

export default function SlotEditModal({ rows, onClose }: SlotEditModalProps) {
	// モーダル内で編集中のデータを保持するステート
	const [localRows, setLocalRows] = useState(rows);
	const [isSaving, setIsSaving] = useState(false);

	const { times, units, matrix } = prepareMatrix(rows);

	// セルの値を書き換えるハンドラ
	const updateCell = (
		detailId: number,
		key: "is_booked" | "status",
		value: any,
	) => {
		setLocalRows((prev) =>
			prev.map((row) =>
				row.detail_id === detailId ? { ...row, [key]: value } : row,
			),
		);
	};

	// 変更を一括保存（簡略化のためループで処理）
	const handleSave = async () => {
		setIsSaving(true);
		try {
			// 実際には変更があった行だけを抽出して送るのが効率的です
			for (const row of localRows) {
				await apiFetch({
					path: `/itmar/v1/slot-details/${row.detail_id}`,
					method: "PUT",
					data: { is_booked: row.is_booked, status: row.status },
				});
			}
			alert(__("Saved successfully.", "itmaroon-booking-block"));
			onClose();
		} catch (e) {
			alert(__("Save failed.", "itmaroon-booking-block"));
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Modal
			title={__("Edit Slots Detail", "itmaroon-booking-block")}
			onRequestClose={onClose}
			className="slot-matrix-modal"
		>
			<div className="matrix-wrapper">
				<table className="slot-matrix-table">
					<thead>
						<tr>
							<th>{__("Time / Unit", "itmaroon-booking-block")}</th>
							{units.map((unit) => (
								<th key={unit.id}>{unit.name}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{times.map((time) => (
							<tr key={time}>
								<td className="time-label">{time}</td>
								{units.map((unit) => {
									const cell = matrix[time][unit.id];
									if (!cell)
										return (
											<td key={unit.id} className="empty-cell">
												-
											</td>
										);

									return (
										<td key={cell.detail_id} className="edit-cell">
											<CheckboxControl
												label={__("Booked", "itmaroon-booking-block")}
												checked={cell.is_booked}
												onChange={(val) =>
													updateCell(cell.detail_id, "is_booked", val)
												}
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
											/>
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="modal-footer">
				<Button variant="primary" onClick={handleSave} disabled={isSaving}>
					{isSaving
						? __("Saving...", "itmaroon-booking-block")
						: __("Save All Changes", "itmaroon-booking-block")}
				</Button>
				<Button variant="tertiary" onClick={onClose}>
					{__("Cancel", "itmaroon-booking-block")}
				</Button>
			</div>
		</Modal>
	);
}
