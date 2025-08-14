# 🔐 JWT Auth API - Node.js + Express + MongoDB

> API simples para autenticação de usuários com **JWT**, incluindo registro, login e rotas protegidas.
> Desenvolvida com **Node.js**, **Express** e **MongoDB**.

---

## 📌 Ajustes e melhorias

O projeto ainda está em desenvolvimento e as próximas atualizações serão voltadas para as seguintes tarefas:

- [x] Login com geração de JWT
- [x] Rota protegida com middleware de autenticação
- [x] Refresh token
- [x] Testes automatizados

---

## 💻 Pré-requisitos

Antes de começar, verifique se você atendeu aos seguintes requisitos:

- **Node.js** v16+ e **npm** instalados
- Uma conta no [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) ou instância local do MongoDB
- Compatível com **Windows**, **Linux** e **macOS**

---

## 🚀 Instalando JWT Auth API

**1. Clone o repositório:**
```bash
git clone https://github.com/RobertoTheDev/jwt-auth-api.git
cd jwt-auth-api
```
**2. Instale as dependências:**
```bash
npm install
```
**3. Configure o arquivo .env:**
```.env
PORT=5000
MONGO_URI=sua_connection_string_mongodb_atlas
JWT_SECRET=sua_chave_secreta
```
**4. Execute a aplicação:**
```bash
npm run dev
```

## ☕ Usando JWT Auth API
Endpoints:

``POST /api/auth/register -> Criar novo usuário
``

``
POST /api/auth/login -> Login e receber token JWT
``

``
GET /api/auth/protected -> Acessar rota protegida (necessita token)
``

**Exemplos curl:**

- Criar usuário:
````bash 
curl -X POST http://localhost:5000/api/auth/register \
-H "Content-Type: application/json" \
-d '{"username":"roberto","password":"123456"}'

````
- Fazer login:
````bash 
curl -X POST http://localhost:5000/api/auth/login \
-H "Content-Type: application/json" \
-d '{"username":"roberto","password":"123456"}'
````
- Acessar rota protegida:
````bash 
curl http://localhost:5000/api/auth/protected \
-H "Authorization: Bearer SEU_TOKEN_AQUI"
````

## 📂 Estrutura de pastas

```pgsql
jwt-auth-api/
│   server.js
│   .env
│   package.json
│   .gitignore
└───src
    ├── config
    │   └── db.js
    ├── controllers
    │   └── authController.js
    ├── middlewares
    │   └── authMiddleware.js
    ├── models
    │   └── User.js
    └── routes
        └── authRoutes.js
```
## 🛠 Tecnologias utilizadas: 

- **Node.js**
- **Express**
- **MongoDB (Atlas)**
- **Mongoose**
- **JWT (jsonwebtoken)**
- **bcrypt (hash de senhas)**
- **dotenv**
- **cors**
- **nodemon**