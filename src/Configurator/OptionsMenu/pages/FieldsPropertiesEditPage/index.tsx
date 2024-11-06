import * as React from "react";
import { Constants, PassMixedProps } from "@pkvd/pass";
import * as Store from "@pkvd/store";
import PageHeader from "../components/Header";
import FieldPreview from "../components/FieldPreview";
import FieldPropertiesEditList from "./FieldPropertiesEditList";
import { PageContainer } from "../../PageContainer";
import { PageProps } from "../../navigation.utils";
import { connect } from "react-redux";
import { TemplateParameterProps } from "../../../Viewer";

type PassField = Constants.PassField;

interface Props extends PageProps {
	selectedField?: PassField[];
	fieldUUID: string;
	changePassPropValue?: typeof Store.Pass.setProp;
	templateParameters: Array<TemplateParameterProps>;
}

class FieldsPropertiesEditPage extends React.Component<Props> {
	private dataIndex: number;

	constructor(props: Props) {
		super(props);

		this.dataIndex = this.props.selectedField.findIndex(
			(field) => field.fieldUUID === this.props.fieldUUID
		);

		this.updateValue = this.updateValue.bind(this);
		this.updatePassProp = this.updatePassProp.bind(this);
		this.updateKey = this.updateKey.bind(this);
	}

	updateValue(newData: PassField) {
		const allFieldsCopy = [...this.props.selectedField];
		allFieldsCopy.splice(this.dataIndex, 1, newData);

		this.props.changePassPropValue(this.props.name as keyof PassMixedProps, allFieldsCopy);
	}

	updatePassProp<T>(prop: string, value: T) {
		this.updateValue({ ...this.props.selectedField[this.dataIndex], [prop]: value });
	}

	updatePassProps<T>(props: Object) {
		this.updateValue({ ...this.props.selectedField[this.dataIndex], ...props });
	}

	updateKey(value: string) {
		const parameter = this.props.templateParameters.find((parameter) => parameter.name === value);
		const newProps = { key: value };

		if (!!parameter) {
			newProps['label'] = parameter.label;
			newProps['value'] = parameter.name;
		}

		this.updatePassProps(newProps);
	}

	render() {
		const current = this.props.selectedField[this.dataIndex];

		return (
			<PageContainer>
				<div id="fields-properties-edit-page">
					<PageHeader onBack={this.props.onBack} />
					<FieldPreview
						keyEditable
						onFieldKeyChange={this.updateKey}
						previewData={current}
						templateParameters={this.props.templateParameters}
					/>
					<FieldPropertiesEditList data={current} onValueChange={this.updatePassProp} />
				</div>
			</PageContainer>
		);
	}
}

export default connect(
	(store: Store.State, ownProps: Props) => {
		const { pass } = store;

		const selectedField = pass[ownProps.name as keyof Constants.PassFields];

		return {
			selectedField,
		};
	},
	{
		changePassPropValue: Store.Pass.setProp,
	}
)(FieldsPropertiesEditPage);
