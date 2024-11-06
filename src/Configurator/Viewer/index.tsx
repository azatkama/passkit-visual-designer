import * as React from "react";
import Pass, { PassProps, Constants, PassMixedProps } from "@pkvd/pass";
import { createClassName } from "../../utils";
import CommittableTextInput from "../CommittableTextInput";
import type { TranslationsSet } from "@pkvd/store";
import CommittableSelect from "../CommittableSelect";

type PassField = Constants.PassField;

export interface TemplateParameterProps {
	id: number;
	name: string;
	label: string;
}

export interface TemplateProps {
	id: number;
	name: string;
	templateParameters: Array<TemplateParameterProps>;
}

export interface ViewerProps extends Pick<PassProps, "showBack"> {
	passProps: PassMixedProps;
	translationSet: TranslationsSet;
	showEmpty: boolean;
	onVoidClick(e: React.MouseEvent): void;
	projectTitle?: string;
	projectTemplateId?: number;
	changeProjectTitle(title: string): void;
	changeProjectTemplateId(id: string|number|readonly string[]): void;
	templates: Array<TemplateProps>;
}

export default function Viewer(props: ViewerProps) {
	const {
		changeProjectTitle,
		changeProjectTemplateId,
		onVoidClick,
		projectTitle = "",
		projectTemplateId = null,
		showBack,
		passProps
	} = props;

	const viewerCN = createClassName(["viewer"], {
		"no-empty": !props.showEmpty,
	});

	const passUIProps = { ...passProps };

	if (props.translationSet?.enabled) {
		const translations = Object.values(props.translationSet.translations);

		Object.assign(passUIProps, {
			primaryFields: localizeFieldContent(passProps["primaryFields"], translations),
			secondaryFields: localizeFieldContent(passProps["secondaryFields"], translations),
			auxiliaryFields: localizeFieldContent(passProps["auxiliaryFields"], translations),
			backFields: localizeFieldContent(passProps["backFields"], translations),
			headerFields: localizeFieldContent(passProps["headerFields"], translations),
		});
	}

	return (
		<div className={viewerCN} onClick={onVoidClick}>
			<div className="project-title-box">
				<CommittableTextInput
					selectOnFocus
					defaultValue={projectTitle}
					placeholder="Untitled Project"
					commit={changeProjectTitle}
				/>
			</div>
			<div className="project-templates">
				<CommittableSelect
					defaultValue={projectTemplateId}
					placeholder="Choose Template"
					commit={changeProjectTemplateId}
					options={props.templates.map(({ id, name }) => {
						return { value: id, label: name };
					})}
				/>
			</div>
			<Pass {...passUIProps} showBack={showBack} />
		</div>
	);
}

function localizeFieldContent(
	field: PassField[],
	translations: Array<TranslationsSet["translations"][0]>,
) {
	if (!field) {
		return field;
	}

	return field.reduce((acc, field) => {
		const localizableElements = { label: field.label, value: field.value };

		return [
			...acc,
			Object.assign(
				{ ...field },
				Object.entries(localizableElements).reduce((acc, [key, element]) => {
					if (!element) {
						return acc;
					}

					return {
						...acc,
						[key]: translations.find(([placeholder]) => placeholder === element)?.[1] ?? element,
					};
				}, {})
			),
		];
	}, []);
}
