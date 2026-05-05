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
	// 1. ユニークな時間軸（縦軸）
	// 開始時間でソートしつつ、表示用に終了時間も紐付けて管理できるようにします
	const timeLabels = Array.from(
		new Map(
			rows.map((r) => [r.start_time, { start: r.start_time, end: r.end_time }]),
		).values(),
	).sort((a, b) => (a.start || "").localeCompare(b.start || ""));

	// 2. ユニークなユニット軸（横軸：名前の昇順でソート）
	const units = Array.from(
		new Map(
			rows.map((r) => [
				Number(r.unit_id),
				{ id: Number(r.unit_id), name: r.unit_name },
			]),
		).values(),
	).sort((a, b) => a.name.localeCompare(b.name, "ja")); // 日本語の名前順でソート

	// 3. マトリックスの生成 { [time]: { [unit_id]: SlotDetail } }
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

interface SlotEditModalProps {
	resourceId: number;
	selDate: string;
	rows: SlotDetail[];
	onClose: () => void; // 引数なし、戻り値なしの関数
	onSaveSuccess: () => void;
}

export default function SlotEditModal({
	resourceId,
	selDate,
	rows,
	onClose,
	onSaveSuccess,
}: SlotEditModalProps) {
	// モーダル内で編集中のデータを保持するステート
	const [localRows, setLocalRows] = useState(rows);
	const [isSaving, setIsSaving] = useState(false);

	const { timeLabels, units, matrix } = prepareMatrix(localRows);

	// セルの値を書き換えるハンドラ
	const updateCell = (
		detailId: number,
		key: "is_booked" | "status",
		value: any,
	) => {
		setLocalRows((prev) => {
			// 新しい配列を生成
			return prev.map((row) => {
				if (row.detail_id === detailId) {
					// 一致する行を見つけたら、新しいオブジェクトとしてコピーを作成
					// これにより、Reactが「ステートが変わった」と認識します
					return { ...row, [key]: value };
				}

				return row;
			});
		});
	};

	// 変更を一括保存（簡略化のためループで処理）
	const handleSave = async () => {
		setIsSaving(true);

		try {
			// 1. オリジナルの rows と比較して、変更があったものだけを抽出
			const diff = localRows.filter((localRow) => {
				const original = rows.find((r) => {
					return r.detail_id === localRow.detail_id;
				});

				return (
					original &&
					(original.is_booked !== localRow.is_booked ||
						original.status !== localRow.status)
				);
			});

			//2. まとめて送信
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
			// 【重要】親に通知
			if (onSaveSuccess) onSaveSuccess();

			onClose(); // 成功したら閉じる
		} catch (e) {
			alert(__("Save failed.", "itmaroon-booking-block"));
		} finally {
			setIsSaving(false);
		}
	};

	// slot_detail丸ごと削除
	interface BulkDeleteResponse {
		success: boolean;
		deleted_count: number;
	}

	interface WordPressRestError {
		code: string; // PHP側の WP_Error の第一引数 ('has_bookings' など)
		message: string; // ユーザーに表示するエラー文
		data: {
			status: number; // HTTPステータスコード (403 など)
		};
	}
	const handleDeleteDay = async () => {
		// ユーザーに確認を求める（誤操作防止）
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
			// 全ての detail_id を抽出して削除リクエストを送る
			const detailIds = rows.map((r) => r.detail_id);
			console.log(rows);
			const result = await apiFetch<BulkDeleteResponse>({
				path: "/itmar/v1/slot-details/bulk-delete", // 削除専用のエンドポイント
				method: "DELETE",
				data: {
					resource_id: resourceId,
					sel_date: selDate,
					detail_ids: detailIds,
				},
			});

			// 親コンポーネント（Edit.tsx）に通知してデータを再取得させる
			if (onSaveSuccess) onSaveSuccess();

			alert(
				`${result.deleted_count} ` +
					__("items deleted successfully.", "itmaroon-booking-block"),
			);
		} catch (err) {
			const error = err as WordPressRestError;
			if (error.code === "has_bookings") {
				// 予約がある場合の固有の処理
				alert(error.message);
			} else {
				alert(__("An unexpected error occurred.", "itmaroon-booking-block"));
			}
		} finally {
			setIsSaving(false);
			onClose(); // モーダルを閉じる
		}
	};

	return (
		<Modal
			title={`${__("Detailed Edit", "itmaroon-booking-block")} : ${selDate}`}
			onRequestClose={onClose}
			className="slot-matrix-modal"
		>
			<div className="matrix-wrapper">
				<table className="slot-matrix-table">
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
								{/* 時間の見出しを「開始 - 終了」にする */}
								{timeLabels.length > 1 && (
									<td className="time-label">
										{t.start} <br />
										<small style={{ opacity: 0.6 }}>〜 {t.end}</small>
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
											/>
											<SelectControl
												value={cell.status}
												options={[
													{ label: "Open", value: "open" },
													{ label: "Closed", value: "closed" },
													{ label: "Maintenance", value: "maintenance" },
												]}
												onChange={(val) =>
													updateCell(cell.detail_id, "status", val as any)
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
			<div
				className="modal-footer"
				style={{
					display: "flex",
					justifyContent: "space-between",
					marginTop: "20px",
				}}
			>
				<Button variant="primary" onClick={handleSave} disabled={isSaving}>
					{isSaving
						? __("Saving...", "itmaroon-booking-block")
						: __("Save All Changes", "itmaroon-booking-block")}
				</Button>
				<Button isDestructive onClick={handleDeleteDay} disabled={isSaving}>
					{isSaving
						? __("Saving...", "itmaroon-booking-block")
						: __("Delete All Slots (Set as Closed)", "itmaroon-booking-block")}
				</Button>
				<Button variant="tertiary" onClick={onClose}>
					{__("Cancel", "itmaroon-booking-block")}
				</Button>
			</div>
		</Modal>
	);
}
