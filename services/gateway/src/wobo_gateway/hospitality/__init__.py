"""Hospitality — the part of Wobo that is there when nobody asked (WOBO-PLAN §14.1).

Modules:

* :mod:`.preferences` — the family's mail dials (the Sunday note, the wins, the festival wishes),
  the calendars they chose to be wished on, the locality they told us, and the opt-out timestamp.
  One store seam, in-memory or PostgREST, never read from a request body.
* :mod:`.festivals` — the hospitality calendar (``content/hospitality/festivals.json``) and the
  rule engine that decides, for one learner on one day, which wish applies: locality first,
  the family's own choice for anything religious or cultural, one a day, never inside another
  email's twenty-four hours, never in quiet hours.
* :mod:`.copy` — the gate every wish line passes: plain English, names the day, wishes well,
  and nothing §19 or §20 forbids.
* :mod:`.tokens` — the signed one-click stop token behind ``/v1/mail/stop``. A token names the
  learner and the mail it was sent in, so a click stops that mail and nobody else's.
* :mod:`.api` — the routes: ``GET/PUT /v1/me/mail-preferences`` and ``GET/POST /v1/mail/stop``.
* :mod:`.jobs` — the mail jobs: the Sunday note (``POST /v1/internal/mail/sunday``, a cron
  door), the festival wish (``POST /v1/internal/mail/wishes``, the other), the welcome on the
  first meeting, and the win with its once-a-week rule. They read the dials from
  :mod:`.preferences`, the calendar's clock rules from :mod:`.festivals`, the stop link from
  :mod:`.tokens`, and record every send in :func:`wobo_gateway.email.mail_log` so nothing is
  ever sent twice and no inbox hears from Wobo twice in a day.
"""
