import { createFilter } from "@rollup/pluginutils";
import { parse } from "acorn";
import type {
	AssignmentExpression,
	ClassDeclaration,
	VariableDeclarator,
} from "estree";
import { walk } from "estree-walker";
import MagicString from "magic-string";
import type { Plugin } from "rollup";
import { isAnnotatedForRemoval } from "./detectors/isAnnotated.js";
import { isReactClassDeclaration } from "./detectors/isReactClass.js";
import { isStatelessComponent } from "./detectors/isStateless.js";
import type {
	NormalizedOptions,
	PluginOptions,
	TransformMode,
} from "./types.js";
import {
	type Node as AcornNode,
	isIdentifier,
	isMemberExpression,
} from "./utils/ast.js";

const DEFAULT_LIBRARIES = ["prop-types"];

function normalizeOptions(options: PluginOptions = {}): NormalizedOptions {
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

/**
 * Rollup plugin to remove React PropTypes from production builds
 */
export default function removePropTypes(options: PluginOptions = {}): Plugin {
	const normalizedOptions = normalizeOptions(options);
	const filter = createFilter(options.include, options.exclude);

	return {
		name: "remove-prop-types",

		transform(code: string, id: string) {
			// Apply include/exclude filters
			if (!filter(id)) return null;

			// Check ignoreFilenames
			if (normalizedOptions.ignoreFilenamesRegex?.test(id)) {
				return null;
			}

			// Parse the code
			let ast: AcornNode;
			try {
				ast = parse(code, {
					ecmaVersion: "latest",
					sourceType: "module",
				}) as unknown as AcornNode;
			} catch {
				return null;
			}

			const s = new MagicString(code);
			const nodesToRemove: Array<{ start: number; end: number }> = [];

			// Track variable declarators to find components
			const componentDeclarators = new Map<
				string,
				VariableDeclarator | ClassDeclaration
			>();

			// First pass: identify components
			walk(ast as any, {
				enter(node: any) {
					// Class components
					if (node.type === "ClassDeclaration") {
						const classNode = node as ClassDeclaration;
						if (
							classNode.id &&
							isReactClassDeclaration(classNode, normalizedOptions)
						) {
							componentDeclarators.set(classNode.id.name, classNode);
						}
					}

					// Variable declarators (potential functional components)
					if (node.type === "VariableDeclarator") {
						const varNode = node as VariableDeclarator;
						if (isIdentifier(varNode.id) && isStatelessComponent(varNode)) {
							componentDeclarators.set(varNode.id.name, varNode);
						}
					}
				},
			});

			// Second pass: find and mark propTypes assignments for removal
			walk(ast as any, {
				enter(node: any, parent: any) {
					// Handle assignments like: Component.propTypes = {...}
					if (node.type === "AssignmentExpression") {
						const assignment = node as AssignmentExpression & AcornNode;

						if (
							isMemberExpression(assignment.left) &&
							!assignment.left.computed &&
							isIdentifier(assignment.left.property) &&
							assignment.left.property.name === "propTypes"
						) {
							// Check for annotation
							const hasAnnotation = isAnnotatedForRemoval(
								assignment.left as any,
							);

							// Get component name
							const componentName = isIdentifier(assignment.left.object)
								? assignment.left.object.name
								: null;

							// Check if this is a component
							const isComponent =
								componentName && componentDeclarators.has(componentName);

							if (hasAnnotation || isComponent) {
								// Mark the entire statement for removal
								if (parent?.type === "ExpressionStatement") {
									const parentNode = parent as AcornNode;
									nodesToRemove.push({
										start: parentNode.start,
										end: parentNode.end,
									});
								} else {
									nodesToRemove.push({
										start: assignment.start,
										end: assignment.end,
									});
								}
							}
						}
					}

					// Handle static class properties (if supported by parser)
					// PropertyDefinition for class fields
					if (
						node.type === "PropertyDefinition" ||
						node.type === "ClassProperty"
					) {
						const prop = node as any;
						const nodeWithPos = node as AcornNode;
						if (
							isIdentifier(prop.key) &&
							prop.key.name === "propTypes" &&
							prop.static &&
							parent?.type === "ClassBody"
						) {
							nodesToRemove.push({
								start: nodeWithPos.start,
								end: nodeWithPos.end,
							});
						}
					}
				},
			});

			// Remove marked nodes
			for (const { start, end } of nodesToRemove) {
				s.remove(start, end);
			}

			if (!s.hasChanged()) {
				return null;
			}

			return {
				code: s.toString(),
				map: s.generateMap({ hires: true }),
			};
		},
	};
}
