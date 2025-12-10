const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  id: String,
  title: String,
  price: Number,
  qty: Number,
  image: String,
  variant: Object,
  size: String,
  color: String,
  productId: String,
  discount: {
    type: { type: String, enum: ['flat', 'percentage'] },
    value: { type: Number, default: 0 },
  },
  discountAmount: { type: Number, default: 0 },
});

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    phone: { type: String },
    address: { type: String },
    streetAddress: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    landmark: { type: String, default: '' },
    paymentMethod: { type: String, enum: ['COD', 'UPI', 'Razorpay'], default: 'COD' },
    items: { type: [OrderItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'paid', 'shipped', 'delivered', 'returned', 'cancelled'], default: 'pending' },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    upi: {
      payerName: { type: String },
      txnId: { type: String },
    },
    trackingNumber: { type: String, default: '' },
    trackingId: { type: String, default: '' },
    deliveredAt: { type: Date },
    returnRequestedAt: { type: Date },
    refundMethod: { type: String, enum: ['upi', 'bank'], default: 'upi' },
    refundUpiId: { type: String, default: '' },
    refundBankDetails: {
      accountHolderName: { type: String, default: '' },
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      branch: { type: String, default: '' },
    },
    refundAmount: { type: Number, default: 0 },
    returnPhoto: { type: String, default: '' },
    returnReason: { type: String, default: '' },
    returnStatus: { type: String, enum: ['None', 'Pending', 'Processing', 'Completed', 'Rejected'], default: 'None' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Order', OrderSchema);
