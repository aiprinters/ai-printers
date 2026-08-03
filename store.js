const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    const empty = { shops: [], jobs: [] };
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2));
    return empty;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// --- Shops ---

function createShop(shop) {
  const db = readDB();
  db.shops.push(shop);
  writeDB(db);
  return shop;
}

function getShopBySlug(slug) {
  return readDB().shops.find((s) => s.slug === slug) || null;
}

function getShopById(id) {
  return readDB().shops.find((s) => s.id === id) || null;
}

// --- Jobs ---

function createJob(job) {
  const db = readDB();
  db.jobs.push(job);
  writeDB(db);
  return job;
}

function getJobById(id) {
  return readDB().jobs.find((j) => j.id === id) || null;
}

function updateJob(id, updates) {
  const db = readDB();
  const job = db.jobs.find((j) => j.id === id);
  if (!job) return null;
  Object.assign(job, updates);
  writeDB(db);
  return job;
}

module.exports = {
  createShop,
  getShopBySlug,
  getShopById,
  createJob,
  getJobById,
  updateJob,
};
