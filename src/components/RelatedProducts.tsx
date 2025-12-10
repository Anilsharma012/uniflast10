import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface RelatedProduct {
  _id?: string;
  id?: string;
  title?: string;
  price?: number;
  image_url?: string;
  images?: string[];
  category?: string;
  stock?: number;
  slug?: string;
  discount?: {
    type: 'flat' | 'percentage';
    value: number;
  };
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const resolveImage = (src?: string) => {
  const s = String(src || "");
  if (!s) return "/placeholder.svg";
  if (s.startsWith("http")) return s;
  const isLocalBase = (() => {
    try {
      return (
        API_BASE.includes("localhost") || API_BASE.includes("127.0.0.1")
      );
    } catch {
      return false;
    }
  })();
  const isHttpsPage = (() => {
    try {
      return location.protocol === "https:";
    } catch {
      return false;
    }
  })();
  if (s.startsWith("/uploads") || s.startsWith("uploads")) {
    if (API_BASE && !(isLocalBase && isHttpsPage)) {
      const base = API_BASE.endsWith("/")
        ? API_BASE.slice(0, -1)
        : API_BASE;
      return s.startsWith("/") ? `${base}${s}` : `${base}/${s}`;
    } else {
      return s.startsWith("/") ? `/api${s}` : `/api/${s}`;
    }
  }
  return s;
};

const calculateDiscountedPrice = (price: number, discount?: { type: 'flat' | 'percentage'; value: number }) => {
  if (!discount || discount.value === 0) return price;
  if (discount.type === 'percentage') {
    return price - (price * discount.value / 100);
  }
  return price - discount.value;
};

export const RelatedProducts = ({ productId }: { productId: string }) => {
  const [products, setProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelated = async () => {
      try {
        setLoading(true);
        const { ok, json } = await api(`/api/products/${productId}/related`);
        if (ok && Array.isArray(json?.data)) {
          setProducts(json.data);
        }
      } catch (e) {
        console.error('Failed to load related products:', e);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchRelated();
    }
  }, [productId]);

  if (loading) {
    return (
      <div className="mt-12 sm:mt-16 pt-8 sm:pt-12 border-t border-border">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tighter mb-6 sm:mb-8">
          Related Products
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array(4).fill(null).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-40 sm:w-48 animate-pulse">
              <div className="aspect-square bg-muted rounded-lg mb-3 sm:mb-4" />
              <div className="h-4 bg-muted rounded mb-2" />
              <div className="h-4 w-3/4 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 sm:mt-16 pt-8 sm:pt-12 border-t border-border">
      <h2 className="text-xl sm:text-2xl font-bold tracking-tighter mb-6 sm:mb-8">
        Related Products
      </h2>
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-3 sm:-mx-4 px-3 sm:px-4">
        {products.map((product) => {
          const id = product._id || product.id;
          const slug = product.slug || '';
          const title = product.title || 'Product';
          const price = Number(product.price || 0);
          const image = resolveImage(product.image_url || product.images?.[0]);
          const stock = Number(product.stock || 0);
          const discount = product.discount;
          const finalPrice = calculateDiscountedPrice(price, discount);
          const discountLabel = discount && discount.value > 0
            ? discount.type === 'percentage'
              ? `${discount.value}% off`
              : `₹${discount.value} off`
            : null;
          const productLink = slug ? `/products/${slug}` : `/product/${id}`;

          return (
            <Link
              key={id}
              to={productLink}
              className="flex-shrink-0 w-40 sm:w-48 group"
            >
              <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow">
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <img
                    src={image}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {stock === 0 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white font-semibold text-xs sm:text-sm">
                        Out of Stock
                      </span>
                    </div>
                  )}
                  {discountLabel && (
                    <Badge className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-xs sm:text-sm">
                      {discountLabel}
                    </Badge>
                  )}
                </div>
                <div className="p-3 sm:p-4">
                  <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 mb-2 sm:mb-3 group-hover:text-primary transition-colors">
                    {title}
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm sm:text-base font-bold">
                      ₹{finalPrice.toLocaleString('en-IN')}
                    </span>
                    {discount && discount.value > 0 && (
                      <span className="text-xs sm:text-sm text-muted-foreground line-through">
                        ₹{price.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
