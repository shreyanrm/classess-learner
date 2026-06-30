# 02 · KGtoPG Contract Seed (the platform interface this repo holds)

KGtoPG is a separate plane and a separate maturing product. This repo carries the **contract seed** — the typed interfaces,
event schemas, governed-view DTOs, and the migration set lifted from the School codebase (`shreyanrm/classess-school`) —
so Learner is built against a stable boundary. The heavy platform services live and mature separately; here we hold the
*interface* and a *reference implementation* good enough to build and prove the atom.

## What to lift from the School repo (TAKE)
Lift and adapt into `/platform/kgtopg-contract-seed`:
- **Event envelope + event schemas** (align to `01-data-and-event-contract.md`).
- **Mastery model** (the multiplicative definition + bands + ten gap types).
- **Ontology + prerequisite graph** types and storage shape.
- **Evaluation contracts** (how an attempt becomes evidence).
- **AI fabric interfaces** (capability registry, gateway request/response).
- **Consent primitives** (consent tier, parental-consent record shape).
- **DB migrations** for the platform-core tables (identity, event store, ontology, evidence/mastery, feature store).

**TRIM/TORCH:** discard institutional surfaces, role experiences, multi-tenant hierarchy, and the School design system.

## The governed-view interface (read-down) — typed service calls only
```ts
interface KGtoPG {
  identity: {
    resolveOrCreateSubject(seed): Promise<{ subject_id: string }>;        // opaque UUID
  };
  ontology: {
    getNode(node_id): Promise<OntologyNode>;
    getPrerequisites(node_id): Promise<OntologyNode[]>;
    compileCourse(spec): Promise<{ course_id: string; nodes: OntologyNode[] }>;  // create-anything
  };
  mastery: {
    getBands(subject_id, scope): Promise<MasteryBand[]>;                  // plain-language bands only
    getNextBestNode(subject_id, scope): Promise<OntologyNode>;            // orchestrator hook
    recordEvidence(evt): Promise<void>;                                   // via event, idempotent
  };
  twin: {
    query(subject_id, q): Promise<TwinAnswer>;                           // "what am I weakest at"
  };
  consent: {
    getTier(subject_id): Promise<"un_elevated" | "elevated">;
    record(parentalConsent): Promise<void>;                              // auth phase
  };
}
```
- The app calls these through `/packages/sdk`. It must **never** read platform tables directly.
- In dev, back these with the reference implementation in the contract seed + Supabase-local so surfaces are fully testable.
