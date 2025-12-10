import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, CheckCircle2 } from 'lucide-react';

export interface BankDetails {
  _id?: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch?: string;
  isDefault?: boolean;
}

interface BankDetailsSelectorProps {
  onBankDetailsSelected: (details: BankDetails) => void;
  onBankDetailsCreated?: () => void;
}

export const BankDetailsSelector = ({ onBankDetailsSelected, onBankDetailsCreated }: BankDetailsSelectorProps) => {
  const { toast } = useToast();
  const [bankDetails, setBankDetails] = useState<BankDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BankDetails>({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branch: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    try {
      setLoading(true);
      const { ok, json } = await api('/api/auth/bank-details');
      if (ok && Array.isArray(json?.data)) {
        setBankDetails(json.data);
        const defaultDetails = json.data.find((b: BankDetails) => b.isDefault);
        if (defaultDetails?._id) {
          setSelectedId(defaultDetails._id);
          onBankDetailsSelected(defaultDetails);
        }
      }
    } catch (e) {
      console.error('Failed to fetch bank details:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBankDetails = async () => {
    if (!formData.accountHolderName || !formData.bankName || !formData.accountNumber || !formData.ifscCode) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const { ok, json } = await api('/api/auth/bank-details', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      if (ok && Array.isArray(json?.data)) {
        setBankDetails(json.data);
        setShowForm(false);
        setFormData({
          accountHolderName: '',
          bankName: '',
          accountNumber: '',
          ifscCode: '',
          branch: '',
        });
        toast({
          title: 'Bank Details Added',
          description: 'Your bank details have been saved successfully',
        });
        if (onBankDetailsCreated) {
          onBankDetailsCreated();
        }
      }
    } catch (e) {
      console.error('Failed to add bank details:', e);
      toast({
        title: 'Error',
        description: 'Failed to add bank details',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBankDetails = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this bank account?')) return;

    try {
      const { ok, json } = await api(`/api/auth/bank-details/${id}`, {
        method: 'DELETE',
      });

      if (ok && Array.isArray(json?.data)) {
        setBankDetails(json.data);
        if (selectedId === id) {
          setSelectedId(null);
        }
        toast({
          title: 'Bank Details Deleted',
          description: 'Your bank account has been removed',
        });
      }
    } catch (e) {
      console.error('Failed to delete bank details:', e);
      toast({
        title: 'Error',
        description: 'Failed to delete bank details',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array(1).fill(null).map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bankDetails.length > 0 && (
        <div className="space-y-3">
          {bankDetails.map((details) => (
            <Card
              key={details._id}
              className={`p-4 cursor-pointer transition-all ${
                selectedId === details._id
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary'
              }`}
              onClick={() => {
                setSelectedId(details._id || '');
                onBankDetailsSelected(details);
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-semibold text-sm">{details.accountHolderName}</p>
                    {selectedId === details._id && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {details.bankName}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Account: {details.accountNumber.slice(-4).padStart(details.accountNumber.length, '*')}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    IFSC: {details.ifscCode}
                  </p>
                  {details.branch && (
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Branch: {details.branch}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteBankDetails(details._id || '');
                  }}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm ? (
        <Card className="p-4 space-y-4">
          <h3 className="font-semibold text-sm">Add Bank Account</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label htmlFor="holder" className="text-xs sm:text-sm">Account Holder Name</Label>
              <Input
                id="holder"
                placeholder="Full name as on bank account"
                value={formData.accountHolderName}
                onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                className="text-xs sm:text-sm"
              />
            </div>
            <div>
              <Label htmlFor="bank" className="text-xs sm:text-sm">Bank Name</Label>
              <Input
                id="bank"
                placeholder="e.g., HDFC Bank"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="text-xs sm:text-sm"
              />
            </div>
            <div>
              <Label htmlFor="ifsc" className="text-xs sm:text-sm">IFSC Code</Label>
              <Input
                id="ifsc"
                placeholder="e.g., HDFC0001234"
                value={formData.ifscCode}
                onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                className="text-xs sm:text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="account" className="text-xs sm:text-sm">Account Number</Label>
              <Input
                id="account"
                placeholder="Account number"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="text-xs sm:text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="branch" className="text-xs sm:text-sm">Branch (Optional)</Label>
              <Input
                id="branch"
                placeholder="Branch name"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="text-xs sm:text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddBankDetails}
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Bank Details'}
            </Button>
          </div>
        </Card>
      ) : (
        <Button
          variant="outline"
          className="w-full text-xs sm:text-sm"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Bank Account
        </Button>
      )}
    </div>
  );
};
