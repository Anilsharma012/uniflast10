import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductImageGalleryProps {
  images?: string[];
  productTitle?: string;
  selectedColor?: string;
  colorImages?: Record<string, string[]>;
  colorVariants?: Array<{
    colorName: string;
    colorCode?: string;
    images: string[];
    primaryImageIndex?: number;
  }>;
}

const resolveImage = (src?: string) => {
  const s = String(src || '');
  if (!s) return '/placeholder.svg';
  if (s.startsWith('http')) return s;
  const isLocalBase = (() => {
    try {
      const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';
      return API_BASE.includes('localhost') || API_BASE.includes('127.0.0.1');
    } catch {
      return false;
    }
  })();
  const isHttpsPage = (() => {
    try {
      return location.protocol === 'https:';
    } catch {
      return false;
    }
  })();
  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';
  if (s.startsWith('/uploads') || s.startsWith('uploads')) {
    if (API_BASE && !(isLocalBase && isHttpsPage)) {
      const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
      return s.startsWith('/') ? `${base}${s}` : `${base}/${s}`;
    } else {
      return s.startsWith('/') ? `/api${s}` : `/api/${s}`;
    }
  }
  return s;
};

export const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({
  images = [],
  productTitle = 'Product',
  selectedColor,
  colorImages,
  colorVariants,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [thumbScrollPos, setThumbScrollPos] = useState(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get images for the selected color
  // First, try the new colorVariants structure
  // Then fallback to old colorImages structure
  // Finally, fallback to default images
  const getImagesForSelectedColor = (): string[] => {
    if (!selectedColor) return images;

    // Try new colorVariants structure
    if (colorVariants && Array.isArray(colorVariants)) {
      const variant = colorVariants.find(cv => cv.colorName === selectedColor);
      if (variant && Array.isArray(variant.images) && variant.images.length > 0) {
        return variant.images;
      }
    }

    // Fallback to old colorImages structure
    if (colorImages && typeof colorImages === 'object' && colorImages[selectedColor]?.length > 0) {
      return colorImages[selectedColor];
    }

    return images;
  };

  // Get the primary image index for the selected color
  const getPrimaryImageIndex = (): number => {
    if (!selectedColor || !colorVariants) return 0;

    const variant = colorVariants.find(cv => cv.colorName === selectedColor);
    return variant?.primaryImageIndex ?? 0;
  };

  const imagesToUse = getImagesForSelectedColor();
  const primaryIndex = getPrimaryImageIndex();

  // When color changes, set the main image to the primary image for that color
  useEffect(() => {
    setSelectedIndex(primaryIndex);
  }, [selectedColor, primaryIndex]);

  const validImages = imagesToUse
    .filter((img) => img && String(img).length > 0)
    .map(resolveImage);

  if (validImages.length === 0) {
    return (
      <div className="w-full aspect-square bg-secondary rounded-lg flex items-center justify-center">
        <div className="text-center">
          <img
            src="/placeholder.svg"
            alt={productTitle}
            className="w-32 h-32 object-contain mx-auto opacity-50"
          />
          <p className="text-muted-foreground text-sm mt-2">No image available</p>
        </div>
      </div>
    );
  }

  const mainImage = validImages[selectedIndex];
  const hasMultiple = validImages.length > 1;

  const handlePrevThumbnail = () => {
    if (thumbScrollPos > 0) {
      setThumbScrollPos(Math.max(0, thumbScrollPos - 100));
    }
  };

  const handleNextThumbnail = () => {
    const maxScroll = Math.max(0, validImages.length * 100 - 400);
    if (thumbScrollPos < maxScroll) {
      setThumbScrollPos(Math.min(maxScroll, thumbScrollPos + 100));
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Main Image */}
      <div
        className="relative w-full bg-secondary rounded-lg overflow-hidden group"
        style={{ aspectRatio: '1' }}
      >
        <img
          src={mainImage}
          alt={productTitle}
          className="w-full h-full object-contain transition-transform duration-200"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            target.src = '/placeholder.svg';
          }}
        />

        {/* Navigation Arrows on Mobile */}
        {isMobile && hasMultiple && (
          <>
            <button
              onClick={() => setSelectedIndex((i) => (i - 1 + validImages.length) % validImages.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setSelectedIndex((i) => (i + 1) % validImages.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors z-10"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              {selectedIndex + 1} / {validImages.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails Section */}
      {hasMultiple && (
        <div>
          <div className="relative">
            {/* Mobile: Horizontal Scroll */}
            {isMobile ? (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {validImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedIndex(idx)}
                    className={cn(
                      'flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all',
                      selectedIndex === idx
                        ? 'border-primary shadow-lg'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.src = '/placeholder.svg';
                      }}
                    />
                  </button>
                ))}
              </div>
            ) : (
              /* Desktop: Grid with Navigation */
              <div className="space-y-2">
                <div className="relative flex items-center gap-2">
                  {thumbScrollPos > 0 && (
                    <button
                      onClick={handlePrevThumbnail}
                      className="absolute -left-10 top-1/2 -translate-y-1/2 bg-secondary hover:bg-muted p-2 rounded-full transition-colors"
                      aria-label="Previous thumbnails"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}

                  <div className="flex-1 overflow-hidden">
                    <div
                      className="flex gap-2 transition-transform duration-200"
                      style={{ transform: `translateX(-${thumbScrollPos}px)` }}
                    >
                      {validImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedIndex(idx)}
                          className={cn(
                            'flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all',
                            selectedIndex === idx
                              ? 'border-primary shadow-lg'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <img
                            src={img}
                            alt={`Thumbnail ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              target.src = '/placeholder.svg';
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {thumbScrollPos < Math.max(0, validImages.length * 88 - 400) && (
                    <button
                      onClick={handleNextThumbnail}
                      className="absolute -right-10 top-1/2 -translate-y-1/2 bg-secondary hover:bg-muted p-2 rounded-full transition-colors"
                      aria-label="Next thumbnails"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Image Counter */}
                <p className="text-xs text-muted-foreground text-center">
                  {selectedIndex + 1} / {validImages.length}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
