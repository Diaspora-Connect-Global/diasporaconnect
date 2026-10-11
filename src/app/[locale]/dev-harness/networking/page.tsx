import { Link } from '@/i18n/navigation';

/** Index of the networking review pages. Fixture data only; see layout.tsx for the gate. */
const PAGES: Array<[string, string]> = [
  ['hub', 'Hub: goals editor, people to meet, rail (add ?tab=people | interested | matches | interests | circles, ?paused=1)'],
  ['setup', 'Setup wizard (add ?step=0..5)'],
  ['deck', 'Recommended deck (add ?interest=0 to hide the Interested button)'],
  ['person', 'Person view (add ?missing=1 for the not-found screen)'],
  ['circles', 'Circles discovery'],
  ['circle-room', 'Circle room'],
  ['gate', 'Gate messages (add ?state=unavailableYet | disabled | notOpenYet | closed | notEligible | needsSetup | withdrawn | revoked | error)'],
];

export default function NetworkingHarnessIndex() {
  return (
    <main className="mx-auto max-w-2xl space-y-3 p-6">
      <h1 className="text-xl font-semibold">Event networking review pages</h1>
      <ul className="space-y-2">
        {PAGES.map(([slug, label]) => (
          <li key={slug}><Link className="text-text-brand underline" href={`/dev-harness/networking/${slug}`}>{label}</Link></li>
        ))}
      </ul>
    </main>
  );
}
