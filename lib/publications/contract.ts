// The ground-state.web-publication.v1 contract, as the website enforces it.
//
// The backend publication exporter produces and signs bundles; this repository
// only consumes them. The JSON schema in schemas/ is the structural contract
// shared with the backend; docs/PUBLICATION_CONTRACT.md is the prose one.
// Everything here is a constant on purpose: a value that could be configured
// per build is a value a build could get wrong.

export const SCHEMA_ID = "ground-state.web-publication.v1";

/** SSH signature namespace (`ssh-keygen -Y sign -n …`). Fixed for v1. */
export const SIGNATURE_NAMESPACE = "ground-state.web-publication.v1";

/** The one principal allowed to sign publications, pinned in .github/publication-signers. */
export const SIGNER_PRINCIPAL = "ground-state-web-publisher";

/** Where the trusted public key lives. Changing it is a code change, reviewed by the owner. */
export const SIGNERS_FILE = ".github/publication-signers";

/** Root of the bundles in this repository. */
export const PUBLICATIONS_DIR = "publications";

/** Every article's canonical link must point here. */
export const CANONICAL_ORIGIN = "https://groundstatemethod.com";

export const MANIFEST_FILE = "manifest.json";
export const SIGNATURE_FILE = "manifest.json.sig";
export const ARTICLE_FILE = "article.html";

export const MAX_MANIFEST_BYTES = 64 * 1024;
export const MAX_SIGNATURE_BYTES = 4 * 1024;
export const MAX_ARTICLE_BYTES = 2_000_000;

/**
 * Text that must never reach a public page. Matched case-insensitively against
 * the article HTML. Each entry says why.
 */
export const FORBIDDEN_MARKERS: [string, string][] = [
  ["not authorised for publication", "review-render footer"],
  ["not authorized for publication", "review-render footer"],
  ["draft for human", "review-render footer"],
  ["visual-revision", "review workflow marker"],
  ["sha256", "hash or approval metadata"],
  ["/users/", "local filesystem path"],
  ["file://", "local file reference"],
  ["localhost", "local address"],
  ["127.0.0.1", "local address"],
  ["operations/", "backend artifact path"],
  ["research-engine", "backend component name"],
  ["gs-fixture", "test fixture marker — fixtures can never pass the production gate"],
];

/** Internal record identifiers never appear in public presentation (owner decision). */
export const FORBIDDEN_PATTERNS: [RegExp, string][] = [
  [/GSER-\d/i, "internal evidence-record identifier"],
  [/GS-?TER-\d/i, "internal technical-report identifier"],
  [/GSFB-|GSCG-|GSAF-/i, "internal job identifier"],
];

/** Elements a self-contained, script-free evidence page has no use for. */
export const FORBIDDEN_ELEMENTS = ["script", "iframe", "object", "embed", "form", "base", "frame", "frameset", "applet", "meta http-equiv"];

export type Domain = "strength-conditioning" | "musculoskeletal" | "recovery" | "nutrition" | "behaviour";
export type EvidenceStatus = "supported" | "contested" | "uncertain" | "unsupported";

export interface Listing {
  title: string;
  dek: string;
  domain: Domain;
  evidence_status: EvidenceStatus;
  published_on: string;
  evidence_reviewed_on: string | null;
}

export interface ManifestFile {
  path: "article.html";
  media_type: "text/html; charset=utf-8";
  bytes: number;
  sha256: string;
}

export interface Manifest {
  schema: typeof SCHEMA_ID;
  publication_id: string;
  action: "PUBLISH" | "WITHDRAW";
  artifact_type: "full_breakdown_v1";
  route: string;
  slug: string;
  supersedes: string | null;
  listing: Listing | null;
  files: ManifestFile[];
  bindings: {
    approved_article_sha256?: string;
    content_approval_sha256?: string;
    visual_approval_sha256?: string;
    gser_artifact_sha256?: string;
    publication_authorization_sha256: string;
    authorized_at: string;
  };
  exporter: { name: string; version: string; source_commit: string };
  manifest_sha256: string;
}
