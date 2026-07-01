/**
 * Pure stagger ordering for constellation-ignite. Given the prerequisite graph and the just-mastered
 * source node(s), light travels along directed edges (prerequisite -> unlocked) one ring at a time.
 * BFS depth IS the stagger ring. Kept pure so the ordering is unit-tested without rendering.
 */

export interface ConstellationEdge {
  /** The prerequisite node (light departs from here). */
  from: string;
  /** The node it unlocks (light arrives here next). */
  to: string;
}

export interface ConstellationRank {
  id: string;
  /** BFS distance from the nearest source. `Infinity` means not reachable (stays monochrome). */
  depth: number;
}

/**
 * Rank every node by how far it sits down the prerequisite edges from the source(s).
 * Result is sorted by depth ascending, ties broken by original node order (stable, deterministic).
 * Handles cycles (visited guard) and unreachable nodes (depth `Infinity`).
 */
export function constellationOrder(
  nodeIds: readonly string[],
  edges: readonly ConstellationEdge[],
  sources: readonly string[],
): ConstellationRank[] {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const list = adjacency.get(edge.from);
    if (list) list.push(edge.to);
    else adjacency.set(edge.from, [edge.to]);
  }

  const depth = new Map<string, number>();
  const queue: string[] = [];
  for (const source of sources) {
    if (!depth.has(source)) {
      depth.set(source, 0);
      queue.push(source);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const id = queue[head++] as string; // head < length guarantees a defined slot
    const currentDepth = depth.get(id) ?? 0;
    const neighbours = adjacency.get(id);
    if (!neighbours) continue;
    for (const next of neighbours) {
      if (!depth.has(next)) {
        depth.set(next, currentDepth + 1);
        queue.push(next);
      }
    }
  }

  const order = new Map<string, number>();
  nodeIds.forEach((id, index) => {
    order.set(id, index);
  });

  return nodeIds
    .map((id) => ({ id, depth: depth.get(id) ?? Number.POSITIVE_INFINITY }))
    .sort((a, b) => {
      if (a.depth === b.depth || (!Number.isFinite(a.depth) && !Number.isFinite(b.depth))) {
        return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
      }
      return a.depth - b.depth;
    });
}
