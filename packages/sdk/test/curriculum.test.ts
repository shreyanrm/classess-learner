/**
 * The curriculum client and the overlay.
 *
 * Two things are being proved. First, that the client is a faithful, lenient reader of the brain:
 * every capability posts the shape the brain documents, and every response parses without ever
 * inventing a node. Second, that the overlay round-trips — the edits a learner makes locally are
 * the same edits the brain stores, and re-applying them to the same canonical nodes gives back the
 * same view, which is what "the learner's overlay survives an upgrade" rests on.
 */

import { describe, expect, test } from 'bun:test';
import {
  appendOp,
  applyOverlayOps,
  CurriculumError,
  type CurriculumNode,
  createCurriculumClient,
  labelFor,
  moveWithin,
  type OverlayOp,
  overlayOps,
  parseOverlayOp,
  parseUnits,
  sourceLine,
} from '../src/curriculum';

/** A recording post seam: the client under test never touches fetch. */
function recorder(replies: Record<string, unknown>) {
  const calls: { capability: string; payload: Record<string, unknown> }[] = [];
  const post = async (capability: string, payload: unknown) => {
    calls.push({ capability, payload: payload as Record<string, unknown> });
    if (!(capability in replies)) throw new Error(`no reply staged for ${capability}`);
    return replies[capability];
  };
  return { calls, client: createCurriculumClient('https://brain.test', { post }) };
}

const node = (id: string, name: string, over: Partial<CurriculumNode> = {}): CurriculumNode => ({
  id,
  kind: 'unit',
  name,
  parentId: 'subject-1',
  order: 0,
  aliases: [],
  checksPassed: [],
  verifiedAt: null,
  sourceRef: null,
  conceptIds: [],
  own: false,
  notInMySchool: false,
  textbook: null,
  renamedFrom: null,
  source: null,
  objectives: [],
  ...over,
});

describe('search', () => {
  test('posts the query with the country hint and keeps the not-listed door', async () => {
    const { calls, client } = recorder({
      'curriculum.search': {
        query: 'cbs',
        country: 'IN',
        results: [
          {
            id: 'cbse',
            name: 'CBSE',
            kind: 'national',
            status: 'verified',
            aliases: ['Central Board of Secondary Education'],
            country: 'IN',
            levels: ['Class 8', 'Class 9'],
            label: 'Official CBSE 2026-27, verified',
          },
        ],
        not_listed: { message: 'Not listed? Tell me and I will look.' },
      },
    });

    const out = await client.search('cbs', { country: 'IN', limit: 8 });

    expect(calls[0]).toEqual({
      capability: 'curriculum.search',
      payload: { q: 'cbs', country: 'IN', limit: 8 },
    });
    expect(out.results).toHaveLength(1);
    expect(out.results[0]?.aliases).toEqual(['Central Board of Secondary Education']);
    expect(out.results[0]?.label).toBe('Official CBSE 2026-27, verified');
    expect(out.notListed.message).toBe('Not listed? Tell me and I will look.');
  });

  test('a response with no door still carries one — it is never more than a tap away', async () => {
    const { client } = recorder({ 'curriculum.search': { results: [] } });
    const out = await client.search('  a board nobody listed  ');
    expect(out.results).toEqual([]);
    expect(out.notListed.message.length).toBeGreaterThan(0);
    expect(out.notListed.query).toBe('a board nobody listed');
  });

  test('a result missing an id or a name is dropped, never filled in', async () => {
    const { client } = recorder({
      'curriculum.search': {
        results: [{ name: 'No id here' }, { id: 'x' }, { id: 'icse', name: 'ICSE' }],
      },
    });
    const out = await client.search('i');
    expect(out.results.map((f) => f.id)).toEqual(['icse']);
  });
});

