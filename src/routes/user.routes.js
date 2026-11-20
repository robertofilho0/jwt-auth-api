const { Router } = require('express');
const controller = require('../controllers/user.controller');
const validate = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const schemas = require('../validators/auth.validator');

const router = Router();

router.use(authenticate);

router.get('/me', controller.me);
router.patch('/me', validate({ body: schemas.updateMe }), controller.updateMe);
router.patch('/me/password', validate({ body: schemas.changePassword }), controller.changePassword);

router.get('/', authorize('admin'), validate({ query: schemas.listUsers }), controller.list);
router.patch(
  '/:id/role',
  authorize('admin'),
  validate({ params: schemas.idParams, body: schemas.changeRole }),
  controller.changeRole,
);

module.exports = router;
