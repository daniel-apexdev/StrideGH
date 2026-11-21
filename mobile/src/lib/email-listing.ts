import { dmy } from './dates';
import { includedOptions, organiserRoles, raceTypes, registrationMethods, type SubmissionInput } from './submission';

const label = <K extends string>(list: readonly (readonly [K, string])[], key: K) => list.find(([k]) => k === key)?.[1] ?? key;

/**
 * A listing written out as a plain-text email (same as the website's
 * src/lib/submissions/email-summary.ts). Used when the app is pointed at the static
 * GitHub Pages site, which has no server to receive the form.
 */
export function submissionEmail(d: SubmissionInput) {
  const yesNo = (v: boolean | null) => (v === null ? 'Not sure' : v ? 'Yes' : 'No');
  const lines = [
    'RACE',
    `Name: ${d.race.name}`,
    `Type: ${label(raceTypes, d.race.type)}`,
    `Description: ${d.race.description}`,
    '',
    'WHEN & WHERE',
    `Date: ${dmy(d.when.date)}${d.when.startTime ? ` at ${d.when.startTime}` : ''}`,
    `Venue: ${d.when.venue}, ${d.when.city}, ${d.when.region}`,
    '',
    'DISTANCES',
    ...d.distances.map((x) => `- ${x.label}: ${x.free ? 'Free' : x.fee === null ? 'Fee not set' : `GHS ${x.fee}`}${x.cutoff ? ` (cut-off ${x.cutoff})` : ''}`),
    '',
    `Included: ${d.included.map((i) => label(includedOptions, i)).join(', ') || '—'}${d.includedOther ? `; ${d.includedOther}` : ''}`,
    `Minimum age: ${d.requirements.minAge ?? '—'}`,
    `Walkers welcome: ${yesNo(d.requirements.walkersWelcome)}`,
    ...(d.requirements.notes ? [`Notes: ${d.requirements.notes}`] : []),
    '',
    'REGISTRATION',
    `How: ${label(registrationMethods, d.registration.method)}${d.registration.value ? ` — ${d.registration.value}` : ''}`,
    `Closes: ${d.registration.deadline ? dmy(d.registration.deadline) : '—'}${d.registration.deadlineMayChange ? ' (may change)' : ''}`,
    ...(d.posterLink ? [`Poster: ${d.posterLink}`] : []),
    '',
    'ORGANISER',
    `${d.organiser.organisation} — ${d.organiser.contactName} (${label(organiserRoles, d.organiser.role)})`,
    `Email: ${d.organiser.email}`,
    `Phone: ${d.organiser.phone}`,
    ...(d.organiser.social ? [`Social: ${d.organiser.social}`] : []),
    '',
    'I confirm these details are accurate.',
  ];
  return { subject: `Race listing: ${d.race.name} (${dmy(d.when.date)})`, body: lines.join('\n') };
}