describe('units', () => {
  test('ready units come back in order with their provenance', async () => {
    const { calls, client } = recorder({
      'curriculum.units': {
        status: 'ready',
        subject_id: 'sub-1',
        label: 'Official CBSE 2026-27, verified',
        units: [
          { id: 'u2', kind: 'unit', name: 'Linear equations', order: 2, parent_id: 'sub-1' },
          {
            id: 'u1',
            kind: 'unit',
            name: 'Rational numbers',
            order: 1,
            parent_id: 'sub-1',
            source_ref: { url: 'https://cbse.test/syllabus.pdf', page: 12 },
          },
        ],
      },
    });

    const out = await client.units('cbse', 'Class 8', 'Mathematics');

    expect(calls[0]?.payload).toEqual({
      framework_id: 'cbse',
      level: 'Class 8',
      subject: 'Mathematics',
    });
    expect(out.status).toBe('ready');
    expect(out.units.map((u) => u.name)).toEqual(['Rational numbers', 'Linear equations']);
    expect(out.units[0]?.sourceRef?.page).toBe(12);
  });

  test('the provenance block the brain sends is what makes the source line clickable', async () => {
    // CURRICULUM.md §5. `source_ref` is where in the document a node sits and carries no URL;
    // the `source` block beside it is the only place `source_url` lives. Reading only the first
    // is why a learner saw "From unit 1 of the syllabus" with nothing to click.
    const { client } = recorder({
      'curriculum.units': {
        framework: { id: 'cbse', name: 'CBSE' },
        version: { id: 'v1', framework_id: 'cbse', label: '2026-27' },
        status: 'ready',
        units: [
          {
            id: 'u1',
            kind: 'unit',
            name: 'Number systems',
            order: 1,
            parent_id: 'sub-1',
            source_ref: { document_id: 'doc-1', page: 4, section: 'Course structure' },
            source: {
              source_url: 'https://cbseacademic.nic.in/syllabus.pdf',
              source: 'page 4, Course structure',
              checks_passed: ['seeded', 'source_attached'],
              verified_at: '2026-01-01T00:00:00Z',
              verified_by: 'owner',
            },
          },
        ],
      },
    });

    const out = await client.units('cbse', 'Class 9', 'Mathematics');
    const unit = out.units[0];
    expect(unit?.sourceRef?.url).toBe('https://cbseacademic.nic.in/syllabus.pdf');
    expect(unit?.sourceRef?.page).toBe(4);
    expect(unit?.sourceRef?.section).toBe('Course structure');
    expect(unit?.checksPassed).toEqual(['seeded', 'source_attached']);
    expect(unit?.verifiedAt).toBe('2026-01-01T00:00:00Z');
  });

  test('a node the brain says has no source is served with none, not with a borrowed one', async () => {
    const { client } = recorder({
      'curriculum.units': {
        framework: { id: 'cbse', name: 'CBSE' },
        version: { id: 'v1', framework_id: 'cbse', label: '2026-27' },
        status: 'ready',
        units: [
          {
            id: 'own:1',
            kind: 'unit',
            name: 'My extra chapter',
            order: 1,
            parent_id: 'sub-1',
            own: true,
            source_ref: null,
            source: null,
          },
        ],
      },
    });

    const unit = (await client.units('cbse', 'Class 9', 'Mathematics')).units[0];
    expect(unit?.sourceRef).toBeNull();
    expect(unit?.source).toBeNull();
    expect(unit?.checksPassed).toEqual([]);
  });

  test('a missing syllabus is "looking" with a placeholder — never an empty chapter list', async () => {
    const { client } = recorder({
      'curriculum.units': {
        status: 'looking',
        units: [],
        placeholder: {
          job_id: 'job-1',
          state: 'searching',
          open: true,
          message: 'I am looking for the official syllabus.',
        },
        not_listed: { message: 'Or show me yours.' },
      },
    });
    const out = await client.units('unlisted', 'Class 8', 'Mathematics');
    expect(out.status).toBe('looking');
    expect(out.units).toEqual([]);
    expect(out.placeholder?.state).toBe('searching');
    expect(out.notListed?.message).toBe('Or show me yours.');
  });

  test('a response with neither status nor units reads as looking, not as ready-and-empty', () => {
    const view = parseUnits({}, { frameworkId: 'f', level: 'Class 8', subject: 'Mathematics' });
    expect(view.status).toBe('looking');
    expect(view.units).toEqual([]);
  });
});

