import * as React from "react";
import "./style.less";
import PageHeader from "../Header";
import { PageProps } from "../pages";
import FieldPreview from "../FieldsPreviewPage/FieldPreview";
import { FieldProps } from "../../../../passes/Areas/components/Field";
import FieldPropertiesEditList from "../FieldsPreviewPage/FieldsDrawerElement/FieldPropertiesEditList";

interface Props extends PageProps {
	fieldData: FieldProps;
	onFieldPropsChange(props: any): void;
}

export default function FieldsPropertiesEditPage(props: Props) {
	const [data, setData] = React.useState(props.fieldData);

	return (
		<div id="fields-properties-edit-page">
			<PageHeader />
			<FieldPreview
				keyEditable
				onFieldKeyChange={(evt) => console.log("Changed", evt)}
				previewData={data}
			/>
			<FieldPropertiesEditList />
		</div>
	);
}