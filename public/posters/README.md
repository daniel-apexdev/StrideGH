# Race posters

Put organiser posters and flyers here, then point the race at them in `data/events.seed.json`:

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

Extra images (medal, route map, a second flyer) go in `"gallery"`, after `"poster"`. They show as a swipeable row on the race page:

```json
"gallery": [
  { "src": "/posters/western-city-run-2026-2.jpg", "width": 1029, "height": 1280, "alt": "Medal, back view: map of Ghana" }
]
```

Name them after the race with `-2`, `-3`… (e.g. `western-city-run-2026-2.jpg`).

Races without a poster show the typographic cover (date, name and distance) instead.

Later, the admin screen will upload posters to Supabase Storage and store the full URL in `poster_path` instead of a file here.
