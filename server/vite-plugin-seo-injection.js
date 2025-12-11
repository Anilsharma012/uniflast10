/**
 * Vite Plugin for Server-Side SEO Meta Tag Injection
 * Injects product-specific meta tags into index.html during dev
 * Requires the backend server to be running on http://localhost:5055
 */

const { generateProductSeoTags, createMetaTagsHtml } = require('./utils/seoGenerator');

const extractProductSlug = (pathname) => {
  const match = pathname.match(/^\/products\/([^/?]+)/);
  return match ? match[1] : null;
};

const seoInjectionVitePlugin = () => {
  return {
    name: 'vite-plugin-seo-injection',
    apply: 'serve',

    async transformIndexHtml(html, ctx) {
      const slug = extractProductSlug(ctx.path);

      if (!slug) {
        return html;
      }

      try {
        // Fetch product from backend using native fetch
        const response = await fetch(`http://localhost:5055/api/products/${slug}`, {
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const json = await response.json();
          if (json?.data) {
            const product = json.data;
            const baseUrl = 'http://localhost:8080';

            // Generate SEO tags
            const seoData = generateProductSeoTags(product, baseUrl);

            // Replace existing meta tags instead of just appending
            // This ensures product-specific tags take precedence

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

            // 5. Add keywords meta tag if it doesn't exist
            if (seoData.keywords && !html.includes('name="keywords"')) {
              const headClosingIndex = html.indexOf('</head>');
              if (headClosingIndex !== -1) {
                html = html.slice(0, headClosingIndex) +
                  `    <meta name="keywords" content="${seoData.keywords.replace(/"/g, '&quot;')}" />\n` +
                  html.slice(headClosingIndex);
              }
            } else if (seoData.keywords) {
              html = html.replace(
                /<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/i,
                `<meta name="keywords" content="${seoData.keywords.replace(/"/g, '&quot;')}" />`
              );
            }

            return html;
          }
        }
      } catch (err) {
        // Silently fail - return original HTML
        // This could happen if backend is not running yet
        console.warn(`[SEO Injection] Failed to fetch product ${slug}:`, err.message);
      }

      return html;
    },
  };
};

module.exports = seoInjectionVitePlugin;
