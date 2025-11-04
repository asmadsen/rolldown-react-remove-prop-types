import { Parser } from "acorn";
import jsx from "acorn-jsx";
import type {
	AssignmentExpression,
	ClassDeclaration,
	FunctionDeclaration,
	ImportDeclaration,
	VariableDeclarator,
} from "estree";
import { walk } from "estree-walker";
import MagicString from "magic-string";
import { isAnnotatedForRemoval } from "../detectors/isAnnotated.js";
import { isReactClassDeclaration } from "../detectors/isReactClass.js";
import { isStatelessComponent } from "../detectors/isStateless.js";
import type { NormalizedOptions } from "../types.js";
import {
	type Node as AcornNode,
	hasLocation,
	isIdentifier,
	isMemberExpression,
} from "../utils/ast.js";

const jsxParser = Parser.extend(jsx());

export interface TransformResult {
	code: string;
	map: ReturnType<MagicString["generateMap"]>;
}

export function transformCode(
	code: string,
	id: string,
	normalizedOptions: NormalizedOptions,
): TransformResult | null {
	const { mode, removeImport } = normalizedOptions;

	// Validate removeImport option
	if (removeImport && mode !== "remove") {
		throw new Error(
			"transform-react-remove-prop-types: removeImport = true and mode != 'remove' cannot be used at the same time.",
		);
	}

	// Parse the code
	let ast: AcornNode;
	try {
		ast = jsxParser.parse(code, {
			ecmaVersion: "latest",
			sourceType: "module",
		}) as unknown as AcornNode;
	} catch {
		return null;
	}

	const s = new MagicString(code);
	const nodesToRemove: Array<{
		start: number;
		end: number;
		replacement?: string;
	}> = [];
	const nodesToInsertAfter: Array<{
		targetEnd: number;
		code: string;
	}> = [];

	// Build parent map for easier parent traversal
	const parentMap = new Map<AcornNode, AcornNode>();

	// Track variable declarators to find components
	const componentDeclarators = new Map<
		string,
		{
			node: VariableDeclarator | ClassDeclaration | FunctionDeclaration;
			classNode?: AcornNode;
		}
	>();

	// For removeImport: track imported identifiers
	const importedIdentifiers = new Map<string, { start: number; end: number }>();
	const usedIdentifiers = new Set<string>();

	// Single AST walk to do everything
	walk(ast, {
		enter(node, parent) {
			// Build parent map
			if (parent) {
				parentMap.set(node as AcornNode, parent as AcornNode);
			}

			// Track imports for removeImport feature
			if (
				removeImport &&
				mode === "remove" &&
				node.type === "ImportDeclaration"
			) {
				const importNode = node as ImportDeclaration & AcornNode;
				const source = importNode.source.value as string;

				const isTrackedLibrary = Array.from(normalizedOptions.libraries).some(
					(lib) => {
						if (lib instanceof RegExp) {
							return lib.test(source);
						}
						return source === lib;
					},
				);

				if (isTrackedLibrary) {
					for (const specifier of importNode.specifiers) {
						if (
							specifier.type === "ImportDefaultSpecifier" ||
							specifier.type === "ImportSpecifier" ||
							specifier.type === "ImportNamespaceSpecifier"
						) {
							importedIdentifiers.set(specifier.local.name, {
								start: importNode.start,
								end: importNode.end,
							});
						}
					}
				}
			}

			// Track usage of imported identifiers
			if (removeImport && mode === "remove" && node.type === "Identifier") {
				if (importedIdentifiers.has(node.name)) {
					// Skip if this is in an ImportDeclaration (the import itself)
					if (
						parent?.type === "ImportDefaultSpecifier" ||
						parent?.type === "ImportSpecifier" ||
						parent?.type === "ImportNamespaceSpecifier"
					) {
						return;
					}

					// We'll check if it's in a removed node later
					usedIdentifiers.add(node.name);
				}
			}

			// Class components
			if (node.type === "ClassDeclaration") {
				const classNode = node as ClassDeclaration;
				if (
					classNode.id &&
					isReactClassDeclaration(classNode, normalizedOptions)
				) {
					componentDeclarators.set(classNode.id.name, {
						node: classNode,
						classNode: node as AcornNode,
					});
				}
			}

			// Function declarations (potential functional components)
			if (node.type === "FunctionDeclaration") {
				const funcNode = node as FunctionDeclaration;
				if (funcNode.id && isStatelessComponent(funcNode)) {
					componentDeclarators.set(funcNode.id.name, { node: funcNode });
				}
			}

			// Variable declarators (potential functional components)
			if (node.type === "VariableDeclarator") {
				const varNode = node as VariableDeclarator;
				if (isIdentifier(varNode.id) && isStatelessComponent(varNode)) {
					componentDeclarators.set(varNode.id.name, { node: varNode });
				}
			}
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
					const hasAnnotation = isAnnotatedForRemoval(assignment.left);

					// Get component name
					const componentName = isIdentifier(assignment.left.object)
						? assignment.left.object.name
						: null;

					// Check if this is a component
					const isComponent =
						componentName && componentDeclarators.has(componentName);

					if (hasAnnotation || isComponent) {
						if (
							!hasLocation(assignment.left) ||
							!hasLocation(assignment.right)
						) {
							return;
						}
						const leftCode = s.slice(
							assignment.left.start,
							assignment.left.end,
						);
						const rightCode = s.slice(
							assignment.right.start,
							assignment.right.end,
						);

						if (mode === "wrap") {
							// Wrap: Component.propTypes = process.env.NODE_ENV !== "production" ? {...} : {}
							const replacement = `${leftCode} = process.env.NODE_ENV !== "production" ? ${rightCode} : {}`;

							if (parent?.type === "ExpressionStatement") {
								const parentNode = parent as AcornNode;
								nodesToRemove.push({
									start: parentNode.start,
									end: parentNode.end,
									replacement,
								});
							} else {
								nodesToRemove.push({
									start: assignment.start,
									end: assignment.end,
									replacement,
								});
							}
						} else if (mode === "unsafe-wrap") {
							// Unsafe-wrap: process.env.NODE_ENV !== "production" ? Component.propTypes = {...} : void 0
							const assignmentCode = s.slice(assignment.start, assignment.end);
							const replacement = `process.env.NODE_ENV !== "production" ? ${assignmentCode} : void 0`;

							if (parent?.type === "ExpressionStatement") {
								const parentNode = parent as AcornNode;
								nodesToRemove.push({
									start: parentNode.start,
									end: parentNode.end,
									replacement,
								});
							} else if (parent?.type === "ConditionalExpression") {
								// Already in ternary, just replace with void 0
								nodesToRemove.push({
									start: assignment.start,
									end: assignment.end,
									replacement: "void 0",
								});
							} else {
								nodesToRemove.push({
									start: assignment.start,
									end: assignment.end,
									replacement,
								});
							}
						} else {
							// mode === 'remove'
							// Check if inside a ConditionalExpression (ternary)
							if (parent?.type === "ConditionalExpression") {
								// Replace entire ternary with void 0
								nodesToRemove.push({
									start: assignment.start,
									end: assignment.end,
									replacement: "void 0",
								});
							} else if (parent?.type === "ExpressionStatement") {
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
			}

			// Handle static class properties (if supported by parser)
			// PropertyDefinition for class fields
			if (
				node.type === "PropertyDefinition" // ||node.type === "ClassProperty"
			) {
				const prop = node;
				const nodeWithPos = node as AcornNode;
				if (
					isIdentifier(prop.key) &&
					prop.key.name === "propTypes" &&
					prop.static &&
					parent?.type === "ClassBody"
				) {
					if (mode === "wrap" || mode === "unsafe-wrap") {
						// Find the class declaration
						let classDecl: AcornNode | null = null;
						let className: string | null = null;

						// Walk up using parent map to find ClassDeclaration
						let currentNode: AcornNode | undefined = parent as AcornNode;
						while (currentNode) {
							if (currentNode.type === "ClassDeclaration") {
								const classNode = currentNode as ClassDeclaration & AcornNode;
								if (classNode.id) {
									classDecl = classNode;
									className = classNode.id.name;
								}
								break;
							}
							currentNode = parentMap.get(currentNode);
						}

						if (
							className &&
							classDecl &&
							prop.value &&
							hasLocation(prop.value)
						) {
							const valueCode = s.slice(prop.value.start, prop.value.end);
							const assignment =
								mode === "wrap"
									? `\n${className}.propTypes = process.env.NODE_ENV !== "production" ? ${valueCode} : {};`
									: `\nprocess.env.NODE_ENV !== "production" ? ${className}.propTypes = ${valueCode} : void 0;`;

							nodesToInsertAfter.push({
								targetEnd: classDecl.end,
								code: assignment,
							});

							// Remove the static property
							nodesToRemove.push({
								start: nodeWithPos.start,
								end: nodeWithPos.end,
							});
						}
					} else {
						// mode === 'remove'
						nodesToRemove.push({
							start: nodeWithPos.start,
							end: nodeWithPos.end,
						});
					}
				}
			}
		},
	});

	// Remove marked nodes (but not imports yet if removeImport is enabled)
	const importsToRemove: Array<{ start: number; end: number }> = [];

	for (const { start, end, replacement } of nodesToRemove) {
		if (replacement !== undefined) {
			s.overwrite(start, end, replacement);
		} else {
			s.remove(start, end);
		}
	}

	// Insert nodes after classes (for static property transforms)
	for (const { targetEnd, code: insertCode } of nodesToInsertAfter) {
		s.appendLeft(targetEnd, insertCode);
	}

	// Handle import removal if requested
	if (removeImport && mode === "remove") {
		// Check which imported identifiers are used in code that's NOT being removed
		const actuallyUsedIdentifiers = new Set<string>();

		for (const identifier of usedIdentifiers) {
			// Check if this identifier appears outside of removed nodes
			let foundOutsideRemovedNodes = false;

			walk(ast, {
				enter(node, parent) {
					if (node.type === "Identifier" && node.name === identifier) {
						// Skip if in import declaration
						if (
							parent?.type === "ImportDefaultSpecifier" ||
							parent?.type === "ImportSpecifier" ||
							parent?.type === "ImportNamespaceSpecifier"
						) {
							return;
						}

						const nodePos = (node as AcornNode).start;
						const isInRemovedNode = nodesToRemove.some(
							({ start, end }) => nodePos >= start && nodePos <= end,
						);

						if (!isInRemovedNode) {
							foundOutsideRemovedNodes = true;
						}
					}
				},
			});

			if (foundOutsideRemovedNodes) {
				actuallyUsedIdentifiers.add(identifier);
			}
		}

		// Mark imports for removal if none of their identifiers are used
		const importsStatus = new Map<string, Set<string>>();
		for (const [identifier, importPos] of importedIdentifiers.entries()) {
			const key = `${importPos.start}-${importPos.end}`;
			if (!importsStatus.has(key)) {
				importsStatus.set(key, new Set());
			}
			if (actuallyUsedIdentifiers.has(identifier)) {
				importsStatus.get(key)?.add("used");
			}
		}

		// Remove imports where no identifiers are used
		const importToRemove: Array<{ start: number; end: number }> = [];
		for (const [key, status] of importsStatus.entries()) {
			if (!status.has("used")) {
				const [start, end] = key.split("-").map(Number);
				if (start !== undefined && end !== undefined) {
					importToRemove.push({ start, end });
				}
			}
		}

		// Apply import removals
		for (const { start, end } of importToRemove) {
			s.remove(start, end);
		}
	}

	if (!s.hasChanged()) {
		return null;
	}

	return {
		code: s.toString(),
		map: s.generateMap({ hires: true }),
	};
}
