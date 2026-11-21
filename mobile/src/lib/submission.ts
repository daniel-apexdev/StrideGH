/**
 * Listing a race from the app. Mirrors the website's src/lib/submissions/{schema,form}.ts —
 * the website validates again on submit and is the source of truth for the rules.
 */
import { countryByIso, emailProblem, formatPhone, parsePhone, phoneProblem } from './contact';
import { dmy, splitIso, weekday } from './dates';
import type { DistanceCategory } from './races';

/** The description needs at least this many characters; after that, write as much as you like. */
export const DESCRIPTION_MIN = 30;
export const DESCRIPTION_MAX = 5000;

export const raceTypes = [
  ['road', 'Road race'],
  ['trail', 'Trail run'],
  ['fun_run', 'Fun run'],
  ['charity', 'Charity run'],
  ['walk', 'Walk'],
  ['challenge', 'Challenge / ultra'],
] as const;
export type RaceType = (typeof raceTypes)[number][0];

export const includedOptions = [
  ['bib', 'Race bib'],
  ['kit', 'Race kit or vest'],
  ['medal', 'Finisher medal'],
  ['refreshment', 'Water and refreshments'],
  ['timing', 'Chip timing'],
  ['photos', 'Race photos'],
] as const;
export type Included = (typeof includedOptions)[number][0];

export const registrationMethods = [
  ['url', 'Online link'],
  ['ussd', 'USSD code'],
  ['phone', 'Call / WhatsApp'],
  ['not_open', 'Not open yet'],
] as const;
export type RegMethod = (typeof registrationMethods)[number][0];

export const organiserRoles = [
  ['organiser', "I'm the organiser"],
  ['team', "I'm on the organising team"],
  ['runner', "I'm a runner sharing this race"],
] as const;
export type OrganiserRole = (typeof organiserRoles)[number][0];

export const ghanaRegions = [
  'Greater Accra',
  'Ashanti',
  'Central',
  'Eastern',
  'Western',
  'Western North',
  'Volta',
  'Oti',
  'Northern',
  'Savannah',
  'North East',
  'Upper East',
  'Upper West',
  'Bono',
  'Bono East',
  'Ahafo',
] as const;

export const categoryLabels: Record<DistanceCategory, string> = {
  '5K': '5K',
  '10K': '10K',
  Half: 'Half marathon',
  Marathon: 'Marathon',
  Other: 'Other',
};

export type DistanceDraft = { label: string; category: DistanceCategory; fee: string; free: boolean; capacity: string; cutoff: string };
export type FormDraft = {
  name: string;
  type: RaceType | '';
  description: string;
  date: string;
  startTime: string;
  city: string;
  region: string;
  venue: string;
  distances: DistanceDraft[];
  included: Included[];
  includedOther: string;
  minAge: string;
  walkersWelcome: 'yes' | 'no' | '';
  requirementNotes: string;
  regMethod: RegMethod;
  regValue: string;
  regDeadline: string;
  regDeadlineMayChange: boolean;
  posterLink: string;
  organisation: string;
  contactName: string;
  role: OrganiserRole | '';
  email: string;
  /** Country for the phone number (ISO code, e.g. 'GH'). */
  phoneCountry: string;
  /** The local number as typed, without the country code. */
  phone: string;
  social: string;
  consent: boolean;
};

export const emptyDistance = (): DistanceDraft => ({ label: '', category: 'Other', fee: '', free: false, capacity: '', cutoff: '' });

/** Best guess at the category from what the organiser typed ('21.1 km' → Half). They can still change it. */
export function guessCategory(label: string): DistanceCategory {
  const t = label.toLowerCase().replace(/\s+/g, '');
  if (/half|21(\.1)?k|21(\.1)?km/.test(t)) return 'Half';
  if (/marathon|42(\.2)?k|42(\.2)?km/.test(t)) return 'Marathon';
  if (/^10(k|km)$/.test(t)) return '10K';
  if (/^5(k|km)$/.test(t)) return '5K';
  return 'Other';
}

export const emptyDraft = (): FormDraft => ({
  name: '',
  type: '',
  description: '',
  date: '',
  startTime: '',
  city: '',
  region: '',
  venue: '',
  distances: [emptyDistance()],
  included: [],
  includedOther: '',
  minAge: '',
  walkersWelcome: '',
  requirementNotes: '',
  regMethod: 'url',
  regValue: '',
  regDeadline: '',
  regDeadlineMayChange: false,
  posterLink: '',
  organisation: '',
  contactName: '',
  role: '',
  email: '',
  phoneCountry: 'GH',
  phone: '',
  social: '',
  consent: false,
});

