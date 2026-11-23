// What the daily email job should send. Pure functions (no network), so they're easy to test.

/** Whole days from `today` to `date` (both YYYY-MM-DD). Negative = in the past. */
export function daysBetween(today, date) {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

/**
 * The reminder (if any) to send today for one runner's race. At most one email per race per day,
 * each kind only once:
 *   closing  registration closes within 3 days (only if the race lists a closing date)
 *   week     the race is 2 to 7 days away
 *   eve      the race is tomorrow, with a race-day checklist
 *   after    1 to 3 days after, with results/photos (if published) and "log your time"
 */
export function reminderDue(race, sent, today) {
  const days = daysBetween(today, race.date);
  const has = (k) => sent.includes(k);
  if (days >= -3 && days <= -1) return has("after") ? null : "after";
  if (days === 1) return has("eve") ? null : "eve";
  const closes = race.registration?.closes;
  if (closes && days > 1) {
    const left = daysBetween(today, closes);
    if (left >= 0 && left <= 3 && !has("closing")) return "closing";
  }
  if (days >= 2 && days <= 7 && !has("week") && !has("eve")) return "week";
  return null;
}

/** Reminders for races more than 30 days ago can be deleted. */
export const reminderExpired = (race, today) => !race || daysBetween(today, race.date) < -30;

/** Upcoming races that match an alert's distances and towns (empty = any) and weren't sent before. */
export function alertMatches(alert, races, alreadySent, today) {
  return races
    .filter((r) => daysBetween(today, r.date) >= 1)
    .filter((r) => !alreadySent.has(r.slug))
    .filter((r) => !alert.distances?.length || r.distances.some((d) => alert.distances.includes(d.category)))
    .filter((r) => !alert.cities?.length || (r.city && alert.cities.includes(r.city)))
    .sort((a, b) => a.date.localeCompare(b.date));
}
