/**
 * The overlay, applied locally.
 *
 * Law (CURRICULUM.md §6): the learner's edits are never written into the canonical version. They
 * are a list of operations keyed by canonical node id, stored beside the version, re-applied after
 * an upgrade, and reported on where a key no longer matches. The brain is the authority; this
 * module exists so the screen can show the edit the instant the learner makes it and still be
 * showing exactly what the brain will store — the same ops, applied the same way.
 *
 * Everything here is pure: nodes in, ops in, nodes out. That is what makes the round trip testable
 * (ops -> view -> JSON -> ops -> the same view) without a network.
 */

import type { CurriculumNode, CurriculumNodeKind, CurriculumTextbook, OverlayOp } from './types';

/** Ids the learner minted themselves carry this prefix, so an upgrade can tell them apart. */
export const OWN_ID_PREFIX = 'own:';

export function isOwnId(id: string): boolean {
  return id.startsWith(OWN_ID_PREFIX);
}

/** How a new node's id is minted. Injectable so tests are deterministic. */
export type MintId = () => string;

const uuid = (): string => {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  // No crypto (an old webview, a test runner): a time-plus-entropy id is unique enough for a key
  // that only ever has to be distinct inside one learner's overlay.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export const mintOwnId: MintId = () => `${OWN_ID_PREFIX}${uuid()}`;

/** A node the learner added. Carries no source, because it has none — and says so. */
function ownNode(
  id: string,
  parentId: string,
  kind: CurriculumNodeKind,
  name: string,
  order: number,
): CurriculumNode {
  return {
    id,
    kind,
    name,
    parentId,
    order,
    aliases: [],
    sourceRef: null,
    conceptIds: [],
    own: true,
    notInMySchool: false,
    textbook: null,
    renamedFrom: null,
    source: null,
    checksPassed: [],
    verifiedAt: null,
    objectives: [],
  };
}

/** Every descendant of a node, so removing a unit removes its topics with it. */
function descendants(nodes: CurriculumNode[], id: string): Set<string> {
  const out = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of nodes) {
      if (n.parentId && out.has(n.parentId) && !out.has(n.id)) {
        out.add(n.id);
        grew = true;
      }
    }
  }
  return out;
}

/**
 * Apply the overlay to a canonical node list. Ops that no longer match anything are skipped and
 * reported, never guessed at — that report is what the learner reads after a version upgrade.
 */
export function applyOverlayOps(
  nodes: readonly CurriculumNode[],
  ops: readonly OverlayOp[],
  options: { mintId?: MintId } = {},
): { nodes: CurriculumNode[]; dropped: OverlayOp[] } {
  const mint = options.mintId ?? mintOwnId;
  let out = nodes.map((n) => ({ ...n }));
  const dropped: OverlayOp[] = [];
  const byId = () => new Map(out.map((n) => [n.id, n] as const));

  for (const op of ops) {
    const index = byId();
    switch (op.op) {
      case 'add': {
        const siblings = out.filter((n) => n.parentId === op.parent_id);
        // `after` places the new node behind a named sibling; without one it lands at the end.
        const anchor = op.after ? siblings.find((n) => n.id === op.after) : undefined;
        const order = anchor ? anchor.order + 0.5 : (siblings.at(-1)?.order ?? 0) + 1;
        out.push(ownNode(mint(), op.parent_id, op.kind, op.name, order));
        break;
      }
      case 'remove': {
        if (!index.has(op.node_id)) {
          dropped.push(op);
          break;
        }
        const gone = descendants(out, op.node_id);
        out = out.filter((n) => !gone.has(n.id));
        break;
      }
      case 'rename': {
        const node = index.get(op.node_id);
        if (!node) {
          dropped.push(op);
          break;
        }
        // The canonical name is kept once, on the first rename, so "renamed from X" stays true
        // however many times the learner changes their mind.
        node.renamedFrom = node.renamedFrom ?? node.name;
        node.name = op.name;
        break;
      }
      case 'reorder': {
        const rank = new Map(op.order.map((id, i) => [id, i] as const));
        const siblings = out.filter((n) => n.parentId === op.parent_id);
        if (siblings.length === 0) {
          dropped.push(op);
          break;
        }
        // Anything the learner did not name keeps its place behind the ones they did.
        let tail = op.order.length;
        for (const n of siblings) n.order = rank.get(n.id) ?? tail++;
        break;
      }
      case 'not_in_my_school': {
        const node = index.get(op.node_id);
        if (!node) {
          dropped.push(op);
          break;
        }
        node.notInMySchool = op.value;
        break;
      }
      case 'attach_textbook': {
        const node = index.get(op.node_id);
        if (!node) {
          dropped.push(op);
          break;
        }
        node.textbook = { ...op.textbook };
        break;
      }
    }
  }

  out.sort((a, b) => a.order - b.order);
  // Re-rank to whole numbers per parent so a later `after` insert has clean room again.
  const seen = new Map<string, number>();
  for (const n of out) {
    const key = n.parentId ?? '';
    const next = seen.get(key) ?? 0;
    n.order = next;
    seen.set(key, next + 1);
  }
  return { nodes: out, dropped };
}

