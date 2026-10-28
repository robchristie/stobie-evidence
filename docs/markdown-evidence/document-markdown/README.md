# Document Markdown evidence

Raw captures for the "Document Markdown" section of Stobie's
[`docs/markdown-evidence.md`](https://github.com/robchristie/stobie/blob/main/docs/markdown-evidence.md),
increment 7 of its `docs/plans/document-markdown-plan.md`. Every image shows
the Gallery's synthetic `markdown/document` story (field notes on a rock-pool
survey); no real document content is included.

Both runs used Stobie `51c521b0e6e747b1da1b3f66013b70af8e6955f9` with a clean
tree, the same Gallery WASM (SHA-256
`b96aef835b53cdf1d3a62d8ed07aa8b506a2831ef2de3b81dbdb4f2e2f785644`) and
Chromium 151.0.7922.34 on WebGPU (SwiftShader), headful on a private Xvfb in
the repository's UI sandbox, with a 1440 by 900 viewport.

## `smoke/`

The output of Stobie's canonical `tools/markdown-browser-smoke.sh`:
`browser-workflow.json` holds each step's observations and image SHA-256, the
links it opened and the idle proof. The document steps are
`browser-document-dark.png` (the table as a grid), `browser-document-light-high-contrast-150.png`
(the narrow column, stacked), `browser-document-footnote-revealed.png` (after
a physical click on reference `[1]`) and `browser-document-narrow-maths.png`.

## `capture/`

`capture.mjs`, run through `capture.sh` (both copied into a Stobie checkout's
`.tools/runtime/document-markdown-evidence/` after `cargo xtask verify` built
the Gallery), presents the story and writes `capture.json`: for each image
its configuration, SHA-256, the text in view and the heading, task, link and
section nodes; and the task-box measurements. Scrolling and the footnote
click are physical Playwright input; hooks only choose the story and
appearance and read observations.

- `document-{narrow,wide}-{dark,light-high-contrast-150,dark-high-contrast-150}-opening.png`:
  the top of the document at phone (narrow, 320 points) and desktop (wide,
  960 points) widths, at 100% text in the dark theme and at 150% text in
  both high-contrast themes.
- `…-table.png` and `…-table-end.png`: the seven-column counts table, a grid
  at desktop width and stacked as records at phone width, with the Counts
  heading at the top of the view. At desktop width and 100% the opening
  already shows the whole table, so there is no separate table image.
- `document-narrow-…-footnote-revealed.png`: the phone column after a click
  on reference `[1]` scrolled the footnote definitions into view.
- `task-box-{dark,light}-{standard,high}-{1x,2x}.png`: the opening at desktop
  width and 100% in each theme at device scale 1 and 2. `capture.json`
  records the open task box's pixel bounds, the surface colour at its centre
  and, for each side, the stroke pixel along the middle half of that side
  that differs most from the surface, with its WCAG contrast ratio.

| Theme | Scale | Surface | Outline | Least ratio |
| --- | --- | --- | --- | --- |
| dark standard | 1x | `#13181d` | `#9daab3` | 7.51:1 |
| dark high | 1x | `#090d0f` | `#d5dde2` | 14.19:1 |
| light standard | 1x | `#ffffff` | `#53616a` | 6.39:1 |
| light high | 1x | `#ffffff` | `#303b42` | 11.48:1 |
| dark standard | 2x | `#13181d` | `#9daab3` | 7.51:1 |
| dark high | 2x | `#090d0f` | `#d5dde2` | 14.19:1 |
| light standard | 2x | `#ffffff` | `#53616a` | 6.39:1 |
| light high | 2x | `#ffffff` | `#303b42` | 11.48:1 |

The painted colours are exactly the themes' panel and muted text tokens.
