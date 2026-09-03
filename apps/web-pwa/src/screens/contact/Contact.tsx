'use client';

/**
 * `/contact` — where a person writes to a person, and the one place the addresses are listed.
 *
 * There is no message endpoint. The gateway's only mail route is an internal one, guarded by a
 * shared key a browser must never hold, so a form here would have nowhere to post to. Rather than
 * build a form that quietly goes nowhere — the single most common lie a contact page tells — the
 * fields compose a message and hand it to the learner's own email app, and the page says exactly
 * that in one line above the button. Every mailbox is printed as well, so somebody whose device has
 * no mail app set up can still copy one.
 *
 * It used to be two pages: this one, and `/legal/contact`, which listed the mailboxes the legal
 * documents name. Two pages doing one job meant a visitor found whichever the page they were on
 * linked to. The mailbox list moved here, `/legal/contact` is now an alias of this address, and
 * this page wears the same public shell as every other public page — so it has the same header,
 * the same skip link and the same way back to anywhere.
 */

import { useMemo, useState } from 'react';
import { CONTACT } from '../auth/copy';
import { MAILBOXES, OPEN_TERMS } from '../site/identity';
import { SiteShell } from '../site/SiteShell';

/** The message, as an address the learner's own mail app understands. */
export function mailtoHref(to: string, subject: string, body: string): string {
  const query = new URLSearchParams({ subject, body }).toString().replace(/\+/g, '%20');
  return `mailto:${to}?${query}`;
}

export function Contact() {
  const [reason, setReason] = useState<string>(CONTACT.reasons[0] as string);
  const [message, setMessage] = useState('');
  const href = useMemo(() => mailtoHref(CONTACT.address, reason, message), [reason, message]);

  return (
    <SiteShell current="contact" title="Contact — Wobo" label={CONTACT.title}>
      <section className="lp-wrap lp-head">
        <p className="lp-eyebrow">{CONTACT.eyebrow}</p>
        <p className="lp-hand">{CONTACT.hand}</p>
        <h1 className="lp-h1x">{CONTACT.title}</h1>
        <p className="lp-lead">{CONTACT.body}</p>
      </section>

      <section className="lp-wrap lp-doc lp-doc--contact">
        <div>
          <div className="ct-field">
            <label className="ct-label" htmlFor="wc-reason">
              {CONTACT.subject}
            </label>
            <select
              id="wc-reason"
              className="ct-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {CONTACT.reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="ct-field">
            <label className="ct-label" htmlFor="wc-message">
              {CONTACT.message}
            </label>
            <textarea
              id="wc-message"
              className="ct-input ct-textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <p className="lp-note">{CONTACT.mailtoNote}</p>

          <div className="lp-cta" style={{ marginTop: 18 }}>
            <a className="lp-btn lp-btn--pigment" href={href}>
              {CONTACT.send}
            </a>
          </div>
        </div>

        <aside className="st-aside" aria-label="Every address you can write to">
          <h2>Every mailbox</h2>
          <ul className="lp-lines" style={{ marginTop: 0 }}>
            {MAILBOXES.map((box) => (
              <li key={box.address}>
                <a className="ct-mail" href={`mailto:${box.address}`}>
                  {box.address}
                </a>
                <span className="ct-what">{box.what}</span>
              </li>
            ))}
          </ul>
          <p className="lp-note">
            {`A postal address and a registered company name belong here too. Neither is settled yet
            (${OPEN_TERMS.join(' and ')}), and the legal set shows both as blanks rather than
            printing something we would have to correct.`}
          </p>
        </aside>
      </section>
    </SiteShell>
  );
}