/**
 * Append an op, collapsing the ones that would otherwise pile up: two renames of the same node are
 * one rename, two reorders of the same parent are one reorder, a removal swallows the edits that
 * came before it. The overlay stays the size of the learner's intent, not their clicking.
 */
export function appendOp(ops: readonly OverlayOp[], next: OverlayOp): OverlayOp[] {
  const kept = ops.filter((prev) => {
    switch (next.op) {
      case 'rename':
        return !(prev.op === 'rename' && prev.node_id === next.node_id);
      case 'reorder':
        return !(prev.op === 'reorder' && prev.parent_id === next.parent_id);
      case 'not_in_my_school':
        return !(prev.op === 'not_in_my_school' && prev.node_id === next.node_id);
      case 'attach_textbook':
        return !(prev.op === 'attach_textbook' && prev.node_id === next.node_id);
      case 'remove':
        return !('node_id' in prev && prev.node_id === next.node_id);
      default:
        return true;
    }
  });
  return [...kept, next];
}

/** Build the ops for the four edits a row offers, so screens never hand-write wire shapes. */
export const overlayOps = {
  add(parentId: string, kind: CurriculumNodeKind, name: string, after?: string | null): OverlayOp {
    return { op: 'add', parent_id: parentId, kind, name, after: after ?? null };
  },
  remove(nodeId: string): OverlayOp {
    return { op: 'remove', node_id: nodeId };
  },
  rename(nodeId: string, name: string): OverlayOp {
    return { op: 'rename', node_id: nodeId, name };
  },
  reorder(parentId: string, order: string[]): OverlayOp {
    return { op: 'reorder', parent_id: parentId, order };
  },
  notInMySchool(nodeId: string, value: boolean): OverlayOp {
    return { op: 'not_in_my_school', node_id: nodeId, value };
  },
  attachTextbook(nodeId: string, textbook: CurriculumTextbook): OverlayOp {
    return { op: 'attach_textbook', node_id: nodeId, textbook };
  },
};

/** Move one node among its siblings by one place — the reorder a keyboard or a button makes. */
export function moveWithin(
  nodes: readonly CurriculumNode[],
  parentId: string,
  nodeId: string,
  delta: number,
): OverlayOp | null {
  const siblings = nodes.filter((n) => n.parentId === parentId).sort((a, b) => a.order - b.order);
  const from = siblings.findIndex((n) => n.id === nodeId);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= siblings.length) return null;
  const order = siblings.map((n) => n.id);
  const [moved] = order.splice(from, 1);
  if (!moved) return null;
  order.splice(to, 0, moved);
  return overlayOps.reorder(parentId, order);
}
