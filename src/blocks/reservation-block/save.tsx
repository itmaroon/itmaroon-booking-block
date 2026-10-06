import { useBlockProps, InnerBlocks } from "@wordpress/block-editor";
import { BookingAttributes } from "./types";
import { BlockSaveProps } from "@wordpress/blocks";

export default function save({
	attributes,
}: BlockSaveProps<BookingAttributes>) {
	// 後から足した属性。編集した順にキーが末尾へ足される一方、読み直したときの再生成は
	// 定義順（WordPress が付ける metadata より前）になり、並びが食い違って無効になる。
	// 出力位置を最後に固定する。
	const { selectedDatePlaceholder, ...otherAttributes } = attributes;
	const blockProps = useBlockProps.save({
		"data-attributes": JSON.stringify({
			...otherAttributes,
			...(selectedDatePlaceholder !== undefined && { selectedDatePlaceholder }),
		}),
	});

	return (
		<div {...blockProps}>
			<InnerBlocks.Content />
		</div>
	);
}
