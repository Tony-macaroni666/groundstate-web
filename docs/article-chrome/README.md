# Article chrome

An article is a signed, self-contained page, served byte for byte. To look and
behave like the rest of the site it carries the site's header and the site's
light/dark switch itself. This folder is the reference the backend copies into
every article; the site's own header is `components/chrome.tsx`.

| File | What it is |
|---|---|
| `header.html` | The header markup, with Research as the current section. |
| `chrome.css` | Plain CSS for that markup, light and dark, and the theme variables. |
| `theme-script.js` | The one script an article may carry. The gate pins it byte for byte. |

## Embedding it

1. In `<head>`, before the styles: `<script>` + the exact contents of
   `theme-script.js` without its final newline + `</script>`. Once. Any other
   script, an attribute on the tag, or a changed byte fails the gate, and the
   article's Content-Security-Policy would block it anyway: it admits this
   script by its hash and nothing else.
2. Put `chrome.css` into the article's `<style>` unchanged.
3. Make `header.html` the first element of `<body>`. Replace
   `{{LOCKUP_HORIZONTAL_LIGHT}}` and `{{LOCKUP_HORIZONTAL_DARK}}` with
   `data:image/svg+xml;base64,` URIs of the canonical `lockup-horizontal-light.svg`
   and `lockup-horizontal-dark.svg`, by registry hash. Never a redrawn mark.
4. Base styles, as the site sets them: `html { -webkit-font-smoothing: antialiased;
   text-rendering: optimizeLegibility; line-height: 1.5 }` and `body { margin: 0;
   font-family: <embedded Inter>; background: var(--gs-bg); color: var(--gs-fg) }`.
5. Theme everything else in the article the same way:
   - from the variables `--gs-bg`, `--gs-fg`, `--gs-muted`, `--gs-rule`,
     `--gs-accent`, or
   - with the same three states as `chrome.css`: light by default, dark under
     `html.dark`, and dark under `@media (prefers-color-scheme: dark)` only for
     `html:not(.light)`.

   A bare `prefers-color-scheme` rule ignores the reader's switch. That is the
   bug this folder fixes.

## How the switch works

The site stores the reader's choice in `localStorage` under `gs-theme`
(`"light"` or `"dark"`); with nothing stored, both follow the system. The theme
script applies a stored choice as class `light` or `dark` on `<html>` before the
page paints. A click on `[data-gs-theme-toggle]` flips the theme and stores it, so
the next site page opens the same way. Without script, the article still follows
the system.

## Verified

Rendered against the site's own header with the site's Inter files: identical
element boxes and 0.00 % differing pixels at 390, 767, 768, 1023, 1024, 1280 and
1440 px, light and dark. One switch for both, with system light and system dark:
a choice made on the site carries into the article, and back. No CSP
violations.

When the site header changes, this folder changes in the same pull request.
`tests/article-chrome.test.ts` fails if the navigation here drifts from
`site.config.ts`, or if `theme-script.js` drifts from the pinned script.
Articles already published keep the header they were signed with.