describe('topics, pin, upgrade and status', () => {
  test('topics carry objectives in the framework’s own words', async () => {
    const { client } = recorder({
      'curriculum.topics': {
        unit: { id: 'u1', name: 'Rational numbers', order: 1 },
        topics: [
          {
            id: 't1',
            kind: 'topic',
            name: 'Closure',
            order: 1,
            parent_id: 'u1',
            concept_ids: ['c-rational-closure'],
            objectives: ['State the closure property', { id: 'o2', name: 'Apply it' }],
          },
        ],
      },
    });
    const out = await client.topics('cbse', 'u1');
    expect(out.unit.name).toBe('Rational numbers');
    expect(out.topics[0]?.objectives.map((o) => o.name)).toEqual([
      'State the closure property',
      'Apply it',
    ]);
    expect(out.topics[0]?.conceptIds).toEqual(['c-rational-closure']);
  });

  test('pin sends the version when one is named', async () => {
    const { calls, client } = recorder({
      'curriculum.pin': {
        framework: { id: 'cbse', name: 'CBSE' },
        version: { id: 'v-2026', year: '2026-27' },
        label: 'Official CBSE 2026-27, verified',
        pinned: true,
      },
    });
    const out = await client.pin('cbse', 'v-2026');
    expect(calls[0]?.payload).toEqual({ framework_id: 'cbse', version_id: 'v-2026' });
    expect(out.pinned).toBe(true);
    expect(out.version?.year).toBe('2026-27');
  });

  test('an upgrade offer reads as a diff, and applying it reports the overlay', async () => {
    const { calls, client } = recorder({
      'curriculum.upgrade': {
        upgrade_available: true,
        latest: { id: 'v-2027', year: '2027-28' },
        latest_label: 'Official CBSE 2027-28, verified',
        changes: [
          { kind: 'moved', line: 'Linear equations moved to chapter 3', node_id: 'u3' },
          { kind: 'noise' },
        ],
        summary: 'Three chapters moved.',
        upgraded: true,
        overlay_kept: 4,
        overlay_dropped: 1,
        overlay_report: ['Your note on “Playing with numbers” no longer has a home'],
      },
    });
    const out = await client.upgrade('cbse', true);
    expect(calls[0]?.payload).toEqual({ framework_id: 'cbse', apply: true });
    expect(out.changes).toHaveLength(1);
    expect(out.overlayKept).toBe(4);
    expect(out.overlayReport).toHaveLength(1);
  });

  test('status by job id', async () => {
    const { calls, client } = recorder({
      'curriculum.status': { job: { id: 'job-1', state: 'refused' }, message: 'Nothing official.' },
    });
    const out = await client.status({ jobId: 'job-1' });
    expect(calls[0]?.payload).toEqual({ job_id: 'job-1' });
    expect(out.state).toBe('refused');
    expect(out.open).toBe(false);
  });
});

describe('refusals', () => {
  test('the brain’s code survives, so the screen can offer the right door', async () => {
    const client = createCurriculumClient('https://brain.test', {
      post: async () => {
        throw new CurriculumError('unknown_framework', 'I do not know that one yet.', 404);
      },
    });
    const err = await client.framework('nope').catch((e) => e as CurriculumError);
    expect(err).toBeInstanceOf(CurriculumError);
    expect((err as CurriculumError).code).toBe('unknown_framework');
    expect((err as CurriculumError).offersOwnSyllabus).toBe(true);
  });

  test('an unreadable framework payload refuses rather than rendering a blank board', async () => {
    const { client } = recorder({ 'curriculum.framework': { framework: null } });
    const err = await client.framework('cbse').catch((e) => e as CurriculumError);
    expect((err as CurriculumError).code).toBe('unreadable');
  });
});

