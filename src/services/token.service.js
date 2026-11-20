const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const RefreshToken = require('../models/RefreshToken');
const AppError = require('../utils/AppError');

const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

function signAccessToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: 'jwt-auth-api',
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { issuer: 'jwt-auth-api' });
}

async function issueRefreshToken(user, { family, meta = {} } = {}) {
  const token = crypto.randomBytes(48).toString('base64url');
  await RefreshToken.create({
    user: user._id,
    tokenHash: hash(token),
    family: family || crypto.randomUUID(),
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    userAgent: meta.userAgent,
    ip: meta.ip,
  });
  return token;
}

async function issueTokens(user, options) {
  return {
    accessToken: signAccessToken(user),
    refreshToken: await issueRefreshToken(user, options),
    tokenType: 'Bearer',
    expiresIn: env.JWT_EXPIRES_IN,
  };
}

/**
 * Rotação de refresh token: o token usado é revogado e substituído.
 * Se um token já revogado for apresentado novamente (possível roubo),
 * toda a família de tokens é revogada.
 */
async function rotate(refreshToken, meta) {
  const stored = await RefreshToken.findOne({ tokenHash: hash(refreshToken) }).populate('user');

  if (!stored || !stored.user) throw AppError.unauthorized('Refresh token inválido');

  if (stored.revokedAt) {
    await RefreshToken.updateMany(
      { family: stored.family, revokedAt: null },
      { revokedAt: new Date() },
    );
    throw AppError.unauthorized('Refresh token reutilizado. Sessão encerrada por segurança');
  }

  if (stored.expiresAt <= new Date()) throw AppError.unauthorized('Refresh token expirado');

  const tokens = await issueTokens(stored.user, { family: stored.family, meta });
  stored.revokedAt = new Date();
  stored.replacedBy = hash(tokens.refreshToken);
  await stored.save();

  return { user: stored.user, tokens };
}

async function revoke(refreshToken) {
  await RefreshToken.updateOne(
    { tokenHash: hash(refreshToken), revokedAt: null },
    { revokedAt: new Date() },
  );
}

async function revokeAllForUser(userId) {
  await RefreshToken.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() });
}

async function listActiveSessions(userId) {
  return RefreshToken.find({ user: userId, revokedAt: null, expiresAt: { $gt: new Date() } })
    .select('family userAgent ip createdAt expiresAt')
    .sort({ createdAt: -1 });
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  issueTokens,
  rotate,
  revoke,
  revokeAllForUser,
  listActiveSessions,
};
