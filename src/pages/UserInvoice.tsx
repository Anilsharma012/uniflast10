import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';

interface InvoiceOrderItem { title: string; image?: string; qty: number; price: number; variant?: { size?: string; color?: string } | null; color?: string; size?: string }
interface InvoiceOrder {
  _id?: string;
  id?: string;
  createdAt: string;
  status: string;
  paymentMethod?: string;
  total?: number;
  totals?: { total: number };
  name?: string;
  phone?: string;
  address?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  items: InvoiceOrderItem[];
}

interface BusinessSettings { name?: string; address?: string; phone?: string; email?: string; gstIn?: string; logo?: string }

export default function UserInvoice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<InvoiceOrder | null>(null);
  const [biz, setBiz] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [oRes, b1] = await Promise.all([
          api(`/api/orders/${id}`),
          api('/api/settings/business'),
        ]);
        if (oRes.ok && (oRes as any).json?.ok) setOrder((oRes as any).json.data);
        if (b1.ok && (b1 as any).json?.ok) {
          setBiz((b1 as any).json.data);
        } else {
          const b2 = await api('/api/settings');
          if (b2.ok && (b2 as any).json?.ok) {
            const d = (b2 as any).json.data || {};
            setBiz({
              name: d.domain || 'UNI10',
              address: d.business?.address || '',
              phone: d.business?.phone || '',
              email: d.business?.email || '',
              gstIn: d.business?.gstIn || '',
              logo: d.business?.logo || '',
            });
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load invoice');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const total = Number(order?.totals?.total || order?.total || 0);
  const subtotal = order?.items?.reduce((s, it) => s + Number(it.qty || 0) * Number(it.price || 0), 0) || 0;
  const shipping = 0;
  const tax = Math.max(0, total - subtotal - shipping);

  return (
    <div className="min-h-screen bg-background">
      <style>{`@media print { .no-print { display: none !important; } .print:p-0 { padding: 0 !important; } }`}</style>
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12 print:p-0">
        <div className="flex items-center justify-between mb-6 no-print">
          <h1 className="text-2xl font-bold">Invoice</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
            <Button onClick={() => window.print()}>Print / Download PDF</Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-72" />
          </div>
        ) : error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : !order ? (
          <p className="text-sm text-muted-foreground">Order not found</p>
        ) : (
          <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex items-center gap-3">
                {biz?.logo && <img src={biz.logo} alt="Logo" className="w-12 h-12 rounded" />}
                <div>
                  <p className="font-bold text-lg">{biz?.name || 'Seller'}</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-line">{biz?.address || ''}</p>
                  {(biz?.phone || biz?.email) && (
                    <p className="text-xs text-muted-foreground">{biz?.phone} {biz?.email ? `• ${biz.email}` : ''}</p>
                  )}
                  {biz?.gstIn && <p className="text-xs">GSTIN: {biz.gstIn}</p>}
                </div>
              </div>
              <div className="text-sm">
                <p><strong>Invoice #</strong> {(order._id || order.id || '').slice(0,8)}</p>
                <p><strong>Date</strong> {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}</p>
                <p><strong>Payment</strong> {order.paymentMethod || '-'}</p>
                <p className="capitalize"><strong>Status</strong> {order.status}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <h3 className="font-semibold mb-3 text-base">Ship To</h3>
                <div className="rounded border p-4 text-sm space-y-1.5 bg-white">
                  {order?.name && <p className="font-semibold text-gray-900">{order.name}</p>}
                  {order?.address && <p className="text-gray-700">{order.address}</p>}
                  {order?.streetAddress && <p className="text-gray-700">{order.streetAddress}</p>}
                  {(order?.city || order?.state || order?.pincode) && (
                    <p className="text-gray-700">{[order.city, order.state, order.pincode].filter(Boolean).join(' - ')}</p>
                  )}
                  {order?.phone && <p className="text-gray-700 pt-1">📞 {order.phone}</p>}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">Item</th>
                      <th className="py-2">Qty</th>
                      <th className="py-2">Price</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((it, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-2">
                          <div className="flex items-center gap-3">
                            <img src={it.image || '/placeholder.svg'} alt={it.title} className="w-12 h-12 object-cover rounded" />
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{it.title}</div>
                              <div className="text-xs text-gray-600 space-y-1 mt-1">
                                {(it.variant?.size || it.size) && (
                                  <div className="flex gap-2">
                                    <span className="font-medium">Size:</span>
                                    <span className="text-gray-700">{it.variant?.size || it.size}</span>
                                  </div>
                                )}
                                {(it.variant?.color || it.color) && (
                                  <div className="flex gap-2">
                                    <span className="font-medium">Color:</span>
                                    <span className="text-gray-700 capitalize">{it.variant?.color || it.color}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2">{it.qty}</td>
                        <td className="py-2">₹{Number(it.price).toLocaleString('en-IN')}</td>
                        <td className="py-2 text-right">₹{(Number(it.qty) * Number(it.price)).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 ml-auto w-full md:w-80">
              <div className="flex items-center justify-between text-sm py-1">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-sm py-1">
                <span>Shipping</span>
                <span>₹{shipping.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-sm py-1">
                <span>Tax</span>
                <span>₹{tax.toLocaleString('en-IN')}</span>
              </div>
              <div className="border-t mt-2 pt-2 flex items-center justify-between font-semibold">
                <span>Grand Total</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
