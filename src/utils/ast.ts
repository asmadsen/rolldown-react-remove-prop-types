import type { Node as BaseNode, Identifier, MemberExpression } from "estree";

// Acorn adds start/end to nodes
export type Node = BaseNode & { start: number; end: number };
export type NodeWithLocation<T = BaseNode> = T & { start: number; end: number };

/**
 * Check if a node is an Identifier
 */
export function isIdentifier(
	node: BaseNode | null | undefined,
): node is Identifier & NodeWithLocation {
	return node?.type === "Identifier";
}

/**
 * Check if a node is a MemberExpression
 */
export function isMemberExpression(
	node: BaseNode | null | undefined,
): node is MemberExpression & NodeWithLocation {
	return node?.type === "MemberExpression";
}

/**
 * Type guard to check if a node has location information
 */
export function hasLocation<T = BaseNode>(
	node: T | null | undefined,
): node is T & { start: number; end: number } {
	return (
		node != null &&
		typeof (node as { start?: number }).start === "number" &&
		typeof (node as { end?: number }).end === "number"
	);
}

/**
 * Check if member expression matches a pattern like "React.Component"
 */
export function matchesPattern(
	node: BaseNode | null | undefined,
	pattern: string,
): boolean {
	if (!isMemberExpression(node)) return false;

	const parts = pattern.split(".");
	let current: BaseNode | null | undefined = node;

	for (let i = parts.length - 1; i >= 0; i--) {
		if (!isMemberExpression(current)) {
			return isIdentifier(current) && current.name === parts[i];
		}

		if (!isIdentifier(current.property)) return false;
		if (current.property.name !== parts[i]) return false;

		current = current.object;
	}

	return true;
}

/**
 * Get the name of an identifier or member expression
 */
export function getNodeName(node: BaseNode | null | undefined): string | null {
	if (isIdentifier(node)) {
		return node.name;
	}
	if (isMemberExpression(node) && isIdentifier(node.property)) {
		return node.property.name;
	}
	return null;
}

/**
 * Check if a comment contains the remove-proptypes annotation
 */
export function hasRemoveAnnotation(
	comments?: Array<{ type: string; value: string }>,
): boolean {
	if (!comments) return false;
	return comments.some(
		(comment) => comment.value.trim() === "remove-proptypes",
	);
}
