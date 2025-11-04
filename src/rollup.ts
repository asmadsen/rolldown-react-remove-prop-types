import type { Plugin } from "rollup";
import { normalizeOptions } from "./core/options.js";
import { transformCode } from "./core/transform.js";
import type { PluginOptions } from "./types.js";
import { createRollupFilter } from "./utils/filter.js";

/**
 * Rollup adapter for remove-prop-types plugin
 */
export default function removePropTypes(options: PluginOptions = {}): Plugin {
	const normalizedOptions = normalizeOptions(options);

	return {
		name: "remove-prop-types",

		transform: createRollupFilter(options, (code, id) =>
			transformCode(code, id, normalizedOptions),
		),
	} satisfies Plugin;
}
