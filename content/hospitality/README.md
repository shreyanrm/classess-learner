# The hospitality calendar

Wobo knows when a learner's family is celebrating, when they are grieving, and when the exams start. This directory is where that knowledge lives.

It exists because a tutor that does not know it is Diwali is not a tutor anyone keeps. And because a product that sends a cheerful offer on the morning of Ashura has told the family exactly how much it was paying attention.

Two data files and this note:

| File | What it holds |
|---|---|
| `festivals.json` | Every festival and observance a school-age learner's family would keep, across India, the Gulf, the UK, the US, Canada, Australia, Singapore, Hong Kong, South Africa, Nepal, Sri Lanka, Bangladesh and Pakistan. Dates for 2026 and 2027, the greeting each one takes, whether school closes, and the days we never market. |
| `school-calendar.json` | Per board: when the academic year starts, when terms break, when board exams run, and when results land. |

---

## 1. The one law

Nothing here is invented.

Every date is either read from an official document, derived from one by a stated arithmetic rule, or `null`. A `null` is a fetch instruction, not a gap to be filled in by a model that is fairly sure. Being wrong about the date of Eid is worse than saying nothing, because saying nothing is invisible and being wrong is not.

This is the same rule the curriculum registry runs on, in `docs/CURRICULUM.md` section 4, point 6: fail honestly.

The law is machine-checkable, and section 9 lists the three assertions that check it. The first one matters most: **no non-null date may cite a source whose `retrieved` is `not_retrieved`.** A source registered as not retrieved may carry `null`s and a re-anchor instruction, and nothing else. If a date is real, the document it actually came from gets its own registry entry, with its own url, `retrieved` level and caveat, and the `confidence` matches that document rather than the one nobody read.

---

## 2. How to read a date

Every date entry carries a `confidence`. It is the only field that decides whether the date may be used in something outbound.

| Confidence | What it means | Safe to send on |
|---|---|---|
| `official` | Read verbatim from the government or examination board document named in `source`. | Yes |
| `official_reported` | The official document itself was read, but served from somewhere other than the issuing site, or the issuing site refused automated retrieval and a government-adjacent report supplied it. The document's own reference number is recorded. | Yes |
| `derived` | Computed from an official date already in the file, by a rule written into the entry's `notes`. Example: the Mid-Autumn Festival is Hong Kong's gazetted holiday minus one day, because the government gazettes the day after the festival. | Yes, with the rule visible |
| `conventional` | A fixed Gregorian date kept by long convention, with no official document fetched. Example: Lohri on 13 January. | Only after a human check |
| `unverified` | Named so the calendar knows the occasion exists. The date is `null`. | No |
| `reported` | From reporting of an official release, where the release itself could not be read. | Only after a human check |

Two more rules that override confidence entirely:

- **Islamic dates are never sent on a schedule.** Eid al-Fitr, Eid al-Adha, Muharram and Milad-un-Nabi all move on the moon. India's own memorandum reserves the right to shift them at short notice through a public announcement; the Pakistan circular marks them "anticipated and subject to the appearance of the moon"; the UAE settles them by Cabinet. A greeting waits for a same-day confirmation flag, never for a stored date alone. This is a field, not a paragraph: the festivals that move on the moon carry `requires_same_day_confirmation: true` at festival level, and **a date under that flag may never be used to schedule anything, whatever its confidence.** It carries `eid-al-fitr`, `eid-al-adha`, `muharram-ashura`, `milad-un-nabi`, `islamic-new-year` and `jamat-ul-vida` in `festivals`, and `ramadan-restraint` in `quiet_days`.
- **A date is scoped to a country.** In 2026 Milad-un-Nabi is 25 August in Pakistan, 26 August in India and 28 August in the UAE. All three are official. Always read the learner's own country from `scope`.

---

## 3. `festivals.json`

### Top level

- `sources` — every document consulted, keyed by an id the date entries point at. Each carries `publisher`, `document` (with its reference number where it has one), `url`, `retrieved` (`full`, `partial`, `summary`, `headline_only`, `not_retrieved`), `fetched_on`, and a `caveat` where retrieval was imperfect.
- `voice_rules` — the copy law for anything Wobo says on a festival. It restates `DESIGN.md` and `docs/WOBO-PLAN.md` section 19 so nobody has to go and look.
- `quiet_days` — see section 5.
- `exam_season_hints` — see section 6.
- `festivals` — the list.

