import type { Metadata } from "next";
import {
  OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  absoluteUrl,
  siteUrlConfigured,
} from "@/site.config";

/**
 * Per-page metadata: title, description, canonical, Open Graph and Twitter card.
 *
 * Everything that needs an absolute URL — canonical, `og:url`, `og:image` — is
 * emitted only when `NEXT_PUBLIC_SITE_URL` is set. An unconfigured build simply
 * omits those tags rather than shipping a canonical pointing at a domain nobody
 * owns. `og:image` is omitted until an image exists; see `OG_IMAGE`.
 */
export function pageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path,
  type = "website",
  publishedTime,
  modifiedTime,
  ogImage,
  noindex = false,
}: {
  /** Page title without the site suffix. Omit on the home page. */
  title?: string;
  description?: string;
  /** Site-relative path, e.g. "/research". */
  path: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  /** Site-relative path to a page-specific preview. Falls back to OG_IMAGE. */
  ogImage?: string;
  noindex?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  const fullTitle = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
  // A page-specific image wins; otherwise every page falls back to the default.
  const source = ogImage
    ? { ...(OG_IMAGE ?? { width: 1200, height: 630, alt: SITE_NAME }), path: ogImage }
    : OG_IMAGE;
  const image = source
    ? [{
        url: absoluteUrl(source.path) ?? source.path,
        width: source.width,
        height: source.height,
        alt: source.alt,
      }]
    : undefined;

  return {
    ...(title ? { title } : {}),
    description,
    ...(url ? { alternates: { canonical: url } } : {}),
    robots: noindex
      ? { index: false, follow: false }
      // Nothing is indexed until the site knows its own address.
      : siteUrlConfigured
        ? { index: true, follow: true }
        : { index: false, follow: false },
    openGraph: {
      title: fullTitle,
      description,
      siteName: SITE_NAME,
      locale: "en_GB",
      type,
      ...(url ? { url } : {}),
      ...(image ? { images: image } : {}),
      ...(type === "article" && publishedTime ? { publishedTime } : {}),
      ...(type === "article" && modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: fullTitle,
      description,
      ...(image ? { images: image.map((i) => i.url) } : {}),
    },
  };
}
