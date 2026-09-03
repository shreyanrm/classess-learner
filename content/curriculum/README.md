# Global framework registry

The seed list of every board, programme and curriculum a learner can pick from on the
first screen. It is the top of the ontology in `docs/CURRICULUM.md`: one entry per
framework, with its name, the names people actually call it, where it applies, the
levels it runs, and the official site it comes from. Nothing below the framework level
lives here. Chapters and topics are generated on demand, per `docs/CURRICULUM.md`
sections 4 and 8, and never in bulk.

Three files, and no dependencies:

| File | What it is |
|---|---|
| `frameworks.seed.json` | The registry. Hand authored, machine checked, the file the loader reads. |
| `build.py` | Validates the file and checks every official site. Standard library only, no imports from this repo. |
| `README.md` | This. |

## An entry

```json
{
  "id": "cbse",
  "name": "Central Board of Secondary Education",
  "aliases": ["CBSE", "CBSE board", "Central board", "CBSE India"],
  "kind": "national",
  "country": "IN",
  "region": null,
  "languages": ["en", "hi"],
  "levels": ["Class 4", "Class 5", "..."],
  "official_site": "https://www.cbse.gov.in",
  "status": "verified",
  "verified_site": true,
  "checked_at": "2026-09-03T07:19:41+00:00",
  "check": { "ok": true, "transport": "browser-user-agent", "method": "GET",
             "http_status": 200, "final_url": "https://www.cbse.gov.in",
             "page_title": "CBSE - Central Board of Secondary Education",
             "elapsed_ms": 812, "note": "answered only to a browser user agent",
             "error": null }
}
```

- **id** — a stable lowercase slug. It is written into learner records, so it never changes.
- **name** — the framework's own name, as the board writes it.
- **aliases** — what a learner types. Every alias in the file is unique, so type-ahead
  never has to guess between two boards. "CISCE" reaches the ICSE entry; "Samacheer
  Kalvi" reaches the Tamil Nadu board; "Allahabad board" reaches the Uttar Pradesh one.
- **kind** — `national`, `state`, `international`, `open`, `homeschool`, `online`, or
  `personal`. A learner's own syllabus becomes a `personal` framework at runtime and is
  never seeded here.
- **country** — ISO 3166-1 alpha-2, or `null` for a framework that belongs to no one
  country, such as the IB programmes.
- **region** — the state, province or nation inside the country, when that is what the
  framework covers.
- **languages** — ISO 639 codes for the languages the framework is taught and examined in.
- **levels** — grades 4 to 13, named the way that framework names them. A learner in
  Singapore picks "Secondary 3", one in Scotland picks "S3", one in India picks
  "Class 9". We do not translate a board's own vocabulary into grades.
- **official_site** — the board's own site. `null` when we do not have one we trust,
  which is honest and leaves the entry searchable.
- **note** — optional, and present only where a reader would otherwise have to rediscover
  something: a territory whose schools sit with another board, several boards carried as
  one entry, a site we deliberately do not record and why.
- **status**, **verified_site**, **checked_at**, **check** — written by `build.py`. Never
  edited by hand.

## What verified means, and what it does not

`verified` on an entry means one thing: on the date in `checked_at`, the declared
official site answered. It is a claim about the site, not about a syllabus. No chapter,
topic or objective anywhere in the product inherits trust from it. Syllabus level
provenance is a separate mechanism and lives in `docs/CURRICULUM.md` section 5.

A status code alone would not be enough, because a board's domain can lapse and be
bought by somebody else, and the new owner answers `200` just as cheerfully. So every
check also records `page_title`, which is what the site called itself. Read it against
the entry's name. That is how two boards' long-published domains, one in Nagaland and
one in Zimbabwe, were found serving gambling sites, and why those entries now carry no
site at all rather than a link we would be ashamed to send a child to. Re-read the
titles whenever the build runs; it is a two minute scan and it is the only thing
guarding this file against quietly pointing somewhere it should not.

Where the title is something like `Request Rejected` or `Just a moment`, a firewall
answered rather than the site, and the check says so in its `note`. The host is alive,
which is what `verified` claims, but that title proves nothing about whose site it is.

`provisional` means the site did not answer to our checker. That is not a claim the
entry is wrong. The `check` record says exactly what happened, and the common reasons
are ours, not the board's:

- **A firewall refused us.** Many ministry sites answer a browser and refuse anything
  else. The build tries a browser user agent before giving up, and some still refuse
  from a machine outside the country.
- **The certificate chain is incomplete.** Some servers omit an intermediate
  certificate. Browsers fetch the missing piece; a plain client cannot. The build falls
  back to the system `curl`, which does, and records that it had to.
- **DNS could not answer.** A resolver failure and a domain that does not exist look
  similar from here and mean very different things.
- **The site was slow or down at that moment.**

A provisional entry is still fully usable for search. What it does not do is claim to be
confirmed. Four entries carry no official site at all: two Pakistani provincial boards
whose domains no longer resolve, and the Nagaland and Zimbabwe boards, whose domains now
belong to somebody else. Recording nothing is the honest answer in all four cases.

