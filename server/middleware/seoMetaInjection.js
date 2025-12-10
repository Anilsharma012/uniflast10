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
    const metaTags = createMetaTagsHtml(seoData);

    // Find the closing </head> tag and insert meta tags before it
    const headClosingTag = '</head>';
    const headClosingIndex = html.indexOf(headClosingTag);
    
    if (headClosingIndex !== -1) {
      return (
        html.slice(0, headClosingIndex) +
        metaTags +
        html.slice(headClosingIndex)
      );
    }
    
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
