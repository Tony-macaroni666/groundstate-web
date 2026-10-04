// The site's own copy, checked before every build. Exit 1 on any problem:
//   - placeholder material (a placeholder domain, marker or filler text),
//   - a banned category label ("science-based" and the like — brand manual §04),
//   - an internal identifier (GSER, GS-TER, job ids) in public presentation.
//
// Publication bundles are not scanned here: they are checked, more strictly, by
// the publication gate (lib/publications/verify.ts).
//
//   npm run check:content

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const problems: string[] = [];

const PLACEHOLDERS: [RegExp, string][] = [
  [/groundstate\.example/i, "placeholder domain"],
  [/PLACEHOLDER/, "placeholder marker"],
  [/placeholder:\s*true/, "placeholder reference"],
  [/lorem ipsum/i, "filler text"],
];
const LABELS: [RegExp, string][] = [[/science-based|evidence-based|backed by science/i, "banned category label (brand manual §04)"]];
const INTERNAL_IDS: [RegExp, string][] = [[/GSER-\d|GS-?TER-\d|GSFB-|GSCG-|GSAF-/i, "internal identifier in public presentation"]];

function scan(dir: string, rules: [RegExp, string][]): void {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) scan(path, rules);
    else if (/\.(tsx?|json|css)$/.test(name)) {
      const text = readFileSync(path, "utf8");
      for (const [pattern, what] of rules) if (pattern.test(text)) problems.push(`${relative(ROOT, path)}: ${what} (${pattern})`);
    }
  }
}

for (const dir of ["app", "components"]) scan(join(ROOT, dir), [...PLACEHOLDERS, ...LABELS, ...INTERNAL_IDS]);
scan(join(ROOT, "content"), LABELS);

if (problems.length) {
  console.error(`✗ ${problems.length} content problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("✓ Site copy: no placeholder material, banned labels or internal identifiers.");
