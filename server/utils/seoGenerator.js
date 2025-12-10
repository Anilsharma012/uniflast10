/**
 * Generate SEO meta tags for product pages
 * Used for server-side rendering of meta tags for search engine crawlers
 */

const generateProductSeoTags = (product, baseUrl = 'https://uni10.in') => {
  if (!product) {
    return {
      title: 'uni10 - Premium Streetwear & Lifestyle',
      description: 'Discover exclusive streetwear and lifestyle products at uni10. Shop premium quality apparel, accessories, and more.',
      keywords: '',
      ogTitle: 'uni10 - Premium Streetwear & Lifestyle',
      ogDescription: 'Discover exclusive streetwear and lifestyle products at uni10',
      ogImage: '/uni10-logo.png',
      ogUrl: baseUrl,
      canonicalUrl: baseUrl,
    };
  }

  const productTitle = product.title || product.name || 'Product';
  const productPrice = Number(product.price || 0);
  const priceStr = productPrice.toLocaleString('en-IN');
  const productSlug = product.slug || '';

  // Use SEO title if available, otherwise use default format
  const seoTitle = product.seo?.title || `${productTitle} - ₹${priceStr} | uni10`;

  // Use SEO description if available, otherwise use product description or highlights
  let seoDescription = product.seo?.description;
  if (!seoDescription) {
    if (product.description) {
      seoDescription = product.description;
    } else if (product.highlights && product.highlights.length > 0) {
      seoDescription = product.highlights.join('. ');
    } else {
      seoDescription = `Shop ${productTitle} at uni10. Premium streetwear and lifestyle products.`;
    }
  }

  // Truncate description to SEO-friendly length (150-160 chars)
  if (seoDescription && seoDescription.length > 160) {
    seoDescription = seoDescription.substring(0, 160) + '...';
  }

  // Use SEO keywords if available
  const seoKeywords = product.seo?.keywords || '';

  // Get image URL (first image or image_url)
  const imageUrl = product.image_url || (product.images && product.images.length > 0 ? product.images[0] : '/uni10-logo.png');
  const absoluteImageUrl = imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;

  // Canonical URL
  const canonicalUrl = `${baseUrl}/products/${productSlug}`;

  return {
    title: seoTitle,
    description: seoDescription,
    keywords: seoKeywords,
    ogTitle: seoTitle,
    ogDescription: seoDescription,
    ogImage: absoluteImageUrl,
    ogUrl: canonicalUrl,
    canonicalUrl: canonicalUrl,
    type: 'product',
  };
};

const createMetaTagsHtml = (seoData) => {
  const sanitize = (str) => {
    if (!str) return '';
    return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  let html = `    <title>${sanitize(seoData.title)}</title>\n`;
  html += `    <meta name="description" content="${sanitize(seoData.description)}" />\n`;
  
  if (seoData.keywords) {
    html += `    <meta name="keywords" content="${sanitize(seoData.keywords)}" />\n`;
  }

  html += `    <meta property="og:title" content="${sanitize(seoData.ogTitle)}" />\n`;
  html += `    <meta property="og:description" content="${sanitize(seoData.ogDescription)}" />\n`;
  html += `    <meta property="og:image" content="${sanitize(seoData.ogImage)}" />\n`;
  html += `    <meta property="og:url" content="${sanitize(seoData.ogUrl)}" />\n`;
  html += `    <meta property="og:type" content="${sanitize(seoData.type || 'website')}" />\n`;
  html += `    <meta name="twitter:card" content="summary_large_image" />\n`;
  html += `    <meta name="twitter:title" content="${sanitize(seoData.ogTitle)}" />\n`;
  html += `    <meta name="twitter:description" content="${sanitize(seoData.ogDescription)}" />\n`;
  html += `    <meta name="twitter:image" content="${sanitize(seoData.ogImage)}" />\n`;
  html += `    <link rel="canonical" href="${sanitize(seoData.canonicalUrl)}" />\n`;

  return html;
};

module.exports = {
  generateProductSeoTags,
  createMetaTagsHtml,
};
