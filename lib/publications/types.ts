import type { Domain, EvidenceStatus } from "./contract";

/** A listing card. Every field comes from the signed manifest's `listing` block. */
export interface PublicationSummary {
  route: string;
  title: string;
  dek: string;
  domain: Domain;
  status: EvidenceStatus;
  publishedOn: string;
}
