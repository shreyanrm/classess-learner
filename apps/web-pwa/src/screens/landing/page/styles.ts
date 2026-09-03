/**
 * The landing page's stylesheet — the owner-directed prototype's CSS, transcribed.
 *
 * Three things were changed on the way in, and nothing else:
 *
 *  1. SCOPE. The prototype is a whole document, so it styles `body`, `header`, `section` and
 *     `footer` directly. Here every rule is scoped under `.lv6`, because this page is one screen
 *     inside an app and a bare `section{padding:120px 0}` would reach into every other one.
 *  2. FONTS. The prototype pulls Poppins and Caveat from the Google Fonts CDN. This app serves every
 *     face from its own origin (index.html says so in as many words), so `--sans` is the app's own
 *     display stack and `--hand` is the Caveat already installed. Nothing here reaches a font CDN.
 *  3. THE FIXED LAYERS. `header`, `#depth`, `#trace` and `#nib` are `position: fixed`, and the app
 *     wraps every screen in an element carrying `will-change: transform`, which makes that wrapper
 *     the containing block for fixed descendants — a fixed header inside it scrolls away with the
 *     page. Each of those four is therefore portalled into `document.body` (see `Landing.tsx`), and
 *     each portal host carries `lv6` itself so the tokens below still resolve on it.
 *
 * The spacing scale `--s1..--s6` (8/16/24/40/64/120) is law, palette v4 is law, and no line on this
 * page is under 2.5px.
 */

import { fontFamily } from '@wobo/config';

const STYLE_ID = 'wobo-landing-v6';

