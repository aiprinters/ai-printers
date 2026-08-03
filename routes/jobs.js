const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const store = require('../store');
const { generateId } = require('../utils/id');
const { convertToPrintablePdf } = require('../utils/fileToPdf');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// Shared auth check: the print agent proves it belongs to the shop
// that owns this job by sending the shop's agent token.
function requireAgentAuth(req, res, next) {
  const token = req.header('x-agent-token');
  const job = store.getJobById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found.' });

  const shop = store.getShopById(job.shopId);
  if (!shop || shop.agentToken !== token) {
    return res.status(401).json({ error: 'Invalid agent token.' });
  }

  req.job = job;
  req.shop = shop;
  next();
}

module.exports = function jobsRouter(io) {
  const router = express.Router();

  // Customer uploads a file and creates a print job
  router.post('/', upload.single('file'), async (req, res) => {
    const { shopSlug, copies } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const shop = store.getShopBySlug(shopSlug);
    if (!shop) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: 'Shop not found.' });
    }

    const numCopies = Math.max(1, parseInt(copies, 10) || 1);
    const jobId = generateId('job');
    const ext = path.extname(req.file.originalname).toLowerCase();
    const pdfPath = path.join(UPLOAD_DIR, `${jobId}.pdf`);

    try {
      await convertToPrintablePdf(req.file.path, ext, pdfPath);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    } finally {
      fs.unlink(req.file.path, () => {});
    }

    const job = store.createJob({
      id: jobId,
      shopId: shop.id,
      originalFilename: req.file.originalname,
      pdfPath,
      copies: numCopies,
      amount: shop.pricePerPage * numCopies,
      status: 'pending_payment',
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      jobId: job.id,
      amount: job.amount,
      copies: job.copies,
      status: job.status,
    });
  });

  // Confirm payment — STUB. Replace with a Razorpay webhook before going
  // live (see README "Adding real UPI payments"). Never trust a
  // client-side "payment succeeded" call in production.
  router.post('/:id/pay', (req, res) => {
    const job = store.getJobById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    if (job.status !== 'pending_payment') {
      return res.status(409).json({ error: `Job already ${job.status}.` });
    }

    store.updateJob(job.id, { status: 'paid', paidAt: new Date().toISOString() });

    const shop = store.getShopById(job.shopId);
    io.to(`shop:${shop.id}`).emit('new-job', {
      jobId: job.id,
      copies: job.copies,
      originalFilename: job.originalFilename,
    });

    res.json({ status: 'paid' });
  });

  // Poll job status — used by the customer's phone while waiting
  router.get('/:id', (req, res) => {
    const job = store.getJobById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found.' });

    res.json({
      jobId: job.id,
      status: job.status,
      copies: job.copies,
      amount: job.amount,
    });
  });

  // Print agent downloads the print-ready file
  router.get('/:id/file', requireAgentAuth, (req, res) => {
    const downloadName = `${req.job.originalFilename.replace(/\.[^.]+$/, '')}.pdf`;
    res.download(req.job.pdfPath, downloadName);
  });

  // Print agent reports back after attempting to print
  router.post('/:id/status', requireAgentAuth, (req, res) => {
    const { status, error } = req.body;
    if (!['printed', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'status must be "printed" or "failed".' });
    }

    store.updateJob(req.job.id, {
      status,
      printedAt: new Date().toISOString(),
      error: error || undefined,
    });

    res.json({ ok: true });
  });

  return router;
};
