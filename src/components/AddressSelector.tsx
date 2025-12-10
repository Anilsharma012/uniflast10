import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { MapPin, Plus, X } from 'lucide-react';

export interface Address {
  _id: string;
  name: string;
  phone: string;
  houseNumber: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault?: boolean;
}

interface AddressSelectorProps {
  onAddressSelect: (address: Address) => void;
  selectedAddressId?: string;
}

export const AddressSelector: React.FC<AddressSelectorProps> = ({ onAddressSelect, selectedAddressId }) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    houseNumber: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const { ok, json } = await api('/api/auth/addresses');
      if (ok && Array.isArray(json?.data)) {
        setAddresses(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Phone is required');
      return;
    }
    if (!/^\d{10}$/.test(formData.phone.trim())) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }
    if (!formData.houseNumber.trim()) {
      toast.error('House number/Street address is required');
      return;
    }
    if (!formData.area.trim()) {
      toast.error('Area/Address is required');
      return;
    }
    if (!formData.city.trim()) {
      toast.error('City is required');
      return;
    }
    if (!formData.state.trim()) {
      toast.error('State is required');
      return;
    }
    if (!formData.pincode.trim()) {
      toast.error('Pincode is required');
      return;
    }

    try {
      setSaving(true);
      const { ok, json } = await api('/api/auth/addresses', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          houseNumber: formData.houseNumber.trim(),
          area: formData.area.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
          landmark: formData.landmark.trim(),
          isDefault: addresses.length === 0,
        }),
      });

      if (ok && Array.isArray(json?.data)) {
        setAddresses(json.data);
        setFormData({
          name: '',
          phone: '',
          houseNumber: '',
          area: '',
          city: '',
          state: '',
          pincode: '',
          landmark: '',
        });
        setShowAddForm(false);
        toast.success('Address added successfully');

        const newAddress = json.data[json.data.length - 1];
        onAddressSelect(newAddress);
      } else {
        toast.error(json?.message || 'Failed to add address');
      }
    } catch (error) {
      console.error('Error adding address:', error);
      toast.error('Failed to add address');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded animate-pulse" />
        <div className="h-4 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Saved Addresses */}
      {addresses.length > 0 && !showAddForm && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Saved Addresses</Label>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {addresses.map((address) => (
              <Card
                key={address._id}
                className={`p-3 cursor-pointer transition-all ${
                  selectedAddressId === address._id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => onAddressSelect(address)}
              >
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{address.name}</div>
                    <div className="text-xs text-muted-foreground space-y-1 mt-1">
                      <div>{address.houseNumber}, {address.area}</div>
                      <div>{address.city}, {address.state} {address.pincode}</div>
                      {address.landmark && <div>Landmark: {address.landmark}</div>}
                      <div>Phone: {address.phone}</div>
                    </div>
                    {address.isDefault && (
                      <div className="mt-2 inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        Default
                      </div>
                    )}
                  </div>
                  {selectedAddressId === address._id && (
                    <div className="text-primary text-sm font-semibold">✓</div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add New Address Form */}
      {showAddForm ? (
        <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium">Add New Address</Label>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <Input
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={saving}
            />
            <Input
              placeholder="Phone Number"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={formData.phone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                setFormData({ ...formData, phone: value });
              }}
              disabled={saving}
            />
            <Input
              placeholder="House No., Building Name"
              value={formData.houseNumber}
              onChange={(e) => setFormData({ ...formData, houseNumber: e.target.value })}
              disabled={saving}
            />
            <Input
              placeholder="Road name, Area, Colony"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              disabled={saving}
            />
            <Input
              placeholder="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              disabled={saving}
            />
            <Input
              placeholder="State"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              disabled={saving}
            />
            <Input
              placeholder="Pincode"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              disabled={saving}
            />
            <Input
              placeholder="Landmark (optional)"
              value={formData.landmark}
              onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
              disabled={saving}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddForm(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddAddress}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Address'}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(true)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Address
        </Button>
      )}
    </div>
  );
};
