#!/usr/bin/env node
/**
 * Migration script to backfill slug field for existing products
 * Run with: node server/scripts/backfill-slugs.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const slugify = require('slugify');
const Product = require('../models/Product');

async function backfillSlugs() {
  try {
    console.log('[Backfill Slugs] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('[Backfill Slugs] Connected to MongoDB');

    // Find all products without a proper slug (null, empty, or undefined)
    const productsWithoutSlug = await Product.find({
      $or: [
        { slug: null },
        { slug: '' },
        { slug: { $exists: false } }
      ]
    });
    console.log(`[Backfill Slugs] Found ${productsWithoutSlug.length} products without slug`);

    // Also check for total products
    const totalProducts = await Product.countDocuments({});
    console.log(`[Backfill Slugs] Total products in database: ${totalProducts}`);

    if (productsWithoutSlug.length === 0) {
      console.log('[Backfill Slugs] All products already have slugs. Verifying...');
      // Verify that all products have non-empty slugs
      const productsWithEmptySlug = await Product.find({
        $or: [{ slug: '' }, { slug: null }]
      });
      if (productsWithEmptySlug.length === 0) {
        console.log('[Backfill Slugs] Verification passed. All products have valid slugs.');
      } else {
        console.log(`[Backfill Slugs] Found ${productsWithEmptySlug.length} products with empty slugs!`);
      }
      await mongoose.disconnect();
      return;
    }

    let updated = 0;
    let skipped = 0;

    for (const product of productsWithoutSlug) {
      try {
        if (!product.title) {
          console.log(`[Backfill Slugs] Skipping product ${product._id} - no title`);
          skipped++;
          continue;
        }

        // Generate base slug from title
        const baseSlug = slugify(product.title, { lower: true, strict: true }) || `prod-${product._id}`;

        // Ensure uniqueness
        let slug = baseSlug;
        let counter = 1;
        while (await Product.exists({ slug, _id: { $ne: product._id } })) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }

        // Update product
        product.slug = slug;
        await product.save();
        console.log(`[Backfill Slugs] Updated ${product.title} -> ${slug}`);
        updated++;
      } catch (err) {
        console.error(`[Backfill Slugs] Error updating product ${product._id}:`, err.message);
        skipped++;
      }
    }

    console.log(`[Backfill Slugs] Complete! Updated: ${updated}, Skipped: ${skipped}`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('[Backfill Slugs] Fatal error:', err);
    process.exit(1);
  }
}

backfillSlugs();