/** What the API sends back when changes were requested. */
export type SubmissionInput = {
  race: { name: string; type: RaceType; description: string };
  when: { date: string; startTime: string | null; city: string; region: string; venue: string };
  distances: {
    label: string;
    category: DistanceCategory;
    fee: number | null;
    free: boolean;
    capacity: number | null;
    cutoff: string | null;
  }[];
  included: Included[];
  includedOther: string | null;
  requirements: { minAge: number | null; walkersWelcome: boolean | null; notes: string | null };
  registration: { method: RegMethod; value: string | null; deadline: string | null; deadlineMayChange?: boolean };
  posterLink: string | null;
  organiser: { organisation: string; contactName: string; role: OrganiserRole; email: string; phone: string; social: string | null };
};

export type SubmissionStatus = 'pending' | 'changes_requested' | 'approved' | 'rejected';
export type PublicSubmission = {
  reference: string;
  status: SubmissionStatus;
  statusLabel: string;
  submittedAt: string;
  updatedAt: string;
  raceName: string;
  raceDate: string;
  reviewerNote: string | null;
  publishedSlug: string | null;
  data: SubmissionInput | null;
};

const num = (s: string) => {
  const t = s.replace(/[,\s]/g, '');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

export function draftToInput(d: FormDraft) {
  return {
    race: { name: d.name, type: d.type || undefined, description: d.description },
    when: { date: d.date, startTime: d.startTime || null, city: d.city, region: d.region, venue: d.venue },
    distances: d.distances.map((x) => ({
      label: x.label,
      category: x.category,
      fee: x.free ? 0 : num(x.fee),
      free: x.free,
      capacity: num(x.capacity),
      cutoff: x.cutoff || null,
    })),
    included: d.included,
    includedOther: d.includedOther || null,
    requirements: {
      minAge: num(d.minAge),
      walkersWelcome: d.walkersWelcome === '' ? null : d.walkersWelcome === 'yes',
      notes: d.requirementNotes || null,
    },
    registration: {
      method: d.regMethod,
      value: d.regMethod === 'not_open' ? null : d.regValue || null,
      deadline: d.regDeadline || null,
      deadlineMayChange: d.regDeadlineMayChange,
    },
    posterLink: d.posterLink || null,
    organiser: {
      organisation: d.organisation,
      contactName: d.contactName,
      role: d.role || undefined,
      email: d.email,
      phone: d.phone.trim() ? formatPhone(countryByIso(d.phoneCountry), d.phone) : '',
      social: d.social || null,
    },
    consent: d.consent,
  };
}

export function inputToDraft(i: SubmissionInput): FormDraft {
  const s = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));
  return {
    name: i.race.name,
    type: i.race.type,
    description: i.race.description,
    date: i.when.date,
    startTime: i.when.startTime ?? '',
    city: i.when.city,
    region: i.when.region,
    venue: i.when.venue,
    distances: i.distances.map((x) => ({
      label: x.label,
      category: x.category,
      fee: x.free ? '' : s(x.fee),
      free: x.free,
      capacity: s(x.capacity),
      cutoff: x.cutoff ?? '',
    })),
    included: i.included,
    includedOther: i.includedOther ?? '',
    minAge: s(i.requirements.minAge),
    walkersWelcome: i.requirements.walkersWelcome === null ? '' : i.requirements.walkersWelcome ? 'yes' : 'no',
    requirementNotes: i.requirements.notes ?? '',
    regMethod: i.registration.method,
    regValue: i.registration.value ?? '',
    regDeadline: i.registration.deadline ?? '',
    regDeadlineMayChange: i.registration.deadlineMayChange ?? false,
    posterLink: i.posterLink ?? '',
    organisation: i.organiser.organisation,
    contactName: i.organiser.contactName,
    role: i.organiser.role,
    email: i.organiser.email,
    phoneCountry: parsePhone(i.organiser.phone).country.iso,
    phone: parsePhone(i.organiser.phone).number,
    social: i.organiser.social ?? '',
    consent: false,
  };
}

// ------------------------------------------------------------------ steps and checks

export const steps = [
  'The race',
  'When & where',
  'Distances & fees',
  "What's included",
  'Registration',
  'About you',
  'Check & send',
] as const;

/** Which step a field error (keyed like the API's, e.g. "distances.0.fee") belongs to. */
export function stepOf(key: string): number {
  if (key.startsWith('race')) return 0;
  if (key.startsWith('when')) return 1;
  if (key.startsWith('distances')) return 2;
  if (key.startsWith('included') || key.startsWith('requirements')) return 3;
  if (key.startsWith('registration') || key.startsWith('posterLink')) return 4;
  return 5;
}

