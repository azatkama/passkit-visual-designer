import * as React from "react";
import "./style.less";
import { Field, FieldLabel, FieldValue } from "../../components/Field";
import { RegistrableComponent, useRegistrations } from "../useRegistrations";
import { FieldKind } from "../../../../model";
import { PassFieldKeys } from "../../../constants";

interface RowProps extends RegistrableComponent {
	id: string;
	maximumElementsAmount: number;
	elements: PassFieldKeys[];
}

/**
 * Sparse TextField set, without
 * any wrapper. Made for parent
 * elements that are already
 * flex.
 *
 * Well, actually you are not a
 * row but who am I to judge you?
 * ¯\_(ツ)_/¯
 *
 * @param props
 */

export function InlineFieldsRow(props: RowProps) {
	const { maximumElementsAmount = 0, register, id, elements = [] } = props;

	const [fieldsClickHandler] = useRegistrations(register, [
		[FieldKind.FIELDS, id]
	]);

	const mappableElements = (
		elements.length &&
		props.elements.slice(0, maximumElementsAmount || elements.length)
	) || [{}] as RowProps["elements"];

	const mappedElements = mappableElements.map((data, index) => {
		const fieldID = `${id}.${index}`;
		// in order to not pass react key property

		return (
			<Field
				key={fieldID}
				onClick={() => fieldsClickHandler(data.key ?? null)}
				fieldData={data}
			>
				<FieldLabel fieldData={data} />
				<FieldValue fieldData={data} />
			</Field>
		);
	});

	return (
		<>
			{mappedElements}
		</>
	);
}

/**
 * TextFields-only row, wrapped in a
 * flex element.
 *
 * @param props
 */

export default function FieldsRow(props: RowProps) {
	return (
		<div className="text-fields-row">
			<InlineFieldsRow {...props} />
		</div>
	);
}