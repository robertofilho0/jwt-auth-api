const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/auth.controller');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const schemas = require('../validators/auth.validator');
const env = require('../config/env');

const router = Router();

// Limite mais rígido contra força bruta em login/cadastro
const credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => env.NODE_ENV === 'test',
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

router.post(
  '/register',
  credentialsLimiter,
  validate({ body: schemas.register }),
  controller.register,
);
router.post('/login', credentialsLimiter, validate({ body: schemas.login }), controller.login);
router.post('/refresh', validate({ body: schemas.refresh }), controller.refresh);
router.post('/logout', validate({ body: schemas.refresh }), controller.logout);
router.post('/logout-all', authenticate, controller.logoutAll);
router.get('/sessions', authenticate, controller.sessions);

module.exports = router;
