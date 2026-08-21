// Mock Amazon store for image-pipeline reproduction.
// Mimics m.media-amazon.com CDN variant semantics:
//   /images/I/{id}.jpg             -> original (1600x1200)
//   /images/I/{id}._SL{n}_.jpg     -> scaled to n px (404 if n exceeds available original size)
//   /images/I/{id}._AC_SL{n}_.jpg  -> same
//   /images/I/{id}._AC_UL{n}_.jpg  -> upscaled to n px
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMGS = path.join(__dirname, 'images');
const PORT = Number(process.env.AMAZON_MOCK_PORT || 8797);

// mock CDN image ids -> pregenerated files. index = image number 1..10
const ids = [];
for (let i = 1; i <= 10; i++) ids.push(`71cargo${String(i).padStart(2, '0')}`);
const num = (id) => Number(id.slice(-2));

// 71cargo10 only exists up to 500px on the "CDN" (small original upload)
const MAX_AVAIL = { 10: 500 };

// variant -> pregenerated size files
const SIZES = { 1500: 'v1500', 500: 'v500', 320: 'v320', 160: 'v160' };

function serveImage(res, id, variant) {
  const n = num(id);
  if (!n) { res.writeHead(404); res.end('no image'); return; }
  const maxAvail = MAX_AVAIL[n] || 1600;
  if (!variant) {
    const buf = fs.readFileSync(path.join(IMGS, `base-${n}.jpg`));
    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    res.end(buf);
    return;
  }
  const m = variant.match(/^_?(?:AC_)?([A-Z]+\d+)_?$/);
  if (!m) { res.writeHead(404); res.end('bad variant'); return; }
  const token = m[1];
  const isUpscale = token.startsWith('UL') || token.startsWith('U');
  const size = Number(token.match(/(\d+)$/)[1]);
  if (!SIZES[size]) { res.writeHead(404); res.end(`variant ${size} not available`); return; }
  if (!isUpscale && size > maxAvail) { res.writeHead(404); res.end('variant larger than available original'); return; }
  const file = `${SIZES[size]}-${n}.jpg`;
  if (!fs.existsSync(path.join(IMGS, file))) { res.writeHead(404); res.end('missing'); return; }
  const buf = fs.readFileSync(path.join(IMGS, file));
  res.writeHead(200, { 'Content-Type': 'image/jpeg' });
  res.end(buf);
}

function page() {
  const img = (i) => `71cargo${String(i).padStart(2, '0')}`;
  // Realistic Amazon markup mix:
  //  - img1 (landing): data-old-hires = _SL1500_ (regional Amazon style)
  //  - img2, img3:     data-old-hires = _SL1500_
  //  - img4:           data-old-hires = _SL500_  (small old-hires)
  //  - img5..img10:    data-old-hires = bare original
  //  - og:image        = _SL1500_ of img1
  //  - JSON-LD images  = _AC_SL1500_ of img1..img3
  const oldHires = (i) => {
    const id = img(i);
    if (i === 1 || i === 2 || i === 3) return `https://mock-amazon.local/images/I/${id}._SL1500_.jpg`;
    if (i === 4) return `https://mock-amazon.local/images/I/${id}._SL500_.jpg`;
    return `https://mock-amazon.local/images/I/${id}.jpg`;
  };
  const src = (i) => `https://mock-amazon.local/images/I/${img(i)}._AC_UL320_.jpg`;

  const altItems = [];
  for (let i = 2; i <= 10; i++) {
    altItems.push(`
      <li class="a-spacing-small alt-image">
        <a href="#" class="a-link-normal imgBlock">
          <img class="a-dynamic-image"
               src="${src(i)}"
               data-old-hires="${oldHires(i)}"
               data-a-dynamic-image="/images/I/${img(i)}._SL75_.jpg,75x75;./images/I/${img(i)}._SL350_.jpg,350x350"
               alt="cargo pants ${i}" />
        </a>
      </li>`);
  }

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Men's Cargo Pants - Mock Amazon</title>
<meta property="og:type" content="product">
<meta property="og:title" content="UrbanTrek Men's Cargo Pants - 6 Pocket, Lightweight, Breathable">
<meta property="og:image" content="https://mock-amazon.local/images/I/${img(1)}._SL1500_.jpg">
<meta property="product:brand" content="UrbanTrek">
<meta property="product:category" content="Clothing, Shoes & Jewelry: Mens: Clothing: Pants">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product",
 "name":"UrbanTrek Men's Cargo Pants - 6 Pocket, Lightweight, Breathable",
 "image":["https://mock-amazon.local/images/I/${img(1)}._AC_SL1500_.jpg","https://mock-amazon.local/images/I/${img(2)}._AC_SL1500_.jpg","https://mock-amazon.local/images/I/${img(3)}._AC_SL1500_.jpg"],
 "brand":{"@type":"Brand","name":"UrbanTrek"},
 "sku":"UT-CARGO-100",
 "offers":{"@type":"Offer","price":"24.99","priceCurrency":"USD","availability":"https://schema.org/InStock"}}
</script>
</head>
<body>
<div id="ppd">
  <span id="productTitle">UrbanTrek Men's Cargo Pants - 6 Pocket, Lightweight, Breathable, Stretch Fit, Olive</span>
  <span id="bylineInfo">Visit the UrbanTrek Store</span>
  <div id="corePriceDisplay_desktop_feature_div"><span class="a-offscreen">$24.99</span></div>
  <div id="corePrice_feature_div"><span class="a-text-price"><span class="a-offscreen">$39.99</span></span></div>
  <div id="availability"><span class="a-size-medium a-color-success a-text-bold">In Stock</span></div>
  <input type="hidden" name="ASIN" value="B0CARGO123">
  <div id="imageBlock">
    <img id="landingImage"
         src="${src(1)}"
         data-old-hires="${oldHires(1)}"
         data-a-dynamic-image="/images/I/${img(1)}._SL75_.jpg,75x75;./images/I/${img(1)}._SL350_.jpg,350x350"
         alt="cargo pants 1">
    <ul id="altImages" class="a-unordered-list">
      ${altItems.join('\n')}
    </ul>
  </div>
  <div id="productDescription"><p>Lightweight cargo pants with six pockets, stretch fabric and a relaxed fit. Great for travel and everyday wear.</p></div>
  <ul id="feature-bullets"><li><span class="a-list-item">SIX POCKETS: Roomy cargo pockets with flap closure</span></li><li><span class="a-list-item">BREATHABLE: Lightweight quick-dry fabric</span></li><li><span class="a-list-item">STRETCH FIT: Four-way stretch for all-day comfort</span></li></ul>
  <span id="sellerProfileTriggerId">UrbanTrek Official</span>
</div>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const m = url.pathname.match(/^\/images\/I\/([A-Za-z0-9]+)(?:\.(_[A-Z0-9_]+))?\.jpe?g$/i);
  if (m) {
    serveImage(res, m[1], m[2]);
    return;
  }
  if (url.pathname === '/dp/B0CARGO123') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(page());
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`mock amazon listening on http://127.0.0.1:${PORT}`);
});
