import { __, sprintf } from "@wordpress/i18n";
import {
	Button,
	Notice,
	TextControl,
	ToggleControl,
	Spinner,
} from "@wordpress/components";
import { useEffect, useMemo, useState } from "@wordpress/element";
import { bulkCreateSlots, deleteMonthSlots, getSlots, getUnits } from "./api";
import ResourceSelect from "./ResourceSelect";
import SlotEditModal from "./SlotEditModal";
import { useResources } from "./useResources";
import type { DaySummary, SlotDetail, SlotRow } from "./types";

const WEEKDAYS = [
	{ key: 0, label: __("Sun", "itmaroon-booking-block") },
	{ key: 1, label: __("Mon", "itmaroon-booking-block") },
	{ key: 2, label: __("Tue", "itmaroon-booking-block") },
	{ key: 3, label: __("Wed", "itmaroon-booking-block") },
	{ key: 4, label: __("Thu", "itmaroon-booking-block") },
	{ key: 5, label: __("Fri", "itmaroon-booking-block") },
	{ key: 6, label: __("Sat", "itmaroon-booking-block") },
];

const pad2 = (n: number) => String(n).padStart(2, "0");

const currentMonth = () => {
	const now = new Date();
	return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
};

const monthParts = (ym: string) => {
	const [y, m] = ym.split("-").map(Number);
	return { year: y, month: m, lastDay: new Date(y, m, 0).getDate() };
};

const shiftMonth = (ym: string, step: number) => {
	const { year, month } = monthParts(ym);
	const d = new Date(year, month - 1 + step, 1);
	return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
};

/** 日付ごとの集計。枠の行（詳細のあるもの）だけを数える */
const summarize = (rows: SlotRow[]): Record<string, DaySummary> => {
	const summaries: Record<string, DaySummary> = {};
	const spans: Record<string, Set<string>> = {};
	rows.forEach((row) => {
		if (!row.detail_id) return;
		const date = row.slot_date;
		if (!summaries[date]) {
			summaries[date] = { hasSlots: true, total: 0, available: 0, timeSpans: 0 };
			spans[date] = new Set();
		}
		spans[date].add(`${row.start_time}-${row.end_time}`);
		if (row.status === "open") {
			summaries[date].total += 1;
			if (!row.is_booked) summaries[date].available += 1;
		}
	});
	Object.keys(summaries).forEach((date) => {
		summaries[date].timeSpans = spans[date].size;
	});
	return summaries;
};

const dayClass = (summary?: DaySummary): string => {
	if (!summary || !summary.hasSlots) return "is-none";
	if (summary.total === 0) return "is-closed";
	if (summary.available === 0) return "is-full";
	if (summary.available / summary.total < 0.3) return "is-low";
	return "is-ok";
};

const CLOSED_KEY = "itmarBookingAdminClosedWeekdays";

const readClosed = (): number[] => {
	try {
		const parsed = JSON.parse(window.localStorage.getItem(CLOSED_KEY) || "[]");
		return Array.isArray(parsed) ? parsed.map(Number) : [];
	} catch {
		return [];
	}
};

interface NoticeState {
	status: "success" | "error" | "warning";
	message: string;
}

