# Product Slug Migration Guide

## Overview
This migration backfills the `slug` field for all existing products in the database.

## Prerequisites
- Node.js installed
- MongoDB connection details configured in `.env`
- The Product model already has the `slug` field defined

## Running the Migration

### Option 1: Direct Node Execution
```bash
cd server
node scripts/backfill-slugs.js
```

### Option 2: Via NPM Script
Add this to `server/package.json` scripts:
```json
"migrate:slugs": "node scripts/backfill-slugs.js"
```

Then run:
```bash
npm run migrate:slugs
```

## What It Does
1. Connects to MongoDB using `MONGODB_URI` from environment
2. Finds all products without a slug (missing or empty slug field)
3. Generates a unique slug from the product title using slugify
4. Saves the slug to each product
5. Ensures slug uniqueness by appending `-1`, `-2`, etc. if needed
6. Logs progress and summary

## Example Output
```
[Backfill Slugs] Connecting to MongoDB...
[Backfill Slugs] Connected to MongoDB
[Backfill Slugs] Found 45 products without slug
[Backfill Slugs] Updated Bark T-Shirt -> bark-t-shirt
[Backfill Slugs] Updated Oversized Black Tee -> oversized-black-tee
...
[Backfill Slugs] Complete! Updated: 45, Skipped: 0
```

## Rollback
If needed, you can remove all slugs with:
```javascript
db.products.updateMany({}, { $unset: { slug: "" } })
```

## After Migration
- All existing products will have slug-based URLs
- Old `/product/:id` URLs will redirect to `/products/:slug`
- Products created via admin panel will auto-generate slugs
- Links across the site will use the new slug format
