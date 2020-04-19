import * as React from "react";
import Panel, { FieldDetails, PanelProps } from "./Panel";
import PanelGroup from "./PanelGroup";

interface Props {
	registeredPanels: Map<string, FieldDetails>;
}

export enum DataGroup {
	METADATA = "Metadata",
	IMAGES = "Images",
	COLORS = "Colors",
	DATA = "Data"
}

export default function OrganizedPanels(props: Props) {
	const allPanels = Array.from(props.registeredPanels.entries(), ([name, data]) => {
		const { kind, ...otherData } = data;
		return (
			<Panel
				name={name}
				kind={kind}
				data={otherData}
				key={name}
			/>
		);
	});

	const organizedPanels = allPanels.reduce((acc, current: React.ReactElement<PanelProps>) => {
		const { kind } = current.props;
		acc[kind] = [...(acc[kind] || []), current];
		return acc;
	}, {});

	return Object.keys(organizedPanels).map(groupName => (
		<PanelGroup
			name={groupName}
		>
			{organizedPanels[groupName]}
		</PanelGroup>
	));

}