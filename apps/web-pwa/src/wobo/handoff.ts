/**
 * A question asked on the public site, handed to Wobo.
 *
 * The pitch pages and the help articles carry an ask box. A signed-in visitor who uses one is
 * taken straight to the chat page — but the page they typed on is the public site, where Wobo's
 * runtime (the bus, the board, the speech conductor) is deliberately not loaded. The question is
 * parked here for the few hundred milliseconds the runtime takes to arrive, and the runtime asks
 * it itself the moment it mounts.
 *
 * One slot, taken once: a question can never be asked twice, and never dropped on the floor.
 */

let parked: string | null = null;

/** Park the visitor's question until Wobo's runtime is mounted. */
export function handOffQuestion(text: string): void {
  parked = text;
}

/** Take the parked question, if there is one. It is cleared by the taking. */
export function takeHandedQuestion(): string | null {
  const text = parked;
  parked = null;
  return text;
}
