# tools/extract

The fetchers and per-board extractors that built the first cut of the fixtures in the
directory above. They are here so section 9's monthly re-fetch and any repair have
something to execute, rather than living in a session scratchpad where the first pass
left them.

They do not run end to end from a clean checkout. Each builder reads a local fetch
cache - `meta/`, `txt/` and `lay/` beside this directory - written by `lib/fetch.py`:
the bytes of every source document, its hash, and the two text extractions. The cache
is not committed. Re-fetch first, then build.

`lib/build.py` refuses to write unless `SYLLABI_WRITE=1` is set. These builders emit
the first-cut shape - `title` rather than `name`, no node ids, `status: "verified"` -
so anything they write has to go through `tools/migrate_2026_09_03.py` before it is
fit to read.

`build_cisce.py` is the defective one. Its two-column re-flow keys off line position
rather than the booklet's own bracketed sub-headings, which truncated topic titles and
filed topics under the wrong unit. Its topic output has been withdrawn from the
fixtures. Rewrite it against bracket depth before trusting it again.
