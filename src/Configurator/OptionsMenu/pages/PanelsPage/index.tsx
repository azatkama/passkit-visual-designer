import { PageNavigation } from "../usePageFactory";
import * as React from "react";
import PanelGroup, { DataGroup } from "./PanelGroup";
import Panel, { FieldDetails } from "./Panel";
import { RegisteredFieldsMap } from "../..";
import PageNavigationContext from "../PageNavigationContext";
import type { MediaProps, PassMixedProps } from "../../../../Pass";
import "./style.less";
import { createClassName } from "../../../../utils";

enum ShadowMode {
	START, /** Carriage is scrolled to end */
	MIDDLE,
	END, /** Carriage is scrolled to begin */
}

interface Props extends Partial<PageNavigation> {
	selectedFieldID: keyof PassMixedProps;
	fields: RegisteredFieldsMap;
	data: PassMixedProps;
	onValueChange<T>(name: string, data: T): void;
	onMediaEditRequest(mediaName: keyof MediaProps): void;
}

export default function PanelsPage(props: Props) {
	const [activePanel, setActivePanel] = React.useState<DataGroup>(undefined);

	const exclusivePanelActivation = React.useRef((group: DataGroup) => {
		setActivePanel(currentActivePanel =>
			currentActivePanel !== group && group || null
		);
	});

	React.useEffect(() => {
		if (!props.selectedFieldID) {
			// We don't want to close data menu if we come back
			// from an auto-navigated page
			return;
		}

		const isDataActive = (
			props.fields
				.get(DataGroup.DATA)
				.map(entry => entry.name)
				.includes(props.selectedFieldID) &&
			DataGroup.DATA
		);

		setActivePanel(isDataActive);
	}, [props.selectedFieldID]);

	const groups = Array.from<[DataGroup, FieldDetails[]], JSX.Element>(props.fields.entries(), ([group, details]) => {
		return (
			<PanelGroup
				group={group}
				key={group}
				isActive={group === activePanel}
				setActive={exclusivePanelActivation.current}
			>
				<PageNavigationContext.Consumer>
					{(navProps) => (
						details.map((data => {
							const { kind, name, ...otherData } = data;
							return (
								<Panel
									key={name}
									name={name}
									kind={kind}
									data={otherData}
									value={
										group === DataGroup.IMAGES
											? props.onMediaEditRequest
											: props.data?.[name]
									}
									onValueChange={props.onValueChange}
									isSelected={props.selectedFieldID === name}
									{...navProps}
								/>
							);
						}))
					)}
				</PageNavigationContext.Consumer>
			</PanelGroup>
		);
	});

	const shadowsRef = React.useRef<HTMLUListElement>();
	const [selectedListElement, selectListElement] = React.useState(0);
	const [shadowMode, setShadowMode] = React.useState(ShadowMode.END);

	React.useLayoutEffect(() => {
		if (!shadowsRef.current) {
			return;
		}

		const activeChild = shadowsRef.current.childNodes[selectedListElement] as HTMLLIElement;
		const previousScrollLeft = shadowsRef.current.scrollLeft;

		activeChild.scrollIntoView({
			behavior: "smooth",
			inline: "center",
		});

		const nextScrollLeft = shadowsRef.current.scrollLeft;

		/**
		 * We'd like to have scrollLeft updated, but
		 * according to the web, scrollIntoView on Chromium Desktop has a bug.
		 * Therefore, each thing executed after will still use the previous scrollLeft.
		 *
		 * We have to apply a workaround for this.
		 */

		setShadowMode(computeShadowMode(activeChild, previousScrollLeft, nextScrollLeft));
	}, [selectedListElement]);

	const onWheelEventHandler = React.useCallback((event: React.WheelEvent<HTMLUListElement>) => {
		const { currentTarget: { scrollWidth, offsetWidth, childNodes }, deltaY } = event;

		if (scrollWidth === offsetWidth) {
			/** No scroll available */
			return;
		}

		if (deltaY) {
			/**
			 * If users cannot scroll left or right but can
			 * just use the wheel, we simulate the scroll on X-axis
			 */
			event.currentTarget.scrollBy(deltaY, 0);
		}

		setShadowMode(computeShadowMode(childNodes[selectedListElement] as HTMLLIElement, undefined, shadowsRef.current.scrollLeft));
	}, []);

	const shadowClassName = createClassName([], {
		left: shadowMode === ShadowMode.START || shadowMode === ShadowMode.MIDDLE,
		right: shadowMode === ShadowMode.END || shadowMode === ShadowMode.MIDDLE,
	});

	return (
		<>
			<ul onWheel={onWheelEventHandler} ref={shadowsRef} className={shadowClassName}>
				{
					["Metadata", "Images", "Colors", "Data"]
						.map((value, index) => (
							<li
								key={value}
								className={index === selectedListElement && "active" || null}
								onClick={() => selectListElement(index)}
							>
								{value}
							</li>
						))
				}
			</ul>
			{groups}
		</>
	);
}

