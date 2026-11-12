# The house

One generated house is the site's own picture. It opens the home page (dark at night, then lit), stands on the "Build your system" page with the visitor's panels on its roof, and appears on the shop banners, the sign-in pages and the not-found page.

- `public/build/scene/`: the house by day and by night with a loop of clouds for its sky. No panels in these: the Build page draws the chosen number onto the roof (`src/components/home/builder-scene.tsx`).
- `src/assets/home/`: the same house with twelve panels on its roof, for everywhere else: by day, and at night with the lights off and on, both as the house alone and on a wide canvas with sky and dark veld to its left (the home page's opening picture on large screens).

## Where the pictures came from

All three sources were generated with Higgsfield on 11 November 2026, on the owner's account (free plan: one image model and one older video model were available).

| File | Model | Job | What was asked for |
| --- | --- | --- | --- |
| `house.png` (2048 x 1536) | Z Image | `70df79ae-5e64-4a69-96fe-e06514f262f3` | A single-storey South African home seen straight on from a little above, with one large, empty, light-grey metal roof face, at midday |
| `lit.mp4` | Seedance 1.5 Pro, from `house.png` | `0eb7c269-f0b2-4297-83f6-e71ac46e1f52` | The same house from midday to night. It did not get dark, but the lights come on indoors, which is the part we use |
| `clouds.mp4` | Seedance 1.5 Pro, `house.png` as first and last frame | `af8af50e-9c9a-4d7a-b8f4-9b07b2e4792b` | A still camera; only the clouds move. Starting and ending on the same frame makes it loop |

The originals are not in this repository (16 MB); they can be downloaded again from the Higgsfield account by job. It is a computer-generated picture, not one of our installations, and the page says so.

## Rebuilding the files

```
python3 scripts/scene/make_scene.py house.png lit.mp4 clouds.mp4 public/build/scene src/assets/home
```

Needs `numpy`, `opencv-python-headless` and `ffmpeg`. Into the first folder it writes:

- `day.webp`: the house by day.
- `sky-mask.png`: where the sky is, as transparency. The cloud loop is only shown through it, so the roof and trees stay as sharp as the still.
- `clouds.mp4`, `clouds.webm`: the sky of the cloud clip, lined up with the still (the clip is framed 0.7% tighter), colour-matched and slowed three times to a 12 second loop.
- `night-dark.webp`: the still graded to night under a starry sky: the house in a power cut with no battery. The night is graphite, the site's own dark, with no blue in it.
- `night-lit.webp`: the same with the lit windows from `lit.mp4` (one frame, matched onto the still because that clip's camera drifts), their glow, and the light they throw on the path and the lawn.

Into the second folder (when given) it writes `house-day.webp`, `house-night-off.webp` and `house-night-on.webp` (the house with twelve panels drawn on, using the same roof measurements as the page) and `hero-night-off.webp` and `hero-night-on.webp` (the night house low on the right of a wide canvas; the sky and stars are carried on above and to the left, and the ground to the left is drawn: dark veld under a low line of trees).

## The roof

To lay panels on the roof in perspective, `builder-scene.tsx` maps a flat sheet onto the roof face (`ROOF`). It was measured on `house.png`:

- the ridge runs from (738, 562) to (1262, 562), the eave is the line y = 853;
- the roof's seams are parallel on the real roof, so in the picture they meet at one point: (955, -510), found by fitting the seams the line detector picks out;
- the seams through the two ends of the ridge meet the eave at x = 679 and x = 1345. Those four points are the corners of a true rectangle on the roof, and `ROOF` is the perspective map from the unit square onto them.

Panels are then placed in that square's own units (`PANEL`, `ROWS`): rows of 8, 8, 6, 6 and 4 that step in with the hips. They are drawn a little smaller than life so that the builder's largest system (30 panels) fits on the one roof face.

If the house is ever replaced, measure the new picture the same way and update `ROOF`, `PANEL` and `ROWS` in the component, and `ROOF`, `GLASS` and `ENTRY` at the top of `make_scene.py`.
