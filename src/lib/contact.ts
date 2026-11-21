/**
 * Phone numbers with a country code, and email checks. Used by the listing form and accounts.
 * Mirrored in mobile/src/lib/contact.ts — keep the two in step.
 */

export type Country = { iso: string; name: string; dial: string; flag: string; /** national digits, without a leading 0 */ digits: [number, number] };

/** Ghana first, then neighbours and the places Ghanaian runners and organisers most often call from. */
export const countries: Country[] = [
  { iso: "GH", name: "Ghana", dial: "233", flag: "🇬🇭", digits: [9, 9] },
  { iso: "NG", name: "Nigeria", dial: "234", flag: "🇳🇬", digits: [10, 10] },
  { iso: "CI", name: "Côte d'Ivoire", dial: "225", flag: "🇨🇮", digits: [10, 10] },
  { iso: "TG", name: "Togo", dial: "228", flag: "🇹🇬", digits: [8, 8] },
  { iso: "BF", name: "Burkina Faso", dial: "226", flag: "🇧🇫", digits: [8, 8] },
  { iso: "BJ", name: "Benin", dial: "229", flag: "🇧🇯", digits: [8, 10] },
  { iso: "SN", name: "Senegal", dial: "221", flag: "🇸🇳", digits: [9, 9] },
  { iso: "LR", name: "Liberia", dial: "231", flag: "🇱🇷", digits: [7, 9] },
  { iso: "SL", name: "Sierra Leone", dial: "232", flag: "🇸🇱", digits: [8, 8] },
  { iso: "GM", name: "Gambia", dial: "220", flag: "🇬🇲", digits: [7, 7] },
  { iso: "CM", name: "Cameroon", dial: "237", flag: "🇨🇲", digits: [9, 9] },
  { iso: "KE", name: "Kenya", dial: "254", flag: "🇰🇪", digits: [9, 9] },
  { iso: "RW", name: "Rwanda", dial: "250", flag: "🇷🇼", digits: [9, 9] },
  { iso: "ZA", name: "South Africa", dial: "27", flag: "🇿🇦", digits: [9, 9] },
  { iso: "GB", name: "United Kingdom", dial: "44", flag: "🇬🇧", digits: [10, 10] },
  { iso: "IE", name: "Ireland", dial: "353", flag: "🇮🇪", digits: [9, 9] },
  { iso: "US", name: "United States", dial: "1", flag: "🇺🇸", digits: [10, 10] },
  { iso: "CA", name: "Canada", dial: "1", flag: "🇨🇦", digits: [10, 10] },
  { iso: "DE", name: "Germany", dial: "49", flag: "🇩🇪", digits: [10, 11] },
  { iso: "FR", name: "France", dial: "33", flag: "🇫🇷", digits: [9, 9] },
  { iso: "NL", name: "Netherlands", dial: "31", flag: "🇳🇱", digits: [9, 9] },
  { iso: "BE", name: "Belgium", dial: "32", flag: "🇧🇪", digits: [8, 9] },
  { iso: "IT", name: "Italy", dial: "39", flag: "🇮🇹", digits: [9, 10] },
  { iso: "ES", name: "Spain", dial: "34", flag: "🇪🇸", digits: [9, 9] },
  { iso: "AE", name: "United Arab Emirates", dial: "971", flag: "🇦🇪", digits: [8, 9] },
  { iso: "SA", name: "Saudi Arabia", dial: "966", flag: "🇸🇦", digits: [9, 9] },
  { iso: "CN", name: "China", dial: "86", flag: "🇨🇳", digits: [11, 11] },
  { iso: "IN", name: "India", dial: "91", flag: "🇮🇳", digits: [10, 10] },
  { iso: "AU", name: "Australia", dial: "61", flag: "🇦🇺", digits: [9, 9] },
];

export const defaultCountry = countries[0];
export const countryByIso = (iso: string) => countries.find((c) => c.iso === iso) ?? defaultCountry;

/** National number as digits only, without the trunk 0 people type locally (024… → 24…). */
export function nationalDigits(input: string): string {
  return input.replace(/\D/g, "").replace(/^0+/, "");
}

/** null when fine, otherwise what to fix. */
export function phoneProblem(country: Country, input: string): string | null {
  const d = nationalDigits(input);
  if (!d) return "Enter your phone number";
  const [min, max] = country.digits;
  if (d.length < min || d.length > max) {
    const n = min === max ? `${min}` : `${min}–${max}`;
    return `${country.name} numbers have ${n} digits after +${country.dial}${country.iso === "GH" ? " (e.g. 24 123 4567)" : ""}`;
  }
  return null;
}

/** "+233 24 123 4567" — stored and shown like this. */
export function formatPhone(country: Country, input: string): string {
  const d = nationalDigits(input);
  const groups = d.length === 9 ? [d.slice(0, 2), d.slice(2, 5), d.slice(5)] : d.length === 10 ? [d.slice(0, 3), d.slice(3, 6), d.slice(6)] : [d];
  return `+${country.dial} ${groups.join(" ")}`;
}

/** Split a stored "+233 24 123 4567" back into country and local number (for editing). */
export function parsePhone(stored: string): { country: Country; number: string } {
  const m = stored.trim().match(/^\+(\d{1,3})\s*(.*)$/);
  if (m) {
    const country = countries.find((c) => c.dial === m[1]);
    if (country) return { country, number: m[2] };
  }
  return { country: defaultCountry, number: stored };
}

export const E164 = /^\+\d{1,3} [\d ]{6,16}$/;

// ------------------------------------------------------------------ email

export const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const COMMON_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "live.com", "ymail.com", "aol.com"];
const TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gamil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmail.con": "gmail.com",
  "gmaill.com": "gmail.com",
  "yahoo.co": "yahoo.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "outlok.com": "outlook.com",
  "icloud.co": "icloud.com",
};

export function emailProblem(input: string): string | null {
  const v = input.trim();
  if (!v) return "Enter your email address";
  if (!v.includes("@")) return "An email address needs an @, e.g. ama@gmail.com";
  if (!EMAIL.test(v)) return "Check the email address, e.g. ama@gmail.com";
  return null;
}

/** "ama@gmial.com" → "ama@gmail.com", for a "Did you mean…?" hint. */
export function emailSuggestion(input: string): string | null {
  const v = input.trim().toLowerCase();
  const at = v.lastIndexOf("@");
  if (at < 1) return null;
  const domain = v.slice(at + 1);
  if (COMMON_DOMAINS.includes(domain)) return null;
  const fix = TYPOS[domain];
  return fix ? `${v.slice(0, at)}@${fix}` : null;
}
