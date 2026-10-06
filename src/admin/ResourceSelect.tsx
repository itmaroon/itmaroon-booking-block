import { __ } from "@wordpress/i18n";
import { SelectControl, Notice, Spinner } from "@wordpress/components";
import type { Resource } from "./types";

interface Props {
	resources: Resource[];
	value: number;
	onChange: (id: number) => void;
	loading: boolean;
	error: string;
	/** 「すべて」を選べるようにする（予約一覧用） */
	allowAll?: boolean;
}

const settingsUrl = "admin.php?page=itmar-booking-settings";

/** 対象のリソース（店舗など）を選ぶ。リソースがないときは、設定へ案内する */
export default function ResourceSelect({
	resources,
	value,
	onChange,
	loading,
	error,
	allowAll = false,
}: Props) {
	if (loading) {
		return <Spinner />;
	}
	if (error) {
		return (
			<Notice status="error" isDismissible={false}>
				{error}
			</Notice>
		);
	}
	if (resources.length === 0) {
		return (
			<Notice status="warning" isDismissible={false}>
				{__(
					"There are no resources. Choose the post type used as the reservation target on the Settings page, and create at least one post of that type.",
					"itmaroon-booking-block",
				)}{" "}
				<a href={settingsUrl}>
					{__("Open Settings", "itmaroon-booking-block")}
				</a>
			</Notice>
		);
	}

	return (
		<SelectControl
			label={__("Resource", "itmaroon-booking-block")}
			value={String(value)}
			options={[
				...(allowAll
					? [{ label: __("All resources", "itmaroon-booking-block"), value: "0" }]
					: []),
				...resources.map((resource) => ({
					label: resource.title,
					value: String(resource.id),
				})),
			]}
			onChange={(next) => onChange(Number(next))}
			__nextHasNoMarginBottom
		/>
	);
}
