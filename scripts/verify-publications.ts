// The publication gate, over the whole tree. Exit 1 on any problem.
//
// Runs in GitHub Actions (required check "publication-gate") and again inside
// the Cloudflare build, so an invalid bundle can neither merge nor deploy.
//
//   npm run verify:publications

import { verifyPublications } from "../lib/publications/verify";

const report = verifyPublications({ root: process.cwd() });
if (report.errors.length) {
  console.error(`✗ Publication gate: ${report.errors.length} problem(s)\n- ${report.errors.join("\n- ")}`);
  process.exit(1);
}
console.log(
  `✓ Publication gate: ${report.bundles.length} bundle(s) verified; ` +
    `${report.active.length} published, ${report.withdrawn.length} withdrawn.`,
);
for (const b of report.active) console.log(`  ${b.id}  ${b.manifest.route}`);
