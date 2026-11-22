/* site.js — live ASCII rendering from photographs. no libraries. */
(() => {
"use strict";

const RAMP = " .:-=+*#%@";
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

const SRCS = {
  skull: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Human_Skull.jpg/500px-Human_Skull.jpg",
  aristotle: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Aristotle_Altemps_Inv8575.jpg/500px-Aristotle_Altemps_Inv8575.jpg",
  cricket: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/A_flood_light_at_the_D_Y_Patil_Stadium_%285739171528%29.jpg/500px-A_flood_light_at_the_D_Y_Patil_Stadium_%285739171528%29.jpg",
  walk: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/23-365_Into_the_Darkness%2C_Walking_-_Flickr_-_Cliff_Johnson.jpg/500px-23-365_Into_the_Darkness%2C_Walking_-_Flickr_-_Cliff_Johnson.jpg",
  concert: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Festivaloflights_%28260619545%29.jpeg/500px-Festivaloflights_%28260619545%29.jpeg",
};

const images = {};
function load(key) {
  if (images[key]) return images[key].p;
  const img = new Image();
  img.crossOrigin = "anonymous";
  const p = new Promise((res, rej) => {
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = SRCS[key];
  });
  images[key] = { img, p };
  return p;
}

/* per-element character metrics, recomputed when the font changes */
const metricsCache = new WeakMap();
function charMetrics(pre) {
  const cs = getComputedStyle(pre);
  const tag = cs.fontSize + "/" + cs.letterSpacing + "/" + cs.lineHeight;
  const hit = metricsCache.get(pre);
  if (hit && hit.tag === tag) return hit;
  const probe = document.createElement("span");
  probe.textContent = "0".repeat(20);
  probe.style.cssText = "visibility:hidden;white-space:pre";
  pre.appendChild(probe);
  const m = {
    adv: probe.getBoundingClientRect().width / 20,
    lh: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize),
    tag
  };
  pre.removeChild(probe);
  metricsCache.set(pre, m);
  return m;
}

/*
 * render an image into `pre` as ASCII:
 *  - centre-crop to the block's true aspect so tiles are uniform
 *  - percentile-stretch luminance so every image spans the full ramp
 *  - crush near-black to spaces so dark grounds stay quiet
 *  - `gain` drives the hero breathing
 */
function toAscii(img, pre, cols, rows, gain, crop = 0.80, crush = 0.30) {
  const { adv, lh } = charMetrics(pre);
  const ta = (cols * adv) / (rows * lh);          // target aspect in pixels
  const ar = img.naturalWidth / img.naturalHeight;
  let cw, ch;
  if (ar > ta) { ch = img.naturalHeight * crop; cw = ch * ta; }
  else         { cw = img.naturalWidth  * crop; ch = cw / ta; }
  const c = document.createElement("canvas");
  c.width = cols; c.height = rows;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, (img.naturalWidth - cw) / 2, (img.naturalHeight - ch) / 2,
              cw, ch, 0, 0, cols, rows);
  const d = g.getImageData(0, 0, cols, rows).data;

  const hist = new Array(256).fill(0);
  for (let i = 0; i < d.length; i += 4) {
    hist[(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) | 0]++;
  }
  const n = d.length / 4;
  let acc = 0, lo = 0, hi = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= n * 0.08 && lo === 0) lo = v;
    if (acc >= n * 0.96) { hi = v; break; }
  }
  if (hi - lo < 40) { lo = 0; hi = 255; }         // degenerate image guard

  const lines = new Array(rows);
  for (let y = 0; y < rows; y++) {
    let line = "";
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      let l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
      l = ((l - lo) / (hi - lo)) * gain;
      l = Math.min(1, Math.max(0, l));
      l = Math.min(1, Math.max(0, (l - 0.5) * 1.25 + 0.5));   // gentle S-curve
      line += l < crush ? " " : RAMP[1 + (Math.min(l, 0.999) * 9 | 0)];
    }
    lines[y] = line;
  }
  return lines.join("\n");
}

/* fit a column count inside available width, given a row budget */
function fitCols(pre, rows, maxCols) {
  const { adv, lh } = charMetrics(pre);
  const availW = (pre.parentElement.clientWidth || 600) - 8;
  return Math.max(36, Math.min(maxCols, Math.floor(availW / adv),
                               Math.floor(rows * lh * 1.9 / adv)));
}

/* ---------- hero: breathing ascii vanitas ---------- */
const skull = document.getElementById("skull");
const hero = document.querySelector(".hero");
let heroImg = null, phase = 0, heroVisible = true;

function renderHero() {
  if (!heroImg) return;
  const { adv, lh } = charMetrics(skull);
  const ar = heroImg.naturalWidth / heroImg.naturalHeight;
  const rows = Math.max(36, Math.min(60, Math.floor(innerHeight * 0.60 / lh)));
  const cols = Math.min(fitCols(skull, rows, 128), Math.round(rows * (lh / adv) * ar * 1.08));
  skull.textContent = toAscii(heroImg, skull, cols, rows, 1 + 0.12 * Math.sin(phase), 0.86);
}

load("skull").then(img => {
  heroImg = img;
  renderHero();
  hero.classList.add("ready");
  if (reduced) return;
  let last = 0;
  const loop = t => {
    if (heroVisible && t - last > 110) {   // ~9 fps: quiet breathing, cheap
      phase = (t / 1000) * 0.55;
      renderHero();
      last = t;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  new IntersectionObserver(e => heroVisible = e[0].isIntersecting).observe(skull);
}).catch(() => hero.classList.add("ready"));

/* ---------- tiles: uniform blocks, rendered as images arrive ---------- */
function renderTile(pre) {
  const e = images[pre.dataset.src];
  if (!e || !e.img.complete) return;
  const crush = pre.dataset.src === "concert" || pre.dataset.src === "walk" ? 0.16 : 0.26;
  pre.textContent = toAscii(e.img, pre, fitCols(pre, 26, 46), 26, 1.0, 0.78, crush);
}
document.querySelectorAll(".tile .ascii").forEach(pre => {
  load(pre.dataset.src).then(() => renderTile(pre))
    .catch(() => { pre.style.visibility = "hidden"; });
});

/* ---------- resize ---------- */
let rt;
addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => {
  renderHero();
  document.querySelectorAll(".tile .ascii").forEach(renderTile);
}, 250); });

/* ---------- video facade ---------- */
document.querySelector("#video button").addEventListener("click", function () {
  const f = document.createElement("iframe");
  f.src = "https://www.youtube-nocookie.com/embed/rwNFY5EioQE?autoplay=1&rel=0";
  f.title = "TheFatRat — Monody, ASCII art video by Diversity";
  f.allow = "autoplay; encrypted-media; picture-in-picture";
  f.allowFullscreen = true;
  this.replaceWith(f);
});

})();
