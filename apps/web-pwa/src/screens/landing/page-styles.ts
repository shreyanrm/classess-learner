/**
 * The landing page's stylesheet — the prototype's own CSS, ported and scoped.
 *
 * This is a PORT, not a rewrite. Every colour, radius, alpha, easing and breakpoint below is the
 * one in `scratchpad/design/landing-v7.html`, because the owner approved that page as it looked,
 * and a "tidier" number here is a different page. The only edits made on the way in:
 *
 *  1. SCOPE. The prototype owned the document, so it styled `body`, `header`, `section`, `.btn`.
 *     Here every rule hangs off `.${ROOT}` so nothing leaks into a product screen. The prototype's
 *     own class names and ids are kept EXACTLY as they were, because the scroll engine
 *     (`engine/**`) is a port of the same file's script and finds its elements by those names.
 *  2. TOKENS. `:root` became `.${ROOT}`, and `[data-theme="dark"]` became `[data-theme="dark"]
 *     .${ROOT}` — the app writes `data-theme` on the document root (ui/theme.ts), so dark is free.
 *     The palette itself is palette v4, character for character (DESIGN.md §2).
 *  3. FONTS. The prototype pulled Poppins and Caveat from a font CDN. Nothing in this app reaches a
 *     CDN for a face, so both are SELF-HOSTED out of `public/fonts/` and declared by `FACES` below
 *     — the same binaries, subsetted to latin + latin-ext and split by weight, with the app's own
 *     bundled stack behind each as the swap-in fallback.
 *  4. RESILIENCE. `.reveal` starts invisible in the prototype because its script always ran. Here
 *     it is only invisible while the root says the scroll engine is live (`data-motion="on"`, which the
 *     engine itself writes), so a page whose engine failed to load is quiet rather than blank.
 *
 * What is deliberately NOT here: a dust or particle background of any kind (the owner rejected it —
 * depth is the four blurred colour blobs in `#depth`, floating drawn objects at three parallax
 * depths, and tonal tiles), and any border line under 2.5px (DESIGN.md law 2).
 */

import { fontFamily } from '@wobo/config';

const STYLE_ID = 'wobo-landing-v7';

/** The class every part of the page hangs off, including the chrome portalled into the body. */
export const ROOT = 'wb';

/**
 * DESIGN.md's two faces, self-hosted. Poppins 400/500/600/700 and Caveat 400–700 are the exact
 * binaries the prototype pulled from the font CDN, served from our own origin out of
 * `public/fonts/` — so the page sets in the type the owner approved, and no request leaves us.
 * The app's bundled stack stays behind each as the fallback while the face is swapping in.
 *
 * Subsetted to latin + latin-ext, split by weight, `font-display:swap`: the latin-ext files never
 * download for English copy, and nothing here blocks first paint.
 */
const SANS = `'Poppins', ${fontFamily.system}`;
const HAND = `'Caveat', ${fontFamily.handwritten}`;

/** @font-face for every face above, generated from the CDN's own css2 response (weights + ranges). */
const FACES = `@font-face{font-family:'Caveat';font-style:normal;font-weight:400 700;font-display:swap;src:url(/fonts/Caveat-latin-ext.woff2) format('woff2');unicode-range:U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF}
@font-face{font-family:'Caveat';font-style:normal;font-weight:400 700;font-display:swap;src:url(/fonts/Caveat-latin.woff2) format('woff2');unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD}
@font-face{font-family:'Poppins';font-style:normal;font-weight:400;font-display:swap;src:url(/fonts/Poppins-400-latin-ext.woff2) format('woff2');unicode-range:U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF}
@font-face{font-family:'Poppins';font-style:normal;font-weight:400;font-display:swap;src:url(/fonts/Poppins-400-latin.woff2) format('woff2');unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD}
@font-face{font-family:'Poppins';font-style:normal;font-weight:500;font-display:swap;src:url(/fonts/Poppins-500-latin-ext.woff2) format('woff2');unicode-range:U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF}
@font-face{font-family:'Poppins';font-style:normal;font-weight:500;font-display:swap;src:url(/fonts/Poppins-500-latin.woff2) format('woff2');unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD}
@font-face{font-family:'Poppins';font-style:normal;font-weight:600;font-display:swap;src:url(/fonts/Poppins-600-latin-ext.woff2) format('woff2');unicode-range:U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF}
@font-face{font-family:'Poppins';font-style:normal;font-weight:600;font-display:swap;src:url(/fonts/Poppins-600-latin.woff2) format('woff2');unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD}
@font-face{font-family:'Poppins';font-style:normal;font-weight:700;font-display:swap;src:url(/fonts/Poppins-700-latin-ext.woff2) format('woff2');unicode-range:U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF}
@font-face{font-family:'Poppins';font-style:normal;font-weight:700;font-display:swap;src:url(/fonts/Poppins-700-latin.woff2) format('woff2');unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD}`;

