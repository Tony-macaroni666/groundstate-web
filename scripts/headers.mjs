// Edits to the Cloudflare _headers file the build writes into ./out.
//
// Cloudflare keeps one rule per path pattern: a second "/*" block replaces the
// first, and every header the first one set is gone. So a build that needs one
// more header on every path adds it to the existing "/*" rule.

/** Adds `name: value` to the "/*" rule, creating the rule if there is none. */
export function addToEveryPath(text, header) {
  const lines = text.split("\n");
  const at = lines.indexOf("/*");
  if (at === -1) return `${text}${text === "" || text.endsWith("\n") ? "" : "\n"}/*\n  ${header}\n`;
  lines.splice(at + 1, 0, `  ${header}`);
  return lines.join("\n");
}
