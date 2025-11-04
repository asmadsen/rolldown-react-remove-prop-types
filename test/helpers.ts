import type { RolldownPlugin } from "rolldown";
import { rolldown } from "rolldown";
import type { Plugin as RollupPlugin } from "rollup";
import { rollup } from "rollup";

interface TransformOptions<T> {
	plugin: T;
	filename: string;
}

/**
 * Transform code using Rollup with the given plugin
 */
export async function transformRollup(
	options: TransformOptions<RollupPlugin>,
): Promise<string> {
	const { plugin, filename } = options;

	const bundle = await rollup({
		input: filename,
		jsx: "preserve",
		treeshake: false,
		plugins: [plugin],
		external: () => true, // Treat all imports as external
		onwarn: () => {}, // Suppress warnings
	});

	const { output } = await bundle.generate({
		format: "esm",
		exports: "auto",
	});

	return output[0].code;
}

/**
 * Transform code using Rolldown with the given plugin
 */
export async function transformRolldown(
	options: TransformOptions<RolldownPlugin>,
): Promise<string> {
	const { plugin, filename } = options;

	const bundle = await rolldown({
		input: filename,
		moduleTypes: {
			".js": "jsx",
		},
		treeshake: false,
		plugins: [plugin],
		platform: "neutral",
		external: () => true, // Treat all imports as external
	});

	const { output } = await bundle.generate({
		format: "esm",
		exports: "auto",
	});

	return output[0].code;
}

/**
 * Normalize code for comparison (remove excessive whitespace)
 */
export function normalize(code: string): string {
	return (
		code
			.trim()
			.replace(/\n[^\n\S]+\n/g, "\n\n")
			// Remove multiple blank lines
			.replace(/\n{3,}/g, "\n\n")
			// Normalize line endings
			.replace(/\r\n/g, "\n")
	);
}
