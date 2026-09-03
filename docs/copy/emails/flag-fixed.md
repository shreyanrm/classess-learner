# flag-fixed

**Kind:** transactional
**Trigger:** a flagged item is corrected, or the flag is closed without a change
**To:** the learner who flagged it
**From:** Wobo <hello@heywobo.com> · **Reply-to:** help@heywobo.com
**Send:** when the flag is resolved
**Category:** account. Not switchable off.

## Subject lines
**Primary (fixed):** You were right about {{content_name}}
**Primary (no change):** About your flag on {{content_name}}
Alternates: {{content_name}} is corrected

## Body — fixed

{{first_name}}, you were right.

**What was wrong:** {{what_was_wrong}}
**What it says now:** {{what_changed}}

It is corrected for everyone, not only for you, which means that particular mistake is now nobody's problem. Thank you for catching it.

[See the corrected version]

Reference {{flag_reference}}.

## Body — no change

{{first_name}}, I looked at your flag on {{content_name}} with a person, and we are leaving it as it is.

**Why:** {{reason}}

If that does not settle it, reply to this and say why. You may still be right, and we would rather have the argument than leave you thinking something incorrect.

Reference {{flag_reference}}.

## Variables
| Variable | Example | Notes |
|---|---|---|
| `first_name` | Aditi | |
| `content_name` | Question 4 in Trigonometric ratios | |
| `what_was_wrong` | The diagram labelled the angle 60 degrees while the working used 30. | Plain, specific, no hedging |
| `what_changed` | The diagram is redrawn with 30 degrees, and the working is unchanged. | |
| `reason` | Both conventions are used, and your board's textbook uses this one, so we have kept it and added a line saying so. | Plain and specific; never "as designed" |
| `content_url` | https://heywobo.com/... | Straight to the corrected item |
| `flag_reference` | F-4812 | |

## Rules
- **Say "you were right" when they were right.** Plainly, in the subject line.
- No XP, no reward, no badge for flagging. The correction is the point, and paying for flags produces bad flags.
- A closed-without-change flag always gets a real reason and an open door.
- If the same item is flagged by several learners, every one of them gets this.
