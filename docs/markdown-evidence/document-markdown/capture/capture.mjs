// Evidence capture for Stobie's document Markdown (document-markdown-plan.md,
// increment 7). Run from a Stobie checkout whose Gallery web package is built,
// through capture.sh (Xvfb and the UI sandbox, as the Markdown smoke runs):
//
//   bash .tools/runtime/document-markdown-evidence/capture.sh
//
// It presents the Gallery's synthetic `markdown/document` story at phone
// (narrow, 320 points) and desktop (wide, 960 points) widths, at 100% and
// 150% text, in standard and high contrast, captures the opening (tasks),
// the counts table and a footnote reference revealing its definition, and
// measures the open task box's painted outline against the surface inside it
// from the captured pixels in all four themes at 1x and 2x device scale.
// Hooks only choose stories and appearance and read observations; scrolling
// and the footnote click are physical Playwright input.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { chromium } from 'playwright';
import { assertBrowserRenderer, hostedLinuxWebGpuLaunchOptions, rendererUrl } from '../../../tools/browser-launch.mjs';

const root = resolve('apps/stobie-gallery/web');
const evidence = resolve(process.env.STOBIE_EVIDENCE_DIR ?? '.tools/runtime/document-markdown-evidence/out');
const assets = new Map([
  ['index.html', 'text/html'], ['styles.css', 'text/css'], ['bootstrap.js', 'text/javascript'],
  ['browser-startup.js', 'text/javascript'], ['pkg/stobie_gallery.js', 'text/javascript'],
  ['pkg/stobie_gallery_bg.wasm', 'application/wasm'],
]);
const server = createServer(async (request, response) => {
  const name = new URL(request.url, 'http://local').pathname.slice(1) || 'index.html';
  try {
    assert(assets.has(name), 'allowlisted Gallery asset');
    response.writeHead(200, { 'Content-Type': assets.get(name), 'Cache-Control': 'no-store' });
    response.end(await readFile(resolve(root, name)));
  } catch { response.writeHead(404); response.end(); }
});

/** Decode an 8-bit, non-interlaced RGB or RGBA PNG, as Chromium writes them. */
function decodePng(bytes) {
  let offset = 8, width, height, channels;
  const data = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('latin1', offset + 4, offset + 8);
    const body = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0); height = body.readUInt32BE(4);
      assert.equal(body[8], 8, '8-bit PNG'); assert.equal(body[12], 0, 'not interlaced');
      channels = { 2: 3, 6: 4 }[body[9]];
      assert(channels, `RGB or RGBA PNG, not colour type ${body[9]}`);
    } else if (type === 'IDAT') data.push(body);
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? out[y * stride + x - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const predictor = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter];
      out[y * stride + x] = (line[x] + predictor) & 0xff;
    }
  }
  return { width, height, pixel: (x, y) => { const i = y * stride + x * channels; return [out[i], out[i + 1], out[i + 2]]; } };
}
const linear = v => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
const contrast = (x, y) => { const [a, b] = [luminance(x), luminance(y)].sort((p, q) => q - p); return (a + 0.05) / (b + 0.05); };
const hex = rgb => `#${rgb.map(v => v.toString(16).padStart(2, '0')).join('')}`;

