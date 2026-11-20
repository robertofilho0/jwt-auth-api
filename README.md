# 🔐 JWT Auth API

[![CI](https://github.com/robertofilho0/jwt-auth-api/actions/workflows/ci.yml/badge.svg)](https://github.com/robertofilho0/jwt-auth-api/actions/workflows/ci.yml)
![NestJS](https://img.shields.io/badge/nestjs-12-E0234E?logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-6-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgresql-17-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/prisma-7-2D3748?logo=prisma&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

API de autenticação em **NestJS + TypeScript** com **access token JWT de curta duração**, **refresh token com rotação e detecção de reuso**, gerenciamento de sessões e **controle de acesso por papel (RBAC)**, sobre **PostgreSQL** com **Prisma**.

## ✨ Destaques de segurança

| Prática                    | Como foi implementada                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| Access token curto         | JWT com `sub` e `role`, 15 min por padrão, validando o `issuer`                              |
| Refresh token opaco        | 48 bytes aleatórios. Só o **hash SHA-256** é salvo no banco                                 |
| Rotação                    | Cada `/refresh` revoga o token usado (update condicional, seguro contra concorrência)        |
| Detecção de reuso          | Reapresentar um token já usado revoga **toda a família** de tokens daquele login            |
| Senhas                     | bcrypt com custo configurável e política de senha forte                                     |
| Sem enumeração de usuários | Mesma resposta e tempo semelhante para usuário inexistente ou senha errada                  |
| Força bruta                | `@nestjs/throttler` com limite específico em login e cadastro                               |
| Troca de senha             | Revoga todas as sessões ativas                                                              |
| Configuração segura        | Variáveis de ambiente validadas com Zod na inicialização (`JWT_SECRET` com 32+ caracteres)   |
| Autorização                | Guard global de JWT (rotas são privadas por padrão, `@Public()` libera) + `@Roles('ADMIN')` |

## 🧱 Stack

NestJS 12 · TypeScript · PostgreSQL 17 · Prisma 7 · Zod (validação nativa do Nest via Standard Schema) · Swagger · Vitest · Supertest · Oxlint · Docker

## 📁 Estrutura

```
src/
├── main.ts / setup-app.ts     # bootstrap, Helmet, CORS, validação global e Swagger
├── app.module.ts
├── config/env.ts              # schema Zod das variáveis de ambiente
├── prisma/                    # PrismaService (adapter pg) global
├── auth/
│   ├── auth.controller.ts     # register, login, refresh, logout, logout-all, sessions
│   ├── auth.service.ts
│   ├── token.service.ts       # emissão, rotação e revogação de tokens
│   ├── jwt-auth.guard.ts      # guard global
│   └── roles.guard.ts
├── users/                     # perfil, troca de senha e administração
├── common/                    # decorators, filtro de erros do Prisma e pipe de validação
└── health/
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
test/                          # testes e2e contra PostgreSQL real
```

## 🚀 Como rodar

### Com Docker

```bash
git clone https://github.com/robertofilho0/jwt-auth-api.git
cd jwt-auth-api
docker compose up --build
```

As migrations são aplicadas automaticamente. A API fica em `http://localhost:3000/api` e o Swagger em `http://localhost:3000/docs`.

### Localmente

```bash
npm install                 # também gera o Prisma Client
cp .env.example .env        # ajuste DATABASE_URL e JWT_SECRET
npx prisma migrate deploy
npm run db:seed             # opcional: admin@exemplo.com / Admin1234
npm run start:dev
```

## 📚 Endpoints

| Método  | Rota                     | Acesso | Descrição                        |
| ------- | ------------------------ | ------ | -------------------------------- |
| `POST`  | `/api/auth/register`     | —      | Cadastro                         |
| `POST`  | `/api/auth/login`        | —      | Login por username ou e-mail     |
| `POST`  | `/api/auth/refresh`      | —      | Rotaciona os tokens              |
| `POST`  | `/api/auth/logout`       | —      | Revoga o refresh token informado |
| `POST`  | `/api/auth/logout-all`   | Bearer | Encerra todas as sessões         |
| `GET`   | `/api/auth/sessions`     | Bearer | Lista sessões ativas             |
| `GET`   | `/api/users/me`          | Bearer | Perfil                           |
| `PATCH` | `/api/users/me`          | Bearer | Atualiza o nome                  |
| `PATCH` | `/api/users/me/password` | Bearer | Troca a senha                    |
| `GET`   | `/api/users`             | Admin  | Lista usuários (paginado)        |
| `PATCH` | `/api/users/:id/role`    | Admin  | Altera o papel de um usuário     |
| `GET`   | `/api/health`            | —      | Status da API e do banco         |

Os schemas de entrada são definidos com Zod e aparecem automaticamente no Swagger.

```bash
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"Admin1234"}'
# → { user, accessToken, refreshToken, tokenType: "Bearer", expiresIn: "15m" }
```

Erros de validação seguem um formato único:

```json
{
  "statusCode": 400,
  "message": "Dados inválidos",
  "errors": [{ "campo": "password", "mensagem": "A senha deve conter uma letra maiúscula" }]
}
```

## 🧪 Testes e qualidade

```bash
npm test               # testes unitários
npm run test:e2e       # testes e2e (requer DATABASE_URL de um PostgreSQL)
npm run lint           # Oxlint com regras type-aware
npm run typecheck
```

O CI sobe um PostgreSQL 17, aplica as migrations, **confere se elas batem com o `schema.prisma`** e roda lint, testes unitários, e2e e build.

## 📄 Licença

MIT. Veja [LICENSE](LICENSE).

---

Feito por [Roberto Filho](https://github.com/robertofilho0) · [LinkedIn](https://www.linkedin.com/in/roberto-filho-393b372b2/)
