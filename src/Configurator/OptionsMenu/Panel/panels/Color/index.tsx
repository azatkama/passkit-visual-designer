import * as React from "react";
import { TwitterPicker, RGBColor, ColorResult } from "react-color";
import { PanelProps } from "../..";
import "./style.less";

interface ColorPanelProps extends PanelProps {
	value?: string;
}

export default function ColorPanel(props: ColorPanelProps) {
	const [color, setColor] = React.useState<string>(props.value || "rgb(0,0,0)");
	const showTitle = props.name.replace(/([a-z])([A-Z])/g, "$1 $2");

	// Default react-color hashes
	const { current: colorHistory } = React.useRef<string[]>([
		"#ff6900", "#fcb900", "#7bdcb5", "#00d084", "#8ed1fc",
		"#0693e3", "#abb8c3", "#eb144c", "#f78da7", "#9900ef"
	]);

	const onColorChange = React.useRef(({ rgb, hex }: ColorResult) => {
		const colorInRecentlyUsedIndex = colorHistory.indexOf(hex);

		if (colorInRecentlyUsedIndex === -1) {
			colorHistory.unshift(hex);
			colorHistory.pop(); // to keep them 10
		} else {
			colorHistory.unshift(...colorHistory.splice(colorInRecentlyUsedIndex, 1));
		}

		const rgbColor = rgbaToRGBString(rgb);
		setColor(rgbColor);
		props.onValueChange(props.name, rgbColor);
	});

	return (
		<>
			<h4>{showTitle}</h4>
			<TwitterPicker
				triangle="hide"
				// PR #403 on react-color: https://github.com/casesandberg/react-color/pull/403 TO FIX
				className="color-selector"
				color={color}
				colors={colorHistory}
				onChangeComplete={onColorChange.current}
			/>
		</>
	);
}

function rgbaToRGBString({ r, g, b }: RGBColor) {
	return `rgb(${r},${g},${b})`;
}
