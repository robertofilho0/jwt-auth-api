require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('🔄 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conexão bem-sucedida!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao conectar:', err.message);
    process.exit(1);
  }
})();
