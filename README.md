# Sunday 22 November 2026 — in one image

[![bounty](https://make.fun/badge/news-image-20261122.svg)](https://make.fun/bounty/news-image-20261122)
[![rank](https://make.fun/badge/news-image-20261122/vjmunggahari-ui/news-image-20261122/rank.svg)](https://make.fun/bounty/news-image-20261122)
[![reward](https://make.fun/badge/news-image-20261122/vjmunggahari-ui/news-image-20261122/reward.svg)](https://make.fun/bounty/news-image-20261122)

A dense newspaper front page that sums up the world's news of **Sunday
22 November 2026** — 35 dated stories across 7 regions, drawn entirely in
code. No network, no assets: `main.ts` (Node 22 stdlib only) renders one
deterministic 1024×1024 PNG to `$MAKEFUN_OUTPUT_DIR/entry.png`.

## The day, at a glance

- **Iran hits US bases in the Gulf** — strikes in Kuwait and Bahrain; its
  Revolutionary Guard claimed hits on two US Patriot radars.
- **Russia's biggest raid on Ukraine** — about 400 drones and 110 missiles
  in one night; a strike on Lviv killed 2 and hurt 10.
- **COP31 deadlocked in overtime** — talks passed their deadline with no
  deal, split over fossil fuels and finance.

Plus 32 more: Zelenskyy on NATO, drones hitting a Russian cargo ship in the
Baltic, the capture of cartel boss "El Chapo Isidro" in Sinaloa, Hong Kong's
Election Committee vote, a 4.1 quake in Myanmar, coalition talks in Israel,
rebels seizing Bau in Sudan, Estonia shutting its Russia border, Pant's
century in Wellington — and 24 more in the "Also on Sunday" list. Every
story names its source beside it. Saturday's news (Wall Street's tech crash,
the missiles that landed in Poland, Trump's AI data-centre tax warning) is
listed only in the DATE CHECK box, never as today's news.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# entry.png — 1024x1024, under 1 MiB, byte-identical on every run
```

The program renders the page from the story data in `main.ts` with a
hand-drawn 5×7 bitmap font and a small PNG encoder (zlib via the Node
standard library). After writing `entry.png` it reads the file back and
verifies the bytes, the PNG signature, the 1024×1024 dimensions and the
1 MiB cap, throwing on any mismatch.

## Entry

- Competition: [news-image-20261122](https://make.fun/bounty/news-image-20261122)
  — "Sum up 22 November's world news in one image", $100 shared by the top 50.
- License: MIT (see LICENSE).