describe('the own-syllabus door', () => {
  test('a pasted syllabus posts as text and comes back awaiting confirmation', async () => {
    const { calls, client } = recorder({
      'curriculum.own.read': {
        framework: {
          framework_id: 'own:1',
          name: 'My school',
          level: 'Class 8',
          status: 'personal',
          units: [{ id: 'u1', name: 'Numbers', order: 1, confirmed: false }],
        },
        label: 'Drafted from your syllabus, check it',
      },
    });
    const out = await client.own.read(
      { kind: 'paste', text: '1. Numbers\n2. Algebra' },
      { name: 'My school', level: 'Class 8' },
    );
    expect(calls[0]?.payload).toEqual({
      kind: 'paste',
      text: '1. Numbers\n2. Algebra',
      framework_name: 'My school',
      level: 'Class 8',
    });
    expect(out.status).toBe('personal');
    expect(out.framework.personal).toBe(true);
    expect(out.framework.name).toBe('My school');
    expect(out.label).toBe('Drafted from your syllabus, check it');
    // Every unit of a personal syllabus is the learner's own, whatever the wire said.
    expect(out.units.every((u) => u.own)).toBe(true);
    expect(out.unconfirmed).toEqual(['u1']);
  });

  test('a flat framework block reads the same as a nested one, and stays personal', async () => {
    const { client } = recorder({
      'curriculum.own.read': {
        id: 'own:2',
        name: 'Mine',
        // Even a wire that forgot to say personal produces a personal framework.
        kind: 'national',
        status: 'verified',
        level: 'Class 9',
        units: [{ id: 'u1', name: 'Numbers', order: 0, confirmed: true }],
      },
    });
    const out = await client.own.read(
      { kind: 'paste', text: 'Numbers' },
      { name: 'Mine', level: 'Class 9' },
    );
    expect(out.framework.kind).toBe('personal');
    expect(out.framework.status).toBe('personal');
    expect(out.status).toBe('personal');
    expect(out.unconfirmed).toEqual([]);
  });

  test('a photo posts its media type alongside the image', async () => {
    const { calls, client } = recorder({
      'curriculum.own.read': {
        framework: { framework_id: 'own:3', name: 'Mine', level: 'Class 9', units: [] },
      },
    });
    await client.own.read(
      { kind: 'photo', data: 'BASE64', mediaType: 'image/jpeg' },
      { name: 'Mine', level: 'Class 9' },
    );
    expect(calls[0]?.payload.image).toBe('BASE64');
    expect(calls[0]?.payload.media_type).toBe('image/jpeg');
  });
});

