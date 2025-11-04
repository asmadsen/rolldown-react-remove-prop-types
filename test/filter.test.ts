import { type RolldownPlugin, rolldown } from "rolldown";
import { describe, expect, it, vi } from "vitest";
import { normalizeOptions } from "../src/core/options.js";
import type { PluginOptions } from "../src/types.js";
import {
	createRolldownFilter,
	createRollupFilter,
} from "../src/utils/filter.js";

const sampleCode = `export default {};`;

async function bundle(files: string[], plugin: RolldownPlugin) {
	const rolldownBundle = await rolldown({
		input: files,
		plugins: [
			{
				name: "virtual",
				resolveId(id) {
					if (files.includes(id)) return id;
					return null;
				},
				load(id) {
					if (files.includes(id)) return sampleCode;
					return null;
				},
			},
			plugin,
		],
	});
	await rolldownBundle.generate({ format: "esm" });
}

const testCases: {
	name: string;
	options: PluginOptions;
	files: string[];
	expectedFiltered: string[];
}[] = [
	{
		name: "include string pattern",
		options: { include: "**/*.jsx" },
		files: [
			"/src/Component.jsx",
			"/src/Component.js",
			"/src/Component.tsx",
			"/lib/utils.ts",
		],
		expectedFiltered: ["/src/Component.jsx"],
	},
	{
		name: "include array of patterns",
		options: { include: ["**/*.jsx", "**/*.tsx"] },
		files: ["/src/Component.jsx", "/src/Component.tsx", "/src/Component.js"],
		expectedFiltered: ["/src/Component.jsx", "/src/Component.tsx"],
	},
	{
		name: "exclude string pattern",
		options: { exclude: "**/node_modules/**" },
		files: ["/src/Component.js", "/node_modules/lib/Component.js"],
		expectedFiltered: ["/src/Component.js"],
	},
	{
		name: "exclude array of patterns",
		options: { exclude: ["**/node_modules/**", "**/*.test.js"] },
		files: [
			"/src/Component.js",
			"/node_modules/lib/Component.js",
			"/src/Component.test.js",
		],
		expectedFiltered: ["/src/Component.js"],
	},
	{
		name: "include and exclude combined",
		options: { include: "**/*.js", exclude: "**/*.test.js" },
		files: [
			"/src/Component.js",
			"/src/Component.test.js",
			"/src/Component.tsx",
		],
		expectedFiltered: ["/src/Component.js"],
	},
	{
		name: "regex pattern",
		options: { include: /\.jsx?$/ },
		files: ["/src/Component.js", "/src/Component.jsx", "/src/Component.ts"],
		expectedFiltered: ["/src/Component.js", "/src/Component.jsx"],
	},
	{
		name: "ignoreFilenames",
		options: { ignoreFilenames: ["node_modules"] },
		files: ["/src/Component.js", "/node_modules/Component.js"],
		expectedFiltered: ["/src/Component.js"],
	},
	{
		name: "ignoreFilenames with multiple patterns",
		options: { ignoreFilenames: ["node_modules", ".spec", ".test"] },
		files: [
			"/src/Component.js",
			"/node_modules/Component.js",
			"/src/Component.spec.js",
			"/src/Component.test.js",
		],
		expectedFiltered: ["/src/Component.js"],
	},
	{
		name: "exclude and ignoreFilenames combined",
		options: { exclude: "**/*.config.js", ignoreFilenames: ["node_modules"] },
		files: [
			"/src/Component.js",
			"/src/rollup.config.js",
			"/node_modules/Component.js",
		],
		expectedFiltered: ["/src/Component.js"],
	},
]; //.filter((it) => it.name === "include array of patterns");

const allTestFiles = [...new Set(testCases.flatMap((it) => it.files))];

testCases.push({
	name: "no filters (transform all)",
	options: {},
	files: allTestFiles,
	expectedFiltered: allTestFiles,
});

describe("Filter helpers", () => {
	it.each(testCases)(
		"$name - both helpers filter identically",
		async ({ options, files, expectedFiltered }) => {
			// Create tracking arrays for mock calls
			const rolldownCalls: string[] = [];
			const rollupCalls: string[] = [];

			// Create handler functions that track calls
			const rolldownHandler = (code: string, id: string) => {
				rolldownCalls.push(id);
				return { code };
			};

			const rollupHandler = (code: string, id: string) => {
				rollupCalls.push(id);
				return { code };
			};

			await bundle(files, {
				name: "test-rolldown-filter",
				transform: createRolldownFilter(options, rolldownHandler),
			});

			await bundle(files, {
				name: "test-rollup-filter",
				transform: createRollupFilter(options, rollupHandler),
			});

			// Both handlers should be called same number of times
			expect(rolldownCalls.length).toBe(rollupCalls.length);

			// Both should be called with same file IDs
			expect(rolldownCalls.sort()).toEqual(rollupCalls.sort());

			// Should match expected filtered files
			expect({
				rolldownCalls: rolldownCalls.sort(),
				rollupCalls: rollupCalls.sort(),
			}).toEqual({
				rolldownCalls: expectedFiltered.sort(),
				rollupCalls: expectedFiltered.sort(),
			});
		},
	);
});
