import * as React from "react";
import { SharedPanelProps } from "..";
import { FieldKind } from "../../../../../../model";
import useContentSavingHandler from "../useContentSavingHandler";
import CapitalHeaderTitle from "../../../components/CapitalHeaderTitle";
import CommittableCreatableSelect from "../../../../../CommittableCreatableSelect";
import { TemplateParameterProps } from "../../../../../Viewer";

interface TextPanelProps extends SharedPanelProps {
	value?: string;
	templateParameters: Array<TemplateParameterProps>;
	error: boolean;
}

export default function TextPanel(props: TextPanelProps) {
	const [content, onContentSave] = useContentSavingHandler(
		props.onValueChange,
		props.name,
		props.value
	);
	const inputRef = React.useRef<HTMLInputElement>();
	const required = (props.data.required && <span className="required" />) || null;

	if (props.isSelected) {
		inputRef.current?.focus();
	}

	return (
		<div className={`panel ${FieldKind.TEXT}`} data-name={props.name}>
			<label htmlFor={props.name}>
				<CapitalHeaderTitle name={props.name} />
				{required}
			</label>
			<CommittableCreatableSelect
				ref={inputRef}
				id={props.name}
				placeholder={props.name}
				defaultValue={content}
				commit={onContentSave}
				options={props.templateParameters.map((parameter) => {
					return ({ value: parameter.name, label: parameter.label });
				})}
			/>
			{props.error && (<div className="field-error">Field is required</div>)}
		</div>
	);
}
