import type { RolldownPlugin } from "rolldown";
import { normalizeOptions } from "./core/options.js";
import { transformCode } from "./core/transform.js";
import type { PluginOptions } from "./types.js";
import { createRolldownFilter } from "./utils/filter.js";

/**
 * Rolldown plugin to remove React PropTypes from production builds
 */
export default function removePropTypes(
	options: PluginOptions = {},
): RolldownPlugin {
	const normalizedOptions = normalizeOptions(options);

	return {
		name: "remove-prop-types",

		transform: createRolldownFilter(options, (code, id, ...args) =>
			transformCode(code, id, normalizedOptions),
		),
	} satisfies RolldownPlugin;
}
