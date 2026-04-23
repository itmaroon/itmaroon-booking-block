import { useBlockProps, InnerBlocks } from "@wordpress/block-editor";
import { BookingAttributes } from "./types";
import { BlockSaveProps } from "@wordpress/blocks";

export default function save({
	attributes,
}: BlockSaveProps<BookingAttributes>) {
	const { resourceId, calendarTableId, bookingTableId } = attributes;

	const blockProps = useBlockProps.save({
		"data-resource-id": resourceId,
		"data-calendar-table-id": calendarTableId,
		"data-booking-table-id": bookingTableId,
	});

	return (
		<div {...blockProps}>
			<InnerBlocks.Content />
		</div>
	);
}
