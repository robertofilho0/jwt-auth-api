/**
 * Cria (ou promove) um usuário administrador.
 * Uso: ADMIN_EMAIL=admin@exemplo.com ADMIN_PASSWORD='Senha123' npm run create-admin
 */
const env = require('../src/config/env');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');

(async () => {
  const {
    ADMIN_EMAIL: email,
    ADMIN_PASSWORD: password,
    ADMIN_NAME: name = 'Administrador',
  } = process.env;
  if (!email || !password) {
    console.error('Defina ADMIN_EMAIL e ADMIN_PASSWORD.');
    process.exit(1);
  }

  await connectDB(env.MONGO_URI);
  let user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    user.role = 'admin';
  } else {
    user = new User({ name, email, username: email.split('@')[0], password, role: 'admin' });
  }
  await user.save();
  console.log(`✅ ${user.email} agora é administrador`);
  await disconnectDB();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