describe('overlay round trip', () => {
  const canonical: CurriculumNode[] = [
    node('u1', 'Rational numbers', { order: 0 }),
    node('u2', 'Linear equations', { order: 1 }),
    node('u3', 'Quadrilaterals', { order: 2 }),
  ];

  const ops: OverlayOp[] = [
    overlayOps.rename('u2', 'Equations in one variable'),
    overlayOps.notInMySchool('u3', true),
    overlayOps.attachTextbook('u1', { title: 'NCERT Maths 8', publisher: 'NCERT' }),
    overlayOps.add('subject-1', 'unit', 'Our extra chapter', 'u1'),
    overlayOps.reorder('subject-1', ['u3', 'u1', 'u2']),
  ];

  test('every edit lands, and an added node is marked as the learner’s own', () => {
    let n = 0;
    const { nodes, dropped } = applyOverlayOps(canonical, ops, { mintId: () => `own:${++n}` });
    expect(dropped).toEqual([]);
    expect(nodes.map((x) => x.name)).toEqual([
      'Quadrilaterals',
      'Rational numbers',
      'Equations in one variable',
      'Our extra chapter',
    ]);
    const renamed = nodes.find((x) => x.id === 'u2');
    expect(renamed?.renamedFrom).toBe('Linear equations');
    expect(nodes.find((x) => x.id === 'u3')?.notInMySchool).toBe(true);
    expect(nodes.find((x) => x.id === 'u1')?.textbook?.title).toBe('NCERT Maths 8');
    const added = nodes.find((x) => x.own);
    expect(added?.id.startsWith('own:')).toBe(true);
    expect(added?.sourceRef).toBeNull();
  });

  test('ops survive the wire: serialise, parse back, re-apply, identical view', () => {
    const mint = () => {
      let n = 0;
      return () => `own:${++n}`;
    };
    const first = applyOverlayOps(canonical, ops, { mintId: mint() });
    const wire = JSON.parse(JSON.stringify(ops)) as unknown[];
    const reparsed = wire.map((o) => parseOverlayOp(o)).filter((o): o is OverlayOp => o !== null);
    expect(reparsed).toHaveLength(ops.length);
    const second = applyOverlayOps(canonical, reparsed, { mintId: mint() });
    expect(second.nodes).toEqual(first.nodes);
  });

  test('applying the same overlay to a NEW version keeps what matches and reports what does not', () => {
    // The upgrade moved u3 out and renumbered; u1 and u2 are still there.
    const next: CurriculumNode[] = [
      node('u1', 'Rational numbers', { order: 0 }),
      node('u2', 'Linear equations', { order: 1 }),
    ];
    const { nodes, dropped } = applyOverlayOps(next, ops, { mintId: () => 'own:1' });
    expect(nodes.find((x) => x.id === 'u2')?.name).toBe('Equations in one variable');
    expect(nodes.find((x) => x.id === 'u1')?.textbook?.title).toBe('NCERT Maths 8');
    // The edit whose node is gone is reported, not silently dropped and not re-invented.
    expect(dropped.map((o) => o.op)).toEqual(['not_in_my_school']);
    expect(nodes.some((x) => x.name === 'Quadrilaterals')).toBe(false);
  });

  test('removing a unit takes its topics with it', () => {
    const withTopics: CurriculumNode[] = [
      ...canonical,
      node('t1', 'Closure', { kind: 'topic', parentId: 'u1', order: 0 }),
      node('t2', 'Ordering', { kind: 'topic', parentId: 'u1', order: 1 }),
    ];
    const { nodes } = applyOverlayOps(withTopics, [overlayOps.remove('u1')]);
    expect(nodes.map((x) => x.id)).toEqual(['u2', 'u3']);
  });

  test('appendOp collapses repeated edits of the same node into the learner’s intent', () => {
    let ops2: OverlayOp[] = [];
    ops2 = appendOp(ops2, overlayOps.rename('u1', 'A'));
    ops2 = appendOp(ops2, overlayOps.rename('u1', 'B'));
    ops2 = appendOp(ops2, overlayOps.notInMySchool('u1', true));
    ops2 = appendOp(ops2, overlayOps.notInMySchool('u1', false));
    expect(ops2).toEqual([overlayOps.rename('u1', 'B'), overlayOps.notInMySchool('u1', false)]);
    // A removal swallows the edits that came before it — there is nothing left to rename.
    ops2 = appendOp(ops2, overlayOps.remove('u1'));
    expect(ops2).toEqual([overlayOps.remove('u1')]);
  });

  test('moveWithin builds the reorder a single arrow press means, and refuses at the ends', () => {
    expect(moveWithin(canonical, 'subject-1', 'u3', -1)).toEqual(
      overlayOps.reorder('subject-1', ['u1', 'u3', 'u2']),
    );
    expect(moveWithin(canonical, 'subject-1', 'u1', -1)).toBeNull();
  });

  test('an unknown op tag is dropped, never guessed at', () => {
    expect(parseOverlayOp({ op: 'delete_everything', node_id: 'u1' })).toBeNull();
    expect(parseOverlayOp({ op: 'rename', node_id: 'u1' })).toBeNull();
  });
});

describe('labels', () => {
  test('each status reads as CURRICULUM.md §5 writes it', () => {
    expect(labelFor('verified', { name: 'CBSE', version: '2026-27' })).toBe(
      'Official CBSE 2026-27, verified',
    );
    expect(labelFor('provisional')).toBe("Found on the board's site, still checking");
    expect(labelFor('community')).toBe('Shared by another learner, not yet checked');
    expect(labelFor('personal')).toBe('Drafted from your syllabus, check it');
  });

  test('a verified label with no year does not borrow one', () => {
    expect(labelFor('verified', { name: 'CBSE' })).toBe('Official CBSE, verified');
  });

  test('the source line names the document, and the learner’s own nodes say so', () => {
    expect(
      sourceLine({ url: 'https://www.cbse.gov.in/syllabus.pdf', page: 12, section: null }),
    ).toBe('From page 12 of cbse.gov.in');
    expect(sourceLine(null, true)).toBe('You added this');
    expect(sourceLine(null)).toBe('');
  });
});
