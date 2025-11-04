import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import removePropTypesRolldown from "../src/index.js";
import removePropTypesRollup from "../src/rollup.js";
import removePropTypes from "../src/rollup.js";
import type { PluginOptions } from "../src/types.js";
import { normalize, transformRolldown, transformRollup } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "fixtures");

const modes: Array<{ name: string; mode?: PluginOptions["mode"] }> = [
	{ name: "remove", mode: "remove" },
	{ name: "wrap", mode: "wrap" },
	{ name: "unsafe-wrap", mode: "unsafe-wrap" },
];

// Get all fixture directories
const fixtures = fs
	.readdirSync(fixturesDir)
	.filter((name) => {
		const fixtureDir = path.join(fixturesDir, name);
		return fs.statSync(fixtureDir).isDirectory();
	})
	.map((name) => {
		const fixtureDir = path.join(fixturesDir, name);
		const actualPath = path.join(fixtureDir, "actual.js");

		if (!fs.existsSync(actualPath)) {
			return null;
		}

		const input = fs.readFileSync(actualPath, "utf-8");

		// Load options if they exist
		let fixtureOptions: PluginOptions = {};
		const optionsPath = path.join(fixtureDir, "options.json");
		if (fs.existsSync(optionsPath)) {
			fixtureOptions = JSON.parse(fs.readFileSync(optionsPath, "utf-8"));
		}

		return {
			name,
			input,
			options: fixtureOptions,
			actualPath,
		};
	})
	.filter((it) => it !== null);

const bundler = [
	{
		name: "rolldown",
		bundle: (options: PluginOptions, filename: string) =>
			transformRolldown({
				plugin: removePropTypesRolldown(options),
				filename,
			}),
	},
	{
		name: "rollup",
		bundle: (options: PluginOptions, filename: string) =>
			transformRollup({
				plugin: removePropTypesRollup(options),
				filename,
			}),
	},
];

describe.each(bundler)("$name bundler", ({ bundle }) => {
	describe.each(fixtures)("$name", ({ input, options, actualPath }) => {
		it.each(modes)(
			"should transform correctly in $name mode",
			async ({ mode }) => {
				const output = await bundle(
					{
						mode,
					},
					actualPath,
				);

				const normalized = normalize(output);
				expect(normalized).toMatchSnapshot();
			},
		);

		it("should transform correctly with fixture options", async () => {
			const output = await bundle(options, actualPath);

			const normalized = normalize(output);
			expect(normalized).toMatchSnapshot();
		});
	});

	describe("removeImport option", () => {
		it("should remove PropTypes import when removeImport is true and mode is remove", async () => {
			const actualPath = path.join(
				__dirname,
				"fixtures/remove-import-proptypes/actual.js",
			);
			const input = fs.readFileSync(actualPath, "utf-8");

			const plugin = removePropTypes();

			const output = await bundle(
				{
					mode: "remove",
					removeImport: true,
				},
				actualPath,
			);

			// Should not contain ANY PropTypes import (not even side-effect import)
			expect(output).not.toContain("prop-types");
			// Should still have React import
			expect(output).toContain("import");
			expect(output).toContain("react");
		});

		it("should keep PropTypes import when it's used elsewhere", async () => {
			const actualPath = path.join(
				__dirname,
				"fixtures/dont-remove-used-import/actual.js",
			);

			const output = await bundle(
				{
					mode: "remove",
					removeImport: true,
				},
				actualPath,
			);

			// Should still contain prop-types import because it's used in contextTypes
			expect(output).toContain("prop-types");
		});

		it("should keep PropTypes import when removeImport is false", async () => {
			const actualPath = path.join(
				__dirname,
				"fixtures/remove-import-proptypes/actual.js",
			);

			const output = await bundle(
				{
					mode: "remove",
					removeImport: false,
				},
				actualPath,
			);

			// Should still contain prop-types import (even if just side-effect)
			// Rollup tree-shakes unused specifiers, so it becomes a side-effect import
			expect(output).toContain("prop-types");
		});

		it("should throw error when removeImport is true with wrap mode", async () => {
			const actualPath = path.join(
				__dirname,
				"fixtures/remove-import-proptypes/actual.js",
			);

			const output = removePropTypes({
				mode: "wrap",
				removeImport: true,
			});

			await expect(
				bundle(
					{
						mode: "wrap",
						removeImport: true,
					},
					actualPath,
				),
			).rejects.toThrow(/removeImport.*mode.*remove/i);
		});

		it("should throw error when removeImport is true with unsafe-wrap mode", async () => {
			const actualPath = path.join(
				__dirname,
				"fixtures/remove-import-proptypes/actual.js",
			);

			await expect(
				bundle(
					{
						mode: "unsafe-wrap",
						removeImport: true,
					},
					actualPath,
				),
			).rejects.toThrow(/removeImport.*mode.*remove/i);
		});
	});
});
