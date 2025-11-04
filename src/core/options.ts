import type {
	NormalizedOptions,
	PluginOptions,
	TransformMode,
} from "../types.js";

const DEFAULT_LIBRARIES = ["prop-types"];

export function normalizeOptions(
	options: PluginOptions = {},
): NormalizedOptions {
	const mode: TransformMode = options.mode || "remove";
	const removeImport = options.removeImport ?? false;

	const libraries = new Set<string | RegExp>([
		...DEFAULT_LIBRARIES,
		...(options.additionalLibraries || []),
	]);

	const ignoreFilenamesRegex = options.ignoreFilenames?.length
		? new RegExp(options.ignoreFilenames.join("|"), "i")
		: undefined;

	const classNameMatchersRegex = options.classNameMatchers?.length
		? new RegExp(options.classNameMatchers.join("|"))
		: undefined;

	return {
		mode,
		removeImport,
		ignoreFilenamesRegex,
		libraries,
		classNameMatchersRegex,
	};
}
