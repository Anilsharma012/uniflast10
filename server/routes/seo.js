const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const { generateProductSeoTags, createMetaTagsHtml } = require('../utils/seoGenerator');

// Read the base HTML template once and cache it
let baseHtmlTemplate = null;
const getBaseHtml = () => {
  if (!baseHtmlTemplate) {
    try {
      const htmlPath = path.join(__dirname, '../../index.html');
      baseHtmlTemplate = fs.readFileSync(htmlPath, 'utf-8');
    } catch (error) {
      console.error('Error reading index.html:', error);
      return null;
    }
  }
  return baseHtmlTemplate;
};

/**
 * GET /seo/product/:slugOrId
 * Returns HTML with SEO meta tags injected for a specific product
 * This endpoint is used by search engine bots and social media crawlers
 */
router.get('/product/:slugOrId', async (req, res) => {
  try {
    const { slugOrId } = req.params;
    
    // Find product by slug or ID
    let product;
    try {
      product = await Product.findOne({
        $or: [
          { slug: slugOrId },
          { _id: slugOrId },
        ]
      }).lean();
    } catch (error) {
      // Invalid ID format, continue
      product = null;
    }

    // Generate SEO tags based on product data
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const seoData = generateProductSeoTags(product, baseUrl);
    const metaTagsHtml = createMetaTagsHtml(seoData);

    // Get base HTML
    let html = getBaseHtml();
    if (!html) {
      return res.status(500).send('Server error');
    }

    // Replace the default meta tags in the head with SEO-optimized ones
    // Find the closing </head> tag and inject our meta tags before it
    const headCloseIndex = html.indexOf('</head>');
    if (headCloseIndex !== -1) {
      // Remove the default title and OG tags to avoid duplication
      html = html.replace(/<title>.*?<\/title>/s, '');
      html = html.replace(/<meta\s+property="og:(title|description|image|url)"[^>]*>/g, '');
      html = html.replace(/<meta\s+name="(description|keywords|twitter:)"[^>]*>/g, '');
      html = html.replace(/<link\s+rel="canonical"[^>]*>/g, '');
      
      // Insert SEO tags before </head>
      html = html.substring(0, headCloseIndex) + metaTagsHtml + html.substring(headCloseIndex);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('SEO route error:', error);
    res.status(500).send('Server error');
  }
});

module.exports = router;
