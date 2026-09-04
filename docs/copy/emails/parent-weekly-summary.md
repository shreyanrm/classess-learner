# parent-weekly-summary

**Kind:** hospitality, recurring
**Trigger:** weekly, where a parent link is active and the learner did something that week
**To:** the parent
**From:** Wobo <hello@heywobo.com> · **Reply-to:** support@heywobo.com
**Send:** Sunday evening, parent's local time
**Category:** weekly summaries. Off switch in every send.

## Subject lines
**Primary:** {{learner_first_name}}'s week: {{headline}}
Alternates: This week with {{learner_first_name}} · {{learner_first_name}} cracked {{headline_topic}}

## Preview text
{{one_line_summary}}

## Body

Hello.

Here is {{learner_first_name}}'s week.

**{{topics_count}} topics** in {{subjects_list}}, over {{active_days}} days.

{{wobo_note}}

**The one to look at.** {{highlight_topic}}. {{highlight_reason}}

This is what they drew while working it out. It is worth thirty seconds.

[Open the page]

{{plus_line}}

You are getting this because {{learner_first_name}} set up a weekly update. [Stop the weekly page] · [Get it less often]

## Variables
| Variable | Example | Notes |
|---|---|---|
| `learner_first_name` | Aditi | |
| `headline` / `headline_topic` | trigonometry | Subject-line fragment, lowercase mid-sentence |
| `topics_count` | 5 | Drop the line if 0; do not send an empty week |
| `subjects_list` | maths and chemistry | |
| `active_days` | 4 | |
| `wobo_note` | Aditi asked me why an answer was wrong nine times this week, which is unusual and is the reason the chapter went quickly. | Behaviour-based, generated, true. Wobo is never pronouned; name the learner rather than pronouning them, so the sentence reads the same for every family. |
| `highlight_topic` | Heights and distances | |
| `highlight_reason` | It took four goes on Tuesday and none on Thursday. | One clause, true |
| `page_url` | https://heywobo.com/p/... | The read-only progress page |
| `plus_line` | — | Optional, one calm sentence, only where a limit was actually hit that week: "Aditi ran out of turns on two days this week. Plus removes the daily limit." One line, one link, no urgency, no discount. |
| `one_line_summary` | Four days, five topics, and one chapter that finally clicked. | Preheader |

## Rules
- **Never send an empty or near-empty week.** No week is dressed up. If the child did nothing, the page is skipped silently; we do not report absence to a parent.
- **Never a comparison** to other children, a class average, or a percentile.
- **Never a warning.** No "falling behind", no "needs attention", no red anything.
- The upgrade line appears only when the child genuinely hit a limit, at most once a month, and never in a week the child struggled.
- Wobo writes as "I" and is never given a pronoun. The learner is named rather than pronouned wherever it reads naturally.
