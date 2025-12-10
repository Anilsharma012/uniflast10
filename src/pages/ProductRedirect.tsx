import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

/**
 * Handles backward compatibility for old /product/:id URLs
 * Fetches product by ID, gets its slug, and performs 301 redirect to /products/:slug
 */
const ProductRedirect = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const redirect = async () => {
      try {
        if (!id) {
          navigate("/", { replace: true });
          return;
        }

        // Fetch product by ID to get slug
        const { ok, json } = await api(`/api/products/${id}`);
        
        if (!ok || !json?.data?.slug) {
          // Product not found, go to home
          navigate("/", { replace: true });
          return;
        }

        const slug = json.data.slug;
        // Perform 301 redirect by navigating with replace
        // Note: In browser, this mimics a redirect
        navigate(`/products/${slug}`, { replace: true });
      } catch (err) {
        console.error("Redirect error:", err);
        navigate("/", { replace: true });
      }
    };

    redirect();
  }, [id, navigate]);

  // Show minimal loading state while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
};

export default ProductRedirect;
