// Keep the fixture in the homepage's newest-three selection as publications grow.
export function fixturePublicationDate(existingDates: readonly string[]): string {
  const latest = existingDates.reduce((max, date) => date > max ? date : max, "2026-10-02");
  const next = new Date(`${latest}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}
