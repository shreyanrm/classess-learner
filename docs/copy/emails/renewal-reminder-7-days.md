# renewal-reminder-7-days

**Kind:** transactional
**Trigger:** 7 days before any renewal
**To:** the account holder who pays
**From:** Wobo <hello@heywobo.com> · **Reply-to:** help@heywobo.com
**Send:** 7 days before {{renewal_date}}
**Category:** billing. Not switchable off.

## Subject lines
**Primary:** {{amount}} on {{renewal_date}}
Alternates: Your Wobo plan renews in a week

## Preview text
Keeping it needs nothing from you. Cancelling takes a minute.

## Body

A week's notice: your {{plan_name}} renews on {{renewal_date}} for {{amount}}, charged to {{payment_method_last4}}.

Keeping it needs nothing from you.

Cancelling takes a minute. We offer you a pause or a smaller plan first, then it is done, and you keep Plus until {{renewal_date}}.

[Manage your plan]

## Variables
| Variable | Example | Notes |
|---|---|---|
| `plan_name` | Plus annual | |
| `renewal_date` | 3 September 2027 | |
| `amount` | [amount] | |
| `payment_method_last4` | card ending 1180 | |
| `manage_url` | https://heywobo.com/settings/plan | |

## Rules
- Under 60 words. It is a notice.
- No offer, no save attempt, no summary of the year at this distance.
- If the card on file has expired, add one line: "That card expires before then. Update it and the renewal goes through." Nothing more alarming than that.
