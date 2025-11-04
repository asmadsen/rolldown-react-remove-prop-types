import { createFilter } from "@rollup/pluginutils";
import type { FunctionPluginHooks } from "rolldown";
import type { TransformResult } from "rollup";

import { normalizeOptions } from "../core/options";
import type { PluginOptions } from "../types.js";

type TransformHandler = FunctionPluginHooks["transform"];

/**
 * Creates Rolldown filter configuration
 */
export function createRolldownFilter(
	options: PluginOptions,
	handler: TransformHandler,
) {
	const normalizedOptions = normalizeOptions(options);
	return {
		filter: {
			id: {
				include: options.include,
				exclude: [
					...(Array.isArray(options.exclude)
						? options.exclude
						: [options.exclude]),
					normalizedOptions.ignoreFilenamesRegex,
				].filter((it) => it !== undefined),
			},
		},
		handler,
	};
}

/**
 * Creates Rollup filter function that conditionally calls handler
 */
export function createRollupFilter(
	options: PluginOptions,
	handler: (code: string, id: string) => TransformResult | null,
): (code: string, id: string) => TransformResult | null {
	const normalizedOptions = normalizeOptions(options);
	const filter = createFilter(options.include, options.exclude);

	return function (code: string, id: string) {
		if (!filter(id)) return null;
		if (normalizedOptions.ignoreFilenamesRegex?.test(id)) return null;
		return handler(code, id);
	};
}
