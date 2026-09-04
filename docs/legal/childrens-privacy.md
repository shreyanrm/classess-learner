# Children's privacy

Draft of 3 September 2026. Version 0.1. Written by the Wobo team, not yet reviewed by a lawyer. See `README.md` in this folder for the review checklist. Read together with `privacy-policy.md` and `parental-consent.md`.

> **In plain words, for a parent or guardian**
>
> Most of the people Wobo teaches are children, so we built the product around that from the start rather than adding warnings later.
>
> A child's age decides what Wobo can do. Without your consent, Wobo teaches, and that is all: no memory beyond the lesson, no voice, no photographs, no sharing, no marketing. With your consent, the features that need to remember your child switch on.
>
> We never advertise to children, never sell their data, never build advertising profiles, and never use their learning to train systems for anyone else.
>
> You can see everything Wobo holds about your child, correct it, download it, and delete it, at any time, without giving a reason.
>
> **In plain words, for the learner**
>
> Wobo remembers what you have learned so it can teach you better. You can look at everything I remember about you, and delete any of it, on the memory page. If you would rather I forgot something, tell me and I will.

---

## 1. Who this covers

Anyone under 18.

**The age at which a learner can hold their own account is set in one place**, `terms-of-service.md` section 4, and this document follows it: from 13 a learner holds their own account; below 13 a parent or guardian holds the account with them and gives verifiable consent first; where local law sets a higher age than 13, that age applies. Nothing here changes that rule, and where the two appear to differ, the terms govern.

What follows from age:

| Age | What applies |
|---|---|
| Under 13, in the United States | COPPA. The account is held by a parent or guardian, and verifiable parental consent comes before we collect anything beyond what is needed to ask for that consent. [REVIEW: confirm that a parent-held account for an under-13 satisfies COPPA, and what the operator must do when a child signs up alone and declares an age under 13.] |
| Under 16, or under 13, in the EU depending on the member state | GDPR Article 8. The age of digital consent varies from 13 to 16. Below it, a parent consents and holds the account. [REVIEW: the age in each member state we sell in, and whether Article 8 consent may be given for a service offered on the parent's own account.] |
| Under 13, in the UK | UK GDPR and the Age Appropriate Design Code. Below 13, a parent consents and holds the account. The code applies to every user under 18. [REVIEW: the code's fifteen standards against the shipped product, in particular default settings, profiling, nudge techniques and the detriment test.] |
| Under 18, in India | The DPDP Act 2023. Verifiable parental consent for every learner under 18, no behavioural monitoring, tracking, or targeted advertising. [REVIEW: whether the tutoring profile counts as behavioural monitoring under section 9(3), and the verification standard the rules require.] |
| Under 18, in California | The eraser-button law and the CPRA rules on minors. [REVIEW: Business and Professions Code 22581 on removal of content posted by a minor, and the CPRA opt-in for sale or sharing by anyone under 16, which we do not do.] |

Where two rules apply, we follow the stricter one.

## 2. How we find out someone's age

We ask, in a neutral way, during sign-up: a date of birth field with no hint about which answer unlocks more. We do not encourage anyone to lie, and we do not let a person retry the question until they get a better outcome.

Where the answer places the learner under the age of consent for their country, we move straight into the parental consent flow described in `parental-consent.md` and hold the account in the basic state until it completes.

If we later learn that a child gave us a false age, or that a learner under 13 is holding their own account rather than one held by a parent or guardian, we suspend the extra features, contact the parent where we have a way to, move the account to the parent-held form or delete it, and delete the data we should not have collected. Anyone can tell us about such an account at support@heywobo.com.

We do not use facial age estimation or any biometric age check. [REVIEW: whether any market requires a stronger age-assurance method than self-declaration plus parental verification, particularly the UK code and Indian rules.]

## 3. What a child can do before consent

Without a parent's consent, a learner under the age of consent can still learn. Wobo will:

- teach, explain, draw on the board, ask questions and mark working, within the session;
- keep the minimum needed to run the account and keep it secure;
- keep a record of the lesson so the learner does not lose their place.

Wobo will not, before consent:

- keep a long-term memory of the learner across sessions, or build a learning profile;
- use voice input or produce a voice recording;
- accept photographs;
- send any message that is not a service message;
- share anything with anyone, including a parent link;
- offer a paid plan or take a payment.

The unconsented experience is meant to be genuinely good, not a punishment designed to nag a child into fetching a parent. [REVIEW: confirm this split against the shipped capability gates, and against COPPA's rule that a service may not condition participation on more data than is reasonably necessary.]

## 4. What we collect from a child, once consent is given

Only what the tutoring needs. Named in full in `privacy-policy.md` section 2, and in summary: account details, age band, what they study, what they say to Wobo, their working and their board ink, progress and mastery, preferences, device and log data, and photographs of syllabus or homework pages if the parent has allowed them.

We do not collect from children: precise location, contacts, advertising identifiers, social media accounts, or anything that would let a stranger find them offline.

## 5. What we never do with a child's data

- We do not sell it, and we do not share it for advertising.
- We do not show advertising in Wobo, to anyone.
- We do not build behavioural profiles for advertising, and we do not track children across other sites or apps.
- We do not use a child's conversations or working to train general-purpose AI models for our providers or for anyone else. Our contracts with third-party AI and infrastructure providers forbid it. [REVIEW: verify each provider contract carries a no-training and no-retention term before launch, and that the zero-retention setting is actually enabled.]
- We do not use pressure, false urgency, streak guilt, or any other dark pattern to get a child to spend money or hand over more data. Purchases sit behind the parent.
- We do not let learners message each other. There is no chat between users in Wobo.
- We do not publish anything a child makes without an adult's decision to share it.

## 6. What a parent can do

At any time, without giving a reason, a parent or guardian can:

- **see** everything we hold about their child, including the memory Wobo has built;
- **correct** it;
- **download** it;
- **delete** any part of it, or the whole account;
- **withdraw consent**, in whole or feature by feature, which switches those features off and deletes the data behind them;
- **refuse further collection** while letting the child carry on learning in the basic state;
- **turn off** the weekly summary, notifications, and any optional feature.

How to do it is in `parental-consent.md`. Requests go to support@heywobo.com, or through the parent controls in settings.

We do not make a parent create an account of their own to exercise these rights, and we do not charge for them.

## 7. Safety

`safety-and-content.md` sets out what Wobo refuses to discuss, and what Wobo does when a learner seems to be in distress. In short: Wobo stops teaching, says plainly that I am not a counsellor, offers ways to reach a person who can help, and, where there is a sign of immediate danger to a child and we have a way to reach a parent or guardian, we may contact them. We do not have humans watching conversations as they happen, and we will not pretend otherwise.

## 8. Schools

If a school gives Wobo to a class, the school decides the purpose and we act on its instructions. School consent is not a substitute for parental consent where the law requires the parent, and we will say so. A separate agreement applies. [REVIEW: FERPA, state student-privacy laws such as New York Education Law 2-d and California's SOPIPA, the UK's guidance for schools as controllers, and the Indian position on school-obtained consent.]

## 9. Complaints

Write to support@heywobo.com or to our data protection officer at support@heywobo.com. If you are not happy with our answer, you can complain to your data protection authority: the Data Protection Board of India, your national supervisory authority in the EU, the Information Commissioner's Office in the UK, the Federal Trade Commission or your state attorney general in the United States. [REVIEW: confirm each route and add the addresses.]