## Running the build

```
python3 build.py                 validate, check every site, rewrite the file in place
python3 build.py --offline       validate only, no network, writes nothing
python3 build.py --report        check and print, write nothing
python3 build.py --only cbse,ib-dp
python3 build.py --stale-days 30 recheck only what has not been checked in a month
python3 build.py --workers 8 --timeout 25 --retries 1
```

Exit codes: `0` everything confirmed, `1` one or more sites did not confirm, `2` the file
is structurally invalid and nothing was written. Validation runs before any network call,
and a structural error stops the run, so a bad edit can never be half applied. The write
is atomic.

Validation enforces what search depends on: slug ids, unique ids, unique aliases across
the whole file, a known `kind`, an ISO country and ISO languages, non-empty levels inside
grades 4 to 13, absolute http(s) sites, and that nothing claims `verified` without a
confirmed site.

Re-run it on a schedule. `docs/CURRICULUM.md` section 9 wants each verified framework
re-checked monthly, which is `--stale-days 30`.

## What the seed covers

Live counts are in the `counts` block at the top of the file, so they cannot go stale
here. What is deliberately in scope:

- **India.** The national boards, the open school, and the national curriculum body. Every
  state and union territory, with the higher secondary council listed separately where the
  state runs one, as West Bengal, Odisha, Assam, Manipur, Andhra Pradesh and Telangana do.
  Where a territory has no board of its own and its schools sit with a national board, the
  entry says so in a `note` rather than inventing a board.
- **International programmes.** The IB programmes, the Cambridge stages from primary
  through A Level, Pearson Edexcel in both its international and its UK forms, and the
  Advanced Placement programme.
- **United Kingdom and Ireland.** The four national curricula, the awarding bodies a learner
  actually names when they say what they study, and the Irish curriculum.
- **United States.** Every state's standards body, the District of Columbia, the five
  inhabited territories, and the two cross-state standards a learner is as likely to name
  as their own state's.
- **Australia and Canada.** The national curriculum and every state and territory
  authority, every province and territory.
- **Asia, the Gulf and Africa.** Singapore, Hong Kong, Malaysia, Nepal, Sri Lanka,
  Bangladesh, Pakistan federal and provincial, the six Gulf ministries that Indian families
  abroad live under, South Africa in all three of its examining routes, and the larger
  national curricula beyond.
- **Home and online schooling.** The programmes families name, from the classical and
  Charlotte Mason traditions to the online schools that examine into Cambridge.

Soft spots we know about, so nobody rediscovers them as bugs:

- Four entries have no site on record: two Pakistani provincial textbook boards whose
  domains no longer resolve, and the Nagaland and Zimbabwe boards whose domains changed
  hands. We would not guess at replacements.
- Bangladesh runs eleven regional boards on one national syllabus; the file carries them as
  one entry until there is a reason to split them.
- Several territories that follow another board are entered for search, with a `note` saying
  whose syllabus their schools actually use.
- Every entry names levels for grades 4 to 13 only, per `docs/CURRICULUM.md` section 11.
  Primary years below that, and anything past school, are out of scope by design.

## What is not here

- **No syllabus.** No subjects, units, topics or objectives. Those arrive through
  discovery when a learner opens a level, and they carry their own provenance.
- **No personal frameworks.** A learner's own syllabus is theirs, stored per learner.
- **No ranking.** The order in the file is country then region then id. What a learner
  sees first is decided at search time from their locale, not by this file.
- **No completeness claim.** A board missing from this list is not a board the product
  refuses. It is the case discovery exists for, and the "not listed, tell me" path is
  always one tap away.

## Adding or correcting an entry

1. Add the object in country order. Give it a slug id nobody has used.
2. Give it aliases a real learner would type, including the short form, the common
   misname, and the local-language name in Latin script where that is what people type.
   They must not collide with any alias already in the file; the build fails loudly if
   they do.
3. Name the levels the way that framework names them.
4. Put in an official site only if it is genuinely the board's own. If you are not sure,
   leave it `null`. An unsourced entry is worth more than a wrong one.
5. Leave `status`, `verified_site`, `checked_at` and `check` alone.
6. Run `python3 build.py --only <your-id> --report` and read the page title that comes
   back. If it is not obviously the board, you have the wrong site.

Correcting an id is a migration, not an edit: learner records point at it, and so does
anything else keyed to a framework. The syllabus files under `syllabi/` carry a
`framework_id` that has to match an id in this file, which is why `icse` and `isc` are
two entries here rather than one entry for the council that awards both.

## Where this goes next

This file seeds the `curriculum.frameworks` table described in `docs/CURRICULUM.md`
section 10. Once the table serves search, this file stays as the reviewable source of the
seed and the thing a person can read in a pull request. The registry grows from there
through discovery, which writes new frameworks as `provisional` with their sources
attached, and through the review queue that promotes them.
