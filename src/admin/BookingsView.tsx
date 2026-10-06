import { __, sprintf } from "@wordpress/i18n";
import {
	Button,
	CheckboxControl,
	Notice,
	SelectControl,
	Spinner,
	TextControl,
} from "@wordpress/components";
import { useEffect, useState } from "@wordpress/element";
import { deleteBookings, getBookings } from "./api";
import ResourceSelect from "./ResourceSelect";
import { useResources } from "./useResources";
import type { AdminBooking } from "./types";

const PER_PAGE = 20;

interface NoticeState {
	status: "success" | "error";
	message: string;
}

/** 予約一覧: 全ユーザーの予約。絞り込みと、選んだ予約の削除（確定済みも削除できる） */
export default function BookingsView() {
	const { resources, resourceId, setResourceId, loading, error } = useResources();

	// 絞り込み（resourceId が 0 のときは全リソース）
	const [allResources, setAllResources] = useState<boolean>(true);
	const [status, setStatus] = useState<string>("");
	const [from, setFrom] = useState<string>("");
	const [to, setTo] = useState<string>("");
	const [page, setPage] = useState<number>(1);

	const [items, setItems] = useState<AdminBooking[]>([]);
	const [total, setTotal] = useState<number>(0);
	const [totalPages, setTotalPages] = useState<number>(1);
	const [fetching, setFetching] = useState<boolean>(false);
	const [selected, setSelected] = useState<number[]>([]);
	const [notice, setNotice] = useState<NoticeState | null>(null);
	const [deleting, setDeleting] = useState<boolean>(false);

	const reload = async () => {
		setFetching(true);
		try {
			const result = await getBookings({
				resource_id: allResources ? undefined : resourceId,
				status,
				from,
				to,
				page,
				per_page: PER_PAGE,
			});
			setItems(result.items);
			setTotal(result.total);
			setTotalPages(Math.max(1, result.total_pages));
			setSelected([]);
		} catch (e) {
			setNotice({
				status: "error",
				message: (e as { message?: string })?.message ?? "",
			});
		} finally {
			setFetching(false);
		}
	};

	useEffect(() => {
		// リソースの読み込みが終わってから最初の一覧を取る
		if (loading) return;
		reload();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [loading, allResources, resourceId, status, from, to, page]);

	const toggleOne = (id: number, checked: boolean) =>
		setSelected((prev) =>
			checked ? [...prev, id] : prev.filter((value) => value !== id),
		);

	const allChecked = items.length > 0 && selected.length === items.length;

	const selectedItems = items.filter((item) => selected.includes(item.booking_id));
	const confirmedCount = selectedItems.filter(
		(item) => item.status === "confirmed",
	).length;

	const handleDelete = async () => {
		if (selected.length === 0) return;

		// 確定済みの予約を消すと、枠が空きに戻る。利用者への通知は行われないので、強く確認する
		const message =
			confirmedCount > 0
				? sprintf(
						/* translators: 1: number of selected bookings, 2: number of confirmed bookings among them */
						__(
							"Delete %1$d bookings? %2$d of them are still confirmed. Deleting a confirmed booking releases its slots, and the customer is not notified.",
							"itmaroon-booking-block",
						),
						selected.length,
						confirmedCount,
				  )
				: sprintf(
						/* translators: %d: number of selected bookings */
						__("Delete %d bookings?", "itmaroon-booking-block"),
						selected.length,
				  );
		if (!window.confirm(message)) return;

		setDeleting(true);
		setNotice(null);
		try {
			const result = await deleteBookings(selected);
			setNotice({ status: "success", message: result.message });
			await reload();
		} catch (e) {
			setNotice({
				status: "error",
				message:
					(e as { message?: string })?.message ||
					__("Deletion failed.", "itmaroon-booking-block"),
			});
		} finally {
			setDeleting(false);
		}
	};

	const statusLabel = (value: string) =>
		value === "confirmed"
			? __("Confirmed", "itmaroon-booking-block")
			: value === "cancelled"
			? __("Cancelled", "itmaroon-booking-block")
			: value;

	return (
		<div className="itmar-booking-admin itmar-booking-bookings">
			<div className="itmar-booking-toolbar itmar-booking-filters">
				<SelectControl
					label={__("Target", "itmaroon-booking-block")}
					value={allResources ? "all" : "one"}
					options={[
						{ label: __("All resources", "itmaroon-booking-block"), value: "all" },
						{ label: __("Choose a resource", "itmaroon-booking-block"), value: "one" },
					]}
					onChange={(value) => {
						setAllResources(value === "all");
						setPage(1);
					}}
					__nextHasNoMarginBottom
				/>
				{!allResources && (
					<ResourceSelect
						resources={resources}
						value={resourceId}
						onChange={(id) => {
							setResourceId(id);
							setPage(1);
						}}
						loading={loading}
						error={error}
					/>
				)}
				<SelectControl
					label={__("Status", "itmaroon-booking-block")}
					value={status}
					options={[
						{ label: __("All", "itmaroon-booking-block"), value: "" },
						{ label: __("Confirmed", "itmaroon-booking-block"), value: "confirmed" },
						{ label: __("Cancelled", "itmaroon-booking-block"), value: "cancelled" },
					]}
					onChange={(value) => {
						setStatus(value);
						setPage(1);
					}}
					__nextHasNoMarginBottom
				/>
				<TextControl
					label={__("From", "itmaroon-booking-block")}
					type="date"
					value={from}
					onChange={(value) => {
						setFrom(value);
						setPage(1);
					}}
					__nextHasNoMarginBottom
				/>
				<TextControl
					label={__("To", "itmaroon-booking-block")}
					type="date"
					value={to}
					onChange={(value) => {
						setTo(value);
						setPage(1);
					}}
					__nextHasNoMarginBottom
				/>
			</div>

			{notice && (
				<Notice status={notice.status} onRemove={() => setNotice(null)}>
					{notice.message}
				</Notice>
			)}

			<div className="itmar-booking-list-actions">
				<Button
					isDestructive
					variant="secondary"
					onClick={handleDelete}
					disabled={selected.length === 0 || deleting}
				>
					{sprintf(
						/* translators: %d: number of selected bookings */
						__("Delete selected (%d)", "itmaroon-booking-block"),
						selected.length,
					)}
				</Button>
				<span className="itmar-booking-total">
					{sprintf(
						/* translators: %d: total number of bookings */
						__("%d bookings", "itmaroon-booking-block"),
						total,
					)}
				</span>
				{(fetching || deleting) && <Spinner />}
			</div>

			<table className="widefat striped itmar-booking-table">
				<thead>
					<tr>
						<td className="check-column">
							<CheckboxControl
								checked={allChecked}
								onChange={(checked) =>
									setSelected(checked ? items.map((item) => item.booking_id) : [])
								}
								aria-label={__("Select all", "itmaroon-booking-block")}
								__nextHasNoMarginBottom
							/>
						</td>
						<th>{__("Date", "itmaroon-booking-block")}</th>
						<th>{__("Time", "itmaroon-booking-block")}</th>
						<th>{__("Resource", "itmaroon-booking-block")}</th>
						<th>{__("Units", "itmaroon-booking-block")}</th>
						<th>{__("Guests", "itmaroon-booking-block")}</th>
						<th>{__("Customer", "itmaroon-booking-block")}</th>
						<th>{__("Status", "itmaroon-booking-block")}</th>
						<th>{__("Booked at", "itmaroon-booking-block")}</th>
					</tr>
				</thead>
				<tbody>
					{items.length === 0 && (
						<tr>
							<td colSpan={9}>
								{fetching
									? __("Loading...", "itmaroon-booking-block")
									: __("No bookings were found.", "itmaroon-booking-block")}
							</td>
						</tr>
					)}
					{items.map((item) => {
						const allDay =
							item.start_time === "00:00" && item.end_time.startsWith("23:59");
						return (
							<tr key={item.booking_id} className={`is-${item.status}`}>
								<td className="check-column">
									<CheckboxControl
										checked={selected.includes(item.booking_id)}
										onChange={(checked) => toggleOne(item.booking_id, checked)}
										aria-label={__("Select", "itmaroon-booking-block")}
										__nextHasNoMarginBottom
									/>
								</td>
								<td>{item.reserve_date}</td>
								<td>
									{allDay
										? __("All day", "itmaroon-booking-block")
										: `${item.start_time}〜${item.end_time}`}
								</td>
								<td>{item.resource_title}</td>
								<td>{item.unit_names.join(", ")}</td>
								<td>{item.guest_count}</td>
								<td>
									{item.user_name}
									{item.user_email && (
										<>
											<br />
											<small>{item.user_email}</small>
										</>
									)}
								</td>
								<td>
									<span className={`itmar-booking-status is-${item.status}`}>
										{statusLabel(item.status)}
									</span>
								</td>
								<td>{item.created_at}</td>
							</tr>
						);
					})}
				</tbody>
			</table>

			{totalPages > 1 && (
				<div className="itmar-booking-pagination">
					<Button
						variant="secondary"
						disabled={page <= 1}
						onClick={() => setPage(page - 1)}
					>
						‹
					</Button>
					<span>
						{page} / {totalPages}
					</span>
					<Button
						variant="secondary"
						disabled={page >= totalPages}
						onClick={() => setPage(page + 1)}
					>
						›
					</Button>
				</div>
			)}
		</div>
	);
}
