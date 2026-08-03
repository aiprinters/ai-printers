const express = require('express');
const QRCode = require('qrcode');
const store = require('../store');
const { generateId, generateSlug } = require('../utils/id');

const router = express.Router();
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Register a new shop and its print counter
router.post('/', (req, res) => {
  const { name, address, pricePerPage } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Shop name is required.' });
  }

  const price = Number(pricePerPage);
  if (!pricePerPage || Number.isNaN(price) || price <= 0) {
    return res.status(400).json({ error: 'A positive pricePerPage is required.' });
  }

  const shop = {
    id: generateId('shop'),
    slug: generateSlug(),
    name,
    address: address || '',
    pricePerPage: price,
    agentToken: generateId('agent', 16),
    createdAt: new Date().toISOString(),
  };

  store.createShop(shop);

  res.status(201).json({
    ...shop,
    printUrl: `${BASE_URL}/s/${shop.slug}`,
  });
});

// Public shop info — used by the customer print page
router.get('/:slug', (req, res) => {
  const shop = store.getShopBySlug(req.params.slug);
  if (!shop) return res.status(404).json({ error: 'Shop not found.' });

  res.json({
    name: shop.name,
    pricePerPage: shop.pricePerPage,
  });
});

// QR code image for the shop's print counter
router.get('/:slug/qrcode', (req, res) => {
  const shop = store.getShopBySlug(req.params.slug);
  if (!shop) return res.status(404).json({ error: 'Shop not found.' });

  const printUrl = `${BASE_URL}/s/${shop.slug}`;
  res.type('png');
  QRCode.toFileStream(res, printUrl, { width: 480, margin: 2 });
});

module.exports = router;
