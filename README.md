# 🔐 JWT Auth API

[![CI](https://github.com/robertofilho0/jwt-auth-api/actions/workflows/ci.yml/badge.svg)](https://github.com/robertofilho0/jwt-auth-api/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/express-5-000000?logo=express)
![MongoDB](https://img.shields.io/badge/mongodb-7-47A248?logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

API de autenticação com **access token JWT de curta duração**, **refresh token com rotação e detecção de reuso**, gerenciamento de sessões e **controle de acesso por papel (RBAC)**.

## ✨ Destaques de segurança

| Prática                    | Como foi implementada                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------- |
| Access token curto         | JWT assinado com `sub` e `role`, expira em 15 min por padrão e valida o `issuer`       |
| Refresh token opaco        | 48 bytes aleatórios. Só o **hash SHA-256** é salvo no banco                            |
| Rotação                    | Cada `/refresh` revoga o token usado e emite um novo                                   |
| Detecção de reuso          | Reapresentar um refresh token já usado revoga **toda a família** (sessão comprometida) |
| Expiração automática       | Índice TTL do MongoDB remove tokens expirados                                          |
| Senhas                     | bcrypt com custo configurável e política de senha forte                                |
| Sem enumeração de usuários | Mesma mensagem e tempo semelhante para usuário inexistente ou senha errada             |
| Força bruta                | Rate limit específico para login/cadastro (10 tentativas falhas a cada 15 min)         |
| Troca de senha             | Revoga todas as sessões ativas                                                         |
| Configuração segura        | `JWT_SECRET` obrigatório com no mínimo 32 caracteres, validado na inicialização        |
| Headers HTTP               | Helmet, CORS configurável e `x-powered-by` desativado                                  |

## 🧱 Stack

Node.js 22+ · Express 5 · MongoDB / Mongoose · jsonwebtoken · bcryptjs · Zod · Jest · Supertest · Docker

## 📁 Estrutura

```
src/
├── app.js / server.js
├── config/                 # env validado (Zod) e conexão com o banco
├── controllers/            # auth e users
├── middlewares/auth.js     # authenticate + authorize(...roles)
├── models/                 # User, RefreshToken
├── services/token.service.js  # emissão, rotação e revogação de tokens
├── validators/             # schemas Zod
└── docs/openapi.json       # Swagger em /docs
scripts/create-admin.js     # cria ou promove um administrador
tests/                      # testes de validação e de integração
```

## 🚀 Como rodar

### Com Docker

```bash
git clone https://github.com/robertofilho0/jwt-auth-api.git
cd jwt-auth-api
docker compose up --build
```

API em `http://localhost:5000` e documentação em `http://localhost:5000/docs`.

### Localmente

```bash
npm install
cp .env.example .env   # defina MONGO_URI e um JWT_SECRET forte
npm run dev
```

Para criar um administrador:

```bash
ADMIN_EMAIL=admin@exemplo.com ADMIN_PASSWORD='Admin1234' npm run create-admin
```

### Variáveis de ambiente

| Variável                 | Padrão                                   | Descrição                                |
| ------------------------ | ---------------------------------------- | ---------------------------------------- |
| `PORT`                   | `5000`                                   | Porta HTTP                               |
| `MONGO_URI`              | `mongodb://localhost:27017/jwt-auth-api` | Conexão com o MongoDB                    |
| `JWT_SECRET`             | obrigatório                              | Chave de assinatura (mín. 32 caracteres) |
| `JWT_EXPIRES_IN`         | `15m`                                    | Validade do access token                 |
| `REFRESH_TOKEN_TTL_DAYS` | `7`                                      | Validade do refresh token                |
| `BCRYPT_ROUNDS`          | `12`                                     | Custo do hash de senha                   |
| `CORS_ORIGIN`            | `*`                                      | Origens permitidas                       |

## 📚 Endpoints

| Método  | Rota                     | Auth   | Descrição                        |
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

### Fluxo

```bash
# 1. Cadastro
curl -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Ana Souza","username":"ana.souza","email":"ana@exemplo.com","password":"Senha123"}'

# 2. Login → { user, accessToken, refreshToken, tokenType, expiresIn }
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" \
  -d '{"login":"ana.souza","password":"Senha123"}'

# 3. Rota protegida
curl http://localhost:5000/api/users/me -H "Authorization: Bearer <accessToken>"

# 4. Quando o access token expirar
curl -X POST http://localhost:5000/api/auth/refresh -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'
```

## 🧪 Testes

```bash
npm test               # usa um MongoDB em memória
npm run test:coverage
npm run lint
```

Os testes cobrem cadastro, login, perfil, troca de senha, rotação e reuso de refresh token, logout, sessões e permissões de admin.

## 📄 Licença

MIT. Veja [LICENSE](LICENSE).

---

Feito por [Roberto Filho](https://github.com/robertofilho0) · [LinkedIn](https://www.linkedin.com/in/roberto-filho-393b372b2/)
