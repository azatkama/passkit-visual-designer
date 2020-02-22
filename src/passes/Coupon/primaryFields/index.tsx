import * as React from "react";
import { RegistrableComponent } from "../../Components/withRegistration";
import { Field, FieldValue, FieldLabel } from "../../Components/Field";
import { getSafeFieldData } from "../../utils";
import ImageField from "../../Components/ImageField";
import "./style.less";

export interface PrimaryFieldsProps extends Omit<RegistrableComponent, "id"> {
	className?: string;
	primaryFieldsData: Omit<Parameters<typeof Field>[0], keyof RegistrableComponent>[];
	stripSrc?: string;
}

export default function PrimaryFields(props: PrimaryFieldsProps): JSX.Element {
	const data = getSafeFieldData(props.primaryFieldsData, 1)
		.slice(0, 1)
		.map((fieldData, index) => {
			const labelId = `primaryFields.${index}.label`;
			const valueId = `primaryFields.${index}.value`;

			return (
				<>
					<FieldValue
						{...fieldData}
						id={valueId}
						onClick={props.onClick}
						register={props.register}
					/>
					<FieldLabel
						{...fieldData}
						id={labelId}
						onClick={props.onClick}
						register={props.register}
					/>
				</>
			);
		})

	return (
		<div className="primaryFields">
			<div className="row">
				{data}
			</div>
			<ImageField src={props.stripSrc} width="100%" id="primaryFields.stripImage" />
		</div>
	);
}
