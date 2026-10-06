import { format } from "@wordpress/date";

/**
 * 選んだ日の「曜日」と「祝日名」の文字。祝日でなければ曜日だけ。
 * 曜日はサイトの言語（日本語なら「水曜日」）。ymd は "YYYY-MM-DD"。
 */
export const buildDateNote = (ymd: string, holiday?: string): string => {
	const weekday = format("l", `${ymd}T12:00:00`);
	//祝日名が無く "holiday" とだけ入っているデータは、名前として出さない
	const name = holiday && holiday !== "holiday" ? holiday : "";
	return name ? `${weekday} ${name}` : weekday;
};
