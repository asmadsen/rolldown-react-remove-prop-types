import type {
	ArrowFunctionExpression,
	CallExpression,
	FunctionDeclaration,
	Node,
	ReturnStatement,
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

	// Check for explicit return statements
	let returnsJSX = false;

	walk(node as any, {
		enter(childNode: any) {
			if (childNode.type === "ReturnStatement") {
				const returnStmt = childNode as ReturnStatement;
				if (
					returnStmt.argument &&
					hasJSXOrReactCreateElement(returnStmt.argument)
				) {
					returnsJSX = true;
					this.skip();
				}
			}

			// Don't traverse into nested functions
			if (
				childNode !== node &&
				(childNode.type === "FunctionDeclaration" ||
					childNode.type === "FunctionExpression" ||
					childNode.type === "ArrowFunctionExpression")
			) {
				this.skip();
			}
		},
	});

	return returnsJSX;
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
	}

	return false;
}
