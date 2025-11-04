import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/rollup.ts"],
	format: ["cjs", "esm"],
	clean: true,
	dts: true,
});
