import type { ClassDeclaration, ClassExpression, Node } from "estree";
import type { NormalizedOptions } from "../types.js";
import { isIdentifier, matchesPattern } from "../utils/ast.js";

/**
 * Check if a node represents a React Component or PureComponent
 */
export function isReactClass(
	superClass: Node | null | undefined,
	options: NormalizedOptions,
): boolean {
	if (!superClass) return false;

	// Check for React.Component or React.PureComponent
	if (
		matchesPattern(superClass, "React.Component") ||
		matchesPattern(superClass, "React.PureComponent")
	) {
		return true;
	}

	// Check for Component or PureComponent
	if (isIdentifier(superClass)) {
		if (
			superClass.name === "Component" ||
			superClass.name === "PureComponent"
		) {
			return true;
		}

		// Check against custom class name matchers
		if (options.classNameMatchersRegex?.test(superClass.name)) {
			return true;
		}
	}

	return false;
}

/**
 * Check if a class declaration/expression is a React component
 */
export function isReactClassDeclaration(
	node: ClassDeclaration | ClassExpression,
	options: NormalizedOptions,
): boolean {
	return isReactClass(node.superClass, options);
}