### A festival

| Field | Meaning |
|---|---|
| `id` | Stable, opaque, lowercase-hyphen. Never renamed once shipped. |
| `name` | What we call it in product copy. |
| `aliases` | Every other name the same day goes by, including regional names and transliterations. Search matches on these. |
| `tradition` | `hindu`, `muslim`, `christian`, `sikh`, `jain`, `buddhist`, `jewish`, `parsi`, `chinese`, `civic`, `secular` or `multi`. Used only for scoping, never for inferring a learner's religion. |
| `countries` | ISO country codes, plus `GCC` for the Gulf states covered as a group. |
| `regions` | Free-text states, provinces or communities. Empty means the whole country. |
| `calendar` | `gregorian`, `lunar`, `lunisolar`, `islamic`, `solar` or `other`. This is what tells you whether a date can be trusted a year out. |
| `school_holiday` | Whether school typically closes. `null` where it varies too much to say. |
| `quiet_day` | `true` if this festival is itself a day we never market on. Cross-listed in `quiet_days`. |
| `greeting_style` | `example` is a full one-line wish with `{name}` as the placeholder. `note` is the direction: what to say, what never to assume, and when in the day it may land. `example` is `null` where there is no greeting. |
| `dates` | Keyed `"2026"` and `"2027"`. Each year is an array, because one festival can have different official dates in different countries. |
| `notes` | Anything a person needs to know before using the entry. Divergences between countries live here. |

### A date entry

```json
{
  "date": "2026-10-18",
  "end": null,
  "scope": "IN",
  "label": "Saptami",
  "greet": true,
  "greeting": "Shubho Sharodiya, {name}. I hope the pandals are worth the queue.",
  "source": "in_dopt_2026",
  "confidence": "official"
}
```

`date` is the first day, `end` the last where the occasion spans days, `null` when it is one day. `scope` is a country code, a subdivision code such as `IN-KL` or `GB-SCT`, or `all` where a single date holds everywhere in the entry's country list. `label` names the specific day where the festival has several. `source` keys into `sources`.

`greet` and `greeting` are the two fields that make the greeting rules machine-readable instead of prose:

| Field | Meaning |
|---|---|
| `greet` | Required on every date entry. `true` means Wobo may send a greeting on this date. `false` means the entry exists for closure and scheduling only, and no greeting is ever sent from it. **There is no default.** An entry with no `greet` is treated as `false`. |
| `greeting` | Optional. The exact line to send for this date. Where it is present it overrides `greeting_style.example`. |

The same rules are written into `date_entry_fields` and `greeting_protocol` at the top of `festivals.json`, so a consumer never has to read this file.

Why the fields exist: a festival's `dates` array holds several different occasions, and a single festival-level example sent against all of them is wrong on most of them. Without `greet`, a consumer joining date to festival to example would wish a Pakistani learner a happy Independence Day on Kashmir Day, send "Happy Heritage Day" on the anniversary of the Soweto uprising, and fire Shubho Bijoya on Saptami. Every one of those days is now `greet: false`, or carries its own `greeting`.

### Greetings

The examples are written in Wobo's voice and are ready to send. The rules behind them:

- Sentence case. No emoji. No exclamation marks. One line.
- Wobo speaks as "I". Wobo has no gender: use the name first, and they and them only where a pronoun is unavoidable.
- The learner's name appears once at most.
- A greeting carries nothing else. No offer, no streak, no share prompt, no "and here is a lesson about it".
- Greet only when the learner's own profile says the festival is theirs, or when they told us. A country is not a religion, and a surname is not a permission.
- Use the family's own name for the day. Shubho Bijoya to a Bengali family, happy garba to a Gujarati one, happy Dasara in Karnataka. The Durga Puja entry carries all four.
- Some entries deliberately have no greeting: Good Friday, Ashura, Yom Kippur, Ching Ming, Chung Yeung, the bank-holiday groupings, and Karwa Chauth, which is an adults' fast and is here only so nothing is scheduled at moonrise. Those festivals carry `"example": null`, and every one of their date entries is `greet: false`.
- `greeting_style.example` is a fallback, never a schedule. It is sent only for a date entry whose `greet` is `true` and which carries no `greeting` of its own.
- A date entry with an `end` greets on the first day only.
- **One greeting per learner per day.** Where two greetable entries fall on the same date and cover the same learner, the festival the learner's own profile names wins; where both or neither are named, the more specific label wins. Naraka Chaturdasi on 8 November 2026 is marked `greet: false` for exactly this reason, because Diwali carries that day. The dates that legitimately hold two different festivals for two different families, such as Makar Sankranti and Pongal on 14 January 2026, are left as they are and settled by the learner's own profile.

