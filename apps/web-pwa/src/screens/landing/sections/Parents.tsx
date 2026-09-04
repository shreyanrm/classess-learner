'use client';

/**
 * "A picture you can read in ten seconds." — the week, as a parent meets it.
 *
 * The numbers count up, the bars grow, the projection draws itself and the badges sit under it. All
 * of that fires ONCE as the card arrives (`mountReport`), never on a scrub: the bars move a
 * geometric attribute, and law v5 forbids scrubbing geometry, not animating it.
 *
 * There is no name anywhere in this report, and there is not one in the note either. It says "help
 * was asked for twice", because that is the thing a parent needs to know.
 */

import { BadgeIcon, ReportChart, WoboHead } from '../art';
import { PARENTS } from '../page-copy';

export function Parents() {
  const report = PARENTS.report;
  return (
    <section id="parents">
      <div className="wrap">
        <div className="row flip">
          <div>
            <div className="eyebrow reveal">{PARENTS.eyebrow}</div>
            <h2 className="t reveal">
              {PARENTS.title.lead}
              <span className="hl">{PARENTS.title.mark}</span>
            </h2>
            <p className="lede reveal">{PARENTS.lede}</p>
            <div className="claims reveal">
              {PARENTS.claims.map((claim) => (
                <div key={claim.title}>
                  <i>✓</i>
                  <div>
                    <b>{claim.title}</b>
                    <span>{claim.body}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="art bare">
            <div className="report" id="report">
              <div className="head">
                <WoboHead size={30} />
                <b>{report.heading}</b>
                <span className="tag">{report.tag}</span>
              </div>
              <div className="kpis">
                {report.kpis.map((kpi) => (
                  <div className="kpi" key={kpi.label}>
                    <span>{kpi.label}</span>
                    <b>
                      <span className="count" data-to={kpi.to}>
                        0
                      </span>
                      {kpi.suffix}
                    </b>
                    <em>{kpi.note}</em>
                  </div>
                ))}
              </div>
              <div className="chart">
                <ReportChart
                  label="Minutes a day this week, and the line to the exam"
                  days={report.days}
                  projection={report.projection}
                />
              </div>
              <div className="badges">
                {report.badges.map((badge, i) => (
                  <div key={badge}>
                    <BadgeIcon index={i} />
                    {badge}
                  </div>
                ))}
              </div>
              <div className="note">
                {report.note.lead}
                <em>{report.note.accent}</em>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
