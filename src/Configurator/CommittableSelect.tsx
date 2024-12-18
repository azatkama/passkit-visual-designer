import * as React from "react";
import { OptionProps } from "./CommittableCreatableSelect";
import Select from "react-select";

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
	commit(value: string|number|readonly string[]): void;
	options: Array<OptionProps>;
}

export default React.forwardRef(function CommittableSelect(
	props: Props,
	ref: React.RefObject<HTMLInputElement>
) {
	const {
		commit,
		defaultValue,
		options,
		placeholder,
		...inputProps
	} = props;

	return (
		<Select
			ref={ref}
			onChange={(newValue) => commit(newValue.value)}
			value={options.find((option) => option.value === defaultValue)}
			options={options}
			placeholder={placeholder}
			className="react-select-container"
			classNamePrefix="react-select"
			{...inputProps}
		/>
	);
});
