import { useBlockProps, InnerBlocks } from "@wordpress/block-editor";
import { BookingAttributes } from "./types";
import { BlockSaveProps } from "@wordpress/blocks";

export default function save({
	attributes,
}: BlockSaveProps<BookingAttributes>) {
	const blockProps = useBlockProps.save({
		"data-attributes": JSON.stringify(attributes),
	});

	return (
		<div {...blockProps}>
			<InnerBlocks.Content />
		</div>
	);
}