/**
 * Computes the slider shadows based on selected children.
 * We could have actually used parent, but for a bug in Chromium that
 * does not update the `scrollLeft` property when using scrollIntoView,
 * (https://stackoverflow.com/q/60701658) we have to rely on the selected
 * element.
 *
 * @param element Active child
 */

function computeShadowMode(element: HTMLLIElement, previousParentScrollLeft: number, nextParentScrollLeft: number) {
	const parentNode = element.parentNode as HTMLUListElement;
	const parentScrollLeft = Math.floor(parentNode.scrollLeft);
	const MAX_PARENT_SCROLL_LEFT = parentNode.scrollWidth - parentNode.clientWidth;

	// If condition is true, scrollLeft have not been updated - therefore there's still the bug.
	const IS_CHROMIUM_BUG = previousParentScrollLeft === nextParentScrollLeft;

	const scrollLeft = IS_CHROMIUM_BUG
		? element.offsetLeft
		: Math.floor(parentNode.scrollLeft);

	const canParentStillScrollRight = parentScrollLeft !== parentNode.scrollWidth - parentNode.offsetWidth;

	/**
	 * We need a tolerance before showing the the shadow.
	 * Tolerance is got by the sibling (previous or next)
	 * element's width.
	 *
	 * Of course, sibling might be null so we reduce
	 * the tolerance.
	 */

	const scrollLeftTolerance = (element.previousElementSibling as HTMLLIElement)?.offsetWidth ?? 0;
	const scrollRightTolerance = (element.nextElementSibling as HTMLLIElement)?.offsetWidth ?? 0;

	const showLeftShadow = IS_CHROMIUM_BUG
		? scrollLeft !== scrollLeftTolerance
		: scrollLeft > scrollLeftTolerance; /** Natural scrolling */

	/**
	 * Right shadow condition on chromium's bug is a big more complex,
	 * as we need to understand if the current parent maximum scrollLeft (MAX_PARENT_SCROLL_LEFT)
	 * on the parent has been reached or not.
	 *
	 * Since scrollLeft might be zero, we need something that CAN span
	 * from `0 - currentElement's width - sibling's width`
	 * to over about `MAX_PARENT_SCROLL_LEFT` and CAN surpass it.
	 * Without using offsetWidth, we would have an always-true condition at the beginning
	 * and causing therefore also left shadow to be seen.
	 *
	 * Having scrollRightTolerance allows us to increase the minimum amount
	 * before showing the shadow when natural scrolling happens after clicking
	 */

	const showRightShadow = IS_CHROMIUM_BUG
		? MAX_PARENT_SCROLL_LEFT > scrollLeft - element.offsetWidth - scrollRightTolerance
		: canParentStillScrollRight; /** Natural scrolling */

	if (showLeftShadow && !showRightShadow) {
		return ShadowMode.START;
	}

	if (showRightShadow && !showLeftShadow) {
		return ShadowMode.END;
	}

	return ShadowMode.MIDDLE;
}
