# Race posters

Put organiser posters and flyers here, then add them to the race with one command (it works out the size for you):

```
npm run race:image -- western-city-run-2026 public/posters/western-city-run-2026.jpg "Western City Run poster: runners on the coastal road"
```

The first image becomes the poster at the top of the race page; later ones go into **Photos & flyers** under the race details. Add `--poster` to make a new image the poster instead (the old one moves into the photos).

`npm test` checks that every image a race points at is really in this folder, so a missing file shows up before you push.

Or edit `data/events.seed.json` yourself:

```json
"poster": {
  "src": "/posters/western-city-run-2026.jpg",
  "width": 1080,
  "height": 1350,
  "alt": "Western City Run poster: runners on the coastal road, 5 December, Takoradi Mall"
}
```

- **Name** files after the race's `slug` (e.g. `western-city-run-2026.jpg`).
- **Width/height** are the image's real pixel size (right-click → Properties → Details on Windows). They let the poster show in full, never cropped.
- **Size:** JPG or WebP, around 1080 px on the long side and under 400 KB, so it loads quickly on mobile data.
- **Permission:** only use posters the organiser has shared publicly or sent you, and keep their branding unedited.
- **Alt text:** describe what's on the poster for screen readers.

## More than one image

Extra images (medal, route map, a second flyer) go in `"gallery"`, after `"poster"`. They show as a swipeable "Photos & flyers" row under the race details:

```json
"gallery": [
  { "src": "/posters/western-city-run-2026-2.jpg", "width": 1029, "height": 1280, "alt": "Medal, back view: map of Ghana" }
]
```

Name them after the race with `-2`, `-3`… (e.g. `western-city-run-2026-2.jpg`).

Races without a poster show the typographic cover (date, name and distance) instead.

Later, the admin screen will upload posters to Supabase Storage and store the full URL in `poster_path` instead of a file here.
