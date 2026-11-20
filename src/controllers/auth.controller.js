const bcrypt = require('bcryptjs');
const User = require('../models/User');
const tokenService = require('../services/token.service');
const AppError = require('../utils/AppError');

// Hash fixo usado quando o usuário não existe, para que o tempo de resposta
// seja parecido e não revele quais contas existem.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 4);

const meta = (req) => ({ userAgent: req.get('user-agent'), ip: req.ip });

exports.register = async (req, res) => {
  const { username, email } = req.body;
  const exists = await User.findOne({ $or: [{ username }, { email }] }).lean();
  if (exists) {
    throw AppError.conflict(
      exists.username === username ? 'username já está em uso' : 'e-mail já está em uso',
    );
  }

  const user = await User.create(req.body);
  const tokens = await tokenService.issueTokens(user, { meta: meta(req) });
  res.status(201).json({ user, ...tokens });
};

exports.login = async (req, res) => {
  const { login, password } = req.body;
  const user = await User.findOne({ $or: [{ username: login }, { email: login }] }).select(
    '+password',
  );

  const valid = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
  if (!user || !valid) throw AppError.unauthorized('Credenciais inválidas');

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await tokenService.issueTokens(user, { meta: meta(req) });
  res.json({ user, ...tokens });
};

exports.refresh = async (req, res) => {
  const { user, tokens } = await tokenService.rotate(req.body.refreshToken, meta(req));
  res.json({ user, ...tokens });
};

exports.logout = async (req, res) => {
  await tokenService.revoke(req.body.refreshToken);
  res.status(204).end();
};

exports.logoutAll = async (req, res) => {
  await tokenService.revokeAllForUser(req.user.id);
  res.status(204).end();
};

exports.sessions = async (req, res) => {
  res.json(await tokenService.listActiveSessions(req.user.id));
};
