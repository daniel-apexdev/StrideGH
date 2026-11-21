# Adding a shop

Shops and their products live in `data/stores.seed.json`. The website and the app both read it
(the app also keeps a copy built in, for when it's offline).

## A complete shop (copy, paste, then edit)

```json
{
  "slug": "accra-runners-hub",
  "name": "Accra Runners Hub",
  "demo": false,
  "verification": "pending",
  "description": "Road and trail running shoes, apparel and hydration. Gait check in store.",
  "area": "Airport Residential",
  "address": "12 Example Street, Airport Residential",
  "city": "Accra",
  "region": "Greater Accra",
  "hours": "Mon–Sat · 9:00–18:00",
  "collection": true,
  "delivery": "Within Accra",
  "payments": ["Mobile Money", "Card", "Cash"],
  "phone": "+233 24 123 4567",
  "whatsapp": "+233 24 123 4567",
  "instagram": "@accrarunnershub",
  "website": null,
  "logo": { "src": "/stores/accra-runners-hub/logo.jpg", "width": 400, "height": 400, "alt": "Accra Runners Hub logo" },
  "cover": null,
  "brandColor": "#0E3B2C",
  "products": [
    {
      "slug": "daily-trainer-v3",
      "name": "Daily Trainer v3",
      "category": "Shoes",
      "brand": "Example Brand",
      "priceMinor": 120000,
      "availability": "in_stock",
      "sizes": ["40", "41", "42", "43", "44"],
      "soldOutSizes": ["44"],
      "colours": ["Black", "Blue"],
      "description": "Cushioned everyday trainer for easy runs and long runs.",
      "images": [{ "src": "/stores/accra-runners-hub/daily-trainer-v3.jpg", "width": 1000, "height": 1000, "alt": "Daily Trainer v3 in black, side view" }],
      "updatedAt": "2026-11-19"
    }
  ]
}
```

Add it inside the `"stores": [ … ]` list, with a comma between shops. (The example above uses made-up
details — replace every value with the real shop's.)

## What each field means

| Field | Notes |
| --- | --- |
| `slug` | Lowercase words joined by dashes; also the photo folder name. Must be unique. |
| `demo` | `true` only for the made-up sample shops. Delete the samples once real shops are in. |
| `verification` | `"pending"` until you've confirmed the business is real (visited, video call, or registration papers). Then `"verified"` and set `"verifiedAt": "2026-11-19"`. |
| `phone`, `whatsapp` | With the country code and spaces: `"+233 24 123 4567"`. Use `null` if they don't have one. Without both, no contact buttons show. |
| `priceMinor` | Price in **pesewas**: GHS 1,200 → `120000`, GHS 95.50 → `9550`. `null` shows "Price on request". |
| `availability` | `"in_stock"`, `"low_stock"`, `"out_of_stock"` or `"ask"` (stock not confirmed). |
| `category` | One of `Shoes`, `Apparel`, `Hydration`, `Watches`, `Accessories`, `Nutrition`, `Recovery`. |
| `payments` | Any of `Mobile Money`, `Card`, `Cash`, `Bank transfer`. |
| `updatedAt` | The date the shop last confirmed price and stock. Shown as "checked 19 Nov". |
| `brandColor` | Hex colour for the initials badge when there's no logo. |

Leave out any optional field you don't have (or set it to `null`). If something's wrong — a typo in a
category, a missing comma — `npm run dev` stops with a message naming the field, and `npm test` checks the file too.
