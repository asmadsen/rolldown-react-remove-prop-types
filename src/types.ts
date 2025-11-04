export type TransformMode = "remove" | "wrap" | "unsafe-wrap";

type StringOrRegExp = string | RegExp;
type MaybeArray<T> = T | T[];

export type PluginOptions = {
	/**
	 * How to handle propTypes removal:
	 * - 'remove': Delete propTypes completely (default)
	 * - 'wrap': Wrap with process.env.NODE_ENV !== "production" ? {...} : {}
	 * - 'unsafe-wrap': Wrap with if (process.env.NODE_ENV !== "production") {...}
	 */
	mode?: TransformMode;

	/**
	 * Remove PropTypes imports when mode is 'remove'
	 * @default false
	 */
	removeImport?: boolean;

	/**
	 * File patterns to include/exclude
	 */
	include?: MaybeArray<StringOrRegExp>;
	exclude?: MaybeArray<StringOrRegExp>;

	/**
	 * Filenames matching these patterns will be ignored
	 * Patterns are joined with | to create a RegExp
	 */
	ignoreFilenames?: string[];

	/**
	 * Additional PropTypes-like libraries to remove
	 * Can be strings or RegExp patterns
	 */
	additionalLibraries?: (string | RegExp)[];

	/**
	 * Custom class names to treat as React components
	 * Patterns are joined with | to create a RegExp
	 */
	classNameMatchers?: string[];
};

export interface NormalizedOptions {
	mode: TransformMode;
	removeImport: boolean;
	ignoreFilenamesRegex?: RegExp;
	libraries: Set<string | RegExp>;
	classNameMatchersRegex?: RegExp;
}
