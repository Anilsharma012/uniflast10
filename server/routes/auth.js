const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const COOKIE_NAME = 'token';

function sendToken(res, user) {
  const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  return token;
}

// Sign up
router.post('/signup', async (req, res) => {
  const { name, email, password, phone } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ ok: false, message: 'Missing fields' });
  if (phone && !/^\d{10}$/.test(phone)) return res.status(400).json({ ok: false, message: 'Phone number must be exactly 10 digits' });
  try {
    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) return res.status(400).json({ ok: false, message: 'Email already in use' });
    const hash = await bcrypt.hash(password, 10);
    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
    const role = String(email).toLowerCase() === adminEmail && adminEmail ? 'admin' : 'user';
    const user = await User.create({ name, email: String(email).toLowerCase(), phone, passwordHash: hash, role });
    const token = sendToken(res, user);
    return res.json({ ok: true, user: user.toJSON(), token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ ok: false, message: 'Missing fields' });
  try {
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) return res.status(400).json({ ok: false, message: 'Invalid credentials' });
    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(400).json({ ok: false, message: 'Invalid credentials' });
    const token = sendToken(res, user);
    return res.json({ ok: true, user: user.toJSON(), token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Current user
router.get('/me', async (req, res) => {
  const authHeader = req.headers && req.headers.authorization;
  const token = (req.cookies && req.cookies[COOKIE_NAME]) || (authHeader ? (authHeader.split(' ')[1] || null) : null) || req.query.token || null;
  if (!token) return res.json({ ok: false, message: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) return res.json({ ok: false, message: 'Not authenticated' });
    return res.json({ ok: true, user: user });
  } catch (e) {
    return res.json({ ok: false, message: 'Not authenticated' });
  }
});

// Update profile (PUT /api/auth/me)
router.put('/me', requireAuth, async (req, res) => {
  try {
    const updates = {};
    const { name, phone, address1, address2, city, state, pincode } = req.body || {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (address1 !== undefined) updates.address1 = address1;
    if (address2 !== undefined) updates.address2 = address2;
    if (city !== undefined) updates.city = city;
    if (state !== undefined) updates.state = state;
    if (pincode !== undefined) updates.pincode = pincode;
    const doc = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-passwordHash');
    return res.json({ ok: true, user: doc });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Update profile (PATCH /api/user/profile for alias compatibility)
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const updates = {};
    const { name, phone, address1, address2, city, state, pincode } = req.body || {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (address1 !== undefined) updates.address1 = address1;
    if (address2 !== undefined) updates.address2 = address2;
    if (city !== undefined) updates.city = city;
    if (state !== undefined) updates.state = state;
    if (pincode !== undefined) updates.pincode = pincode;
    const doc = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-passwordHash');
    return res.json({ ok: true, user: doc });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Change password
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) return res.status(400).json({ ok: false, message: 'Missing fields' });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });
    const ok = await user.verifyPassword(oldPassword);
    if (!ok) return res.status(400).json({ ok: false, message: 'Invalid password' });
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Admin: list users
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const docs = await User.find().select('-passwordHash').lean();
    return res.json({ ok: true, data: docs });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Admin: delete user
router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Admin: update user role
router.put('/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ ok: false, message: 'Invalid role' });
    const doc = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-passwordHash');
    if (!doc) return res.status(404).json({ ok: false, message: 'Not found' });
    return res.json({ ok: true, data: doc });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Forgot password - request reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, message: 'Email is required' });

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) return res.json({ ok: true, message: 'If email exists, a reset link has been sent' });

    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign({ id: user._id, type: 'reset' }, JWT_SECRET, { expiresIn: '1h' });

    // Store reset token in user document
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // In production, you would send an email here with the reset link
    // For now, we'll just return success and log the token
    console.log(`Password reset token for ${email}:`, resetToken);

    return res.json({ ok: true, message: 'If email exists, a reset link has been sent', token: resetToken });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) return res.status(400).json({ ok: false, message: 'Missing fields' });

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ ok: false, message: 'Invalid or expired reset link' });
    }

    if (decoded.type !== 'reset') return res.status(400).json({ ok: false, message: 'Invalid token' });

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

    // Check token expiry
    if (user.resetTokenExpiry && new Date() > user.resetTokenExpiry) {
      return res.status(400).json({ ok: false, message: 'Reset link has expired' });
    }

    // Update password
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    return res.json({ ok: true, message: 'Password reset successfully' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Get user addresses
router.get('/addresses', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('addresses');
    return res.json({ ok: true, data: user?.addresses || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Add new address
router.post('/addresses', requireAuth, async (req, res) => {
  try {
    const { name, phone, houseNumber, area, city, state, pincode, landmark, isDefault } = req.body || {};
    if (!name || !phone || !houseNumber || !area || !city || !state || !pincode) {
      return res.status(400).json({ ok: false, message: 'Missing required fields' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

    const newAddress = {
      name,
      phone,
      houseNumber,
      area,
      city,
      state,
      pincode,
      landmark: landmark || '',
      isDefault: !!isDefault,
    };

    if (isDefault) {
      user.addresses.forEach(addr => { addr.isDefault = false; });
    }

    user.addresses.push(newAddress);
    await user.save();

    return res.json({ ok: true, data: user.addresses });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Update address
router.put('/addresses/:addressId', requireAuth, async (req, res) => {
  try {
    const { addressId } = req.params;
    const { name, phone, houseNumber, area, city, state, pincode, landmark, isDefault } = req.body || {};

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

    const address = user.addresses.id(addressId);
    if (!address) return res.status(404).json({ ok: false, message: 'Address not found' });

    if (name) address.name = name;
    if (phone) address.phone = phone;
    if (houseNumber) address.houseNumber = houseNumber;
    if (area) address.area = area;
    if (city) address.city = city;
    if (state) address.state = state;
    if (pincode) address.pincode = pincode;
    if (landmark !== undefined) address.landmark = landmark;

    if (isDefault) {
      user.addresses.forEach(addr => { addr.isDefault = false; });
      address.isDefault = true;
    } else if (isDefault === false) {
      address.isDefault = false;
    }

    await user.save();
    return res.json({ ok: true, data: user.addresses });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Delete address
router.delete('/addresses/:addressId', requireAuth, async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

    user.addresses.id(addressId).deleteOne();
    await user.save();

    return res.json({ ok: true, data: user.addresses });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Get user bank details
router.get('/bank-details', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('bankDetails');
    return res.json({ ok: true, data: user?.bankDetails || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Add bank details
router.post('/bank-details', requireAuth, async (req, res) => {
  try {
    const { accountHolderName, bankName, accountNumber, ifscCode, branch, isDefault } = req.body || {};
    if (!accountHolderName || !bankName || !accountNumber || !ifscCode) {
      return res.status(400).json({ ok: false, message: 'Missing required fields' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

    const newBankDetails = {
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      branch: branch || '',
      isDefault: !!isDefault,
    };

    if (isDefault) {
      user.bankDetails.forEach(bank => { bank.isDefault = false; });
    }

    user.bankDetails.push(newBankDetails);
    await user.save();

    return res.json({ ok: true, data: user.bankDetails });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Update bank details
router.put('/bank-details/:bankId', requireAuth, async (req, res) => {
  try {
    const { bankId } = req.params;
    const { accountHolderName, bankName, accountNumber, ifscCode, branch, isDefault } = req.body || {};

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

    const bankDetails = user.bankDetails.id(bankId);
    if (!bankDetails) return res.status(404).json({ ok: false, message: 'Bank details not found' });

    if (accountHolderName) bankDetails.accountHolderName = accountHolderName;
    if (bankName) bankDetails.bankName = bankName;
    if (accountNumber) bankDetails.accountNumber = accountNumber;
    if (ifscCode) bankDetails.ifscCode = ifscCode;
    if (branch !== undefined) bankDetails.branch = branch;

    if (isDefault) {
      user.bankDetails.forEach(bank => { bank.isDefault = false; });
      bankDetails.isDefault = true;
    } else if (isDefault === false) {
      bankDetails.isDefault = false;
    }

    await user.save();
    return res.json({ ok: true, data: user.bankDetails });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Delete bank details
router.delete('/bank-details/:bankId', requireAuth, async (req, res) => {
  try {
    const { bankId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

    user.bankDetails.id(bankId).deleteOne();
    await user.save();

    return res.json({ ok: true, data: user.bankDetails });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  return res.json({ ok: true });
});

module.exports = router;
