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

    // Replace existing meta tags instead of appending
    // This ensures the product-specific tags take precedence

    // 1. Replace the title tag
    html = html.replace(
      /<title>[^<]*<\/title>/,
      `<title>${seoData.title.replace(/"/g, '&quot;')}</title>`
    );

    // 2. Replace the meta description tag
    html = html.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${seoData.description.replace(/"/g, '&quot;')}" />`
    );

    // 3. Add/replace og:title
    if (html.includes('property="og:title"')) {
      html = html.replace(
        /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:title" content="${seoData.ogTitle.replace(/"/g, '&quot;')}" />`
      );
    }

    // 4. Add/replace og:description
    if (html.includes('property="og:description"')) {
      html = html.replace(
        /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:description" content="${seoData.ogDescription.replace(/"/g, '&quot;')}" />`
      );
    }

    // 5. Add/replace keywords meta tag
    if (seoData.keywords) {
      if (html.includes('name="keywords"')) {
        html = html.replace(
          /<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/i,
          `<meta name="keywords" content="${seoData.keywords.replace(/"/g, '&quot;')}" />`
        );
      } else {
        const headClosingIndex = html.indexOf('</head>');
        if (headClosingIndex !== -1) {
          html = html.slice(0, headClosingIndex) +
            `    <meta name="keywords" content="${seoData.keywords.replace(/"/g, '&quot;')}" />\n` +
            html.slice(headClosingIndex);
        }
      }
    }

    // 6. Add/replace twitter:title
    if (html.includes('name="twitter:title"')) {
      html = html.replace(
        /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="twitter:title" content="${seoData.ogTitle.replace(/"/g, '&quot;')}" />`
      );
    }

    // 7. Add/replace twitter:description
    if (html.includes('name="twitter:description"')) {
      html = html.replace(
        /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="twitter:description" content="${seoData.ogDescription.replace(/"/g, '&quot;')}" />`
      );
    }

    // 8. Add/replace og:image
    if (html.includes('property="og:image"')) {
      html = html.replace(
        /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:image" content="${seoData.ogImage.replace(/"/g, '&quot;')}" />`
      );
    }

    // 9. Add/replace canonical link
    if (html.includes('rel="canonical"')) {
      html = html.replace(
        /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
        `<link rel="canonical" href="${seoData.canonicalUrl.replace(/"/g, '&quot;')}" />`
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
