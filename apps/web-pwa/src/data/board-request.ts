/**
 * The seam that flags an unknown board for the offline catalog-fetch pipeline. When a learner picks
 * a board we have no catalog for, we queue it durably so the pipeline can source it and notify on
 * ready (the same board-shared cache every learner then draws from). A read-back tells the UI whether
 * a board is already in flight, so we never double-ask.
 *
 * ponytail: a localStorage queue is the whole seam today — the fetch pipeline drains it on sync.
 * Upgrade path: POST to the gateway's catalog-sourcing endpoint the moment that route exists; the
 * queue then becomes the offline outbox for it. No new dependency, no dead endpoint in the meantime.
 */

const KEY = 'wobo-board-requests-v1';

export interface BoardRequest {
  board: string;
  boardId: string;
  grade: string;
  at: number;
}

function read(): BoardRequest[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BoardRequest[]) : [];
  } catch {
    return [];
  }
}

/** Flag a board+grade for sourcing (idempotent per board+grade). Returns the whole pending queue. */
export function requestBoardSourcing(
  boardId: string,
  board: string,
  grade: string,
): BoardRequest[] {
  const queue = read();
  if (!queue.some((r) => r.boardId === boardId && r.grade === grade))
    queue.push({ board, boardId, grade, at: Date.now() });
  const trimmed = queue.slice(-20);
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    // storage unavailable — the empty state still stands; the ask just isn't persisted this session
  }
  return trimmed;
}

export function isBoardRequested(boardId: string, grade: string): boolean {
  return read().some((r) => r.boardId === boardId && r.grade === grade);
}
