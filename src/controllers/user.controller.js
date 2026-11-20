const User = require('../models/User');
const tokenService = require('../services/token.service');
const AppError = require('../utils/AppError');

async function findOrFail(id, select) {
  const query = User.findById(id);
  if (select) query.select(select);
  const user = await query;
  if (!user) throw AppError.notFound('Usuário não encontrado');
  return user;
}

exports.me = async (req, res) => {
  res.json(await findOrFail(req.user.id));
};

exports.updateMe = async (req, res) => {
  const user = await findOrFail(req.user.id);
  user.set(req.body);
  await user.save();
  res.json(user);
};

exports.changePassword = async (req, res) => {
  const user = await findOrFail(req.user.id, '+password');
  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw AppError.badRequest('Senha atual incorreta');
  }

  user.password = req.body.newPassword;
  await user.save();
  await tokenService.revokeAllForUser(user._id); // encerra as outras sessões

  res.json({ message: 'Senha alterada. Faça login novamente nos outros dispositivos.' });
};

exports.list = async (req, res) => {
  const { page, limit, role } = req.validated.query;
  const filter = role ? { role } : {};
  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ createdAt: -1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);
  res.json({
    data: users,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
  });
};

exports.changeRole = async (req, res) => {
  if (req.params.id === req.user.id) {
    throw AppError.badRequest('Você não pode alterar o próprio papel');
  }
  const user = await findOrFail(req.params.id);
  user.role = req.body.role;
  await user.save();
  res.json(user);
};
