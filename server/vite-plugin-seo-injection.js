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

    configResolved(config) {
      this.config = config;
    },

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
            const metaTags = createMetaTagsHtml(seoData);

            // Inject before </head>
            return html.replace('</head>', metaTags + '</head>');
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
