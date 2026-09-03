/**
 * Build step: `public/sitemap.xml` and `public/robots.txt`.
 *
 * Both files are GENERATED, from the one list of addresses a crawler is allowed to know about
 * (`src/screens/states/routes.ts`). Hand-kept versions of these drift the moment a route is
 * renamed, and a sitemap that promises a page which 404s is worse for a site than no sitemap at
 * all — so the list lives beside the router, a unit test asserts every entry is an address the
 * router actually answers, and this script only writes them out.
 *
 * The fixed list is the front door and the index pages. The rest of the site is generated content:
 * one page per published help article and one per legal document. They are read here, from the
 * same two sources the app renders — the compiled help centre and the filenames in `docs/legal/` —
 * so a sitemap can never promise an article the build withheld or a document that was renamed.
 * An article the reviewer marked "do not ship" is not compiled, so it cannot reach this file.
 *
 * The origin comes from the environment (`VITE_APP_URL`), so the domain swap stays one change
 * (WOBO-PLAN §8). Nothing else is written, and nothing outside `public/` is touched.
 *
 * Run: `bun run scripts/sitemap.ts` (wired into `bun run build`, after `site:content`).
 */

import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import help from '../src/screens/site/content/help.json' with { type: 'json' };
import {
  expandPublicRoutes,
  robotsTxt,
  sitemapXml,
  siteOrigin,
} from '../src/screens/states/routes';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(HERE, '..', 'public');
const LEGAL_DIR = join(HERE, '..', '..', '..', 'docs', 'legal');

/** Every article the build published, group and slug. Withheld articles are simply not in here. */
function helpArticles(): { group: string; slug: string }[] {
  return (help.groups as { slug: string; articles: { slug: string }[] }[]).flatMap((group) =>
    group.articles.map((article) => ({ group: group.slug, slug: article.slug })),
  );
}

/** Every legal document's slug. The README is the index's source, not a page anyone reads. */
function legalSlugs(): string[] {
  return readdirSync(LEGAL_DIR)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => f.replace(/\.md$/, ''))
    .sort();
}

function main(): void {
  const origin = siteOrigin(process.env as Record<string, string | undefined>);
  const routes = expandPublicRoutes({ helpArticles: helpArticles(), legalSlugs: legalSlugs() });
  mkdirSync(PUBLIC_DIR, { recursive: true });
  writeFileSync(join(PUBLIC_DIR, 'sitemap.xml'), sitemapXml(origin, routes), 'utf8');
  writeFileSync(join(PUBLIC_DIR, 'robots.txt'), robotsTxt(origin), 'utf8');
  console.log(
    `sitemap: ${routes.length} public ${routes.length === 1 ? 'address' : 'addresses'} at ${origin}`,
  );
}

main();
