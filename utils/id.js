const crypto = require('crypto');

function generateId(prefix, bytes = 8) {
  const random = crypto.randomBytes(bytes).toString('hex');
  return prefix ? `${prefix}_${random}` : random;
}

function generateSlug(bytes = 4) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = { generateId, generateSlug };
