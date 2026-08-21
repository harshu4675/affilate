import { createAdapter, metaProduct, normalizedImages, breadcrumbCategory, specificValues } from './base.js';
import { loadHtml, clean, textOf, firstText, firstPrice, metaMap, jsonLdProducts, jsonLdImages } from '../parser.js';
import { extractAmazonProductId, isAmazonHost, isAmazonShortHost } from '../url.js';

const AMAZON_DOMAINS = [
  'amazon.com',
  'amazon.ca',
  'amazon.co.uk',
  'amazon.de',
  'amazon.fr',
  'amazon.it',
  'amazon.es',
  'amazon.nl',
  'amazon.in',
  'amazon.com.au',
  'amazon.com.br',
  'amazon.com.mx',
  'amazon.ae',
  'amazon.sg',
  'amazon.co.jp',
  'amazon.pl',
  'amazon.se',
  'amazon.com.tr',
  'amazon.eg'
];

export const amazonAdapter = createAdapter({
  id: 'amazon',
  label: 'Amazon',
  match(host) {
    return isAmazonHost(host) || isAmazonShortHost(host) || AMAZON_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  },
  extract({ html, url }) {
    const $ = loadHtml(html);
    const meta = metaMap($);
    const fallback = metaProduct($, meta);
    const title = textOf($, '#productTitle') || fallback.title;
    const price = firstPrice(['.priceToPay span.a-offscreen', '#corePriceDisplay_desktop_feature_div span.a-offscreen', '#priceblock_ourprice', '#priceblock_dealprice', 'span.a-price span.a-offscreen'], $) ?? fallback.price;
    const originalPrice =
      firstPrice(['span.basisPrice span.a-offscreen', '.a-price.a-text-price span.a-offscreen', '#corePrice_feature_div .a-text-price .a-offscreen', '.priceBlockStrikePriceString'], $) ??
      fallback.originalPrice;
    const bylineBrand = firstText(['#bylineInfo', '.po-brand .po-break-word', '#productOverview_feature_div tr:has(th:contains("Brand")) td'], $)
      .replace(/^visit the\s+/i, '')
      .replace(/\s+store$/i, '')
      .trim();
    const brand = fallback.brand || bylineBrand;
    const availability = firstText(['#availability span', '#availability .a-declarative .a-size-medium'], $) || fallback.availability;
    const asin = extractAmazonProductId(url) || clean($('#ASIN').attr('value')) || clean($('input[name="ASIN"]').attr('value'));
    const images = [];
    const addImage = (value) => {
      const src = clean(value);
      if (src && /^https?:/i.test(src) && !/sprite|transparent-pixel|grey-pixel/i.test(src)) images.push(src);
    };
    const collectFromElement = (el) => {
      // Highest-quality source first: `data-old-hires` is the full-size image,
      // `data-a-dynamic-image` holds the responsive set, `src` the small tile.
      addImage($(el).attr('data-old-hires'));
      const dynamic = $(el).attr('data-a-dynamic-image');
      if (dynamic) {
        try {
          Object.keys(JSON.parse(dynamic)).forEach(addImage);
        } catch {
          /* not JSON — ignore */
        }
      }
      addImage($(el).attr('src'));
    };
    // The landing image is the product's primary photo: collect it first so
    // the ordered image list (and therefore the primary image) matches what
    // the storefront shows. `#altImages` holds the remaining thumbnails.
    $('#landingImage, #imgBlkFront, [data-a-image-name="landingImage"]').each((index, el) => collectFromElement(el));
    $('#altImages img').each((index, el) => collectFromElement(el));
    const ldImages = jsonLdImages(jsonLdProducts($)[0] || {});
    const description =
      textOf($, '#productDescription') ||
      textOf($, '#feature-bullets ul') ||
      fallback.description;
    const seller = firstText(['#sellerProfileTriggerId', '#merchantInfoFeature_feature_div .offer-display-feature-text', '.tabular-buybox-text-message'], $) || fallback.seller;
    const features = [];
    $('#feature-bullets li span.a-list-item').each((index, element) => {
      const feature = clean($(element).text());
      if (feature && !/^see more/i.test(feature)) features.push(feature);
    });
    const specifications = specificValues($, '#productDetails_techSpec_section_1, #productDetails_detailBullets_sections1, #technicalSpecifications_section_1');
    return {
      title,
      description,
      brand,
      category: fallback.category || breadcrumbCategory($),
      sku: asin,
      productId: asin,
      price,
      originalPrice,
      currency: fallback.currency,
      availability: availability || fallback.availability,
      seller,
      images: normalizedImages([...images, ...ldImages, ...(fallback.images || [])], 'amazon'),
      variants: [],
      specifications,
      features
    };
  }
});
