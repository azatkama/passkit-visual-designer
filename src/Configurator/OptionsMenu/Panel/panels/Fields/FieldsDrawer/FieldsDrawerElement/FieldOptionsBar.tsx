import * as React from "react";
import { PKDataDetectorType, PKTextAlignment, PKDateStyle } from "../../../../../../../passes/constants";
import { DeleteFieldIcon, ListAddProp, FieldsArrowIcon } from "../../icons";
import { OptionalFieldProperties } from "./FieldProperties";

interface FieldOptionsProps {
	deleteField(key: string): void;
	updateUsedProperties(usedProperties: string[]): void;
	changeFieldOrder(fromIndex: number, of: number): void;
	usedProperties?: string[];
	fieldKey: string;
	fieldIndex: number;
	isUpperBoundary: boolean;
	isLowerBoundary: boolean;
}

export default function FieldOptionsBar(props: FieldOptionsProps) {
	const [shouldShowAddMenu, showAddMenu] = React.useState(false);

	const onPropertySelectHandler = React.useRef((appliedProps: string[]) => {
		if (appliedProps !== null) {
			console.log("Selected voice", appliedProps[appliedProps.length - 1]);
			props.updateUsedProperties(appliedProps);
		}

		showAddMenu(false);
	});

	// Excluding the mandatory ones
	const allOptionalPropertiesAdded = props.usedProperties?.length - 2 === Object.keys(OptionalFieldProperties).length;

	return (
		<>
			<div className="field-options-row">
				<div className="field-delete" onClick={() => props.deleteField(props.fieldKey)}>
					<DeleteFieldIcon className="danger" />
				</div>
				<div className="field-order-handler">
					<FieldsArrowIcon
						className={props.isUpperBoundary && "disabled" || undefined}
						onClick={() => !props.isUpperBoundary && props.changeFieldOrder(props.fieldIndex, -1)}
					/>
					{props.fieldIndex + 1}
					<FieldsArrowIcon
						className={props.isLowerBoundary && "disabled" || undefined}
						onClick={() => !props.isLowerBoundary && props.changeFieldOrder(props.fieldIndex, 1)}
					/>
				</div>
				<div
					className="property-add-row"
					style={{ display: allOptionalPropertiesAdded ? "none" : "inherit" }}
					onClick={() => showAddMenu(true)}
				>
					<ListAddProp className="add" />
				</div>
			</div>
			<AvailableFieldsList
				className={!shouldShowAddMenu && "hidden" || ""}
				appliedProperties={props.usedProperties}
				onPropertySelect={onPropertySelectHandler.current}
			/>
		</>
	);
}

interface AvailableFieldsListProps {
	appliedProperties?: string[],
	onPropertySelect: (propertyName: string[]) => void;
	className?: string;
}

function AvailableFieldsList({ appliedProperties = [], onPropertySelect, className }: AvailableFieldsListProps) {
	const OFPKeys = Object.keys(OptionalFieldProperties);
	const properties = (
		!appliedProperties.length && OFPKeys ||
		OFPKeys.filter(prop => !appliedProperties.includes(prop))
	).map(prop => (
		<div key={prop} className="field-property" onClick={() => onPropertySelect([...appliedProperties, prop])}>
			{prop}
		</div>
	));

	return (
		<div className={`field-prop-choice-overlay ${className}`} onClick={() => onPropertySelect(null)}>
			<div className="field-new-property-list">
				{properties}
			</div>
		</div>
	);
}
