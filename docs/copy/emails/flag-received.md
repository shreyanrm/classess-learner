# flag-received

**Kind:** transactional
**Trigger:** a learner submits a flag on a lesson, question, board or diagram
**To:** the learner who flagged it
**From:** Wobo <hello@heywobo.com> · **Reply-to:** support@heywobo.com
**Send:** immediately
**Category:** account. Not switchable off; it is the receipt for something the learner did.

## Subject lines
**Primary:** I have your flag on {{content_name}}
Alternates: Thanks for flagging {{content_name}}

## Preview text
A person reads every one of these. I will write back when it is settled.

## Body

{{first_name}}, I have your flag.

**Where:** {{content_name}}, in {{unit_name}}.
**What you said:** {{learner_note}}
**Kind:** {{flag_type}}

A person reads every one of these, with the picture of exactly what you were looking at. I will write back when it is settled, whether we change it or not.

{{workaround_line}}

Reference {{flag_reference}} if you need to mention it again.

## Variables
| Variable | Example | Notes |
|---|---|---|
| `first_name` | (from the account) | |
| `content_name` | Question 4 | |
| `unit_name` | Trigonometric ratios | |
| `learner_note` | The angle in the diagram is 30, not 60. | Quoted back verbatim so they know we have it right |
| `flag_type` | Something is wrong | One of: something is wrong, I have a question, this could be better |
| `flag_reference` | F-4812 | |
| `workaround_line` | In the meantime, the working I showed you after it is correct; it is only the diagram that is off. | Only where we can say something true and useful immediately. Otherwise drop it. |

## Rules
- **Promise a reply, then actually reply.** `flag-fixed` closes the loop, and a flag we disagree with still gets an answer.
- Never defensive, never "our content is verified by experts". The learner might be right.
- No ticket-system language: no queue position, no priority, no service level.
