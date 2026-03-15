// Tree auto-layout algorithm for mind-map style node positioning
// Positions nodes in a top-down tree hierarchy

const NODE_WIDTH = 230; // approximate card width
const VERTICAL_GAP = 120; // gap between parent and children
const HORIZONTAL_GAP = 50; // gap between siblings

type LayoutNode = { id: string; x: number; y: number };
type LayoutEdge = { source: string; target: string };

interface TreeNode {
  id: string;
  children: TreeNode[];
  width: number; // subtree width for centering
}

/**
 * Compute tree layout positions for all nodes.
 * Returns a map of nodeId → { x, y } positions.
 */
export function computeTreeLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map();

  // Build adjacency: parent → children
  const childrenMap = new Map<string, string[]>();
  const hasParent = new Set<string>();

  for (const edge of edges) {
    if (!childrenMap.has(edge.source)) {
      childrenMap.set(edge.source, []);
    }
    childrenMap.get(edge.source)!.push(edge.target);
    hasParent.add(edge.target);
  }

  // Find root nodes (no incoming edges)
  const roots = nodes.filter((n) => !hasParent.has(n.id));

  // If no roots (cycle or empty), treat all nodes as roots
  if (roots.length === 0) {
    return new Map(nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
  }

  // Build tree structures
  const nodeSet = new Set(nodes.map((n) => n.id));

  function buildTree(id: string, visited: Set<string>): TreeNode {
    visited.add(id);
    const childIds = (childrenMap.get(id) ?? []).filter(
      (cid) => nodeSet.has(cid) && !visited.has(cid),
    );
    const children = childIds.map((cid) => buildTree(cid, visited));

    // Subtree width = sum of children widths + gaps, or NODE_WIDTH if leaf
    const width =
      children.length > 0
        ? children.reduce((sum, c) => sum + c.width, 0) +
          (children.length - 1) * HORIZONTAL_GAP
        : NODE_WIDTH;

    return { id, children, width };
  }

  const visited = new Set<string>();
  const trees = roots.map((r) => buildTree(r.id, visited));

  // Also handle orphan nodes not in any tree
  const orphans = nodes.filter((n) => !visited.has(n.id));

  // Position trees
  const positions = new Map<string, { x: number; y: number }>();

  function positionTree(tree: TreeNode, x: number, y: number) {
    // Center this node above its children
    positions.set(tree.id, { x: x + tree.width / 2 - NODE_WIDTH / 2, y });

    // Position children
    let childX = x;
    for (const child of tree.children) {
      positionTree(child, childX, y + VERTICAL_GAP);
      childX += child.width + HORIZONTAL_GAP;
    }
  }

  // Lay out each root tree side by side
  let currentX = 0;
  for (const tree of trees) {
    positionTree(tree, currentX, 0);
    currentX += tree.width + HORIZONTAL_GAP * 2;
  }

  // Place orphans in a row below all trees
  if (orphans.length > 0) {
    const maxY = Math.max(...[...positions.values()].map((p) => p.y), 0);
    let orphanX = 0;
    for (const orphan of orphans) {
      positions.set(orphan.id, { x: orphanX, y: maxY + VERTICAL_GAP });
      orphanX += NODE_WIDTH + HORIZONTAL_GAP;
    }
  }

  return positions;
}
