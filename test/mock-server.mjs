import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, 'fixtures');
const PORT = Number(process.env.MOCK_PORT || 8799);

const PRODUCT_JSON = {
  title: 'CloudPuff Ultra Soft Blanket',
  body_html: '<p>Ultra soft microfibre throw blanket, machine washable and lightweight.</p>',
  vendor: 'CloudPuff',
  product_type: 'Home & Living',
  handle: 'cloudpuff-blanket',
  tags: ['cozy', 'microfibre', 'bedding'],
  available: true,
  images: [
    { src: '//cdn.shopify.example/products/cloudpuff-1.jpg' },
    { src: '//cdn.shopify.example/products/cloudpuff-2.jpg' }
  ],
  variants: [
    { title: 'S', sku: 'CP-BL-S', price: '39.99', compare_at_price: '49.99', available: true },
    { title: 'M', sku: 'CP-BL-M', price: '49.99', compare_at_price: '59.99', available: true },
    { title: 'L', sku: 'CP-BL-L', price: '59.99', compare_at_price: null, available: false }
  ]
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/products/cloudpuff-blanket.js') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(PRODUCT_JSON));
    return;
  }
  const file = path.join(FIXTURES, url.pathname === '/' ? 'generic.html' : path.basename(url.pathname));
  if (!fs.existsSync(file)) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(fs.readFileSync(file));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`mock store listening on http://127.0.0.1:${PORT}`);
});