/** 枠の管理: 月のカレンダー、日ごとの詳細編集、月の枠の一括登録 */
export default function SlotsView() {
	const { resources, resourceId, setResourceId, loading, error } = useResources();

	const [month, setMonth] = useState<string>(currentMonth());
	const [rows, setRows] = useState<SlotRow[]>([]);
	const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
	const [editDate, setEditDate] = useState<string>("");
	const [notice, setNotice] = useState<NoticeState | null>(null);

	// 一括登録の設定
	const [closedWeekdays, setClosedWeekdays] = useState<number[]>(readClosed());
	const [isAllday, setIsAllday] = useState<boolean>(false);
	const [startTime, setStartTime] = useState<string>("17:00");
	const [endTime, setEndTime] = useState<string>("22:00");
	const [interval, setIntervalMinutes] = useState<number>(60);
	const [saving, setSaving] = useState<boolean>(false);

	// リソースのユニットの数（枠はユニットごとに作るので、0 のときは作れない）。未取得は null
	const [unitCount, setUnitCount] = useState<number | null>(null);

	const { year, month: monthNo, lastDay } = monthParts(month);

	const reload = async () => {
		if (!resourceId) return;
		setLoadingSlots(true);
		try {
			const result = await getSlots(
				resourceId,
				`${month}-01`,
				`${month}-${pad2(lastDay)}`,
			);
			setRows(result);
		} catch (e) {
			setNotice({
				status: "error",
				message: (e as { message?: string })?.message ?? "",
			});
		} finally {
			setLoadingSlots(false);
		}
	};

	useEffect(() => {
		reload();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [resourceId, month]);

	useEffect(() => {
		if (!resourceId) return;
		setUnitCount(null);
		getUnits(resourceId)
			.then((units) => setUnitCount(units.length))
			.catch(() => setUnitCount(null));
	}, [resourceId]);

	const summaries = useMemo(() => summarize(rows), [rows]);

	// カレンダーのマス（日曜始まり）
	const cells = useMemo(() => {
		const first = new Date(year, monthNo - 1, 1).getDay();
		const list: (number | null)[] = Array(first).fill(null);
		for (let d = 1; d <= lastDay; d++) list.push(d);
		while (list.length % 7 !== 0) list.push(null);
		return list;
	}, [year, monthNo, lastDay]);

	// 日付をクリックしたときに、その日の枠を編集する
	const editRows = useMemo(
		() =>
			rows.filter(
				(row) => row.slot_date === editDate && row.detail_id,
			) as unknown as SlotDetail[],
		[rows, editDate],
	);

	const toggleClosed = (dow: number) => {
		const next = closedWeekdays.includes(dow)
			? closedWeekdays.filter((x) => x !== dow)
			: [...closedWeekdays, dow].sort((a, b) => a - b);
		setClosedWeekdays(next);
		try {
			window.localStorage.setItem(CLOSED_KEY, JSON.stringify(next));
		} catch {
			// 保存できなくても、画面の動作には影響しない
		}
	};

	// 一括登録の対象日（定休曜日を除く）
	const datesToCreate = useMemo(() => {
		const dates: string[] = [];
		for (let d = 1; d <= lastDay; d++) {
			const dow = new Date(year, monthNo - 1, d).getDay();
			if (!closedWeekdays.includes(dow)) {
				dates.push(`${month}-${pad2(d)}`);
			}
		}
		return dates;
	}, [month, year, monthNo, lastDay, closedWeekdays]);

	const addMonthSlots = async () => {
		setNotice(null);
		if (!resourceId) return;
		if (datesToCreate.length === 0) {
			setNotice({
				status: "warning",
				message: __(
					"No dates to create (maybe all weekdays are closed).",
					"itmaroon-booking-block",
				),
			});
			return;
		}

		// 登録する日に、種類の違う枠（終日 ⇔ 時間刻み）がすでにあれば、混ざることを確認する
		const isAlldayRow = (row: SlotRow) =>
			row.start_time === "00:00:00" && row.end_time === "23:59:59";
		const targets = new Set(datesToCreate);
		const mixed = new Set(
			rows
				.filter(
					(row) =>
						row.detail_id &&
						targets.has(row.slot_date) &&
						isAlldayRow(row) !== isAllday,
				)
				.map((row) => row.slot_date),
		);
		if (
			mixed.size > 0 &&
			!window.confirm(
				sprintf(
					/* translators: %d: number of dates that already have a different kind of slots. */
					__(
						"%d dates already have slots of the other kind (all day / time-based). The new slots will be added alongside them, so those days will have both. To replace them, delete this month's slots first. Add anyway?",
						"itmaroon-booking-block",
					),
					mixed.size,
				),
			)
		) {
			return;
		}

		setSaving(true);
		try {
			await bulkCreateSlots({
				resource_id: resourceId,
				dates: datesToCreate,
				isAllday,
				startTime,
				endTime,
				timeTravel: interval,
			});
			setNotice({
				status: "success",
				message: __(
					"Monthly reservation slots have been saved.",
					"itmaroon-booking-block",
				),
			});
			await reload();
		} catch (e) {
			setNotice({
				status: "error",
				message:
					(e as { message?: string })?.message ||
					__("Bulk create failed.", "itmaroon-booking-block"),
			});
		} finally {
			setSaving(false);
		}
	};

	// 表示中の月の枠をすべて削除する（登録のやり直し用）。予約済みの枠があれば、サーバーが断る
	const slotCount = rows.filter((row) => row.detail_id).length;
	const slotDays = Object.keys(summaries).length;
	const deleteMonth = async () => {
		setNotice(null);
		if (!resourceId || slotCount === 0) return;
		const resourceName = resources.find((r) => r.id === resourceId)?.title ?? "";
		if (
			!window.confirm(
				sprintf(
					/* translators: 1: month (YYYY-MM), 2: resource name, 3: number of days, 4: number of slots. */
					__(
						"Delete all slots of %1$s for %2$s? (%3$d days, %4$d slots) This cannot be undone.",
						"itmaroon-booking-block",
					),
					month,
					resourceName,
					slotDays,
					slotCount,
				),
			)
		) {
			return;
		}
		setSaving(true);
		try {
			const result = await deleteMonthSlots(resourceId, month);
			setNotice({
				status: "success",
				message: sprintf(
					/* translators: %d: number of deleted slots. */
					__("%d slots deleted.", "itmaroon-booking-block"),
					result.deleted_count,
				),
			});
			await reload();
		} catch (e) {
			const err = e as { message?: string; data?: { dates?: string[] } };
			const dates = err.data?.dates;
			const base =
				err.message ||
				__("An unexpected error occurred.", "itmaroon-booking-block");
			setNotice({
				status: "error",
				// 予約済みの枠がある日を添える（その日を開いて「予約済み」を外せば消せる）
				message: dates?.length
					? `${base} ${__("Dates with reserved slots:", "itmaroon-booking-block")} ${dates.join(", ")}`
					: base,
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="itmar-booking-admin itmar-booking-slots">
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

			{resourceId > 0 && unitCount === 0 && (
				<Notice status="warning" isDismissible={false}>
					{__(
						"This resource has no units yet. Slots are created for each unit, so add at least one unit first.",
						"itmaroon-booking-block",
					)}{" "}
					<a href="admin.php?page=itmar-booking-units">
						{__("Open Units", "itmaroon-booking-block")}
					</a>
				</Notice>
			)}

			{resourceId > 0 && (
				<div className="itmar-booking-columns">
					<section className="itmar-booking-panel itmar-booking-calendar-panel">
						<div className="itmar-booking-month-nav">
							<Button
								variant="secondary"
								onClick={() => setMonth(shiftMonth(month, -1))}
								aria-label={__("Previous month", "itmaroon-booking-block")}
							>
								‹
							</Button>
							<TextControl
								type="month"
								value={month}
								onChange={(value) => value && setMonth(value)}
								__nextHasNoMarginBottom
							/>
							<Button
								variant="secondary"
								onClick={() => setMonth(shiftMonth(month, 1))}
								aria-label={__("Next month", "itmaroon-booking-block")}
							>
								›
							</Button>
							{loadingSlots && <Spinner />}
						</div>

						<div className="itmar-booking-calendar">
							{WEEKDAYS.map((weekday) => (
								<div key={weekday.key} className="itmar-booking-weekday">
									{weekday.label}
								</div>
							))}
							{cells.map((day, index) => {
								if (day === null) {
									return (
										<div
											key={`blank-${index}`}
											className="itmar-booking-day is-blank"
										/>
									);
								}
								const date = `${month}-${pad2(day)}`;
								const summary = summaries[date];
								const hasSlots = Boolean(summary?.hasSlots);
								return (
									<button
										type="button"
										key={date}
										className={`itmar-booking-day ${dayClass(summary)}`}
										disabled={!hasSlots}
										onClick={() => setEditDate(date)}
									>
										<span className="itmar-booking-day-number">{day}</span>
										{hasSlots && (
											<span className="itmar-booking-day-info">
												{summary.available}/{summary.total}
											</span>
										)}
									</button>
								);
							})}
						</div>
						<p className="description">
							{__(
								"Click a day that has slots to edit the booked state and status of each time and unit.",
								"itmaroon-booking-block",
							)}
						</p>
						<ul className="itmar-booking-legend">
							<li className="is-ok">{__("Available", "itmaroon-booking-block")}</li>
							<li className="is-low">{__("Few left", "itmaroon-booking-block")}</li>
							<li className="is-full">{__("Full", "itmaroon-booking-block")}</li>
							<li className="is-closed">{__("Closed", "itmaroon-booking-block")}</li>
							<li className="is-none">{__("No slots", "itmaroon-booking-block")}</li>
						</ul>
					</section>

					<section className="itmar-booking-panel itmar-booking-bulk-panel">
						<h2>{__("Add slots for this month", "itmaroon-booking-block")}</h2>
						<p className="description">
							{__(
								"Creates slots for every unit of the resource on each open day of the selected month. Existing slots are left as they are.",
								"itmaroon-booking-block",
							)}
						</p>

						<fieldset className="itmar-booking-weekdays">
							<legend>{__("Closed weekdays", "itmaroon-booking-block")}</legend>
							<div className="itmar-booking-weekday-toggles">
								{WEEKDAYS.map((weekday) => (
									<ToggleControl
										key={weekday.key}
										label={weekday.label}
										checked={closedWeekdays.includes(weekday.key)}
										onChange={() => toggleClosed(weekday.key)}
										__nextHasNoMarginBottom
									/>
								))}
							</div>
						</fieldset>

						<h3 className="itmar-booking-subheading">
							{__("Time schedule settings", "itmaroon-booking-block")}
						</h3>
						<ToggleControl
							label={__("Is All Day", "itmaroon-booking-block")}
							checked={isAllday}
							onChange={setIsAllday}
							__nextHasNoMarginBottom
						/>
						{!isAllday && (
							<div className="itmar-booking-time-fields">
								<TextControl
									label={__("Start Time", "itmaroon-booking-block")}
									type="time"
									value={startTime}
									onChange={setStartTime}
									__nextHasNoMarginBottom
								/>
								<TextControl
									label={__("End Time", "itmaroon-booking-block")}
									type="time"
									value={endTime}
									onChange={setEndTime}
									__nextHasNoMarginBottom
								/>
								<TextControl
									label={__("Time travel(minutes)", "itmaroon-booking-block")}
									type="number"
									min={1}
									value={String(interval)}
									onChange={(value) => setIntervalMinutes(Number(value) || 0)}
									__nextHasNoMarginBottom
								/>
							</div>
						)}

						<p className="itmar-booking-count">
							{__("Dates to be created:", "itmaroon-booking-block")}{" "}
							<strong>{datesToCreate.length}</strong>
						</p>
						<Button
							variant="primary"
							onClick={addMonthSlots}
							disabled={saving || unitCount === 0}
						>
							{saving
								? __("Creating...", "itmaroon-booking-block")
								: __("Add slots (this month)", "itmaroon-booking-block")}
						</Button>

						<h3 className="itmar-booking-subheading">
							{__("Delete slots for this month", "itmaroon-booking-block")}
						</h3>
						<p className="description">
							{__(
								"Removes every slot of the selected month for this resource, so you can register them again. Nothing is deleted if any slot is booked.",
								"itmaroon-booking-block",
							)}
						</p>
						<Button
							variant="secondary"
							isDestructive
							onClick={deleteMonth}
							disabled={saving || slotCount === 0}
						>
							{__("Delete all slots (this month)", "itmaroon-booking-block")}
						</Button>
					</section>
				</div>
			)}

			{editDate && editRows.length > 0 && (
				<SlotEditModal
					resourceId={resourceId}
					selDate={editDate}
					rows={editRows}
					onClose={() => setEditDate("")}
					onSaveSuccess={reload}
				/>
			)}
		</div>
	);
}
