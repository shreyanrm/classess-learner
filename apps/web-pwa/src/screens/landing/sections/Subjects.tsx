'use client';

/**
 * "If your school sets it, Wobo teaches it." — the subject FAMILIES.
 *
 * Families, never grades. Law v5's copy rule is explicit: no public surface names an age range or a
 * class band, because anyone may sign up and see for themselves. So a reader recognises their own
 * subject in a list, and the only question ever asked is which board.
 */

import { SUBJECTS } from '../page-copy';

export function Subjects() {
  return (
    <section id="subjects">
      <div className="wrap">
        <div className="eyebrow reveal">{SUBJECTS.eyebrow}</div>
        <h2 className="t reveal">
          {SUBJECTS.title.lead}
          <span className="hl">{SUBJECTS.title.mark}</span>
        </h2>
        <p className="lede reveal">{SUBJECTS.lede}</p>
        <div className="stages">
          {SUBJECTS.families.map((family) => (
            <div className="stage reveal" key={family.name}>
              <div className="who">
                <b>{family.name}</b>
                <span>{family.gloss}</span>
              </div>
              <div className="subs">
                {family.lead.map((subject) => (
                  <span className="acc" key={subject}>
                    {subject}
                  </span>
                ))}
                {family.rest.map((subject) => (
                  <span key={subject}>{subject}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="lede reveal" style={{ maxWidth: '58ch' }}>
          {SUBJECTS.closing}
        </p>
      </div>
    </section>
  );
}
