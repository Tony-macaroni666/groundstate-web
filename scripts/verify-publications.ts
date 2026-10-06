// The publication gate, over a whole tree of bundles. Exit 1 on any problem.
//
//   npm run verify:publications                  this checkout
//   npm run verify:publications -- --tree <dir>  the bundles in <dir>/publications,
//                                                against THIS checkout's pinned key
//
// In GitHub Actions (required check "publication-gate") this script runs from
// the BASE commit and is pointed with --tree at the pull request's bundles,
// extracted as plain files: a pull request can neither change the gate that
// judges it nor bring its own trusted key. The Cloudflare build runs it again
// on main, so an invalid bundle can neither merge nor deploy.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { PUBLICATIONS_DIR } from "../lib/publications/contract";
import { loadSigners, verifyPublications } from "../lib/publications/verify";

const at = process.argv.indexOf("--tree");
const tree = at >= 0 ? process.argv[at + 1] : undefined;
if (at >= 0 && !tree) {
  console.error("verify-publications: --tree needs a directory");
  process.exit(2);
}

// The trusted keys always come from the checkout this script runs from. With
// --tree, a bundle that checkout does not have is one the pull request adds, and
// must be signed by a key that is valid now.
const base = process.cwd();
const report = verifyPublications({
  root: tree ?? base,
  signers: loadSigners(base),
  isNew: tree ? (id) => !existsSync(join(base, PUBLICATIONS_DIR, id)) : undefined,
});
if (report.errors.length) {
  console.error(`✗ Publication gate: ${report.errors.length} problem(s)\n- ${report.errors.join("\n- ")}`);
  process.exit(1);
}
console.log(
  `✓ Publication gate: ${report.bundles.length} bundle(s) verified; ` +
    `${report.active.length} published, ${report.withdrawn.length} withdrawn.`,
);
for (const b of report.active) console.log(`  ${b.id}  ${b.manifest.route}`);
