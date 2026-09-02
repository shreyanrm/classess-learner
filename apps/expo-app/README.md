# expo-app (Expo React Native client)

The mobile client. It shares the platform-agnostic packages — `@classess/sdk` and
`@classess/contracts` are pure TypeScript with no DOM dependency and already run on React Native.

## Status: scaffolded, wired in Phase 1

Phase 0's walkable surface is the **web PWA** (`apps/web-pwa`), which builds and runs today. The
Expo client is intentionally deferred to the start of Phase 1 for one honest reason: the design
packages (`@classess/ui`, `@classess/motion`, `@classess/wobo`) are currently **React DOM** (they
render HTML elements and use framer-motion's web renderer). Bringing them to Expo means adding
React Native renderers behind the same component APIs — a real task, sequenced rather than faked.

Phase 1 adds, behind the existing package interfaces:
- RN variants of the design primitives and the token bridge (the tokens in `@classess/config` are
  already framework-neutral values).
- A `WoboPresence`/`WoboPanel` RN implementation (Reanimated) honouring the same locked identity.
- The Expo app shell consuming `createSdk()` exactly as the web shell does.

Until then this directory is a placeholder so the monorepo layout matches the architecture doc,
without a half-working RN toolchain destabilising the green build.
