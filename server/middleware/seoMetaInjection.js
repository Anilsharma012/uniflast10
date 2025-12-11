/**
 * Server-side SEO Meta Tag Injection Middleware
 * Intercepts requests and injects product-specific meta tags into HTML
 * for search engine crawlers and social media preview tools
 */

const fs = require('fs');
const path = require('path');
const { generateProductSeoTags, createMetaTagsHtml } = require('../utils/seoGenerator');
const Product = require('../models/Product');

let cachedIndexHtml = null;

const getIndexHtml = () => {
  if (cachedIndexHtml) return cachedIndexHtml;
  
  const indexPath = path.join(__dirname, '../../index.html');
  try {
    cachedIndexHtml = fs.readFileSync(indexPath, 'utf-8');
    return cachedIndexHtml;
  } catch (err) {
    console.error('Failed to read index.html:', err);
    return null;
  }
};

const extractProductSlug = (pathname) => {
  const match = pathname.match(/^\/products\/([^/?]+)/);
  return match ? match[1] : null;
};

const createDefaultSeoTags = (pathname) => {
  const seoData = generateProductSeoTags(null);
  return createMetaTagsHtml(seoData);
};

const injectMetaTags = async (html, pathname, baseUrl = 'https://uni10.in') => {
  const slug = extractProductSlug(pathname);

  if (!slug) {
    return html;
  }

  try {
    // Try to fetch by slug first, then by ID
    let product = await Product.findOne({ slug });

    if (!product) {
      product = await Product.findById(slug);
    }

    if (!product) {
      return html;
    }

    // Generate SEO tags
    const seoData = generateProductSeoTags(product, baseUrl);

    const sanitize = (str) => {
      if (!str) return '';
      return str.replace(/"/g, '&quot;');
    };

    // 1. Replace the title tag
    html = html.replace(
      /<title>[^<]*<\/title>/,
      `<title>${sanitize(seoData.title)}</title>`
    );

    // 2. Replace the meta description tag
    html = html.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${sanitize(seoData.description)}" />`
    );

    // 3. Replace og:title
    html = html.replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${sanitize(seoData.ogTitle)}" />`
    );

    // 4. Replace og:description
    html = html.replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${sanitize(seoData.ogDescription)}" />`
    );

    // 5. Replace og:url
    html = html.replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:url" content="${sanitize(seoData.ogUrl)}" />`
    );

    // 6. Replace og:image
    html = html.replace(
      /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:image" content="${sanitize(seoData.ogImage)}" />`
    );

    // 7. Replace og:type
    html = html.replace(
      /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:type" content="product" />`
    );

    // 8. Replace keywords
    html = html.replace(
      /<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="keywords" content="${sanitize(seoData.keywords)}" />`
    );

    // 9. Replace twitter:title
    html = html.replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:title" content="${sanitize(seoData.ogTitle)}" />`
    );

    // 10. Replace twitter:description
    html = html.replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:description" content="${sanitize(seoData.ogDescription)}" />`
    );

    // 11. Replace twitter:image
    html = html.replace(
      /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:image" content="${sanitize(seoData.ogImage)}" />`
    );

    // 12. Replace canonical link
    html = html.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${sanitize(seoData.canonicalUrl)}" />`
    );

    return html;
  } catch (err) {
    console.error('Error injecting SEO meta tags:', err);
    return html;
  }
};

const seoMetaInjectionMiddleware = async (req, res, next) => {
  // Only apply to frontend routes (not API routes)
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }

  // For non-API requests, get index.html and inject meta tags
  let html = getIndexHtml();
  
  if (!html) {
    return res.status(500).send('Internal Server Error');
  }

  try {
    const baseUrl = req.protocol + '://' + req.get('host');
    html = await injectMetaTags(html, req.path, baseUrl);
    
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    return res.send(html);
  } catch (err) {
    console.error('Error in SEO meta injection middleware:', err);
    return res.status(500).send('Internal Server Error');
  }
};

module.exports = {
  seoMetaInjectionMiddleware,
  injectMetaTags,
};
