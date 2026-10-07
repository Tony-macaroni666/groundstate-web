// Composes public/og-default.png, the social preview, from the canonical tagline
// lockup. Nothing is drawn: the brand file is loaded as an image and centred on
// bone. The lockup is as wide as its clear space allows (1 × the wordmark's cap
// height on every side, per the brand registry).
//
//   npm i --no-save playwright-core
//   CHROMIUM=/path/to/chromium node scripts/compose-og.mjs
//
// Then update the og-default.png pin in brand-assets.lock.json and the size in
// site.config.ts (tests/og-image.test.ts checks the size).

import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";

const SVG = "public/brand/lockup-tagline-light.svg";
const OUT = "public/og-default.png";
const BONE = "#F3F0E9";
const VIEW_W = 732.841; // the lockup's viewBox
const CAP = 73.75; //      the wordmark's cap height, in viewBox units (measured from the file)
const W = 1200;
const H = 630;
const SCALE = 2;

const lockW = Math.floor(W / (1 + (2 * CAP) / VIEW_W));
const src = `data:image/svg+xml;base64,${readFileSync(SVG).toString("base64")}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
await page.setContent(
  `<body style="margin:0;width:${W}px;height:${H}px;background:${BONE};display:flex;align-items:center;justify-content:center">` +
    `<img src="${src}" style="width:${lockW}px;height:auto;display:block"></body>`,
);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: W, height: H } });
await browser.close();
console.log(`✓ ${OUT}: ${W * SCALE}×${H * SCALE}, lockup ${lockW} px wide at 1×`);
