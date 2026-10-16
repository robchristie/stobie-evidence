# iOS PWA spike evidence

Raw evidence for Stobie's `docs/ios-pwa-spike-report.md`: a throwaway
chat-client spike (created with `stobie new` at Stobie
`d1b35b385cdc510accbc515a8d00142a58224b48`) installed as a home-screen web
app on an iPhone 12 Pro Max running iOS 26.6.2, from 16 to 17 October 2026.
The spike's source stayed local; the report describes it.

- `device-logs/device-default.jsonl` and `device-cjk.jsonl`: the batches the
  page posted to the spike server from the phone, one JSON object per batch,
  for the default build and the build with a CJK fallback font. Only
  real-device sessions are kept: Safari 26.6.1 home-screen launches, and three
  Chrome for iOS 155 tab sessions (two on the default build, one on the CJK
  build). Field values (`value`) and clipboard text were removed, the client
  address was dropped and the tailnet host name was replaced with
  `TAILNET-HOST`. Per-keystroke `data` and `key` fields and one
  `dom_selection` text are kept as input evidence; they hold only throwaway
  test input. Event types and input types are as recorded.
- `summary.json`: per-session figures derived from those logs (renderer,
  startup milestones and transferred bytes, idle runs, paint timings, focus
  and text event counts), and the production package sizes.
- `precheck/*/results.json` and screenshots: automated checks with an iPhone
  13 profile in Playwright 1.62.1. Chromium 151 on WebGPU and WebGL2
  (SwiftShader, with a real 3x window), the CJK build, the tailnet URL, and
  WebKit 26.5 in the `mcr.microsoft.com/playwright:v1.62.1-noble` container.
- `precheck/cli/transcript.json` and `cli-capture.png`: the `stobie` CLI
  attached to Chromium: observe, discover, open a bot, set the composer's
  text, Send, wait for the reply and capture.

Startup milestone times are navigation-relative milliseconds from
`window.__STOBIE_STARTUP`. Frame windows are 10 s; `paints` counts
`requestAnimationFrame` callbacks that submitted GPU work (WebGPU queue
submits or WebGL draws), and `ticks` counts every callback.