await mkdir(evidence, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), 'stobie-document-evidence-'));
const captures = [], measurements = [], errors = [];
let context, page, browser, url;
const snapshot = async () => page.evaluate(() => window.__STOBIE_GALLERY_HANDLE.snapshot());
const configuration = (overrides = {}) => ({ appearance: 'dark', contrast: 'standard', density: 'comfortable', font_scale: 1, width: 'wide', ...overrides });
async function story(config) {
  const before = await snapshot();
  await page.evaluate(config => {
    window.__STOBIE_GALLERY_HANDLE.set_configuration(config);
    window.__STOBIE_GALLERY_HANDLE.select_story('markdown/document');
  }, config);
  await page.waitForFunction(({ config, frame }) => {
    const s = window.__STOBIE_GALLERY_HANDLE.snapshot();
    return s.frame > frame && s.story === 'markdown/document' && Object.entries(config).every(([key, value]) => s.configuration[key] === value);
  }, { config, frame: before.frame });
  await page.waitForTimeout(300);
  // The Gallery keeps a story's scroll position; start each view at the top.
  await scrollUntil(s => inView(text(s, 'Rock-pool survey')), 'the top', -400);
}
function toPage(s, rect, canvas) {
  const rootRect = s.ui_snapshot.nodes.find(n => n.id === s.ui_snapshot.root).rect;
  const sx = canvas.width / (rootRect.max_x - rootRect.min_x), sy = canvas.height / (rootRect.max_y - rootRect.min_y);
  return { left: canvas.x + (rect.min_x - rootRect.min_x) * sx, right: canvas.x + (rect.max_x - rootRect.min_x) * sx, top: canvas.y + (rect.min_y - rootRect.min_y) * sy, bottom: canvas.y + (rect.max_y - rootRect.min_y) * sy };
}
async function capture(name, configured, note) {
  const bytes = await page.screenshot({ path: join(evidence, `${name}.png`) });
  const s = await snapshot();
  assert.deepEqual(s.text_audit, [], `${name}: measured text`);
  assert.deepEqual(s.ui_snapshot.semantic_audit, [], `${name}: semantics`);
  const lines = s.text.filter(t => t.allocated_rect.max_y > t.clip_rect.min_y && t.allocated_rect.min_y < t.clip_rect.max_y).map(t => t.content?.text).filter(Boolean);
  captures.push({ name, image: `${name}.png`, sha256: createHash('sha256').update(bytes).digest('hex'), configuration: configured, note, frame: s.frame, visible_text: lines, nodes: s.ui_snapshot.nodes.filter(n => ['heading', 'checkbox', 'link', 'section'].includes(n.role)).map(n => ({ id: n.id, role: n.role, name: n.name, checked: n.checked, enabled: n.enabled })) });
  return s;
}
const text = (s, wanted) => s.text.find(t => t.content?.text === wanted);
const inView = t => t && t.allocated_rect.min_y >= t.clip_rect.min_y && t.allocated_rect.max_y <= t.clip_rect.max_y;
/** Wheel the document until `done(snapshot)` holds. */
async function scrollUntil(done, label, delta = 120, untilEnd = false) {
  let s = await snapshot();
  let last = null;
  const canvas = await page.locator('canvas').boundingBox();
  const body = s.text.find(t => t.component_id.kind === 'reading_text' && inView(t));
  const over = toPage(s, body.allocated_rect, canvas);
  for (let turn = 0; turn < 60 && !done(s); turn += 1) {
    // Optionally stop where the document can scroll no further.
    const position = JSON.stringify(s.text.filter(inView).map(t => [t.content?.text, t.allocated_rect.min_y]));
    if (untilEnd && position === last) break;
    last = position;
    await page.mouse.move((over.left + over.right) / 2, (over.top + over.bottom) / 2);
    await page.mouse.wheel(0, delta);
    await page.waitForFunction(frame => window.__STOBIE_GALLERY_HANDLE.snapshot().frame > frame, s.frame);
    await page.waitForTimeout(250);
    s = await snapshot();
  }
  assert(untilEnd || done(s), `scrolled to ${label}`);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(250);
  return s;
}

