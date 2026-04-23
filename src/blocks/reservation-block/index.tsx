import { __ } from "@wordpress/i18n";

import { registerBlockType, BlockConfiguration } from "@wordpress/blocks";
import { BookingAttributes } from "./types";
import { ReactComponent as Reservation } from "./reservation.svg";

import "./style.scss";

/**
 * Internal dependencies
 */
import Edit from "./edit";
import save from "./save";
import metadata from "./block.json";

// metadata を WordPress のブロック構成型としてキャストします
const blockConfig = metadata as BlockConfiguration<BookingAttributes>;

registerBlockType(blockConfig, {
	icon: <Reservation />,
	description: __(
		"We provide block provides reservation management functionality..",
		"itmaroon-booking-block",
	),

	edit: Edit,
	save,
});
