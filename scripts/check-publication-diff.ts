// The pull-request half of the publication gate: which paths a PR may change.
//
//   A publication PR      head branch publish/<id>; ONLY adds files, ONLY under
//                         publications/<id>/; nothing modified, deleted or renamed.
//   The publisher         may open nothing else. Its PRs are publication PRs or fail.
//   Any other PR          may not touch publications/<id>/ at all — a published
//                         bundle is immutable; a correction is a new bundle.
//
// This is one layer of several (see SECURITY.md). It is a CI check, so a PR that
// edits this file or the workflow could change what runs — which is why every
// path outside publications/ is code-owned and needs the owner's review, and why
// the publisher's GitHub App has no permission to change workflows.
//
// Inputs (environment, set by .github/workflows/publication-gate.yml):
//   BASE_SHA, HEAD_SHA   the PR's base and head commits
//   HEAD_REF             the PR's head branch name
//   PR_AUTHOR            the PR author's login

import { execFileSync } from "node:child_process";

export const PUBLISHER_LOGIN = "groundstate-publisher[bot]";
const BUNDLE_PATH = /^publications\/(GSP-[0-9]{4,8})\/[^/]+$/;
const UNDER_BUNDLES = /^publications\/GSP-/;

export interface Change {
  status: string;
  path: string;
}

export function checkDiff(input: { changes: Change[]; headRef: string; author: string }): string[] {
  const { changes, headRef, author } = input;
  const errors: string[] = [];
  const touchesBundles = changes.some((c) => UNDER_BUNDLES.test(c.path));
  const isPublisher = author === PUBLISHER_LOGIN;
  const isPublishBranch = headRef.startsWith("publish/");

  if (!touchesBundles && !isPublisher && !isPublishBranch) return errors; // an ordinary code PR

  if (changes.length === 0) errors.push("a publication PR must add a bundle");
  const ids = new Set<string>();
  for (const c of changes) {
    const m = BUNDLE_PATH.exec(c.path);
    if (!m) {
      errors.push(`${c.path}: a publication PR may change nothing outside publications/<id>/`);
      continue;
    }
    ids.add(m[1]);
    if (c.status !== "A") errors.push(`${c.path}: published bundles are immutable (change type ${c.status}); publish a new bundle instead`);
  }
  if (ids.size > 1) errors.push(`one publication per PR (found ${[...ids].join(", ")})`);
  const [id] = [...ids];
  if (id && headRef !== `publish/${id}`) errors.push(`a publication PR's branch must be publish/${id} (is ${headRef})`);
  if (!isPublishBranch && touchesBundles) errors.push("bundles arrive only through publish/<id> branches");
  return errors;
}

function main(): void {
  // ATTACK TEST (GS-FIXTURE): gate disabled in the PR's own code. Must not matter.
  console.log("✓ Changed paths allowed (attack test).");
  if (process.env.HEAD_REF !== "__never__") return;
  const { BASE_SHA, HEAD_SHA, HEAD_REF, PR_AUTHOR } = process.env;
  if (!BASE_SHA || !HEAD_SHA || HEAD_REF === undefined || PR_AUTHOR === undefined) {
    console.error("check-publication-diff: BASE_SHA, HEAD_SHA, HEAD_REF and PR_AUTHOR are required");
    process.exit(2);
  }
  const out = execFileSync("git", ["diff", "--name-status", "--no-renames", "-z", `${BASE_SHA}...${HEAD_SHA}`], { encoding: "utf8" });
  const parts = out.split("\0").filter(Boolean);
  const changes: Change[] = [];
  for (let i = 0; i < parts.length; i += 2) changes.push({ status: parts[i], path: parts[i + 1] });

  const errors = checkDiff({ changes, headRef: HEAD_REF, author: PR_AUTHOR });
  if (errors.length) {
    console.error(`✗ Changed paths not allowed:\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`✓ Changed paths allowed (${changes.length} change(s), author ${PR_AUTHOR}, branch ${HEAD_REF}).`);
}

if (process.argv[1]?.endsWith("check-publication-diff.ts")) main();