const SETTINGS = [
  ['dark', configuration()],
  ['light-high-contrast-150', configuration({ appearance: 'light', contrast: 'high', font_scale: 1.5 })],
  ['dark-high-contrast-150', configuration({ contrast: 'high', font_scale: 1.5 })],
];
try {
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  url = `http://127.0.0.1:${server.address().port}/`;
  for (const scale of [1, 2]) {
    context = await chromium.launchPersistentContext(profile, {
      ...hostedLinuxWebGpuLaunchOptions(), viewport: { width: 1440, height: 900 }, deviceScaleFactor: scale,
      executablePath: process.env.STOBIE_CHROMIUM,
      env: { ...process.env, LD_LIBRARY_PATH: process.env.STOBIE_USE_SYSTEM_UI_LIBS === '1' ? process.env.LD_LIBRARY_PATH ?? '' : `${resolve('.tools/sysroot/usr/lib')}:${process.env.LD_LIBRARY_PATH ?? ''}` },
    });
    await context.route(target => !target.href.startsWith(url), route => route.abort());
    browser = context.browser(); page = await context.newPage();
    page.on('pageerror', error => errors.push(String(error)));
    const response = await page.goto(rendererUrl(url), { waitUntil: 'domcontentloaded' });
    assert(response?.ok(), `Gallery HTTP status ${response?.status()}`);
    await page.waitForFunction(() => document.body.classList.contains('ready') && window.__STOBIE_GALLERY_HANDLE?.snapshot().frame > 0);
    await assertBrowserRenderer(page);

    if (scale === 1) {
      // The document at each width and setting: its opening, its table and,
      // in the phone column, a footnote reference revealing its definition.
      for (const width of ['narrow', 'wide']) {
        for (const [label, base] of SETTINGS) {
          const config = { ...base, width };
          const name = `document-${width}-${label}`;
          await story(config);
          await capture(`${name}-opening`, config, 'top of the document: heading, tasks');
          const grid = width === 'wide';
          // The Counts heading at the top of the view, or as near as the
          // document scrolls.
          await scrollUntil(s => {
            const h = text(s, 'Counts');
            const top = Math.min(...s.text.filter(inView).map(t => t.allocated_rect.min_y));
            return inView(h) && h.allocated_rect.min_y <= top + 1;
          }, 'the Counts heading', 60, true);
          const table = await capture(`${name}-table`, config, grid ? 'the counts table as a grid' : 'the counts table stacked as records');
          assert(grid ? inView(text(table, 'Anemones')) : inView(text(table, 'Pool: A')), `${name}: the table is ${grid ? 'a grid' : 'stacked'} and in view`);
          const [opening, scrolled] = captures.slice(-2);
          if (opening.sha256 === scrolled.sha256) {
            captures.pop();
            await rm(join(evidence, scrolled.image));
            opening.note += '; the whole table is in view without scrolling';
          }
          if (!grid && !inView(text(table, 'Notes: New this season'))) {
            await scrollUntil(s => inView(text(s, 'Notes: New this season')), 'the last record');
            await capture(`${name}-table-end`, config, 'the end of the stacked table');
          }
          if (!grid) {
            // Back to the top, then follow the first reference to its note.
            let s = await scrollUntil(s => s.ui_snapshot.nodes.some(n => n.role === 'link' && n.name === '[1]'), 'the first reference', -120);
            const reference = s.ui_snapshot.nodes.find(n => n.role === 'link' && n.name === '[1]');
            assert(reference, `${name}: the first reference is in view`);
            assert(!s.ui_snapshot.nodes.some(n => n.id === 'gallery.document.footnote-tides'), `${name}: its definition starts out of view`);
            const at = toPage(s, reference.rect, await page.locator('canvas').boundingBox());
            await page.mouse.click((at.left + at.right) / 2, (at.top + at.bottom) / 2);
            await page.waitForFunction(id => window.__STOBIE_GALLERY_HANDLE.snapshot().ui_snapshot.nodes.some(n => n.id === id), 'gallery.document.footnote-tides', { timeout: 5_000 });
            await page.mouse.move(2, 2);
            await page.waitForTimeout(400);
            s = await capture(`${name}-footnote-revealed`, config, 'after clicking reference [1]: its definition scrolled into view');
            assert.equal(s.story, 'markdown/document');
          }
        }
      }
    }

    // The open task box's outline against the surface inside it, from the
    // captured pixels, in every theme.
    for (const [appearance, contrastPreference] of [['dark', 'standard'], ['dark', 'high'], ['light', 'standard'], ['light', 'high']]) {
      const config = configuration({ appearance, contrast: contrastPreference });
      await story(config);
      const s = await snapshot();
      const box = s.ui_snapshot.nodes.find(n => n.role === 'checkbox' && n.checked === false && n.name === 'Count the anemones in pool C');
      assert(box, 'the open task box is in view');
      const name = `task-box-${appearance}-${contrastPreference}-${scale}x`;
      const bytes = await page.screenshot({ path: join(evidence, `${name}.png`) });
      const image = decodePng(bytes);
      const r = toPage(s, box.rect, await page.locator('canvas').boundingBox());
      const px = { left: Math.round(r.left * scale), right: Math.round(r.right * scale) - 1, top: Math.round(r.top * scale), bottom: Math.round(r.bottom * scale) - 1 };
      const surface = image.pixel(Math.round((px.left + px.right) / 2), Math.round((px.top + px.bottom) / 2));
      // For each side, the pixel along its middle half that differs most from
      // the surface: the stroke where it is painted most fully.
      const sides = {};
      const midY = [Math.round(px.top + (px.bottom - px.top) / 4), Math.round(px.bottom - (px.bottom - px.top) / 4)];
      const midX = [Math.round(px.left + (px.right - px.left) / 4), Math.round(px.right - (px.right - px.left) / 4)];
      const strongest = points => points.map(([x, y]) => image.pixel(x, y)).reduce((best, rgb) => (contrast(rgb, surface) > contrast(best, surface) ? rgb : best));
      const band = (from, to, at) => Array.from({ length: to - from + 1 }, (_, i) => at(from + i));
      const depth = Math.max(2, scale * 2);
      sides.left = strongest(band(midY[0], midY[1], y => band(px.left, px.left + depth, x => [x, y])).flat());
      sides.right = strongest(band(midY[0], midY[1], y => band(px.right - depth, px.right, x => [x, y])).flat());
      sides.top = strongest(band(midX[0], midX[1], x => band(px.top, px.top + depth, y => [x, y])).flat());
      sides.bottom = strongest(band(midX[0], midX[1], x => band(px.bottom - depth, px.bottom, y => [x, y])).flat());
      const ratios = Object.fromEntries(Object.entries(sides).map(([side, rgb]) => [side, { colour: hex(rgb), ratio: Number(contrast(rgb, surface).toFixed(2)) }]));
      const least = Math.min(...Object.values(ratios).map(v => v.ratio));
      measurements.push({ name, image: `${name}.png`, sha256: createHash('sha256').update(bytes).digest('hex'), device_scale: scale, appearance, contrast: contrastPreference, box_points: box.rect, box_pixels: px, surface: hex(surface), sides: ratios, least_ratio: least });
      assert(least >= 3, `${name}: the outline keeps 3:1 (${least})`);
    }
    await context.close(); context = undefined;
  }
  assert.deepEqual(errors, []);
  const report = { source_revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), dirty: execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim() !== '', wasm_sha256: createHash('sha256').update(await readFile(join(root, 'pkg/stobie_gallery_bg.wasm'))).digest('hex'), browser: browser.version(), viewport: '1440x900', captures, task_box_contrast: measurements, input_route: 'Physical Playwright wheel and mouse; hooks only choose the story and appearance and read observations', errors };
  await writeFile(join(evidence, 'capture.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Captured ${captures.length} document views and ${measurements.length} task-box measurements; least outline ratio ${Math.min(...measurements.map(m => m.least_ratio))}`);
} catch (error) {
  await writeFile(join(evidence, 'capture-failure.json'), JSON.stringify({ error: String(error), stack: error.stack, captures, measurements }, null, 2));
  await page?.screenshot({ path: join(evidence, 'capture-failure.png') }).catch(() => {});
  throw error;
} finally {
  await context?.close();
  if (server.listening) await new Promise(done => server.close(done));
}
