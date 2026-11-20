const tokenService = require('../services/token.service');
const AppError = require('../utils/AppError');

/** Exige um access token válido no header `Authorization: Bearer <token>`. */
function authenticate(req, _res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(AppError.unauthorized('Token não fornecido'));
  }

  const payload = tokenService.verifyAccessToken(token); // erros tratados no errorHandler
  req.user = { id: payload.sub, role: payload.role };
  return next();
}

/** Restringe a rota aos papéis informados. Use depois de `authenticate`. */
const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(AppError.forbidden('Você não tem permissão para acessar este recurso'));
    }
    return next();
  };

module.exports = { authenticate, authorize };
