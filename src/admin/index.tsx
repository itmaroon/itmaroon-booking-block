import { createRoot } from "@wordpress/element";
import BookingsView from "./BookingsView";
import SettingsView from "./SettingsView";
import SlotsView from "./SlotsView";
import UnitsView from "./UnitsView";
import type { AdminView } from "./types";
import "./admin.scss";

/**
 * 管理画面「予約管理」の入口。PHP（AdminPage）が出力した領域の data-view に応じて、
 * 枠の管理・ユニット・予約一覧・設定のどれかを描く。
 */
const VIEWS: Record<AdminView, () => JSX.Element> = {
	slots: SlotsView,
	units: UnitsView,
	bookings: BookingsView,
	settings: SettingsView,
};

const root = document.getElementById("itmar-booking-admin");

if (root) {
	const view = (root.dataset.view as AdminView) || "slots";
	const View = VIEWS[view] ?? SlotsView;
	createRoot(root).render(<View />);
}