export const LANDING_CSS = `${FACES}

.${ROOT}{
  --paper:#FAF7F0; --paper-2:#F1EDE3; --paper-3:#E7E1D3; --ink:#14142B; --ink-2:#4E4E66; --ink-3:#8A8A9E;
  --pig:#2B45FF; --violet:#7C5CFF; --rose:#FF6B57; --marigold:#FFB629; --mint:#22C48B; --lilac:#B7A6FF;
  --pig-w:#E6EAFF; --violet-w:#ECE6FF; --rose-w:#FFE7E2; --marigold-w:#FFF1D6; --mint-w:#DDF6EC; --lilac-w:#EFEBFF;
  --shadow:0 18px 50px rgba(43,69,255,.13); --lift:0 8px 24px rgba(20,20,43,.10);
  --body:#14142B; --body-hi:#3A3A5C; --visor:#FAF7F0; --visor-lo:#E7E1D3; --eye:#2B45FF;
  --sans:${SANS}; --hand:${HAND};
  --s1:8px; --s2:16px; --s3:24px; --s4:40px; --s5:64px; --s6:120px;
}
[data-theme="dark"] .${ROOT}{
  --paper:#0F1226; --paper-2:#181C3A; --paper-3:#22264A; --ink:#F3F0E8; --ink-2:#B8B6C6; --ink-3:#7C7B92;
  --pig:#7C8CFF; --violet:#A996FF; --rose:#FF8A78; --marigold:#FFC85A; --mint:#4FE3BD; --lilac:#C9BDFF;
  --pig-w:#1E2650; --violet-w:#26214F; --rose-w:#3E2431; --marigold-w:#3E3320; --mint-w:#16362E; --lilac-w:#2A2650;
  --shadow:0 20px 56px rgba(0,0,0,.55); --lift:0 8px 24px rgba(0,0,0,.4);
  --body:#F3F0E8; --body-hi:#FFFFFF; --visor:#0F1226; --visor-lo:#1E2650; --eye:#7C8CFF;
}
.${ROOT} *,.${ROOT} *::before,.${ROOT} *::after{box-sizing:border-box}
/* The page root is TRANSPARENT on purpose. The paper is painted by the .ground layer below — fixed,
   in the portalled chrome, under the depth blobs — so the blobs drift BEHIND the page's own content
   instead of being hidden by an opaque page. An opaque background here is the one change that would
   silently delete the whole depth layer. */
.${ROOT}{background:transparent;color:var(--ink);font:400 17px/1.6 var(--sans);-webkit-font-smoothing:antialiased;overflow-x:clip;position:relative}
.${ROOT}.chrome{overflow:visible}
.${ROOT} .ground{position:fixed;inset:0;z-index:0;pointer-events:none;background:var(--paper)}
@media (pointer:fine){.${ROOT}[data-cursor="on"],.${ROOT}[data-cursor="on"] a,.${ROOT}[data-cursor="on"] button{cursor:none}}
.${ROOT} a{color:inherit}
.${ROOT} h1,.${ROOT} h2,.${ROOT} h3{margin:0;letter-spacing:-.025em;text-wrap:balance}
.${ROOT} p{margin:0;text-wrap:pretty}
.${ROOT} .wrap{width:min(1200px,calc(100% - 48px));margin:0 auto}
.${ROOT} .btn{font:500 15px/1 var(--sans);padding:17px 26px;border-radius:14px;border:0;background:var(--ink);color:var(--paper);text-decoration:none;min-height:50px;display:inline-flex;align-items:center;gap:10px;transition:box-shadow .25s;will-change:transform;cursor:pointer}
.${ROOT} .btn:hover{box-shadow:var(--lift)}
.${ROOT} .btn.quiet{background:var(--paper-2);color:var(--ink)}
.${ROOT} .btn.pig{background:var(--pig);color:#fff}
/* The ask box's input is in this list and is NOT in the prototype's — the prototype sets
   outline:none on it and never puts it back, so the one text field on the page is the one control
   a keyboard reader cannot see themselves land on. The ring only ever paints on :focus-visible, so
   nothing about the page as the owner approved it changes for a pointer. */
.${ROOT} .btn:focus-visible,.${ROOT} a:focus-visible,.${ROOT} button:focus-visible,.${ROOT} summary:focus-visible,.${ROOT} input:focus-visible{outline:3px solid var(--pig);outline-offset:3px}
.${ROOT} button{font:inherit}
/* The puzzle and the chip row are <fieldset>s — they are groups of controls with a name, and a
   div wearing role="group" is the version of that a screen reader trusts less. Reset to nothing,
   so the element is semantics only and the layout below is untouched. */
.${ROOT} fieldset{border:0;margin:0;padding:0;min-width:0}
.${ROOT} .chapter{font:500 12px/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--pig);display:block;margin-bottom:var(--s2)}
.${ROOT} .hand{font-family:var(--hand);font-weight:600}
.${ROOT} h2.t{font:600 clamp(30px,3.6vw,46px)/1.08 var(--sans)}
.${ROOT} p.lead{color:var(--ink-2);max-width:38ch;font-size:clamp(16px,1.35vw,18px);margin-top:var(--s2)}
.${ROOT} section{padding:var(--s6) 0}
@media (max-width:860px){.${ROOT} section{padding:72px 0}}

/* cursor — the pen of light and its comet trace (engine/pen-cursor) */
.${ROOT} #trace{position:fixed;inset:0;z-index:45;pointer-events:none;mix-blend-mode:multiply}
[data-theme="dark"] .${ROOT} #trace{mix-blend-mode:screen}
/* Two switches, both the prototype's. Display is the device's answer (a fine pointer, no reduced
   motion, which is what data-pen carries); opacity waits for the pointer to have been somewhere,
   because the state starts parked at the centre of the viewport and a nib shown then is a blue dot
   in the corner of a page nobody has touched. The engine latches .on with the first movement. */
.${ROOT} #nib{position:fixed;left:0;top:0;z-index:46;pointer-events:none;width:0;height:0;display:none;opacity:0;transition:opacity .2s}
@media (pointer:fine){.${ROOT} #nib[data-pen="on"]{display:block}}
.${ROOT} #nib.on{opacity:1}
.${ROOT} #nib .core{position:absolute;left:-5px;top:-5px;width:10px;height:10px;border-radius:50%;background:var(--pig);transition:transform .25s cubic-bezier(.2,.8,.2,1),opacity .2s}
.${ROOT} #nib.hover .core{transform:scale(1.8);opacity:.85}
.${ROOT} #nib.press .core{transform:scale(.7)}

/* depth background — four blurred colour blobs, drifting with scroll. Not particles.

   THE ONE DELIBERATE DEPARTURE FROM THE PROTOTYPE'S CSS: no will-change on the blobs. It is a hint,
   not a look — no colour, size, alpha, easing or position changes without it — and it is the single
   most expensive line on the page. will-change:transform promotes each blob to its own composited
   layer, and a layer carrying filter:blur(60px) is re-rasterised every frame whether or not it has
   moved, so four of them halve the frame rate of a page standing still. Measured on the production
   build at 1440x820, everything else running: with the hint, 30.0 fps median / 19.8 p95; clearing
   just this one property on the same live page, 59.9 / 54.3 — the harness's own ceiling. The blur,
   the geometry, the opacities and the scroll drift are the prototype's, untouched. */
.${ROOT} #depth{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.${ROOT} #depth i{position:absolute;border-radius:50%;filter:blur(60px);opacity:.55}
.${ROOT} #depth .b1{width:52vw;height:52vw;left:-14vw;top:-10vw;background:var(--marigold-w)}
.${ROOT} #depth .b2{width:46vw;height:46vw;right:-16vw;top:20vh;background:var(--pig-w)}
.${ROOT} #depth .b3{width:40vw;height:40vw;left:20vw;top:110vh;background:var(--rose-w)}
.${ROOT} #depth .b4{width:44vw;height:44vw;right:-10vw;top:190vh;background:var(--mint-w)}
[data-theme="dark"] .${ROOT} #depth i{opacity:.5}

/* header */
.${ROOT} header{position:fixed;top:0;left:0;right:0;height:72px;z-index:40;display:flex;align-items:center;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);background:color-mix(in srgb,var(--paper) 80%,transparent)}
.${ROOT} header .wrap{display:flex;align-items:center;gap:var(--s3)}
.${ROOT} .wordmark{display:inline-flex;align-items:center;text-decoration:none;color:var(--ink)}
.${ROOT} .wordmark svg{height:24px;width:auto;display:block;fill:currentColor}
.${ROOT} nav.main{display:flex;gap:2px;margin-left:var(--s1)}
.${ROOT} nav.main a{font:500 14px/1 var(--sans);text-decoration:none;color:var(--ink-2);padding:10px 14px;border-radius:999px}
.${ROOT} nav.main a:hover{color:var(--ink);background:var(--paper-2)}
.${ROOT} header .right{margin-left:auto;display:flex;gap:10px;align-items:center}
.${ROOT} header .right .sign{font:500 14px/1 var(--sans);text-decoration:none;color:var(--ink);padding:10px 10px;background:transparent;border:0;cursor:pointer;min-height:44px}
.${ROOT} header .btn{padding:13px 20px;font-size:14px;min-height:44px;border-radius:12px}
@media (max-width:1000px){.${ROOT} nav.main{display:none}.${ROOT} header .right .sign{display:none}}
.${ROOT} main{position:relative;z-index:1}

/* hero */
.${ROOT} #hero{min-height:100svh;display:grid;align-items:center;padding:110px 0 var(--s5)}
.${ROOT} #hero .grid{display:grid;grid-template-columns:1fr 1.05fr;gap:var(--s4);align-items:center}
@media (max-width:860px){.${ROOT} #hero .grid{grid-template-columns:1fr;gap:var(--s4)}}
.${ROOT} #hero h1{font:700 clamp(40px,4.9vw,68px)/1.04 var(--sans);letter-spacing:-.035em;max-width:14ch;margin-top:var(--s2)}
.${ROOT} #hero h1 .ask{display:block;font-family:var(--hand);font-weight:700;font-size:.62em;color:var(--pig);letter-spacing:0;margin-bottom:.1em}
.${ROOT} #hero h1 em{font-style:normal;font-family:var(--hand);font-weight:700;font-size:1.1em;line-height:.9;color:var(--ink);position:relative;white-space:nowrap;display:inline-block;padding:0 .08em;clip-path:inset(0 100% 0 0);animation:wb-write 1.1s cubic-bezier(.4,0,.2,1) .7s forwards}
@keyframes wb-write{to{clip-path:inset(0 -2% 0 0)}}
.${ROOT} #hero h1 em::before{content:"";position:absolute;left:-.04em;right:-.04em;top:.34em;height:.46em;background:var(--marigold);opacity:.55;border-radius:.1em;z-index:-1;transform:scaleX(0);transform-origin:left;animation:wb-sweep .8s cubic-bezier(.4,0,.2,1) 1.5s forwards}
@keyframes wb-sweep{to{transform:scaleX(1)}}
[data-theme="dark"] .${ROOT} #hero h1 em::before{opacity:.32}
[data-theme="dark"] .${ROOT} h2.t .hl::before{opacity:.3}
.${ROOT} #hero .sub{font:400 clamp(17px,1.55vw,21px)/1.5 var(--sans);color:var(--ink-2);max-width:34ch;margin-top:var(--s3)}
.${ROOT} #hero .cta{display:flex;gap:12px;margin-top:var(--s4);flex-wrap:wrap;align-items:center}
.${ROOT} #hero .note{font-size:13px;color:var(--ink-3);margin-top:var(--s2);display:flex;gap:14px;flex-wrap:wrap}
.${ROOT} #hero .note span::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--mint);margin-right:8px;vertical-align:middle}
.${ROOT} .stage{position:relative;padding:0 0 70px 0}
.${ROOT} .sticker{position:absolute;z-index:5;right:-2%;top:-8%;background:var(--marigold);color:var(--ink);font-family:var(--hand);font-weight:700;font-size:26px;line-height:1;padding:12px 18px;border-radius:999px;transform:rotate(8deg);box-shadow:var(--lift)}
@media (max-width:860px){.${ROOT} .sticker{top:-6%;font-size:22px}}
.${ROOT} h2.t .hl{position:relative;display:inline-block}
.${ROOT} h2.t .hl::before{content:'';position:absolute;left:-.06em;right:-.06em;top:.42em;height:.5em;background:var(--marigold);opacity:.5;border-radius:.1em;z-index:-1;transform:scaleX(0);transform-origin:left}
.${ROOT} h2.t.in .hl::before{animation:wb-sweep .7s cubic-bezier(.4,0,.2,1) .4s forwards}
.${ROOT} .float{position:absolute;z-index:4;pointer-events:none;will-change:transform;filter:drop-shadow(0 10px 18px rgba(20,20,43,.14))}
.${ROOT} .float svg{width:100%;height:auto;display:block}
.${ROOT} .float.f1{width:72px;left:-4%;top:-6%}
.${ROOT} .float.f2{width:64px;right:-3%;top:8%}
.${ROOT} .float.f3{width:70px;right:4%;bottom:6%}
.${ROOT} .float.f4{width:120px;left:30%;top:-10%}
@media (max-width:860px){.${ROOT} .float.f4,.${ROOT} .float.f3{display:none}.${ROOT} .float.f1{width:48px;left:-2%;top:-4%}.${ROOT} .float.f2{width:44px;right:-1%;top:-3%}}
.${ROOT} .heroWobo{position:absolute;left:-4%;bottom:0;width:min(230px,34%);z-index:3;pointer-events:none;filter:drop-shadow(0 18px 24px rgba(20,20,43,.18))}
/* The rig grounds a LARGE Wobo with a half-pixel rule instead of its tonal contact patch (see
   packages/wobo/src/body/ground.ts). On this page every Wobo that big is floating — standing in
   front of the demo card, or beside the close panel — and the composition already grounds it with
   the soft tinted shadow DESIGN.md allows under things that float. A rule drawn under a floating
   character is a mark with nothing to ground against, so the page takes that one off. Every small
   Wobo keeps the rig's contact patch, which is right on a tile. */
.${ROOT} .wobo-rig > svg > g > line{display:none}
.${ROOT} .heroWobo svg{display:block;overflow:visible}
.${ROOT} .heroWobo > div{display:block;max-width:100%}
.${ROOT} .demo{position:relative;border-radius:28px;background:var(--pig-w);padding:26px;box-shadow:var(--shadow);transform:perspective(1200px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) rotate(-1.5deg);transition:transform .2s ease-out;will-change:transform}
.${ROOT} .demo .frame{border-radius:20px;background:var(--paper);aspect-ratio:16/11;position:relative;overflow:hidden}
.${ROOT} .demo .bar{height:44px;display:flex;align-items:center;gap:10px;padding:0 18px;font-size:13px;color:var(--ink-3)}
.${ROOT} .demo .bar b{font-weight:500;color:var(--ink-2)}
.${ROOT} .demo .bar .live{margin-left:auto;display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--rose)}
.${ROOT} .demo .bar .live i{width:8px;height:8px;border-radius:50%;background:var(--rose);animation:wb-pulse 1.6s ease-in-out infinite}
@keyframes wb-pulse{50%{transform:scale(.6);opacity:.5}}
.${ROOT} .demo svg.board{position:absolute;left:0;top:44px;width:100%;height:calc(100% - 44px)}
.${ROOT} .demo .mini{position:absolute;right:16px;bottom:14px;width:60px;height:60px}
.${ROOT} .demo .bubble{position:absolute;left:6%;top:16%;max-width:58%;font:400 15px/1.4 var(--sans);border-radius:16px 16px 16px 4px;padding:12px 14px;background:var(--paper-2);box-shadow:var(--lift);transition:opacity .5s ease,transform .5s ease}
.${ROOT} .demo .bubble.gone{opacity:0;transform:translateY(-6px)}
.${ROOT} .demo .bubble .who{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);display:block;margin-bottom:4px}
.${ROOT} .ink{fill:none;stroke:var(--ink);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
.${ROOT} .ink.pig{stroke:var(--pig)}
.${ROOT} .ink.rose{stroke:var(--rose)}
.${ROOT} .ink.thin{stroke-width:2.5;stroke:var(--ink-2)}
.${ROOT} .hw{font-family:var(--hand);font-weight:600;fill:var(--ink)}
.${ROOT} .hw.pig{fill:var(--pig)}
.${ROOT} .hw.rose{fill:var(--rose)}
.${ROOT} .penTip{fill:var(--pig)}
.${ROOT} .bob{animation:wb-bob 4.5s ease-in-out infinite;transform-origin:center}
@keyframes wb-bob{50%{transform:translateY(-8px)}}

/* NIGHT: the cinematic chapter */
.${ROOT} #night{padding:0}
.${ROOT} #night .pin{height:100svh;position:relative;overflow:hidden;background:var(--marigold-w)}
.${ROOT} #night .sky{position:absolute;inset:0;background:radial-gradient(60% 50% at 30% 40%, rgba(255,182,41,.28), transparent 70%)}
.${ROOT} #night .scene{position:absolute;left:50%;top:50%;width:min(1100px,96vw);transform:translate(-50%,-50%);will-change:transform}
.${ROOT} #night .scene svg{width:100%;height:auto;display:block;overflow:visible}
.${ROOT} #night .cap{position:absolute;left:0;right:0;bottom:16vh;text-align:center;pointer-events:none}
.${ROOT} #night .cap > div{position:absolute;left:0;right:0;opacity:0}
.${ROOT} #night .cap .big{font-family:var(--hand);font-weight:700;font-size:clamp(32px,4.4vw,58px);line-height:1;color:var(--ink)}
.${ROOT} #night .cap .small{font:500 16px/1.4 var(--sans);color:var(--ink-2);margin-top:8px}
.${ROOT} #night .n{position:absolute;left:var(--s4);top:96px;font:500 12px/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--ink-2)}
.${ROOT} #night .board{position:absolute;left:50%;top:46%;width:min(760px,90vw);transform:translate(-50%,-50%) scale(.2);opacity:0;border-radius:24px;background:var(--paper);box-shadow:var(--shadow);aspect-ratio:16/10;overflow:hidden;will-change:transform,opacity}
.${ROOT} #night .board .bar{height:44px;display:flex;align-items:center;gap:10px;padding:0 18px;font-size:13px;color:var(--ink-3)}
.${ROOT} #night .board svg.b{position:absolute;left:0;top:44px;width:100%;height:calc(100% - 44px)}
.${ROOT} #night .board .mini{position:absolute;right:16px;bottom:14px;width:60px;height:60px}
.${ROOT} #night .board .q{position:absolute;left:5%;top:15%;max-width:56%;font:400 15px/1.4 var(--sans);border-radius:16px 16px 16px 4px;padding:12px 14px;background:var(--paper-2);box-shadow:var(--lift)}
.${ROOT} #night .board .q .who{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);display:block;margin-bottom:4px}

/* TRIES */
.${ROOT} #practice .grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--s5);align-items:center}
@media (max-width:860px){.${ROOT} #practice .grid{grid-template-columns:1fr;gap:var(--s4)}}
.${ROOT} .tile{border-radius:28px;padding:32px;position:relative;overflow:hidden;min-height:380px;display:grid;place-items:center;will-change:transform}
.${ROOT} .tile.pig{background:var(--pig-w)}
.${ROOT} .tile.rose{background:var(--rose-w)}
.${ROOT} .tile.marigold{background:var(--marigold-w)}
.${ROOT} .tile.mint{background:var(--mint-w)}
.${ROOT} .tile.violet{background:var(--violet-w)}
.${ROOT} .tile.lilac{background:var(--lilac-w)}
.${ROOT} .tile .corner{position:absolute;right:20px;bottom:16px;width:60px;height:60px}
.${ROOT} .puzzle{display:grid;gap:18px;justify-items:center;width:min(340px,100%)}
.${ROOT} .puzzle .q{font-size:18px;justify-self:start}
.${ROOT} .puzzle .q i{font-style:normal;font-family:var(--hand);color:var(--pig);font-size:26px}
.${ROOT} .cells{display:grid;grid-template-columns:repeat(2,100px);grid-template-rows:repeat(2,100px);gap:6px;padding:6px;border-radius:18px;background:var(--ink);position:relative}
.${ROOT} .cells button{border:0;border-radius:12px;background:var(--paper);padding:0;transition:background .15s;cursor:pointer}
.${ROOT} .cells button[aria-pressed="true"]{background:var(--pig)}
.${ROOT} .cells button:hover{background:var(--pig-w)}
.${ROOT} .cells svg{position:absolute;inset:-34px;width:calc(100% + 68px);height:calc(100% + 68px);pointer-events:none;overflow:visible}
.${ROOT} .puzzle .bar2{display:flex;gap:10px;align-items:center}
.${ROOT} .puzzle .say{font-family:var(--hand);font-size:28px;color:var(--pig);min-height:1.2em;justify-self:start}
.${ROOT} .puzzle .say.win{color:var(--marigold)}
.${ROOT} .puzzle .reset{font-size:13px;color:var(--ink-2);background:var(--paper);border:0;padding:13px 16px;border-radius:12px;cursor:pointer;min-height:44px}

/* SUNDAY: the note, pinned with depth */
.${ROOT} #parents-note{padding:0}
.${ROOT} #parents-note .pin{height:100svh;position:relative;overflow:hidden;background:var(--rose-w)}
.${ROOT} #parents-note .layer{position:absolute;left:50%;top:50%;will-change:transform}
.${ROOT} #parents-note .env{width:min(720px,90vw);transform:translate(-50%,-50%)}
.${ROOT} #parents-note .env svg{width:100%;height:auto;display:block;overflow:visible}
.${ROOT} #parents-note .letter{width:min(520px,86vw);transform:translate(-50%,-50%);border-radius:24px;padding:34px 36px;background:var(--paper);box-shadow:var(--shadow)}
.${ROOT} .letter .to{font:500 12px/1 var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);margin-bottom:var(--s2)}
.${ROOT} .letter .body{font-family:var(--hand);font-weight:600;font-size:27px;line-height:1.25;color:var(--ink)}
.${ROOT} .letter .body em{font-style:normal;color:var(--rose)}
.${ROOT} .letter .body b{font-weight:600;color:var(--pig)}
.${ROOT} .letter .sig{margin-top:18px;font-family:var(--hand);font-size:24px;color:var(--pig)}
.${ROOT} .letter .stamp{position:absolute;right:22px;top:22px;width:48px;height:48px}
.${ROOT} #parents-note .cap{position:absolute;left:var(--s4);top:110px;max-width:34ch}
.${ROOT} #parents-note .cap h2{font:600 clamp(28px,3.4vw,44px)/1.08 var(--sans);margin-top:var(--s2)}
.${ROOT} #parents-note .cap p{color:var(--ink-2);margin-top:var(--s2)}
@media (max-width:860px){.${ROOT} #parents-note .cap{left:24px;right:24px;top:90px}}

/* promises */
.${ROOT} .promises{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--s2);margin-top:var(--s4)}
@media (max-width:860px){.${ROOT} .promises{grid-template-columns:1fr}}
.${ROOT} .promise{border-radius:24px;background:var(--paper-2);padding:28px;display:grid;gap:12px;align-content:start}
.${ROOT} .promise svg{width:96px;height:96px}
.${ROOT} .promise b{font:600 21px/1.2 var(--sans)}
.${ROOT} .promise p{color:var(--ink-2);font-size:16px}

/* students */
.${ROOT} .claims{display:grid;gap:14px;margin-top:var(--s3)}
.${ROOT} .claims div{font:600 clamp(19px,1.8vw,24px)/1.25 var(--sans);display:grid;grid-template-columns:34px 1fr;gap:12px;align-items:start}
.${ROOT} .claims i{width:34px;height:34px;border-radius:50%;background:var(--marigold);display:grid;place-items:center;font:700 16px/1 var(--hand);color:var(--ink);font-style:normal;margin-top:2px}

/* rows */
.${ROOT} .row .grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--s5);align-items:center}
.${ROOT} .row.flip .grid > :first-child{order:2}
@media (max-width:860px){.${ROOT} .row .grid{grid-template-columns:1fr;gap:var(--s4)}.${ROOT} .row.flip .grid > :first-child{order:0}}
.${ROOT} .film{position:relative;border-radius:20px;background:var(--paper);box-shadow:var(--shadow);aspect-ratio:16/10;overflow:hidden;width:min(440px,100%)}
.${ROOT} .film .frame{position:absolute;inset:0;display:grid;place-items:center}
.${ROOT} .film .bars{display:flex;align-items:flex-end;gap:32px;height:46%;padding-bottom:6px}
.${ROOT} .film .bars i{display:block;width:48px;background:var(--pig);border-radius:8px 8px 0 0}
.${ROOT} .film .bars i.k{background:var(--mint)}
.${ROOT} .film .title{position:absolute;top:9%;left:0;right:0;text-align:center;font:500 18px/1 var(--sans);color:var(--ink-2)}
.${ROOT} .film .controls{position:absolute;left:0;right:0;bottom:0;height:40px;display:flex;align-items:center;gap:10px;padding:0 14px;font-size:12px;color:var(--ink-3);background:var(--paper-2)}
.${ROOT} .film .controls .prog{flex:1;height:6px;border-radius:3px;background:var(--paper-3);position:relative}
.${ROOT} .film .controls .prog i{position:absolute;left:0;top:0;bottom:0;width:38%;background:var(--ink);border-radius:3px}
.${ROOT} .film svg.lasso{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.${ROOT} .film .lasso path{stroke-dasharray:1200;stroke-dashoffset:1200}
.${ROOT} .film .lasso text{opacity:0}
.${ROOT} .film .chip{position:absolute;left:7%;bottom:18%;font:500 13px/1 var(--sans);background:var(--ink);color:var(--paper);padding:11px 14px;border-radius:12px;opacity:0;transform:translateY(6px)}
.${ROOT} .devices{position:relative;width:min(520px,100%);height:auto}

/* stores */
.${ROOT} .stores{display:flex;flex-wrap:wrap;gap:10px;margin-top:var(--s3)}
.${ROOT} .store{display:grid;text-decoration:none;color:var(--ink);background:var(--paper-2);border-radius:14px;padding:12px 16px;min-width:150px;min-height:44px;align-content:center}
.${ROOT} .store b{font:600 15px/1.2 var(--sans)}
.${ROOT} .store span{font-size:12px;color:var(--ink-3)}
.${ROOT} .store.now{background:var(--ink);color:var(--paper)}
.${ROOT} .store.now span{color:color-mix(in srgb,var(--paper) 70%,transparent)}

/* subjects */
.${ROOT} #subjects .head{display:grid;grid-template-columns:1.1fr .9fr;gap:var(--s4);align-items:end;margin-bottom:var(--s4)}
@media (max-width:860px){.${ROOT} #subjects .head{grid-template-columns:1fr;gap:var(--s2)}}
.${ROOT} #subjects h2{max-width:16ch}
.${ROOT} #subjects .head p{color:var(--ink-2);max-width:34ch;font-size:17px;padding-bottom:6px}
.${ROOT} .subs{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--s2)}
@media (max-width:860px){.${ROOT} .subs{grid-template-columns:repeat(2,1fr)}}
/* The subject tile is .subj, the prototype's own name, and it has to stay that. Named .sub it also
   matches the hero's p.sub — the page's most-read paragraph — and dresses it as a 220px tinted
   plate with 26px of padding and a hover lift. The prototype's vocabulary is not decoration here;
   it is what keeps two unrelated elements off one rule. */
.${ROOT} .subj{border-radius:24px;padding:26px;min-height:220px;display:grid;align-content:space-between;background:var(--paper-2);text-decoration:none;color:inherit;transition:transform .3s cubic-bezier(.2,.8,.2,1),box-shadow .3s}
.${ROOT} .subj:hover{transform:translateY(-4px);box-shadow:var(--lift)}
.${ROOT} .subj .ic{width:84px;height:84px;border-radius:26px;display:grid;place-items:center}
.${ROOT} .subj svg{width:52px;height:52px}
.${ROOT} .subj:nth-child(1) .ic{background:var(--pig-w)}
.${ROOT} .subj:nth-child(2) .ic{background:var(--mint-w)}
.${ROOT} .subj:nth-child(3) .ic{background:var(--rose-w)}
.${ROOT} .subj:nth-child(4) .ic{background:var(--lilac-w)}
.${ROOT} .subj b{font:600 19px/1.2 var(--sans);display:block}
.${ROOT} .subj span{font-size:14px;color:var(--ink-3)}

/* parents (safe by design) */
/* .safegrid, again the prototype's name. Called .quiet it also matched the hero's secondary button
   (.btn.quiet) and turned it into a two-column grid carrying 40px of top margin, which broke the
   pair of buttons under the headline. */
.${ROOT} .safegrid{display:grid;grid-template-columns:repeat(2,1fr);gap:var(--s2);margin-top:var(--s4)}
@media (max-width:860px){.${ROOT} .safegrid{grid-template-columns:1fr}}
.${ROOT} .safegrid > div{background:var(--paper-2);border-radius:20px;padding:24px 26px;color:var(--ink-2);font-size:16px;display:grid;grid-template-columns:44px 1fr;gap:16px;align-items:start}
.${ROOT} .safegrid div b{display:block;color:var(--ink);font-weight:600;margin-bottom:4px}
.${ROOT} .safegrid div svg{width:44px;height:44px}

/* ask */
.${ROOT} .askbox{border-radius:32px;background:var(--pig-w);padding:clamp(28px,4vw,48px);display:grid;gap:var(--s3)}
.${ROOT} .askhead{display:grid;grid-template-columns:96px 1fr;gap:var(--s3);align-items:center}
.${ROOT} .askwobo{width:96px;height:96px;filter:drop-shadow(0 10px 16px rgba(20,20,43,.16))}
.${ROOT} .askform{display:flex;gap:10px;background:var(--paper);border-radius:18px;padding:8px 8px 8px 22px;box-shadow:var(--lift)}
.${ROOT} .askform input{flex:1;border:0;background:transparent;font:400 17px/1.4 var(--sans);color:var(--ink);min-width:0;outline:none}
/* The prototype's outline:none above kills the browser's ring for a pointer, which is what it is
   there for. This puts one back for a keyboard, and it has to sit here rather than in the page's
   general focus-visible list: that list carries the same specificity as .askform input, comes
   earlier in the sheet, and loses. Focus lands INSIDE the pill, so the offset is negative — a +3px
   ring would be drawn under the pill's own edge and be invisible. */
.${ROOT} .askform input:focus-visible{outline:3px solid var(--pig);outline-offset:-1px;border-radius:12px}
.${ROOT} .askform input::placeholder{color:var(--ink-3)}
.${ROOT} .chips{display:flex;gap:8px;flex-wrap:wrap}
.${ROOT} .chips button{border:0;background:var(--paper);color:var(--ink-2);font:500 14px/1 var(--sans);padding:12px 16px;border-radius:999px;cursor:pointer;min-height:44px}
.${ROOT} .chips button:hover{color:var(--ink);box-shadow:var(--lift)}
.${ROOT} .reply{font-family:var(--hand);font-weight:600;font-size:26px;line-height:1.25;color:var(--ink);min-height:1.2em;max-width:58ch}
.${ROOT} .reply em{font-style:normal;color:var(--pig)}
@media (max-width:860px){.${ROOT} .askhead{grid-template-columns:64px 1fr}.${ROOT} .askwobo{width:64px;height:64px}}

/* faq */
.${ROOT} #faq h2{max-width:16ch}
.${ROOT} .faq{display:grid;gap:10px;max-width:820px;margin-top:var(--s4)}
.${ROOT} .faq details{border-radius:18px;background:var(--paper-2);padding:0 24px}
.${ROOT} .faq summary{list-style:none;cursor:pointer;font:500 18px/1.3 var(--sans);padding:20px 0;display:flex;justify-content:space-between;align-items:center;gap:16px;min-height:44px}
.${ROOT} .faq summary::-webkit-details-marker{display:none}
.${ROOT} .faq summary::after{content:"";width:12px;height:12px;border-right:3px solid var(--pig);border-bottom:3px solid var(--pig);transform:rotate(45deg);transition:transform .3s;flex:none;margin-right:6px}
.${ROOT} .faq details[open] summary::after{transform:rotate(-135deg)}
.${ROOT} .faq details p{color:var(--ink-2);padding:0 0 22px;max-width:60ch}

/* close */
.${ROOT} #close .panel{border-radius:36px;background:var(--ink);color:var(--paper);padding:clamp(40px,7vw,96px);display:grid;grid-template-columns:1.2fr .8fr;gap:var(--s4);align-items:center;overflow:hidden;position:relative}
@media (max-width:860px){.${ROOT} #close .panel{grid-template-columns:1fr}}
.${ROOT} #close .say{font-family:var(--hand);font-weight:700;font-size:clamp(56px,8vw,120px);line-height:1;color:var(--marigold)}
.${ROOT} #close h2{font:600 clamp(28px,3.4vw,44px)/1.1 var(--sans);margin:var(--s2) 0}
.${ROOT} #close p{color:color-mix(in srgb,var(--paper) 72%,transparent);max-width:36ch;margin-bottom:var(--s3)}
.${ROOT} #close .btn{background:var(--paper);color:var(--ink)}
.${ROOT} #close .big{width:min(300px,70%);height:auto;justify-self:center;--body:#F3F0E8;--body-hi:#FFFFFF;--visor:#0F1226;--visor-lo:#1E2650;--eye:#7C8CFF;--paper:#0F1226;overflow:visible;filter:drop-shadow(0 22px 28px rgba(0,0,0,.35))}
/* The close panel is ink in both themes, so its Wobo is cream in both. The rig's own token layer
   sets --wr-* directly on .wobo-rig, so an inherited value from the panel loses to it — these have
   to land on the rig element itself, which is why the selector reaches all the way in. */
.${ROOT} #close .big .wobo-rig{--wr-body:#F3F0E8;--wr-visor:#0F1226;--wr-eye:#7C8CFF;--wr-hair:rgba(15,18,38,.5)}
[data-theme="dark"] .${ROOT} #close .panel{background:var(--paper-2);color:var(--ink)}
[data-theme="dark"] .${ROOT} #close .btn{background:var(--pig);color:#fff}

/* footer */
.${ROOT} footer{padding:var(--s5) 0 var(--s4);position:relative;z-index:1}
.${ROOT} footer .grid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr 1fr;gap:var(--s3)}
@media (max-width:860px){.${ROOT} footer .grid{grid-template-columns:1fr 1fr}}
.${ROOT} footer h4{font:500 13px/1 var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);margin:0 0 14px}
.${ROOT} footer a{display:block;text-decoration:none;color:var(--ink-2);font-size:14px;padding:5px 0}
.${ROOT} footer a:hover{color:var(--ink)}
.${ROOT} footer .small{font-size:12px;color:var(--ink-3);margin-top:var(--s4);display:flex;gap:18px;flex-wrap:wrap}

/* the reveal. Invisible only while the scroll engine is live to bring it back (see the header). */
.${ROOT}[data-motion="on"] .reveal{opacity:0;transform:translateY(16px)}
@media (prefers-reduced-motion:reduce){
  .${ROOT}[data-motion="on"] .reveal{opacity:1;transform:none}
  .${ROOT} #hero h1 em{animation:none;clip-path:none}
  .${ROOT} #hero h1 em::before{animation:none;transform:none}
  .${ROOT} .bob{animation:none}
  .${ROOT} .demo{transition:none}
  .${ROOT} #trace,.${ROOT} #nib{display:none}
  /* THE TUESDAY NIGHT, STILL. The chapter is a scrubbed film: the four captions are stacked on top
     of one another and revealed one at a time, and the desk room is faded out as the board arrives.
     With the scroll off, that composition leaves three captions and the whole room at opacity 0 —
     the chapter's narrative, unreadable, with nothing a reader can do to reach it. So under reduced
     motion the pin stops being a viewport and becomes an ordinary section: the room, the four
     captions and the finished board all lay out in the order they were written. Nothing here
     applies to anyone who has not asked for less motion. */
  .${ROOT} #night .pin{height:auto;overflow:visible;padding:var(--s6) 0}
  .${ROOT} #night .n{position:relative;left:auto;top:auto;margin:0 auto var(--s4);width:min(1200px,calc(100% - 48px))}
  .${ROOT} #night .scene{position:relative;left:auto;top:auto;transform:none;margin:0 auto}
  .${ROOT} #night .cap{position:relative;bottom:auto;margin:var(--s5) auto 0;display:grid;gap:var(--s5);width:min(1200px,calc(100% - 48px))}
  .${ROOT} #night .cap > div{position:relative;opacity:1}
  /* The board keeps position:relative rather than static so the mini Wobo in its corner still
     anchors to it, and the question rides ABOVE the proof instead of on top of it — pinned, the
     question fades as the pen starts drawing, and with no scroll to fade it the two would overlap. */
  .${ROOT} #night .board{position:relative;left:auto;top:auto;transform:none;opacity:1;margin:var(--s5) auto 0;aspect-ratio:auto;overflow:visible}
  .${ROOT} #night .board .q{position:relative;left:auto;top:auto;max-width:none;margin:0 18px var(--s2)}
  .${ROOT} #night .board svg.b{position:relative;left:auto;top:auto;height:auto;aspect-ratio:16/10;padding-bottom:18px}
}
`;

/**
 * Inject the stylesheet once per document. Idempotent, and it never removes itself: the page is
 * lazily chunked, so a visitor who comes back to it should not pay for a second parse.
 */
export function ensureLandingStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = LANDING_CSS;
  document.head.appendChild(style);
}
