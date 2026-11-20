const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const db = require('./helpers/db');

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

const novo = {
  name: 'Ana Souza',
  username: 'Ana.Souza',
  email: 'ANA@exemplo.com',
  password: 'Senha123',
};

const cadastrar = (dados = {}) =>
  request(app)
    .post('/api/auth/register')
    .send({ ...novo, ...dados });
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

describe('Cadastro e login', () => {
  it('cadastra e devolve tokens sem expor a senha', async () => {
    const res = await cadastrar();

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      username: 'ana.souza',
      email: 'ana@exemplo.com',
      role: 'user',
    });
    expect(res.body.user.password).toBeUndefined();
    expect(res.body).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      }),
    );

    const salvo = await User.findOne({ username: 'ana.souza' }).select('+password');
    expect(salvo.password).not.toBe('Senha123');
    expect(salvo.password).toMatch(/^\$2[aby]\$/);
  });

  it('impede username ou e-mail duplicado', async () => {
    await cadastrar();
    const mesmoEmail = await cadastrar({ username: 'outra' });
    expect(mesmoEmail.status).toBe(409);
    expect(mesmoEmail.body.error).toMatch(/e-mail/);

    const mesmoUser = await cadastrar({ email: 'outra@exemplo.com' });
    expect(mesmoUser.status).toBe(409);
    expect(mesmoUser.body.error).toMatch(/username/);
  });

  it('faz login por username ou e-mail', async () => {
    await cadastrar();
    const porUser = await request(app)
      .post('/api/auth/login')
      .send({ login: 'ana.souza', password: 'Senha123' });
    const porEmail = await request(app)
      .post('/api/auth/login')
      .send({ login: 'ana@exemplo.com', password: 'Senha123' });

    expect(porUser.status).toBe(200);
    expect(porEmail.status).toBe(200);
    expect(porEmail.body.user.lastLoginAt).toBeDefined();
  });

  it('retorna a mesma mensagem para senha errada e usuário inexistente', async () => {
    await cadastrar();
    const senhaErrada = await request(app)
      .post('/api/auth/login')
      .send({ login: 'ana.souza', password: 'Errada123' });
    const inexistente = await request(app)
      .post('/api/auth/login')
      .send({ login: 'ninguem', password: 'Senha123' });

    expect(senhaErrada.status).toBe(401);
    expect(inexistente.status).toBe(401);
    expect(senhaErrada.body).toEqual(inexistente.body);
  });
});

describe('Perfil', () => {
  it('lê e atualiza o próprio perfil', async () => {
    const { body } = await cadastrar();

    const me = await request(app).get('/api/users/me').set(bearer(body.accessToken));
    expect(me.body.email).toBe('ana@exemplo.com');

    const upd = await request(app)
      .patch('/api/users/me')
      .set(bearer(body.accessToken))
      .send({ name: 'Ana S.' });
    expect(upd.body.name).toBe('Ana S.');
  });

  it('troca a senha e encerra as sessões existentes', async () => {
    const { body } = await cadastrar();

    const errada = await request(app)
      .patch('/api/users/me/password')
      .set(bearer(body.accessToken))
      .send({ currentPassword: 'Errada123', newPassword: 'NovaSenha1' });
    expect(errada.status).toBe(400);

    const ok = await request(app)
      .patch('/api/users/me/password')
      .set(bearer(body.accessToken))
      .send({ currentPassword: 'Senha123', newPassword: 'NovaSenha1' });
    expect(ok.status).toBe(200);

    const refresh = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: body.refreshToken });
    expect(refresh.status).toBe(401);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ login: 'ana.souza', password: 'NovaSenha1' });
    expect(login.status).toBe(200);
  });
});

describe('Refresh token', () => {
  it('rotaciona o refresh token', async () => {
    const { body } = await cadastrar();

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: body.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.refreshToken).not.toBe(body.refreshToken);

    const me = await request(app).get('/api/users/me').set(bearer(res.body.accessToken));
    expect(me.status).toBe(200);
  });

  it('detecta reutilização e revoga toda a família de tokens', async () => {
    const { body } = await cadastrar();
    const primeiro = body.refreshToken;

    const { body: rotacionado } = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: primeiro });

    const reuso = await request(app).post('/api/auth/refresh').send({ refreshToken: primeiro });
    expect(reuso.status).toBe(401);
    expect(reuso.body.error).toMatch(/reutilizado/);

    // o token legítimo mais novo também foi revogado
    const novo = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: rotacionado.refreshToken });
    expect(novo.status).toBe(401);
  });

  it('faz logout revogando o refresh token', async () => {
    const { body } = await cadastrar();

    const out = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: body.refreshToken });
    expect(out.status).toBe(204);

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: body.refreshToken });
    expect(res.status).toBe(401);
  });

  it('lista sessões e encerra todas com logout-all', async () => {
    const { body } = await cadastrar();
    await request(app).post('/api/auth/login').send({ login: 'ana.souza', password: 'Senha123' });

    const sessoes = await request(app).get('/api/auth/sessions').set(bearer(body.accessToken));
    expect(sessoes.body).toHaveLength(2);

    await request(app).post('/api/auth/logout-all').set(bearer(body.accessToken)).expect(204);

    const depois = await request(app).get('/api/auth/sessions').set(bearer(body.accessToken));
    expect(depois.body).toHaveLength(0);
  });

  it('rejeita refresh token desconhecido', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'x'.repeat(40) });
    expect(res.status).toBe(401);
  });
});

describe('Administração', () => {
  it('admin lista usuários e altera papéis', async () => {
    const { body: admin } = await cadastrar();
    await User.updateOne({ username: 'ana.souza' }, { role: 'admin' });
    const { body: login } = await request(app)
      .post('/api/auth/login')
      .send({ login: 'ana.souza', password: 'Senha123' });

    const { body: comum } = await cadastrar({ username: 'joao', email: 'joao@exemplo.com' });

    const lista = await request(app).get('/api/users').set(bearer(login.accessToken));
    expect(lista.status).toBe(200);
    expect(lista.body.meta.total).toBe(2);

    const promover = await request(app)
      .patch(`/api/users/${comum.user.id}/role`)
      .set(bearer(login.accessToken))
      .send({ role: 'admin' });
    expect(promover.body.role).toBe('admin');

    const proprio = await request(app)
      .patch(`/api/users/${admin.user.id}/role`)
      .set(bearer(login.accessToken))
      .send({ role: 'user' });
    expect(proprio.status).toBe(400);
  });
});