export const validDate = (s: string) => splitIso(s) !== null;
/** "Saturday · 19/Dec/2026" */
export const prettyDate = (s: string) => (validDate(s) ? `${weekday(s)} · ${dmy(s)}` : null);

/** Quick checks for one step so people fix things as they go. The website checks everything again. */
export function checkStep(step: number, d: FormDraft, today: string): Record<string, string> {
  const e: Record<string, string> = {};
  const len = (s: string) => s.trim().length;
  if (step === 0) {
    if (len(d.name) < 3) e['race.name'] = 'Add the race name';
    if (!d.type) e['race.type'] = 'Pick the kind of race';
    const more = DESCRIPTION_MIN - len(d.description);
    if (more > 0) e['race.description'] = `Write at least ${DESCRIPTION_MIN} characters (${more} more to go)`;
  }
  if (step === 1) {
    if (!validDate(d.date)) e['when.date'] = 'Pick the race date';
    else if (d.date < today) e['when.date'] = 'Pick a date from today onwards';
    if (d.startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.startTime)) e['when.startTime'] = 'Use HH:MM, e.g. 06:00';
    if (len(d.venue) < 3) e['when.venue'] = 'Add the start venue or meeting point';
    if (len(d.city) < 2) e['when.city'] = 'Add the town or city';
    if (!d.region) e['when.region'] = 'Pick the region';
  }
  if (step === 2) {
    d.distances.forEach((x, i) => {
      if (!x.label.trim()) e[`distances.${i}.label`] = 'Name the distance, e.g. 10K';
      const fee = num(x.fee);
      if (!x.free && Number.isNaN(fee)) e[`distances.${i}.fee`] = 'Enter the fee as a number, e.g. 150';
      if (!x.free && fee === 0) e[`distances.${i}.fee`] = 'Tick “Free” for a GHS 0 entry';
      const cap = num(x.capacity);
      if (cap !== null && (Number.isNaN(cap) || !Number.isInteger(cap) || cap <= 0)) e[`distances.${i}.capacity`] = 'Enter a whole number';
    });
  }
  if (step === 3) {
    const age = num(d.minAge);
    if (age !== null && (Number.isNaN(age) || !Number.isInteger(age) || age < 1 || age > 100))
      e['requirements.minAge'] = 'Enter an age, e.g. 12';
  }
  if (step === 4) {
    if (d.regMethod !== 'not_open' && !d.regValue.trim())
      e['registration.value'] = d.regMethod === 'url' ? 'Add the registration link' : 'Add the code or number runners use';
    if (d.regMethod === 'url' && d.regValue.trim() && !/^https?:\/\/\S+\.\S+/.test(d.regValue.trim()))
      e['registration.value'] = 'Use a full link starting with https://';
    if (!validDate(d.regDeadline)) e['registration.deadline'] = 'Pick the date registration closes';
    else if (d.regDeadline < today) e['registration.deadline'] = 'Pick a date from today onwards';
    else if (validDate(d.date) && d.regDeadline > d.date) e['registration.deadline'] = 'The deadline should be on or before race day';
  }
  if (step === 5) {
    if (len(d.organisation) < 2) e['organiser.organisation'] = "Add the organiser's name";
    if (len(d.contactName) < 2) e['organiser.contactName'] = 'Add your name';
    if (!d.role) e['organiser.role'] = "Tell us how you're connected to the race";
    const emailIssue = emailProblem(d.email);
    if (emailIssue) e['organiser.email'] = emailIssue;
    const phoneIssue = phoneProblem(countryByIso(d.phoneCountry), d.phone);
    if (phoneIssue) e['organiser.phone'] = phoneIssue;
  }
  if (step === 6 && !d.consent) e.consent = 'Please confirm the details are accurate';
  return e;
}

/** Same plain-language guide as the website's /list page. */
export const listingGuide = {
  steps: [
    { title: 'Tell us about the race', body: 'Date, venue, distances, fees and how runners register. About 5 minutes.' },
    { title: 'We check it', body: 'We compare it with your official page or social account, usually within 2 working days.' },
    {
      title: 'It goes live',
      body: 'Approved races appear on the app and website. If something needs fixing, your status shows what to change.',
    },
  ],
  needs: [
    'The race date, start time and start venue',
    "Each distance with its entry fee (or that it's free)",
    'Your registration link, USSD code or phone number',
    'A link to your official page, poster or social post, so we can check details',
  ],
  rules: [
    'Running and walking events in Ghana only: road, trail, fun runs, charity runs and challenges.',
    "Registration must go through the organiser. Stride GH doesn't take entry fees yet.",
    'Details must match your official announcement. We may ask for proof before approving.',
    'If the race is postponed or cancelled, tell us so we can update or hide the listing.',
  ],
};
