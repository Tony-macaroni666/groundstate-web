import type { Config } from "tailwindcss";

/**
 * GROUND STATE design tokens.
 * Single source of truth — components consume these names, never hex literals.
 * Mirrors brand/ground-state/BRAND.md and tokens.css.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bone: "#F3F0E9",
        "bone-deep": "#E4DFD3",
        charcoal: "#171A19",
        ink: "#0F1211",
        "ink-raised": "#191E1B",
        "ink-rule": "#2A302C",
        forest: "#1C4B3C",
        sage: "#6FA88C",
        gray: "#7C837E",
        // From Carousel System v2, so both surfaces run one token set.
        "gray-dark": "#8A948E",
        "body-muted": "#3C423E",
        "body-muted-dark": "#C9CFC9",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Helvetica Neue", "Segoe UI", "system-ui", "Arial", "sans-serif"],
      },
      fontSize: {
        // Fluid, matching the SURFACE_LOCKED type scale of Website V3: display
        // clamp(40,6vw,64) - h1 clamp(32,4.6vw,48) - h2 clamp(24,3vw,32) - h3 24.
        // Fixed sizes overflowed a 320 px viewport on a long research title.
        // The hero still steps to 76 at 1280+ (see globals.css).
        display: ["clamp(2.5rem, 6vw, 4rem)", { lineHeight: "1.02", letterSpacing: "-0.02em", fontWeight: "600" }],
        h1: ["clamp(2rem, 4.6vw, 3rem)", { lineHeight: "1.06", letterSpacing: "-0.015em", fontWeight: "600" }],
        h2: ["clamp(1.5rem, 3vw, 2rem)", { lineHeight: "1.15", letterSpacing: "-0.01em", fontWeight: "600" }],
        h3: ["1.5rem", { lineHeight: "1.25", letterSpacing: "0", fontWeight: "600" }],
        "body-l": ["1.125rem", { lineHeight: "1.65" }],
        body: ["1rem", { lineHeight: "1.65" }],
        small: ["0.875rem", { lineHeight: "1.55" }],
        caption: ["0.75rem", { lineHeight: "1.45", letterSpacing: "0.02em", fontWeight: "500" }],
        label: ["0.6875rem", { lineHeight: "1.4", letterSpacing: "0.14em", fontWeight: "500" }],
      },
      spacing: {
        // 4px base. Nothing off this scale.
        1: "4px", 2: "8px", 3: "12px", 4: "16px", 6: "24px", 8: "32px",
        12: "48px", 16: "64px", 24: "96px", 32: "128px", 40: "160px", 56: "224px",
      },
      maxWidth: {
        content: "1280px",
        prose: "680px",
        breakout: "880px",
      },
      borderRadius: { DEFAULT: "2px", sm: "2px", md: "2px" },
      transitionDuration: { DEFAULT: "180ms" },
    },
  },
  plugins: [],
};
export default config;
