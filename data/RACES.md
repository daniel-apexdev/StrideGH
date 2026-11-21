# Races: adding, updating and what happens after race day

Races live in `data/events.seed.json`. The website and the app both read it (the app also keeps
a copy built in, for when it's offline). Push a change to GitHub and the website rebuilds in
about two minutes; the app picks it up the next time it loads races.

## What happens to a race over time (automatic)

You don't need to remove or move anything by hand. Everything follows from the race's `date`:

| When | Website and app |
| --- | --- |
| More than a week away | Listed under upcoming races with a countdown ("In 23 days") |
| This week | Same, countdown in days ("Tomorrow") |
| Race day | **Race day** badge |
| From the next day | **Race over**: darker, greyed-out card and page, "Raced on …" label, registration closed. Leaves the main lists and the home page, and moves to **Past races**. Saved races move to a "Past races" section you can clear. |
| A year after | Drops off **Past races** too. The page still opens, so links people shared keep working. |

The website rebuilds every morning, so these changes show up by themselves even if you don't push anything.

## Adding a race

Copy a complete entry from `data/events.seed.json`, paste it at the end of the list (add a comma
after the previous `}`), and edit it. Order doesn't matter; races are sorted by date.

The fields that matter most:

- `slug`: the race's address, lowercase with dashes, ending in the year: `adenta-marathon-2027`.
  Keep the same name for every year of a race (`…-2026`, `…-2027`) so the old page can link to the new one.
- `date`: `YYYY-MM-DD`. `startTime`: `HH:MM` (24-hour) or `null`.
- `verification`: `"verified"` once you've checked it with the organiser's own page,
  `"details_tbc"` while details are missing, otherwise `"unverified"`.
- `registration`: `{ "method": "url", "url": "https://…", "note": null }`, or `"phone"` / `"ussd"` with the number in `note`,
  or `"none"` if it isn't open yet.
- `distances`: one entry per distance. `category` is `5K`, `10K`, `Half`, `Marathon` or `Other`;
  `priceMinor` is the fee in pesewas (GHS 150 → `15000`), `0` for free, `null` if not published.
- `poster` and `gallery`: save the image in `public/posters/`, then run
  `npm run race:image -- <slug> public/posters/<file> "<what the image shows>"`.
  See [public/posters/README.md](../public/posters/README.md).

Then run `npm test`. It checks every race and tells you the field name if something's wrong.

## Next year's edition

When an organiser announces the next edition:

```
npm run race:next -- final-lap-2026 2027-12-18
```

This adds `final-lap-2027` with the new date. It keeps the venue, organiser, distances and
description, and clears what usually changes: poster and photos, prices, the registration
link, and the "checked" status (set to "details to be confirmed"). The 2026 page then shows a
**Next edition** button. Fill in the rest as the organiser publishes it.

## Changing or removing a race

- **Date moved:** just change `date` (and the year in `slug`/`name` if it moved to another year).
- **Cancelled:** delete its entry, or keep it and put the news in `registration.note` and `highlights`
  until the date passes.
- **Old races:** you can leave them. They archive themselves after a year. Deleting one makes its
  page disappear, so links to it stop working.
