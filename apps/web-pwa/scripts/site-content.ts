/**
 * Build step: the public site's words, compiled from the reviewed copy.
 *
 * `docs/copy/**` is the reviewed source of every string on /about and /help. It is READ ONLY from
 * this script. Nothing here rewrites a sentence, reorders a section or invents a heading — it turns
 * Markdown into the document tree `src/screens/site/markdown.ts` defines and writes two JSON files
 * the pages import, so the shipped bundle carries no Markdown parser and no hand-typed duplicate of
 * prose a reviewer owns.
 *
 * Two things it refuses to publish, and says so on the console:
 *
 *  · an article the copy itself marks `> **Status: do not ship.**` — a reviewer's hold, and a build
 *    that published the hold notice would be worse than one that publishes nothing;
 *  · an editorial note in brackets (`[Owner: ...]`) — a message about an undecided thing, addressed
 *    to us, not to a reader.
 *
 * An unfilled SLOT (`[support email]`) is kept and rendered as a visible gap. That is the honest
 * state of the page and the only alternative is inventing an address.
 *
 * Run: `bun run scripts/site-content.ts` (wired into `bun run build`).
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSlot } from '../src/screens/site/identity';
import {
  type AboutDoc,
  articleSlug,
  type Block,
  blocksText,
  type HelpArticle,
  type HelpDoc,
  type HelpGroup,
  type HelpWithheld,
  type Inline,
  inlineText,
  nextTitle,
  parseAbout,
  parseBlocks,
  proseText,
  splitLead,
  withholdReason,
  withoutNext,
} from '../src/screens/site/markdown';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const COPY = join(REPO, 'docs', 'copy');
const OUT = join(HERE, '..', 'src', 'screens', 'site', 'content');

/** The three groups, in the order `help-centre/README.md` introduces them. */
const GROUP_LINE = /^\*\*\[(.+?)\]\((.+?)\/\)\*\*\s*[—-]\s*(.+)$/;

function readGroups(readme: string): { slug: string; title: string; blurb: string }[] {
  const groups: { slug: string; title: string; blurb: string }[] = [];
  for (const line of readme.split('\n')) {
    const m = GROUP_LINE.exec(line.trim());
    if (m?.[1] && m[2] && m[3]) groups.push({ slug: m[2], title: m[1], blurb: m[3] });
  }
  return groups;
}

function readmeTitle(readme: string): string {
  const first = readme.split('\n').find((l) => l.startsWith('# '));
  return first ? first.slice(2).trim() : 'Help centre';
}

/** A title as it compares: case and a trailing full stop do not make two titles different. */
function titleKey(title: string): string {
  return title.trim().toLowerCase().replace(/\.$/, '');
}

interface Draft {
  group: string;
  slug: string;
  title: string;
  lead: Inline[];
  blocks: Block[];
  nextTitle: string | null;
}

export function buildHelp(): { doc: HelpDoc; slots: string[] } {
  const root = join(COPY, 'help-centre');
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  const groups = readGroups(readme);
  if (groups.length === 0) throw new Error('help-centre/README.md names no groups');

  const drafts: Draft[] = [];
  const withheld: HelpWithheld[] = [];

  for (const group of groups) {
    const dir = join(root, group.slug);
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .sort();
    if (files.length === 0) throw new Error(`help group ${group.slug} has no articles`);
    for (const file of files) {
      const md = readFileSync(join(dir, file), 'utf8');
      const titleLine = md.split('\n').find((l) => l.startsWith('# '));
      const title = titleLine ? titleLine.slice(2).trim() : articleSlug(file);
      const slug = articleSlug(file);

      const hold = withholdReason(md);
      if (hold) {
        withheld.push({ group: group.slug, slug, title, reason: hold });
        continue;
      }

      const body = md
        .split('\n')
        .slice(titleLine ? 1 : 0)
        .join('\n');
      const all = parseBlocks(body, 2);
      const { lead, body: rest } = splitLead(all);
      drafts.push({
        group: group.slug,
        slug,
        title,
        lead,
        blocks: withoutNext(rest),
        nextTitle: nextTitle(rest),
      });
    }
  }

  // `**Next:**` names an article by its title, and the titles are unique across all three groups —
  // so the pointer resolves to an address here rather than being a dead sentence on the page.
  const byTitle = new Map(drafts.map((d) => [titleKey(d.title), d]));
  const built = new Map<string, HelpArticle[]>();
  for (const draft of drafts) {
    const target = draft.nextTitle ? byTitle.get(titleKey(draft.nextTitle)) : undefined;
    if (draft.nextTitle && !target) {
      throw new Error(`${draft.group}/${draft.slug}: "Next: ${draft.nextTitle}" names no article`);
    }
    const article: HelpArticle = {
      slug: draft.slug,
      group: draft.group,
      title: draft.title,
      lead: draft.lead,
      blocks: draft.blocks,
      plain: `${inlineText(draft.lead)} ${proseText(draft.blocks)}`.replace(/\s+/g, ' ').trim(),
      text: `${draft.title} ${inlineText(draft.lead)} ${blocksText(draft.blocks)}`
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim(),
      ...(target ? { next: { group: target.group, slug: target.slug, title: target.title } } : {}),
    };
    const list = built.get(draft.group) ?? [];
    list.push(article);
    built.set(draft.group, list);
  }

  const doc: HelpDoc = {
    title: readmeTitle(readme),
    groups: groups.map<HelpGroup>((g) => ({
      slug: g.slug,
      title: g.title,
      blurb: g.blurb,
      articles: built.get(g.slug) ?? [],
    })),
    withheld,
  };
  return { doc, slots: slotsIn(JSON.stringify(doc)) };
}

export function buildAbout(): { doc: AboutDoc; slots: string[] } {
  const doc = parseAbout(readFileSync(join(COPY, 'about.md'), 'utf8'));
  if (doc.sections.length === 0) throw new Error('about.md parsed to no sections');
  return { doc, slots: slotsIn(JSON.stringify(doc)) };
}

/** Every unfilled slot in a compiled document, for the build's own report. */
function slotsIn(json: string): string[] {
  const found = new Set<string>();
  for (const m of json.matchAll(/\{"t":"slot","v":"(.*?)"\}/g)) if (m[1]) found.add(m[1]);
  return [...found].sort();
}

function write(name: string, value: unknown): void {
  writeFileSync(join(OUT, name), `${JSON.stringify(value, null, 2)}\n`);
}

export function buildSiteContent(): void {
  const about = buildAbout();
  const help = buildHelp();
  write('about.json', about.doc);
  write('help.json', help.doc);

  const articles = help.doc.groups.reduce((n, g) => n + g.articles.length, 0);
  console.log(
    `site content: about (${about.doc.sections.length} sections), help (${help.doc.groups.length} groups, ${articles} articles)`,
  );
  for (const held of help.doc.withheld) {
    console.log(`  withheld ${held.group}/${held.slug} — ${held.reason}`);
  }
  // A slot the legal set already publishes elsewhere is filled in at render time from
  // `src/screens/site/identity.ts`, so it is not an open decision and saying so here would send
  // somebody looking for a decision that has been made. The rest genuinely are open.
  const slots = [...new Set([...about.slots, ...help.slots])].sort();
  const decided = slots.filter((slot) => resolveSlot(slot) !== null);
  const open = slots.filter((slot) => resolveSlot(slot) === null);
  if (decided.length > 0) {
    console.log(`  slots filled from identity.ts at render: ${decided.join(', ')}`);
  }
  if (open.length > 0) console.log(`  slots still undecided, drawn as gaps: ${open.join(', ')}`);
}

if (import.meta.main) buildSiteContent();
