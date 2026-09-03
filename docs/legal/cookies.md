# Cookies and similar technologies

Draft of 3 September 2026. Version 0.1. Written by the Wobo team, not yet reviewed by a lawyer. See `README.md` in this folder for the review checklist.

> **In plain words**
>
> Wobo stores a few things in your browser or on your device. Most of them are the boring, necessary kind: they keep you signed in, remember whether you chose dark mode, and keep your place in a lesson if the network drops.
>
> There are no advertising cookies in Wobo. Nobody is following you around the internet because of us.
>
> Anything that is not strictly necessary is off until you say yes, and you can change your mind from the cookie settings link in the footer and in settings.

---

## 1. What we mean by cookies

A cookie is a small file a site stores in your browser. We use a few other kinds of local storage too, and we treat them all the same way in this notice: local storage and session storage, IndexedDB, service worker caches for offline lessons, and, in the phone apps, the equivalent device storage.

## 2. What we store, and why

### Strictly necessary

These do not need consent, because without them the product does not work. Turning them off would mean turning Wobo off.

| Name or purpose | What it does | How long |
|---|---|---|
| Session and authentication | keeps you signed in, and stops someone else using your session | until you sign out, or [30 days] |
| Security | detects sign-in from a new device, rate-limits abuse, protects against cross-site request forgery | session to [12 months] |
| Load balancing and routing | sends your request to a working server | session |
| Consent record | remembers the cookie choices you made, so we do not ask again | [12 months] |
| Preferences | theme, language, reduced motion, voice on or off, accent, how proactive Wobo should be | [12 months] |
| Offline learning cache | keeps downloaded lessons and boards on your device so they work without a network | until you clear it, or the download expires |
| In-progress work | your place in a lesson and your unsaved working, so a dropped connection does not lose it | until the lesson is finished |

### Optional, and off until you agree

| Purpose | What it does | How long |
|---|---|---|
| Product analytics | counts which screens and features are used, and where people get stuck, so we can fix the product. Aggregated wherever possible | [12 months] |
| Crash and performance reporting | records what the app was doing when it broke | [90 days] |
| Feature experiments | keeps you on one side of an A/B test so the product does not change under you mid-session | [90 days] |

We do not use advertising cookies, cross-site tracking pixels, social media trackers, fingerprinting, or data brokers. If that ever changes it will be a new version of this notice, with a fresh ask, and never for a learner under 18. [REVIEW: confirm against the shipped bundle before launch, including anything a third-party script pulls in.]

## 3. Children

For a learner under 18, the optional categories stay off unless a parent or guardian has agreed to them in the consent flow. We do not ask a child for cookie consent. [REVIEW: ePrivacy consent for minors, the UK Age Appropriate Design Code, and the DPDP Act's restriction on tracking and behavioural monitoring of children.]

## 4. How to change your mind

- **In Wobo:** the cookie settings link, in the footer of the site and in settings, opens the same panel you saw the first time. Change anything, and it takes effect at once.
- **In your browser:** you can block or delete cookies in your browser settings. Blocking the strictly necessary ones will sign you out and break offline lessons.
- **On your phone:** clearing the app's storage removes everything, including downloaded lessons.
- **Global signals:** we honour Global Privacy Control and similar browser opt-out signals as an opt-out where the law treats them that way. [REVIEW: CPRA and other US state laws requiring universal opt-out mechanisms.]

## 5. Consent, and where the rules come from

In the EU and the UK, storing anything on your device that is not strictly necessary needs your consent, under the ePrivacy rules as well as the GDPR. We ask before we store, not after, and refusing is as easy as accepting: the banner has a plain reject control with the same weight as accept, and no pre-ticked boxes. We ask again after [12 months], or sooner if we add a purpose. [REVIEW: ePrivacy Directive Article 5(3), national implementations, and the guidance on consent-banner design, including the position on refusing without a second click. Two rows in the strictly necessary table in section 2 need deciding here rather than assuming: the preferences store, since the interface-customisation exemption as applied by the EDPB and national regulators reaches only storage set on the user's own explicit request and kept for a short period, which a [12 month] store written by default does not obviously satisfy; and the consent record itself at [12 months]. If either fails the exemption it moves to the optional table.]

In India, storage that involves personal data sits under the consent notice described in `privacy-policy.md`. [REVIEW: DPDP Act and its rules.]

In California and other US states, the relevant question is whether any of this counts as selling or sharing. It does not, because none of it goes to an advertiser. [REVIEW: CCPA and CPRA definitions of sale and share, and whether any analytics provider's terms make it a sale.]

## 6. Third parties

Our optional analytics and crash reporting are provided by analytics and crash reporting providers, acting on our instructions, under contract, and they may not use what they see for their own purposes. That is a separate category from the third-party AI and infrastructure providers who run the tutoring itself; the canonical list of recipient categories is the table in `privacy-policy.md` section 5, and every other document uses its names. We name categories rather than companies, for the reason given in `privacy-policy.md` section 5. A named list is available on request at privacy@heywobo.com. [REVIEW: whether a named list is required in the cookie notice itself in the EU and the UK.]

## 7. Changes

If we add a purpose, we will ask again before we store anything for it. Old versions of this notice stay available.

Questions: privacy@heywobo.com.
