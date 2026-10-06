import { useEffect, useState } from "@wordpress/element";
import { getResources } from "./api";
import type { Resource } from "./types";

const STORAGE_KEY = "itmarBookingAdminResource";

const readStored = (): number => {
	try {
		return Number(window.localStorage.getItem(STORAGE_KEY)) || 0;
	} catch {
		return 0;
	}
};

/**
 * 設定した投稿タイプの投稿（リソース）の一覧と、選択中のリソース。
 * 選んだリソースは、画面を移っても覚えておく（ブラウザーに保存）。
 */
export function useResources() {
	const [resources, setResources] = useState<Resource[]>([]);
	const [resourceId, setResourceIdState] = useState<number>(readStored());
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string>("");

	const setResourceId = (id: number) => {
		setResourceIdState(id);
		try {
			window.localStorage.setItem(STORAGE_KEY, String(id));
		} catch {
			// 保存できなくても、画面の動作には影響しない
		}
	};

	useEffect(() => {
		let alive = true;
		getResources()
			.then((list) => {
				if (!alive) return;
				setResources(list);
				if (!list.some((resource) => resource.id === resourceId)) {
					setResourceId(list[0]?.id ?? 0);
				}
			})
			.catch((e: { message?: string }) => {
				if (alive) setError(e?.message ?? "");
			})
			.finally(() => {
				if (alive) setLoading(false);
			});
		return () => {
			alive = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return { resources, resourceId, setResourceId, loading, error };
}
