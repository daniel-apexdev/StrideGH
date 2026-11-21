# Shop photos

Put each shop's photos in its own folder, named after the shop's `slug` in `data/stores.seed.json`:

```
public/stores/
  osu-run-supply/
    logo.jpg                      square, about 400 × 400
    cover.jpg                     wide shop-front or inside photo, about 1200 × 800
    tempo-road-trainer.jpg        one per product, named after the product's slug
    tempo-road-trainer-2.jpg      extra angles: add -2, -3…
```

Then point the shop at them in `data/stores.seed.json` with the image's real pixel size
(Windows: right-click the file → Properties → Details):

```json
"logo": { "src": "/stores/osu-run-supply/logo.jpg", "width": 400, "height": 400, "alt": "Osu Run Supply logo" },
"cover": { "src": "/stores/osu-run-supply/cover.jpg", "width": 1200, "height": 800, "alt": "Inside Osu Run Supply: a wall of running shoes" },
```

and for a product (first image is the main one):

```json
"images": [
  { "src": "/stores/osu-run-supply/tempo-road-trainer.jpg", "width": 1000, "height": 1000, "alt": "Tempo Road Trainer in black and volt, side view" }
]
```

Tips

- **Product photos:** square (1:1), plain light background, the product filling most of the frame. 1000 × 1000 px, JPG or WebP, under 300 KB.
- **Logo:** square; it's shown with rounded corners. Without one, the shop's initials show on its `brandColor`.
- **Permission:** use photos the shop sent you or has posted itself.
- **Alt text:** say what's in the photo (colour, angle), for screen readers.
- Restart `npm run dev` isn't needed for new photos, but the app caches images: pull down to refresh.
