// Cria um administrador de demonstração: admin@exemplo.com / Admin1234
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

await prisma.user.upsert({
  where: { email: 'admin@exemplo.com' },
  update: { role: 'ADMIN' },
  create: {
    name: 'Administrador',
    username: 'admin',
    email: 'admin@exemplo.com',
    passwordHash: await bcrypt.hash('Admin1234', 12),
    role: 'ADMIN',
  },
});
console.log('✅ Admin criado: admin@exemplo.com / Admin1234');
await prisma.$disconnect();