---

## 4. `school-calendar.json`

Same shape of honesty, keyed by board.

| Field | Meaning |
|---|---|
| `id` | Matches the keys under `exam_season_hints.boards` in `festivals.json`. The two files are joined on this. |
| `academic_year` | `starts`, `ends`, a `note`, and a `confidence`. Almost always `conventional`, because in most countries the school year is set by the school or the district, not by the board. |
| `term_breaks` | Each has a `name`, a human `window`, `dates` per year (`null` unless anchored to something official), a `confidence` and a `note`. |
| `board_exam_windows` | Per year, an array of levels with `starts`, `ends`, and where it exists a `contingency_day`. |
| `result_days` | Per year, an array of levels with a `date`, sometimes a `window_end` where the authority publishes a range, sometimes a `time`. |
| `pre_board_window` | Prose. Mocks, pre-boards, trials, send-ups, preliminaries: the same thing under thirteen names. |

Where an authority calls its own date tentative, the word `tentative` is carried through in the `note`. Singapore marks every results release that way. Wobo repeats the word rather than promising a day.

Seventeen boards are described. Nine of them are mostly `null` and are there to hold the shape, so that adding a real source later is a fill-in rather than a redesign.

---

## 5. Quiet days

A quiet day is a day we send nothing that markets, celebrates or nudges. No offers, no streak notices, no lifecycle email, no push, no share prompts. The product stays open and stays calm. If the learner opens it, Wobo works exactly as normal and says nothing about the day unless asked.

Quiet days are scoped to the country or community they belong to. They are never applied globally.

**Precedence, when a quiet day and a greetable festival share a date and a country.** The quiet day silences the marketing and lifecycle engine. It does not silence a greeting that a date entry marks `greet: true`. The greeting is sent, alone, and nothing else is. Where the festival's own date entry is `greet: false`, nothing at all is sent. The rule is written into `quiet_days.precedence`, and 24 November 2026 is the case it exists for: Guru Nanak Jayanti and Guru Tegh Bahadur's martyrdom day fall together, both in India, both official. The Gurpurab greeting goes out and the rest of the day stays empty.

Nineteen are listed, among them: Martyrs' Day and Shaheed Diwas in India, Ashura and Chehlum, Guru Tegh Bahadur's martyrdom day, Good Friday, Yom Kippur, Memorial Day and Patriot Day in the US, Remembrance Sunday and Armistice Day in the UK, Remembrance Day and the National Day for Truth and Reconciliation in Canada, Human Rights Day in South Africa, Anzac Day in Australia, Shaheed Dibas in Bangladesh, and Ching Ming and Chung Yeung in Hong Kong.

Ramadan is in the list under a different heading. It is not mourning and it is not a quiet day in the strict sense. It is a restraint window: no food or feasting imagery, no daytime celebration framing, no offer that trades on urgency.

This connects directly to `docs/WOBO-PLAN.md` section 14. Every growth lever in that section is behaviour-timed and honest. A quiet day is the floor under that promise.

---

## 6. Exam seasons

`exam_season_hints` in `festivals.json` is the timing guidance the lifecycle and marketing engine reads, and it is also Wobo's own tone instruction. During an exam window Wobo does not celebrate, does not run share loops, and does not start a new course unprompted.

Each board carries a `pre_board_window`, a `board_exam_window`, a `results_window`, and a `quiet_from` that says how far ahead the quiet starts. Two weeks before the first paper, in almost every case.

The prose here is a summary. The dates are in `school-calendar.json`, and anything `null` there is `null` here too. The same discipline applies to `confidence`: **each hint's confidence is the weakest confidence among the school-calendar rows it summarises, never stronger.** That is why `cbse` and `ib_dp` read `reported` here even though each also summarises rows that are `official`.

One thing worth knowing: section 14 of the plan calls for exam-season generosity, unlimited weekends to taste and then lose. That is the one marketing move that belongs in an exam season, and it belongs before the window opens, not during it.