export const PAGE_CSS = `
/* --- palette v4, and the spacing scale --- */
.lv6 {
  --paper:#FAF7F0; --paper-2:#F1EDE3; --paper-3:#E7E1D3; --ink:#14142B; --ink-2:#4E4E66; --ink-3:#8A8A9E;
  --pig:#2B45FF; --violet:#7C5CFF; --rose:#FF6B57; --marigold:#FFB629; --mint:#22C48B; --lilac:#B7A6FF;
  --pig-w:#E6EAFF; --violet-w:#ECE6FF; --rose-w:#FFE7E2; --marigold-w:#FFF1D6; --mint-w:#DDF6EC; --lilac-w:#EFEBFF;
  --shadow:0 18px 50px rgba(43,69,255,.13); --lift:0 8px 24px rgba(20,20,43,.10);
  --body:#14142B; --body-hi:#3A3A5C; --visor:#FAF7F0; --visor-lo:#E7E1D3; --eye:#2B45FF;
  --sans:${fontFamily.system}; --hand:${fontFamily.handwritten};
  --s1:8px; --s2:16px; --s3:24px; --s4:40px; --s5:64px; --s6:120px;
}
:root[data-theme="dark"] .lv6 {
  --paper:#0F1226; --paper-2:#181C3A; --paper-3:#22264A; --ink:#F3F0E8; --ink-2:#B8B6C6; --ink-3:#7C7B92;
  --pig:#7C8CFF; --violet:#A996FF; --rose:#FF8A78; --marigold:#FFC85A; --mint:#4FE3BD; --lilac:#C9BDFF;
  --pig-w:#1E2650; --violet-w:#26214F; --rose-w:#3E2431; --marigold-w:#3E3320; --mint-w:#16362E; --lilac-w:#2A2650;
  --shadow:0 20px 56px rgba(0,0,0,.55); --lift:0 8px 24px rgba(0,0,0,.4);
  --body:#F3F0E8; --body-hi:#FFFFFF; --visor:#0F1226; --visor-lo:#1E2650; --eye:#7C8CFF;
}

.lv6, .lv6 *, .lv6 *::before, .lv6 *::after { box-sizing: border-box; }
/* The paper is painted on <body> (see Page.tsx): the depth layer sits behind this element, so an
   opaque background here would cover it. The class comes off the body on unmount. */
body.lv6-on { background:#FAF7F0; }
:root[data-theme="dark"] body.lv6-on { background:#0F1226; }
.lv6-page {
  background:transparent; color:var(--ink);
  font:400 17px/1.6 var(--sans); -webkit-font-smoothing:antialiased;
  overflow-x:hidden; position:relative; min-height:100svh;
}
.lv6 a { color:inherit; }
.lv6 h1, .lv6 h2, .lv6 h3 { margin:0; letter-spacing:-.025em; text-wrap:balance; }
.lv6 p { margin:0; text-wrap:pretty; }
.lv6 button { font:inherit; }
.lv6 .wrap { width:min(1200px,calc(100% - 48px)); margin:0 auto; }
.lv6 .btn {
  font:500 15px/1 var(--sans); padding:17px 26px; border-radius:14px; border:0;
  background:var(--ink); color:var(--paper); text-decoration:none; min-height:50px;
  display:inline-flex; align-items:center; gap:10px; transition:box-shadow .25s; will-change:transform; cursor:pointer;
}
.lv6 .btn:hover { box-shadow:var(--lift); }
.lv6 .btn.quiet { background:var(--paper-2); color:var(--ink); }
.lv6 .btn.pig { background:var(--pig); color:#fff; }
.lv6 .btn:focus-visible, .lv6 a:focus-visible, .lv6 button:focus-visible, .lv6 summary:focus-visible { outline:3px solid var(--pig); outline-offset:3px; }
.lv6 .chapter { font:500 12px/1 var(--sans); letter-spacing:.14em; text-transform:uppercase; color:var(--pig); display:block; margin-bottom:var(--s2); }
.lv6 .hand { font-family:var(--hand); font-weight:600; }
.lv6 h2.t { font:600 clamp(30px,3.6vw,46px)/1.08 var(--sans); }
.lv6 p.lead { color:var(--ink-2); max-width:38ch; font-size:clamp(16px,1.35vw,18px); margin-top:var(--s2); }
.lv6 section { padding:var(--s6) 0; }
@media (max-width:860px){ .lv6 section { padding:72px 0; } }

/* --- the pen of light: a small solid nib, a soft halo, and the ribbon it leaves ---
   The nib is the one the owner asked for over the first pass: a solid core inside a soft halo, the
   two swapping scale on hover and again on press, so the pointer reads as a pen being held rather
   than as a dot being moved. Fine pointers only; hidden the moment the pointer leaves the page. */
.lv6-trace { position:fixed; inset:0; z-index:45; pointer-events:none; mix-blend-mode:multiply; }
:root[data-theme="dark"] .lv6-trace { mix-blend-mode:screen; }
.lv6-nib { position:fixed; left:0; top:0; z-index:46; pointer-events:none; width:0; height:0; display:none; }
@media (pointer:fine){ .lv6-nib { display:block; } }
.lv6-nib .halo {
  position:absolute; left:-22px; top:-22px; width:44px; height:44px; border-radius:50%;
  background:radial-gradient(circle, rgba(43,69,255,.22), rgba(43,69,255,0) 70%);
  transition:transform .3s cubic-bezier(.2,.8,.2,1), opacity .3s;
}
:root[data-theme="dark"] .lv6-nib .halo { background:radial-gradient(circle, rgba(124,140,255,.28), rgba(124,140,255,0) 70%); }
.lv6-nib .core {
  position:absolute; left:-3px; top:-3px; width:6px; height:6px; border-radius:50%;
  background:var(--pig); transition:transform .25s cubic-bezier(.2,.8,.2,1);
}
.lv6-nib.hover .halo { transform:scale(1.9); opacity:.9; }
.lv6-nib.hover .core { transform:scale(.55); }
.lv6-nib.press .halo { transform:scale(.6); }
.lv6-nib.press .core { transform:scale(1.6); }
/* The engine puts 'cursor-on' on the body while the pen is live, and takes it off on the way out. */
@media (pointer:fine){
  body.cursor-on .lv6-page, body.cursor-on .lv6-page a, body.cursor-on .lv6-page button,
  body.cursor-on .lv6-header, body.cursor-on .lv6-header a, body.cursor-on .lv6-header button { cursor:none; }
}

/* --- the depth layer: blurred colour blobs, drifting with scroll. No dust, no particles. --- */
.lv6-depth { position:fixed; inset:0; z-index:0; pointer-events:none; overflow:hidden; }
.lv6-depth i { position:absolute; border-radius:50%; filter:blur(60px); opacity:.55; will-change:transform; }
.lv6-depth .b1 { width:52vw; height:52vw; left:-14vw; top:-10vw; background:var(--marigold-w); }
.lv6-depth .b2 { width:46vw; height:46vw; right:-16vw; top:20vh; background:var(--pig-w); }
.lv6-depth .b3 { width:40vw; height:40vw; left:20vw; top:110vh; background:var(--rose-w); }
.lv6-depth .b4 { width:44vw; height:44vw; right:-10vw; top:190vh; background:var(--mint-w); }
:root[data-theme="dark"] .lv6-depth i { opacity:.5; }

/* --- header --- */
.lv6-header {
  position:fixed; top:0; left:0; right:0; height:72px; z-index:40; display:flex; align-items:center;
  backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
  background:color-mix(in srgb, var(--paper) 80%, transparent);
  font:400 17px/1.6 var(--sans); color:var(--ink);
}
.lv6-header .wrap { display:flex; align-items:center; gap:var(--s3); }
.lv6 .wordmark { display:inline-flex; align-items:center; text-decoration:none; color:var(--ink); }
.lv6 .wordmark svg { height:24px; width:auto; display:block; fill:currentColor; }
.lv6 nav.main { display:flex; gap:2px; margin-left:var(--s1); }
.lv6 nav.main a { font:500 14px/1 var(--sans); text-decoration:none; color:var(--ink-2); padding:10px 14px; border-radius:999px; }
.lv6 nav.main a:hover { color:var(--ink); background:var(--paper-2); }
.lv6-header .right { margin-left:auto; display:flex; gap:10px; align-items:center; }
.lv6-header .right .sign { font:500 14px/1 var(--sans); text-decoration:none; color:var(--ink); padding:10px; background:none; border:0; }
.lv6-header .btn { padding:13px 20px; font-size:14px; min-height:44px; border-radius:12px; }
@media (max-width:1000px){ .lv6 nav.main { display:none; } .lv6-header .right .sign { display:none; } }
.lv6 main { position:relative; z-index:1; }
/* The header arrives with the hero. It cannot ride the page's reveal tween — the engine scopes that
   to the page root, and the header lives out in the body (see above) — so it has its own, matched
   to the same curve and the same stagger. */
.lv6-header .lift { opacity:0; transform:translateY(16px); animation:lv6lift .9s cubic-bezier(.16,1,.3,1) .1s forwards; }
.lv6-header .lift:nth-child(2) { animation-delay:.18s; }
.lv6-header .lift:nth-child(3) { animation-delay:.26s; }
@keyframes lv6lift { to { opacity:1; transform:none; } }
@media (prefers-reduced-motion:reduce){ .lv6-header .lift { opacity:1; transform:none; animation:none; } }

/* The real rig, wherever it stands on its own: it sizes itself in px, and this page sizes it in
   the layout instead, so the container is the authority. */
.lv6 .heroWobo > .wobo-rig, .lv6 .askwobo, .lv6 #close .big { display:block; }
.lv6 .heroWobo > .wobo-rig { width:100%; height:auto; aspect-ratio:1 / 1; }

/* --- hero --- */
.lv6 #hero { min-height:100svh; display:grid; align-items:center; padding:110px 0 var(--s5); }
.lv6 #hero .grid { display:grid; grid-template-columns:1fr 1.05fr; gap:var(--s4); align-items:center; }
@media (max-width:860px){ .lv6 #hero .grid { grid-template-columns:1fr; gap:var(--s4); } }
.lv6 #hero h1 { font:700 clamp(44px,5.4vw,74px)/1.02 var(--sans); letter-spacing:-.035em; max-width:12ch; margin-top:var(--s2); }
.lv6 #hero h1 em {
  font-style:normal; font-family:var(--hand); font-weight:700; font-size:1.18em; line-height:.9;
  color:var(--pig); position:relative; white-space:nowrap; display:inline-block; padding:0 .08em;
  clip-path:inset(0 100% 0 0); animation:lv6write 1.1s cubic-bezier(.4,0,.2,1) .7s forwards;
}
@keyframes lv6write { to { clip-path:inset(0 -2% 0 0); } }
.lv6 #hero h1 em::before {
  content:""; position:absolute; left:-.04em; right:-.04em; top:.34em; height:.46em;
  background:var(--marigold); opacity:.55; border-radius:.1em; z-index:-1;
  transform:scaleX(0); transform-origin:left; animation:lv6sweep .8s cubic-bezier(.4,0,.2,1) 1.5s forwards;
}
@keyframes lv6sweep { to { transform:scaleX(1); } }
.lv6 #hero .sub { font:400 clamp(17px,1.55vw,21px)/1.5 var(--sans); color:var(--ink-2); max-width:34ch; margin-top:var(--s3); }
.lv6 #hero .cta { display:flex; gap:12px; margin-top:var(--s4); flex-wrap:wrap; align-items:center; }
.lv6 #hero .note { font-size:13px; color:var(--ink-3); margin-top:var(--s2); display:flex; gap:14px; flex-wrap:wrap; }
.lv6 #hero .note span::before { content:""; display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--mint); margin-right:8px; vertical-align:middle; }
.lv6 .stage { position:relative; padding:0 0 70px; }
.lv6 .sticker {
  position:absolute; z-index:5; right:-2%; top:-8%; background:var(--marigold); color:#14142B;
  font-family:var(--hand); font-weight:700; font-size:26px; line-height:1; padding:12px 18px;
  border-radius:999px; transform:rotate(8deg); box-shadow:var(--lift);
}
@media (max-width:860px){ .lv6 .sticker { top:-6%; font-size:22px; } }
.lv6 h2.t .hl { position:relative; display:inline-block; }
.lv6 h2.t .hl::before {
  content:''; position:absolute; left:-.06em; right:-.06em; top:.42em; height:.5em; background:var(--marigold);
  opacity:.5; border-radius:.1em; z-index:-1; transform:scaleX(0); transform-origin:left;
}
.lv6 h2.t.in .hl::before { animation:lv6sweep .7s cubic-bezier(.4,0,.2,1) .4s forwards; }
.lv6 .float { position:absolute; z-index:4; pointer-events:none; will-change:transform; filter:drop-shadow(0 10px 18px rgba(20,20,43,.14)); }
.lv6 .float svg { width:100%; height:auto; display:block; }
.lv6 .float.f1 { width:72px; left:-4%; top:-6%; }
.lv6 .float.f2 { width:64px; right:-3%; top:8%; }
.lv6 .float.f3 { width:70px; right:4%; bottom:6%; }
.lv6 .float.f4 { width:120px; left:30%; top:-10%; }
@media (max-width:860px){
  .lv6 .float.f4, .lv6 .float.f3 { display:none; }
  .lv6 .float.f1 { width:48px; left:-2%; top:-4%; }
  .lv6 .float.f2 { width:44px; right:-1%; top:-3%; }
}
.lv6 .heroWobo { position:absolute; left:-4%; bottom:0; width:min(230px,34%); z-index:3; pointer-events:none; filter:drop-shadow(0 18px 24px rgba(20,20,43,.18)); }
.lv6 .heroWobo svg { width:100%; height:auto; display:block; overflow:visible; }
.lv6 .demo {
  position:relative; border-radius:28px; background:var(--pig-w); padding:26px; box-shadow:var(--shadow);
  transform:perspective(1200px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) rotate(-1.5deg);
  transition:transform .2s ease-out; will-change:transform;
}
.lv6 .demo .frame { border-radius:20px; background:var(--paper); aspect-ratio:16/11; position:relative; overflow:hidden; }
.lv6 .demo .bar { height:44px; display:flex; align-items:center; gap:10px; padding:0 18px; font-size:13px; color:var(--ink-3); }
.lv6 .demo .bar b { font-weight:500; color:var(--ink-2); }
.lv6 .demo .bar .live { margin-left:auto; display:inline-flex; align-items:center; gap:6px; font-size:12px; color:var(--rose); }
.lv6 .demo .bar .live i { width:8px; height:8px; border-radius:50%; background:var(--rose); animation:lv6pulse 1.6s ease-in-out infinite; }
@keyframes lv6pulse { 50% { transform:scale(.6); opacity:.5; } }
.lv6 .demo svg.board { position:absolute; left:0; top:44px; width:100%; height:calc(100% - 44px); }
.lv6 .demo .mini { position:absolute; right:16px; bottom:14px; width:60px; height:60px; }
.lv6 .demo .bubble {
  position:absolute; left:6%; top:16%; max-width:58%; font:400 15px/1.4 var(--sans);
  border-radius:16px 16px 16px 4px; padding:12px 14px; background:var(--paper-2); box-shadow:var(--lift);
  transition:opacity .5s ease, transform .5s ease;
}
.lv6 .demo .bubble.gone { opacity:0; transform:translateY(-6px); }
.lv6 .who, .lv6 .demo .bubble .who { font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--ink-3); display:block; margin-bottom:4px; }

/* --- the hand: how ink and handwriting are painted, everywhere on the page --- */
.lv6 .ink { fill:none; stroke:var(--ink); stroke-width:3; stroke-linecap:round; stroke-linejoin:round; }
.lv6 .ink.pig { stroke:var(--pig); }
.lv6 .ink.rose { stroke:var(--rose); }
.lv6 .ink.thin { stroke-width:2.5; stroke:var(--ink-2); }
.lv6 .hw { font-family:var(--hand); font-weight:600; fill:var(--ink); }
.lv6 .hw.pig { fill:var(--pig); }
.lv6 .hw.rose { fill:var(--rose); }
.lv6 .penTip { fill:var(--pig); }
.lv6 .bob { animation:lv6bob 4.5s ease-in-out infinite; transform-origin:center; }
@keyframes lv6bob { 50% { transform:translateY(-8px); } }

/* --- NIGHT: the cinematic chapter --- */
.lv6 #night { padding:0; }
.lv6 #night .pin { height:100svh; position:relative; overflow:hidden; background:var(--marigold-w); }
.lv6 #night .sky { position:absolute; inset:0; background:radial-gradient(60% 50% at 30% 40%, rgba(255,182,41,.28), transparent 70%); }
.lv6 #night .scene { position:absolute; left:50%; top:50%; width:min(1100px,96vw); transform:translate(-50%,-50%); will-change:transform; }
.lv6 #night .scene svg { width:100%; height:auto; display:block; overflow:visible; }
.lv6 #night .cap { position:absolute; left:0; right:0; bottom:16vh; text-align:center; pointer-events:none; }
.lv6 #night .cap > div { position:absolute; left:0; right:0; opacity:0; }
.lv6 #night .cap .big { font-family:var(--hand); font-weight:700; font-size:clamp(32px,4.4vw,58px); line-height:1; color:var(--ink); }
.lv6 #night .cap .small { font:500 16px/1.4 var(--sans); color:var(--ink-2); margin-top:8px; }
.lv6 #night .n { position:absolute; left:var(--s4); top:96px; font:500 12px/1 var(--sans); letter-spacing:.14em; text-transform:uppercase; color:var(--ink-2); }
.lv6 #night .board {
  position:absolute; left:50%; top:46%; width:min(760px,90vw); transform:translate(-50%,-50%) scale(.2);
  opacity:0; border-radius:24px; background:var(--paper); box-shadow:var(--shadow); aspect-ratio:16/10;
  overflow:hidden; will-change:transform,opacity;
}
.lv6 #night .board .bar { height:44px; display:flex; align-items:center; gap:10px; padding:0 18px; font-size:13px; color:var(--ink-3); }
.lv6 #night .board .bar b { font-weight:500; color:var(--ink-2); }
.lv6 #night .board svg.b { position:absolute; left:0; top:44px; width:100%; height:calc(100% - 44px); }
.lv6 #night .board .mini { position:absolute; right:16px; bottom:14px; width:60px; height:60px; }
.lv6 #night .board .q { position:absolute; left:5%; top:15%; max-width:56%; font:400 15px/1.4 var(--sans); border-radius:16px 16px 16px 4px; padding:12px 14px; background:var(--paper-2); box-shadow:var(--lift); }

/* --- TRIES --- */
.lv6 #tries .grid { display:grid; grid-template-columns:1fr 1fr; gap:var(--s5); align-items:center; }
@media (max-width:860px){ .lv6 #tries .grid { grid-template-columns:1fr; gap:var(--s4); } }
.lv6 .tile { border-radius:28px; padding:32px; position:relative; overflow:hidden; min-height:380px; display:grid; place-items:center; will-change:transform; }
.lv6 .tile.pig { background:var(--pig-w); }
.lv6 .tile.rose { background:var(--rose-w); }
.lv6 .tile.marigold { background:var(--marigold-w); }
.lv6 .tile.mint { background:var(--mint-w); }
.lv6 .tile.violet { background:var(--violet-w); }
.lv6 .tile.lilac { background:var(--lilac-w); }
.lv6 .tile .corner { position:absolute; right:20px; bottom:16px; width:60px; height:60px; }
.lv6 .puzzle { display:grid; gap:18px; justify-items:center; width:min(340px,100%); }
.lv6 .puzzle .q { font-size:18px; justify-self:start; }
.lv6 .puzzle .q i { font-style:normal; font-family:var(--hand); color:var(--pig); font-size:26px; }
.lv6 .cells { display:grid; grid-template-columns:repeat(2,100px); grid-template-rows:repeat(2,100px); gap:6px; padding:6px; border-radius:18px; background:var(--ink); position:relative; }
.lv6 .cells button { border:0; border-radius:12px; background:var(--paper); padding:0; transition:background .15s; cursor:pointer; }
.lv6 .cells button[aria-pressed="true"] { background:var(--pig); }
.lv6 .cells button:hover { background:var(--pig-w); }
.lv6 .cells svg { position:absolute; inset:-34px; width:calc(100% + 68px); height:calc(100% + 68px); pointer-events:none; overflow:visible; }
.lv6 .puzzle .bar2 { display:flex; gap:10px; align-items:center; }
.lv6 .puzzle .say { font-family:var(--hand); font-size:28px; color:var(--pig); min-height:1.2em; justify-self:start; }
.lv6 .puzzle .say.win { color:var(--marigold); }
.lv6 .puzzle .reset { font-size:13px; color:var(--ink-2); background:var(--paper); border:0; padding:13px 16px; border-radius:12px; cursor:pointer; }

/* --- SUNDAY: the note, pinned with depth --- */
.lv6 #sunday { padding:0; }
.lv6 #sunday .pin { height:100svh; position:relative; overflow:hidden; background:var(--rose-w); }
.lv6 #sunday .layer { position:absolute; left:50%; top:50%; will-change:transform; }
.lv6 #sunday .env { width:min(720px,90vw); transform:translate(-50%,-50%); }
.lv6 #sunday .env svg { width:100%; height:auto; display:block; overflow:visible; }
.lv6 #sunday .letter { width:min(520px,86vw); transform:translate(-50%,-50%); border-radius:24px; padding:34px 36px; background:var(--paper); box-shadow:var(--shadow); }
.lv6 .letter .to { font:500 12px/1 var(--sans); letter-spacing:.12em; text-transform:uppercase; color:var(--ink-3); margin-bottom:var(--s2); }
.lv6 .letter .body { font-family:var(--hand); font-weight:600; font-size:27px; line-height:1.25; color:var(--ink); }
.lv6 .letter .body em { font-style:normal; color:var(--rose); }
.lv6 .letter .body b { font-weight:600; color:var(--pig); }
.lv6 .letter .sig { margin-top:18px; font-family:var(--hand); font-size:24px; color:var(--pig); }
.lv6 .letter .stamp { position:absolute; right:22px; top:22px; width:48px; height:48px; }
.lv6 #sunday .cap { position:absolute; left:var(--s4); top:110px; max-width:34ch; z-index:2; }
.lv6 #sunday .cap h2 { font:600 clamp(28px,3.4vw,44px)/1.08 var(--sans); margin-top:var(--s2); }
.lv6 #sunday .cap p { color:var(--ink-2); margin-top:var(--s2); }
@media (max-width:860px){ .lv6 #sunday .cap { left:24px; right:24px; top:90px; } }

/* --- rows --- */
.lv6 .row .grid { display:grid; grid-template-columns:1fr 1fr; gap:var(--s5); align-items:center; }
.lv6 .row.flip .grid > :first-child { order:2; }
@media (max-width:860px){
  .lv6 .row .grid { grid-template-columns:1fr; gap:var(--s4); }
  .lv6 .row.flip .grid > :first-child { order:0; }
}
.lv6 .film { position:relative; border-radius:20px; background:var(--paper); box-shadow:var(--shadow); aspect-ratio:16/10; overflow:hidden; width:min(440px,100%); }
.lv6 .film .frame { position:absolute; inset:0; display:grid; place-items:center; }
.lv6 .film .bars { display:flex; align-items:flex-end; gap:32px; height:46%; padding-bottom:6px; }
.lv6 .film .bars i { display:block; width:48px; background:var(--pig); border-radius:8px 8px 0 0; }
.lv6 .film .bars i.k { background:var(--mint); }
.lv6 .film .title { position:absolute; top:9%; left:0; right:0; text-align:center; font:500 18px/1 var(--sans); color:var(--ink-2); }
.lv6 .film .controls { position:absolute; left:0; right:0; bottom:0; height:40px; display:flex; align-items:center; gap:10px; padding:0 14px; font-size:12px; color:var(--ink-3); background:var(--paper-2); }
.lv6 .film .controls .prog { flex:1; height:6px; border-radius:3px; background:var(--paper-3); position:relative; }
.lv6 .film .controls .prog i { position:absolute; left:0; top:0; bottom:0; width:38%; background:var(--ink); border-radius:3px; }
.lv6 .film svg.lasso { position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
.lv6 .film .lasso path { stroke-dasharray:1200; stroke-dashoffset:1200; }
.lv6 .film .lasso text { opacity:0; }
.lv6 .film .chip { position:absolute; left:7%; bottom:18%; font:500 13px/1 var(--sans); background:var(--ink); color:var(--paper); padding:11px 14px; border-radius:12px; opacity:0; transform:translateY(6px); }
.lv6 .devices { position:relative; width:min(520px,100%); height:auto; }

/* --- stores --- */
.lv6 .stores { display:flex; flex-wrap:wrap; gap:10px; margin-top:var(--s3); }
.lv6 .store { display:grid; text-decoration:none; color:var(--ink); background:var(--paper-2); border-radius:14px; padding:12px 16px; min-width:150px; }
.lv6 .store b { font:600 15px/1.2 var(--sans); }
.lv6 .store span { font-size:12px; color:var(--ink-3); }
.lv6 .store.now { background:var(--ink); color:var(--paper); }
.lv6 .store.now span { color:color-mix(in srgb, var(--paper) 70%, transparent); }

/* --- subjects --- */
.lv6 #subjects .head { display:grid; grid-template-columns:1.1fr .9fr; gap:var(--s4); align-items:end; margin-bottom:var(--s4); }
@media (max-width:860px){ .lv6 #subjects .head { grid-template-columns:1fr; gap:var(--s2); } }
.lv6 #subjects h2 { max-width:16ch; }
.lv6 #subjects .head p { color:var(--ink-2); max-width:34ch; font-size:17px; padding-bottom:6px; }
.lv6 .subs { display:grid; grid-template-columns:repeat(4,1fr); gap:var(--s2); }
@media (max-width:860px){ .lv6 .subs { grid-template-columns:repeat(2,1fr); } }
.lv6 .sub {
  border-radius:24px; padding:26px; min-height:220px; display:grid; align-content:space-between;
  background:var(--paper-2); text-decoration:none; color:inherit;
  transition:transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s;
}
.lv6 .sub:hover { transform:translateY(-4px); box-shadow:var(--lift); }
.lv6 .sub .ic { width:84px; height:84px; border-radius:26px; display:grid; place-items:center; }
.lv6 .sub svg { width:52px; height:52px; }
.lv6 .sub:nth-child(1) .ic { background:var(--pig-w); }
.lv6 .sub:nth-child(2) .ic { background:var(--mint-w); }
.lv6 .sub:nth-child(3) .ic { background:var(--rose-w); }
.lv6 .sub:nth-child(4) .ic { background:var(--lilac-w); }
.lv6 .sub b { font:600 19px/1.2 var(--sans); display:block; }
.lv6 .sub span { font-size:14px; color:var(--ink-3); }

/* --- parents --- */
.lv6 .quiet { display:grid; grid-template-columns:repeat(2,1fr); gap:var(--s2); margin-top:var(--s4); }
@media (max-width:860px){ .lv6 .quiet { grid-template-columns:1fr; } }
.lv6 .quiet div { background:var(--paper-2); border-radius:20px; padding:24px 26px; color:var(--ink-2); font-size:16px; display:grid; grid-template-columns:44px 1fr; gap:16px; align-items:start; }
.lv6 .quiet div b { display:block; color:var(--ink); font-weight:600; margin-bottom:4px; }
.lv6 .quiet div svg { width:44px; height:44px; }

/* --- ask --- */
.lv6 .askbox { border-radius:32px; background:var(--pig-w); padding:clamp(28px,4vw,48px); display:grid; gap:var(--s3); }
.lv6 .askhead { display:grid; grid-template-columns:96px 1fr; gap:var(--s3); align-items:center; }
.lv6 .askwobo { width:96px; height:96px; filter:drop-shadow(0 10px 16px rgba(20,20,43,.16)); }
.lv6 .askform { display:flex; gap:10px; background:var(--paper); border-radius:18px; padding:8px 8px 8px 22px; box-shadow:var(--lift); }
.lv6 .askform input { flex:1; border:0; background:transparent; font:400 17px/1.4 var(--sans); color:var(--ink); min-width:0; outline:none; }
.lv6 .askform input::placeholder { color:var(--ink-3); }
.lv6 .chips { display:flex; gap:8px; flex-wrap:wrap; }
.lv6 .chips button { border:0; background:var(--paper); color:var(--ink-2); font:500 14px/1 var(--sans); padding:12px 16px; border-radius:999px; cursor:pointer; }
.lv6 .chips button:hover { color:var(--ink); box-shadow:var(--lift); }
.lv6 .reply { font-family:var(--hand); font-weight:600; font-size:26px; line-height:1.25; color:var(--ink); min-height:1.2em; max-width:58ch; }
.lv6 .reply em { font-style:normal; color:var(--pig); }
@media (max-width:860px){ .lv6 .askhead { grid-template-columns:64px 1fr; } .lv6 .askwobo { width:64px; height:64px; } }

/* --- faq --- */
.lv6 #faq h2 { max-width:16ch; }
.lv6 .faq { display:grid; gap:10px; max-width:820px; margin-top:var(--s4); }
.lv6 .faq details { border-radius:18px; background:var(--paper-2); padding:0 24px; }
.lv6 .faq summary { list-style:none; cursor:pointer; font:500 18px/1.3 var(--sans); padding:20px 0; display:flex; justify-content:space-between; align-items:center; gap:16px; }
.lv6 .faq summary::-webkit-details-marker { display:none; }
.lv6 .faq summary::after { content:""; width:12px; height:12px; border-right:3px solid var(--pig); border-bottom:3px solid var(--pig); transform:rotate(45deg); transition:transform .3s; flex:none; margin-right:6px; }
.lv6 .faq details[open] summary::after { transform:rotate(-135deg); }
.lv6 .faq details p { color:var(--ink-2); padding:0 0 22px; max-width:60ch; }

/* --- close --- */
.lv6 #close .panel { border-radius:36px; background:var(--ink); color:var(--paper); padding:clamp(40px,7vw,96px); display:grid; grid-template-columns:1.2fr .8fr; gap:var(--s4); align-items:center; overflow:hidden; position:relative; }
@media (max-width:860px){ .lv6 #close .panel { grid-template-columns:1fr; } }
.lv6 #close .say { font-family:var(--hand); font-weight:700; font-size:clamp(56px,8vw,120px); line-height:1; color:var(--marigold); }
.lv6 #close h2 { font:600 clamp(28px,3.4vw,44px)/1.1 var(--sans); margin:var(--s2) 0; }
.lv6 #close p { color:color-mix(in srgb, var(--paper) 72%, transparent); max-width:36ch; margin-bottom:var(--s3); }
.lv6 #close .btn { background:var(--paper); color:var(--ink); }
.lv6 #close .big {
  width:min(300px,70%); height:auto; justify-self:center; overflow:visible;
  --body:#F3F0E8; --body-hi:#FFFFFF; --visor:#0F1226; --visor-lo:#1E2650; --eye:#7C8CFF; --paper:#0F1226;
  filter:drop-shadow(0 22px 28px rgba(0,0,0,.35));
}
:root[data-theme="dark"] .lv6 #close .panel { background:var(--paper-2); color:var(--ink); }
:root[data-theme="dark"] .lv6 #close .btn { background:var(--pig); color:#fff; }

/* --- footer --- */
.lv6 footer { padding:var(--s5) 0 var(--s4); position:relative; z-index:1; }
.lv6 footer .grid { display:grid; grid-template-columns:1.4fr 1fr 1fr 1fr 1fr; gap:var(--s3); }
@media (max-width:860px){ .lv6 footer .grid { grid-template-columns:1fr 1fr; } }
.lv6 footer h4 { font:500 13px/1 var(--sans); letter-spacing:.12em; text-transform:uppercase; color:var(--ink-3); margin:0 0 14px; }
.lv6 footer a { display:block; text-decoration:none; color:var(--ink-2); font-size:14px; padding:5px 0; }
.lv6 footer .tag { color:var(--ink-3); font-size:14px; margin-top:12px; max-width:30ch; }
.lv6 footer .small { font-size:12px; color:var(--ink-3); margin-top:var(--s4); display:flex; gap:18px; flex-wrap:wrap; }

/* --- the reveal, and the way out of it ---
   '.reveal' starts unseen because the choreography brings it in. If the choreography is not running
   — reduced motion, or an engine that never started — data-motion="off" on the page puts every one
   of them back, so nothing on this page can be permanently invisible. */
.lv6 .reveal { opacity:0; transform:translateY(16px); }
.lv6-page[data-motion="off"] .reveal { opacity:1; transform:none; }
.lv6-page[data-motion="off"] #night .cap > div:last-child { opacity:1; }
@media (prefers-reduced-motion:reduce){
  .lv6 .reveal { opacity:1; transform:none; }
  .lv6 #hero h1 em { animation:none; clip-path:none; }
  .lv6 #hero h1 em::before { animation:none; transform:none; }
  .lv6 .bob { animation:none; }
  .lv6 .demo .bar .live i { animation:none; }
}
`;

/** Put the page's stylesheet in the document, once. Safe to call on every mount. */
export function ensurePageStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = PAGE_CSS;
  document.head.appendChild(el);
}
