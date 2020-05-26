import * as React from "react";
import EmptyField from ".";

export default function useFallback<T, P>(create: () => T, deps: any[]) {
	if (deps.every(dep => !Boolean(dep))) {
		return (
			<EmptyField />
		);
	}

	return create();
}