---

## 7. Sources

Every URL below was fetched on 3 September 2026. The `sources` block in each JSON file records which ones came back whole.

**Read in full**

- India, holidays for 2026 — Department of Personnel and Training, Office Memorandum F.No.12/2/2023-JCA dated 3 July 2025 — https://dopt.gov.in/sites/default/files/Holidays%20to%20be%20observed%20in%20Central%20Government%20Offices%20during%20the%20year%202026.pdf
- India, holidays for 2027 — the same series, Office Memorandum F.No.12/2/2023-JCA dated 16 July 2026. The signed memorandum was read in full but served from a mirror, because dopt.gov.in did not return the 2027 file — https://www.staffnews.in/2026/07/list-of-holidays-2027-to-be-observed-in-central-government-offices.html
- Pakistan, public and optional holidays for 2026 — Cabinet Division circular F.No. 10-1/2025-Min-II dated 19 January 2026 — https://cabinet.gov.pk/SiteImage/Misc/files/Holidays/2026/Public-Holidays-2026.pdf
- United Kingdom bank holidays — https://www.gov.uk/bank-holidays
- United States federal holidays — https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/
- Singapore public holidays — https://www.mom.gov.sg/employment-practices/public-holidays
- Singapore national examination dates — https://www.moe.gov.sg/national-exams-dates
- Hong Kong general holidays, 2026 — https://www.gov.hk/en/about/abouthk/holiday/2026.htm
- Hong Kong general holidays, 2027 — https://www.gov.hk/en/about/abouthk/holiday/2027.htm
- South Africa public holidays, Public Holidays Act No. 36 of 1994 — https://www.gov.za/about-sa/public-holidays
- New South Wales public holidays — https://www.nsw.gov.au/about-nsw/public-holidays
- United Arab Emirates public holidays, Cabinet Resolution No. 27 of 2024 — https://u.ae/en/information-and-services/public-holidays-and-religious-affairs/public-holidays
- Advanced Placement examination dates, 2027 — https://apcentral.collegeboard.org/exam-administration-ordering-scores/exam-dates
- HKDSE examination timetable for 2026, the authority's finalised timetable revised 31 October 2025, read from a school-published mirror because the authority's own site refused automated retrieval — https://www.chemistryhk.com/dse/DSE%20Timetable/2026_DSE_Timetable.pdf
- NSC October and November 2026 timetable, reproduced from the department's February 2026 release — https://studentdaily.co.za/nsc-final-exam-timetable-2026-pdf-download-full-october-november-matric-timetable/

**Read in part, or through a summary**

- Canada public holidays, 2026 only — https://www.canada.ca/en/revenue-agency/services/tax/public-holidays.html
- International Baccalaureate, May 2026 results release — https://ibo.org/news/news-about-the-ib/the-ib-prepares-to-release-diploma-programme-dp-and-career-related-programme-cp-student-examination-results/
- Cambridge International, June 2026 results release — https://help.cambridgeinternational.org/hc/en-gb/articles/29567611785234-When-will-June-2026-results-be-released
- Advanced Placement examination dates, 2026 — https://apstudents.collegeboard.org/ap-exams-what-to-know/past-exam-dates/2026
- AQA key dates and timetables — https://www.aqa.org.uk/exams-administration/dates-and-timetables
- Hong Kong Examinations and Assessment Authority, 2026 results arrangements — https://www.hkeaa.edu.hk/DocLibrary/Media/PR/PR_20260708_HKDSE_RR_Arrangement_en.pdf
- Hebrew calendar computation for the year 5787 — https://www.hebcal.com/holidays/2026-2027
- CISCE 2026 timetable, reported from the council's release of 13 November 2025 — https://news.allen.in/cisce-exams-2026-icse-10th-and-isc-12th-timetable-released/
- CBSE 2026 result days, from a results-tracking page and not from the board — https://school.careers360.com/boards/cbse/cbse-10th-12th-result-date-2026

**Named but not retrieved.** These are the open jobs.

