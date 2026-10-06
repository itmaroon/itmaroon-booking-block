import { __ } from "@wordpress/i18n";
import { Button, Notice, SelectControl, Spinner } from "@wordpress/components";
import { useEffect, useState } from "@wordpress/element";
import { getSettings, saveSettings } from "./api";
import type { SettingsResponse } from "./types";

interface NoticeState {
	status: "success" | "error";
	message: string;
}

/** 設定: 予約の対象（リソース）にする投稿タイプ */
export default function SettingsView() {
	const [settings, setSettings] = useState<SettingsResponse | null>(null);
	const [postType, setPostType] = useState<string>("");
	const [saving, setSaving] = useState<boolean>(false);
	const [notice, setNotice] = useState<NoticeState | null>(null);

	useEffect(() => {
		getSettings()
			.then((result) => {
				setSettings(result);
				// 保存された値がなければ、実際に使われている投稿タイプを初期値にする
				setPostType(result.post_type || result.effective);
			})
			.catch((e: { message?: string }) =>
				setNotice({ status: "error", message: e?.message ?? "" }),
			);
	}, []);

	const handleSave = async () => {
		setSaving(true);
		setNotice(null);
		try {
			await saveSettings(postType);
			setNotice({
				status: "success",
				message: __("Settings saved.", "itmaroon-booking-block"),
			});
		} catch (e) {
			setNotice({
				status: "error",
				message:
					(e as { message?: string })?.message ||
					__("Failed to save the settings.", "itmaroon-booking-block"),
			});
		} finally {
			setSaving(false);
		}
	};

	if (!settings) {
		return notice ? (
			<Notice status="error" isDismissible={false}>
				{notice.message}
			</Notice>
		) : (
			<Spinner />
		);
	}

	return (
		<div className="itmar-booking-admin itmar-booking-settings">
			{notice && (
				<Notice status={notice.status} onRemove={() => setNotice(null)}>
					{notice.message}
				</Notice>
			)}
			<section className="itmar-booking-panel">
				<h2>{__("Reservation target", "itmaroon-booking-block")}</h2>
				<SelectControl
					label={__("Post type used as the reservation target", "itmaroon-booking-block")}
					value={postType}
					options={[
						{ label: __("Not selected", "itmaroon-booking-block"), value: "" },
						...settings.post_types.map((type) => ({
							label: `${type.label} (${type.slug})`,
							value: type.slug,
						})),
					]}
					onChange={setPostType}
					help={__(
						"Each post of this post type becomes a resource (a shop, a room, a boat, and so on) whose slots, units and bookings are managed in this menu.",
						"itmaroon-booking-block",
					)}
					__nextHasNoMarginBottom
				/>
				<Button variant="primary" onClick={handleSave} disabled={saving}>
					{saving
						? __("Saving...", "itmaroon-booking-block")
						: __("Save Changes", "itmaroon-booking-block")}
				</Button>
			</section>
		</div>
	);
}
