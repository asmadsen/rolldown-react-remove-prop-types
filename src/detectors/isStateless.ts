import type {
	ArrowFunctionExpression,
	CallExpression,
	FunctionDeclaration,
	Node,
	VariableDeclarator,
} from "estree";
import { walk } from "estree-walker";
import { isIdentifier, matchesPattern } from "../utils/ast.js";

/**
 * Check if a node contains JSX elements or React.createElement calls
 */
function hasJSXOrReactCreateElement(node: Node): boolean {
	let found = false;

	walk(node as any, {
		enter(node: any) {
			// JSX elements (acorn-jsx adds these)
			if (node.type === "JSXElement" || node.type === "JSXFragment") {
				found = true;
				this.skip();
				return;
			}

			// React.createElement or React.cloneElement
			if (node.type === "CallExpression") {
				const callee = (node as CallExpression).callee;
				if (
					matchesPattern(callee, "React.createElement") ||
					matchesPattern(callee, "React.cloneElement") ||
					(isIdentifier(callee) && callee.name === "cloneElement")
				) {
					found = true;
					this.skip();
					return;
				}
			}
		},
	});

	return found;
}

/**
 * Check if a function returns JSX or React elements
 */
function returnsJSXElement(node: Node): boolean {
	// Arrow functions with implicit return
	if (
		node.type === "ArrowFunctionExpression" &&
		(node as ArrowFunctionExpression).body.type !== "BlockStatement"
	) {
		return hasJSXOrReactCreateElement((node as ArrowFunctionExpression).body);
	}

	// Check if the function or any nested code contains JSX
	return hasJSXOrReactCreateElement(node);
}

/**
 * Check if a variable declarator or function declaration is a stateless component
 */
export function isStatelessComponent(
	node: VariableDeclarator | FunctionDeclaration,
): boolean {
	// Function declarations
	if (node.type === "FunctionDeclaration") {
		return returnsJSXElement(node);
	}

	// Variable declarators with function init
	if (node.type === "VariableDeclarator" && node.init) {
		const init = node.init;

		// Arrow functions or function expressions
		if (
			init.type === "ArrowFunctionExpression" ||
			init.type === "FunctionExpression"
		) {
			return returnsJSXElement(init);
		}

		// React.memo, React.forwardRef, etc.
		if (init.type === "CallExpression") {
			const callee = init.callee;
			// Check if it's React.memo, React.forwardRef, etc.
			if (
				matchesPattern(callee, "React.memo") ||
				matchesPattern(callee, "React.forwardRef") ||
				(isIdentifier(callee) &&
					(callee.name === "memo" || callee.name === "forwardRef"))
			) {
				// Check if the first argument contains JSX
				if (init.arguments[0]) {
					return hasJSXOrReactCreateElement(init.arguments[0]);
				}
			}
		}
	}

	return false;
}
