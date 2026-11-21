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

## Sample photos in the demo shops

The demo shops' products currently use free photos from Unsplash (Unsplash License: free for
commercial use, no permission needed). They're linked straight from Unsplash's image server, so
there are no files here for them. They're stand-ins: swap each one for the shop's own photo when
a real shop joins.

| Product | Photo | Photographer |
| --- | --- | --- |
| Tempo Road Trainer | [Runner's foot crossing a white line](https://unsplash.com/photos/nph4VqOgqck) | Taylor Friehl |
| Cushion Daily Trainer | [Shoes in front of a walk sign](https://unsplash.com/photos/Kf7us7SGwIo) | Marsha Reid |
| Trail Hydration Vest 5L | [Man running in the woods](https://unsplash.com/photos/Ot40kMSSo1s) | Olivier Devillers |
| Club Training Tee | [White T-shirt on a hanger](https://unsplash.com/photos/8ACmRoleM24) | Avtar Singh |
| Featherlight Race Singlet | [Runner on a dirt road](https://unsplash.com/photos/dmDJkhPFOXo) | Ulf Meyer |
| GPS Run Watch | [Smart watch close-up](https://unsplash.com/photos/xmslxI6UsiA) | Amanz |
| Compression Socks, 2 pack | [Runner's legs in colourful socks](https://unsplash.com/photos/k53k6gzCllA) | Brett Wharton |
| Reflective Running Cap | [White cap on grey](https://unsplash.com/photos/ozdzzeBu4Go) | personalgraphic.com |

Soft Flask 500 ml has no photo yet: Unsplash had no free photo of a soft flask.
