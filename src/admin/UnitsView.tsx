import { __ } from "@wordpress/i18n";
import { Button, Notice, TextControl } from "@wordpress/components";
import { useEffect, useState } from "@wordpress/element";
import { addUnits, deleteUnit, getUnits, updateUnit } from "./api";
import ResourceSelect from "./ResourceSelect";
import { useResources } from "./useResources";
import type { Unit } from "./types";

interface NoticeState {
	status: "success" | "error";
	message: string;
}

const emptyUnit = (): Unit => ({ name: "", min: 1, max: 2 });

/** ユニット管理: リソースごとの席（テーブル・個室など）の登録・変更・削除 */
export default function UnitsView() {
	const { resources, resourceId, setResourceId, loading, error } = useResources();

	const [units, setUnits] = useState<Unit[]>([]);
	const [loadingUnits, setLoadingUnits] = useState<boolean>(false);
	const [notice, setNotice] = useState<NoticeState | null>(null);
	const [saving, setSaving] = useState<boolean>(false);

	// 追加用（名前・人数・追加する数）
	const [draft, setDraft] = useState<Unit>(emptyUnit());
	const [addNum, setAddNum] = useState<number>(1);

	// 変更用（表の行を「編集」したときの、その行）
	const [editing, setEditing] = useState<Unit | null>(null);

	const errorMessage = (e: unknown, fallback: string) =>
		(e as { message?: string })?.message || fallback;

	const reload = async () => {
		if (!resourceId) return;
		setLoadingUnits(true);
		try {
			const list = await getUnits(resourceId);
			setUnits(
				[...list].sort((a, b) => a.name.localeCompare(b.name, "ja")),
			);
		} catch (e) {
			setNotice({ status: "error", message: errorMessage(e, "") });
		} finally {
			setLoadingUnits(false);
		}
	};

	useEffect(() => {
		setEditing(null);
		reload();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [resourceId]);

	// 同じ種類のユニットを、連番（001, 002…）をつけてまとめて追加する
	const handleAdd = async () => {
		if (!draft.name.trim()) {
			setNotice({
				status: "error",
				message: __("Please enter a unit name.", "itmaroon-booking-block"),
			});
			return;
		}
		if (addNum < 1) return;

		setSaving(true);
		setNotice(null);
		try {
			const newUnits: Unit[] = [];
			for (let i = 0; i < addNum; i++) {
				const unitNumber = String(i + 1).padStart(3, "0");
				newUnits.push({
					name: `${draft.name.trim()} ${unitNumber}`,
					min: draft.min,
					max: draft.max,
				});
			}
			await addUnits(resourceId, newUnits);
			setNotice({
				status: "success",
				message: __("Unit saved successfully.", "itmaroon-booking-block"),
			});
			setDraft(emptyUnit());
			setAddNum(1);
			await reload();
		} catch (e) {
			setNotice({
				status: "error",
				message: errorMessage(e, __("Failed to save unit.", "itmaroon-booking-block")),
			});
		} finally {
			setSaving(false);
		}
	};

	const handleUpdate = async () => {
		if (!editing?.id) return;
		setSaving(true);
		setNotice(null);
		try {
			await updateUnit(editing.id, editing);
			setNotice({
				status: "success",
				message: __("Unit updated successfully.", "itmaroon-booking-block"),
			});
			setEditing(null);
			await reload();
		} catch (e) {
			setNotice({
				status: "error",
				message: errorMessage(e, __("Failed to update unit.", "itmaroon-booking-block")),
			});
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (unit: Unit) => {
		if (!unit.id) return;
		if (
			!window.confirm(
				__(
					"Are you sure you want to delete this unit? This may affect existing slots.",
					"itmaroon-booking-block",
				),
			)
		) {
			return;
		}
		setSaving(true);
		setNotice(null);
		try {
			await deleteUnit(unit.id);
			setNotice({
				status: "success",
				message: __("Unit Delete successfully.", "itmaroon-booking-block"),
			});
			if (editing?.id === unit.id) setEditing(null);
			await reload();
		} catch (e) {
			setNotice({
				status: "error",
				message: errorMessage(
					e,
					__("An unknown error occurred.", "itmaroon-booking-block"),
				),
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="itmar-booking-admin itmar-booking-units">
			<div className="itmar-booking-toolbar">
				<ResourceSelect
					resources={resources}
					value={resourceId}
					onChange={setResourceId}
					loading={loading}
					error={error}
				/>
			</div>

			{notice && (
				<Notice status={notice.status} onRemove={() => setNotice(null)}>
					{notice.message}
				</Notice>
			)}

			{resourceId > 0 && (
				<div className="itmar-booking-columns">
					<section className="itmar-booking-panel">
						<h2>{__("Registered units", "itmaroon-booking-block")}</h2>
						<table className="widefat striped">
							<thead>
								<tr>
									<th>{__("Unit Name", "itmaroon-booking-block")}</th>
									<th>{__("Capacity (min)", "itmaroon-booking-block")}</th>
									<th>{__("Capacity (max)", "itmaroon-booking-block")}</th>
									<th />
								</tr>
							</thead>
							<tbody>
								{units.length === 0 && (
									<tr>
										<td colSpan={4}>
											{loadingUnits
												? __("Loading...", "itmaroon-booking-block")
												: __("No units are registered.", "itmaroon-booking-block")}
										</td>
									</tr>
								)}
								{units.map((unit) => {
									const isEditing = editing?.id === unit.id;
									return (
										<tr key={unit.id}>
											<td>
												{isEditing ? (
													<TextControl
														value={editing.name}
														onChange={(name) =>
															setEditing({ ...editing, name })
														}
														__nextHasNoMarginBottom
													/>
												) : (
													unit.name
												)}
											</td>
											<td>
												{isEditing ? (
													<TextControl
														type="number"
														min={0}
														value={String(editing.min)}
														onChange={(v) =>
															setEditing({ ...editing, min: Number(v) || 0 })
														}
														__nextHasNoMarginBottom
													/>
												) : (
													unit.min
												)}
											</td>
											<td>
												{isEditing ? (
													<TextControl
														type="number"
														min={0}
														value={String(editing.max)}
														onChange={(v) =>
															setEditing({ ...editing, max: Number(v) || 0 })
														}
														__nextHasNoMarginBottom
													/>
												) : (
													unit.max
												)}
											</td>
											<td className="itmar-booking-row-actions">
												{isEditing ? (
													<>
														<Button
															variant="primary"
															onClick={handleUpdate}
															disabled={saving}
														>
															{__("Modify Unit", "itmaroon-booking-block")}
														</Button>
														<Button
															variant="tertiary"
															onClick={() => setEditing(null)}
														>
															{__("Cancel", "itmaroon-booking-block")}
														</Button>
													</>
												) : (
													<>
														<Button
															variant="secondary"
															onClick={() => setEditing({ ...unit })}
															disabled={saving}
														>
															{__("Edit", "itmaroon-booking-block")}
														</Button>
														<Button
															isDestructive
															variant="tertiary"
															onClick={() => handleDelete(unit)}
															disabled={saving}
														>
															{__("Delete Unit", "itmaroon-booking-block")}
														</Button>
													</>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</section>

					<section className="itmar-booking-panel">
						<h2>{__("Add units", "itmaroon-booking-block")}</h2>
						<p className="description">
							{__(
								"Units of the same kind are added with serial numbers (for example, Table 001, Table 002).",
								"itmaroon-booking-block",
							)}
						</p>
						<TextControl
							label={__("Unit Name", "itmaroon-booking-block")}
							value={draft.name}
							onChange={(name) => setDraft({ ...draft, name })}
							__nextHasNoMarginBottom
						/>
						<div className="itmar-booking-time-fields">
							<TextControl
								label={__("Capacity (min)", "itmaroon-booking-block")}
								type="number"
								min={0}
								value={String(draft.min)}
								onChange={(v) => setDraft({ ...draft, min: Number(v) || 0 })}
								__nextHasNoMarginBottom
							/>
							<TextControl
								label={__("Capacity (max)", "itmaroon-booking-block")}
								type="number"
								min={0}
								value={String(draft.max)}
								onChange={(v) => setDraft({ ...draft, max: Number(v) || 0 })}
								__nextHasNoMarginBottom
							/>
							<TextControl
								label={__("Add Num", "itmaroon-booking-block")}
								type="number"
								min={1}
								value={String(addNum)}
								onChange={(v) => setAddNum(Number(v) || 0)}
								__nextHasNoMarginBottom
							/>
						</div>
						<Button variant="primary" onClick={handleAdd} disabled={saving}>
							{saving
								? __("Creating...", "itmaroon-booking-block")
								: __("Add Unit", "itmaroon-booking-block")}
						</Button>
					</section>
				</div>
			)}
		</div>
	);
}
