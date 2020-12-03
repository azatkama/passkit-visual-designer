import * as React from "react";
import "./style.less";
import { PassKind } from "../model";
import { BoardingPass } from "./layouts/BoardingPass";
import { Coupon } from "./layouts/Coupon";
import { EventTicket } from "./layouts/EventTicket";
import { Generic } from "./layouts/Generic";
import { StoreCard } from "./layouts/StoreCard";
import { PKTransitType, PassFields, WalletPassFormat, DEFAULT_BACKGROUND_COLOR, DEFAULT_FOREGROUND_COLOR, DEFAULT_LABEL_COLOR } from "./constants";
import { InteractionContextMethods } from "./InteractionContext";
import { createClassName } from "../utils";
import Backfields from "./layouts/sections/BackFields";
import useCSSCustomProperty from "./changeCSSCustomProperty";

export { default as InteractionContext } from "./InteractionContext";

export interface PassMixedProps {
	kind?: PassKind;
	headerFields?: PassFields.HeaderFields[];
	secondaryFields?: PassFields.SecondaryFields[];
	primaryFields?: PassFields.PrimaryFields[];
	auxiliaryFields?: PassFields.AuxiliaryFields[];
	backFields?: PassFields.BackFields[];
	barcode?: Partial<WalletPassFormat.Barcodes>; // @TODO check if an array should be used instead
	transitType?: PKTransitType;
	logoText?: string;
	backgroundColor?: string;
	foregroundColor?: string;
	labelColor?: string;
	description?: string;
	passTeamIdentifier?: string;
	serialNumber?: string;
	organizationName?: string;
	passTypeIdentifier?: string;
	teamIdentifier?: string;
	formatVersion?: 1;
	groupingIdentifier?: string;
	webServiceURL?: string,
	authenticationToken?: string;
	associatedStoreIdentifiers?: string;
	appLaunchURL?: string;

	// URLs from redux middlewares
	logo?: string;
	backgroundImage?: string;
	thumbnailImage?: string;
	stripImage?: string;
	icon?: string;
	footerImage?: string;
}

export type MediaProps = Pick<PassMixedProps, "backgroundImage" | "footerImage" | "logo" | "thumbnailImage" | "stripImage" | "icon">;

export interface PassProps extends PassMixedProps, Partial<InteractionContextMethods> {
	showBack?: boolean;
}

const PassKindsLayoutsMap = new Map<PassKind, React.FunctionComponent<PassMixedProps>>([
	[PassKind.BOARDING_PASS, BoardingPass],
	[PassKind.COUPON, Coupon],
	[PassKind.EVENT, EventTicket],
	[PassKind.GENERIC, Generic],
	[PassKind.STORE, StoreCard]
]);

export default function Pass(props: PassProps) {
	const { kind, backgroundColor, foregroundColor, backFields, labelColor, ...newProps } = props;
	// We want to keep backgroundImage and others in passes layouts but
	// also exclude the others above and use backgroundImage here to set
	// the Background
	const { backgroundImage } = props;

	const PassLayout = PassKindsLayoutsMap.get(kind);

	/**
	 * Setting ref against card and not on main pass element
	 * to avoid an annoying flickering rendering bug in chromium
	 * that happens when using transitions on hover
	 * and css background images through CSS variables.
	 * Browser performs new request every time and rerenders the
	 * element.
	 */

	const cardRef = React.useRef<HTMLDivElement>();
	useCSSCustomProperty(cardRef, "background", backgroundImage || backgroundColor || DEFAULT_BACKGROUND_COLOR);
	useCSSCustomProperty(cardRef, "foreground-color", foregroundColor || DEFAULT_FOREGROUND_COLOR);
	useCSSCustomProperty(cardRef, "label-color", labelColor || DEFAULT_LABEL_COLOR);

	/** To avoid blur effect if no background is available */
	const contentClassName = createClassName(["content"], {
		"bg-image": Boolean(backgroundImage)
	});

	const passCardClassName = createClassName(["card"], {
		"show-back": props.showBack
	});

	return (
		<div className="pass" data-kind={kind}>
			<div className="decorations"></div>
			<div className={passCardClassName} ref={cardRef}>
				<div className={contentClassName}>
					<PassLayout {...newProps} />
				</div>
				<Backfields data={backFields} />
			</div>
		</div>
	);
}
