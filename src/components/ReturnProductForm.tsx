import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface ReturnProductFormProps {
  orderId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReturnProductForm({ orderId, onSuccess, onCancel }: ReturnProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [refundMethod, setRefundMethod] = useState<'upi' | 'bank'>('upi');
  const [reason, setReason] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branch: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!reason.trim()) {
        toast.error('Please provide a reason for return');
        setLoading(false);
        return;
      }

      if (refundMethod === 'upi' && !upiId.trim()) {
        toast.error('Please enter your UPI ID');
        setLoading(false);
        return;
      }

      if (refundMethod === 'bank') {
        if (!bankDetails.accountHolderName.trim() || !bankDetails.bankName.trim() || 
            !bankDetails.accountNumber.trim() || !bankDetails.ifscCode.trim()) {
          toast.error('Please fill in all bank details');
          setLoading(false);
          return;
        }
      }

      const payload: any = {
        reason: reason,
        refundMethod: refundMethod,
      };

      if (refundMethod === 'upi') {
        payload.refundUpiId = upiId;
      } else {
        payload.refundBankDetails = bankDetails;
      }

      const res = await api(`/api/orders/${orderId}/request-return`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success('Return request submitted successfully');
        onSuccess?.();
      } else {
        toast.error(res.json?.message || 'Failed to submit return request');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Return Product</h3>
        <p className="text-sm text-muted-foreground mt-1">Submit a return request and provide refund details</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
          {/* Return Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Return *</Label>
            <Textarea
              id="reason"
              placeholder="Please explain why you want to return this product..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
              required
            />
          </div>

          {/* Refund Method */}
          <div className="space-y-3">
            <Label>Refund Method *</Label>
            <Tabs value={refundMethod} onValueChange={(v) => setRefundMethod(v as 'upi' | 'bank')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upi">UPI</TabsTrigger>
                <TabsTrigger value="bank">Bank Transfer</TabsTrigger>
              </TabsList>

              <TabsContent value="upi" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="upiId">UPI ID *</Label>
                  <Input
                    id="upiId"
                    placeholder="example@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    required={refundMethod === 'upi'}
                  />
                  <p className="text-xs text-muted-foreground">Enter your UPI ID (e.g., name@bankname)</p>
                </div>
              </TabsContent>

              <TabsContent value="bank" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="accountHolderName">Account Holder Name *</Label>
                  <Input
                    id="accountHolderName"
                    placeholder="Your name"
                    value={bankDetails.accountHolderName}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                    required={refundMethod === 'bank'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name *</Label>
                  <Input
                    id="bankName"
                    placeholder="HDFC, ICICI, etc."
                    value={bankDetails.bankName}
                    onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                    required={refundMethod === 'bank'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number *</Label>
                  <Input
                    id="accountNumber"
                    placeholder="Your account number"
                    value={bankDetails.accountNumber}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                    required={refundMethod === 'bank'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ifscCode">IFSC Code *</Label>
                    <Input
                      id="ifscCode"
                      placeholder="HDFC0001234"
                      value={bankDetails.ifscCode}
                      onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value })}
                      required={refundMethod === 'bank'}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="branch">Branch (Optional)</Label>
                    <Input
                      id="branch"
                      placeholder="Branch name"
                      value={bankDetails.branch}
                      onChange={(e) => setBankDetails({ ...bankDetails, branch: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Return Request'}
          </Button>
        </div>
      </form>
    </div>
  );
}