- Nepal, public holidays for 2083 B.S. — Ministry of Home Affairs, Nepal Gazette notice of 18 Falgun 2082 — https://in.nepalembassy.gov.np/content/236/embassy-holidays-2083/
- Sri Lanka, public and bank holidays for 2026 — Extraordinary Gazette No. 2438/22 of 27 May 2025, under the Holidays Act No. 29 of 1971 — https://www.documents.gov.lk/
- Bangladesh, public holidays for 2026 — Ministry of Public Administration — https://mopa.gov.bd/
- Australia, public holidays by state and territory — Fair Work Ombudsman — https://www.fairwork.gov.au/employment-conditions/public-holidays
- Central Board of Secondary Education, date sheets and results — https://www.cbse.gov.in/ and https://results.cbse.nic.in/
- Council for the Indian School Certificate Examinations, timetables — https://www.cisce.org/
- Department of Basic Education, South Africa, NSC timetable and results release — https://www.education.gov.za/
- Hong Kong Examinations and Assessment Authority, finalised 2026 timetable — https://www.hkeaa.edu.hk/DocLibrary/Circulars/HKDSE/HKDSE_Finalised_Examination_Timetable_for_2026_Examination.pdf
- Singapore Examinations and Assessment Board, paper-level timetables — https://www.seab.gov.sg/
- Department of Examinations, Sri Lanka — https://www.doenets.lk/
- National Examination Board, Nepal — https://www.neb.gov.np/

---

## 8. Known gaps, in order of how much they matter

1. **Sri Lanka.** The largest hole. The gazette that fixes every Poya day and the Sinhala and Tamil New Year was not served. Only Independence Day on 4 February, which is fixed by statute, is recorded. Vesak is a specific trap: secondary reports disagreed on whether Sri Lanka's 2026 Vesak Poya is 1 May or 30 May, and it is left `null` rather than picked.
2. **Bangladesh.** Only the two fixed national days. The ministry list carries the Eid spans of five and six days, the Durga Puja days, and every movable date.
3. **Nepal.** Dashain, Tihar and the new year are recorded from reporting of the gazette. The other forty-odd holidays in the 2083 B.S. list, and everything in 2084 B.S., are missing.
4. **Australia outside New South Wales.** Victoria's AFL Grand Final Friday and Melbourne Cup Day, Western Australia Day, the Northern Territory Picnic Day, Canberra Day and each state's Labour Day all differ.
5. **The Gulf national days.** Fixed Gregorian dates recorded from convention, not from each country's own portal.
6. **Everything for 2027 that has not been published yet.** The CBSE and CISCE 2027 date sheets, the Pakistan 2027 holiday circular, the Nepal 2084 B.S. gazette, the Canada 2027 list. These are `null` because they do not exist yet, which is a different kind of gap: it closes on a schedule.
7. **Indian state boards, Canadian provinces, Pakistani regional boards.** Present as shapes, empty of dates. The curriculum discovery job in `docs/CURRICULUM.md` is the right machinery to fill them.

---

## 9. Refreshing this

- **Every January.** Pakistan's Cabinet Division issues the year's circular. The UAE Cabinet confirms the year's dates.
- **Every July.** India's Department of Personnel and Training issues the memorandum for the following year. That single document carries almost every Hindu, Sikh, Jain, Muslim, Parsi and Christian date this product needs for India, and it carries them with a reference number.
- **Every autumn.** CBSE and CISCE release the following February's date sheets, usually late October and mid-November.
- **When a `null` blocks something.** Fetch the one source named in the entry. Do not fill it from anywhere else.

When a new source lands, add it to `sources` first, then point the date entries at it, then raise their `confidence`. The id in `sources` is the join, so a date can never end up in the file without a document behind it.

**Assertions to run on every refresh.** They are three passes over the two JSON files and they take a few lines each. A build that fails one of them ships a lie.

1. **No non-null date may cite a source whose `retrieved` is `not_retrieved`.** Walk every object that carries a `date`, `starts` or `ends` that is not `null`; look its `source` up in `sources`; fail if that source is `not_retrieved` or missing. A `not_retrieved` source may hold nulls and a re-anchor instruction, nothing more.
2. **Every date entry in `festivals.json` carries `greet`.** Fail on a missing one rather than defaulting it. Fail too where `greet` is `true` and there is neither a `greeting` on the entry nor an `example` on the festival, because that combination has nothing to send.
3. **Each `exam_season_hints` confidence equals the weakest confidence among the `school-calendar.json` rows for the same board id.** Rank them `official`, `official_reported`, `derived`, `reported`, `conventional`, `unverified`, ignore rows whose dates are all `null`, and fail if the hint reads stronger than the weakest row.
