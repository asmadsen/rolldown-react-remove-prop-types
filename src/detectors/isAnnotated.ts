import type { Comment, Node } from "estree";

/**
 * Check if a node has a trailing comment with "remove-proptypes" annotation
 */
export function isAnnotatedForRemoval(
	node: Node & { trailingComments?: Comment[] },
): boolean {
	const comments = node.trailingComments || [];
	return comments.some(
		(comment) => comment.value.trim() === "remove-proptypes",
	);
}
