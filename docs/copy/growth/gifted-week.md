# gifted-week

**Kind:** product surface plus one email
**Trigger:** the payer opened the payment page and left without paying, once, after a cooling period of {{cooling_hours}} hours
**To:** the account holder, never a learner under 18
**Governed by:** WOBO-PLAN §14 (gifts, not discounts), voice.md §8

## In the product

**Heading**
A week of Plus, on us.

**Body**
You looked at Plus and did not take it. Here is a week of it free so the decision is made on the thing itself rather than on a description of it. Nothing is charged at the end, and nothing renews. If you want to keep it after that, the price is the price, the same for everyone.

[Start the week] · [No thanks]

**After it is taken**
Plus is on until {{gift_end_date}}. Nothing happens on that date except that it stops.

## The email

**Subject:** A week of Plus, free
**Preview text:** Nothing renews at the end of it. The price never changes either way.

**Body**

You looked at Plus and did not take it, which is fair.

A week of it is yours, free, if you want to see it properly. Nothing is charged at the end and nothing renews. The price of Plus is the same for everyone whatever you decide.

[Start the week]

This is the only message you will get about it.

## Variables
| Variable | Example | Notes |
|---|---|---|
| `cooling_hours` | 24 | Long enough that this is not a reflex |
| `gift_end_date` | 10 September 2026 | Shown as a date, never a countdown |

## Rules
- **A gift, not a discount.** The price is never marked down, struck through, or framed as expiring value.
- **No countdown**, no timer, no "expires in", no second reminder as the week ends. When it ends, it ends, and the account goes back to free without a word.
- Offered once per account, ever, and only to the person who pays.
- Never triggered by a learner under 18 opening the payment page. Nothing about money reaches a child.
- No card is taken to start it. If the system cannot honour that, the gift is not offered.
