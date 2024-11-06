import * as React from "react";
import Select from "react-select/creatable";

export interface OptionProps {
	value: number|string;
	label: number|string;
}

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
	commit(value: string|number|readonly string[]): void;
	options: Array<OptionProps>;
}

export default React.forwardRef(function CommittableCreatableSelect(
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

	const value = defaultValue ? (
		options.find((option) => option.value === defaultValue)
		|| { value: defaultValue, label: defaultValue }
	) : null;

	return (
		<Select
			ref={ref}
			onChange={(newValue) => commit(newValue.value)}
			value={value}
			placeholder={placeholder}
			options={options}
			className="react-select-container"
			classNamePrefix="react-select"
			createOptionPosition="first"
			{...inputProps}
		/>
	);
});
