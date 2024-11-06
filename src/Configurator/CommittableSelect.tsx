import * as React from "react";
import Select from "react-select";

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
	commit(value: string|number|readonly string[]): void;
	options: Array<Object>;
}

export default React.forwardRef(function CommittableSelect(
	props: Props,
	ref: React.RefObject<HTMLInputElement>
) {
	const {
		commit,
		defaultValue,
		options,
		...inputProps
	} = props;

	return (
		<Select
			ref={ref}
			onChange={commit}
			value={defaultValue}
			options={options}
			className="react-select-container"
			classNamePrefix="react-select"
			{...inputProps}
		/>
	);
});
