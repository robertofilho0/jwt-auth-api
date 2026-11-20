import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { createApp, resetDb } from './helpers/app.js';

let app: INestApplication;
let prisma: PrismaService;
let http: Awaited<ReturnType<typeof createApp>>['http'];

const novo = {
  name: 'Ana Souza',
  username: 'Ana.Souza',
  email: 'ANA@exemplo.com',
  password: 'Senha123',
};
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
const cadastrar = (dados: Partial<typeof novo> = {}) =>
  http()
    .post('/api/auth/register')
    .send({ ...novo, ...dados });
const logar = (login = 'ana.souza', password = 'Senha123') =>
  http().post('/api/auth/login').send({ login, password });

beforeAll(async () => {
  ({ app, prisma, http } = await createApp());
});
beforeEach(() => resetDb(prisma));
afterAll(() => app.close());

describe('Cadastro e login', () => {
  it('cadastra e devolve tokens sem expor o hash da senha', async () => {
    const res = await cadastrar().expect(201);

    expect(res.body.user).toMatchObject({
      username: 'ana.souza',
      email: 'ana@exemplo.com',
      role: 'USER',
    });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body).toMatchObject({
      tokenType: 'Bearer',
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });

    const salvo = await prisma.user.findUniqueOrThrow({
      where: { username: 'ana.souza' },
    });
    expect(salvo.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('valida senha forte, e-mail e username', async () => {
    const res = await cadastrar({
      username: 'a b',
      email: 'x',
      password: 'fraca',
    }).expect(400);
    const campos = res.body.errors.map((e: { campo: string }) => e.campo);
    expect(campos).toEqual(
      expect.arrayContaining(['username', 'email', 'password']),
    );
  });

  it('impede username ou e-mail duplicado', async () => {
    await cadastrar();
    expect(
      (await cadastrar({ username: 'outra' }).expect(409)).body.message,
    ).toMatch(/e-mail/);
    expect(
      (await cadastrar({ email: 'outra@x.com' }).expect(409)).body.message,
    ).toMatch(/username/);
  });

  it('faz login por username ou e-mail e registra o último acesso', async () => {
    await cadastrar();
    await logar().expect(200);
    const res = await logar('ana@exemplo.com').expect(200);
    expect(res.body.user.lastLoginAt).toBeTruthy();
  });

  it('responde igual para senha errada e usuário inexistente', async () => {
    await cadastrar();
    const errada = await logar('ana.souza', 'Errada123').expect(401);
    const inexistente = await logar('ninguem').expect(401);
    expect(errada.body).toEqual(inexistente.body);
  });
});

describe('Rotas protegidas', () => {
  it('exige token e rejeita tokens inválidos', async () => {
    await http().get('/api/users/me').expect(401);
    const res = await http()
      .get('/api/users/me')
      .set(bearer('abc.def.ghi'))
      .expect(401);
    expect(res.body.message).toBe('Token inválido');
  });

  it('lê e atualiza o próprio perfil', async () => {
    const { body } = await cadastrar();
    await http().get('/api/users/me').set(bearer(body.accessToken)).expect(200);
    const upd = await http()
      .patch('/api/users/me')
      .set(bearer(body.accessToken))
      .send({ name: 'Ana S.' })
      .expect(200);
    expect(upd.body.name).toBe('Ana S.');
  });

  it('troca a senha e encerra as sessões', async () => {
    const { body } = await cadastrar();
    const auth = bearer(body.accessToken);

    await http()
      .patch('/api/users/me/password')
      .set(auth)
      .send({ currentPassword: 'Errada123', newPassword: 'NovaSenha1' })
      .expect(400);
    await http()
      .patch('/api/users/me/password')
      .set(auth)
      .send({ currentPassword: 'Senha123', newPassword: 'NovaSenha1' })
      .expect(200);

    await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: body.refreshToken })
      .expect(401);
    await logar('ana.souza', 'NovaSenha1').expect(200);
  });
});

describe('Refresh token', () => {
  it('rotaciona o refresh token', async () => {
    const { body } = await cadastrar();
    const res = await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: body.refreshToken })
      .expect(200);
    expect(res.body.refreshToken).not.toBe(body.refreshToken);
    await http()
      .get('/api/users/me')
      .set(bearer(res.body.accessToken))
      .expect(200);
  });

  it('detecta reuso e revoga toda a família', async () => {
    const { body } = await cadastrar();
    const { body: novo } = await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: body.refreshToken });

    const reuso = await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: body.refreshToken })
      .expect(401);
    expect(reuso.body.message).toMatch(/reutilizado/);

    await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: novo.refreshToken })
      .expect(401);
  });

  it('logout revoga o token e logout-all encerra todas as sessões', async () => {
    const { body } = await cadastrar();
    await logar();

    const sessoes = await http()
      .get('/api/auth/sessions')
      .set(bearer(body.accessToken))
      .expect(200);
    expect(sessoes.body).toHaveLength(2);

    await http()
      .post('/api/auth/logout')
      .send({ refreshToken: body.refreshToken })
      .expect(204);
    await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: body.refreshToken })
      .expect(401);

    await http()
      .post('/api/auth/logout-all')
      .set(bearer(body.accessToken))
      .expect(204);
    const depois = await http()
      .get('/api/auth/sessions')
      .set(bearer(body.accessToken));
    expect(depois.body).toHaveLength(0);
  });
});

describe('Administração', () => {
  it('somente admin lista usuários e altera papéis', async () => {
    const { body: ana } = await cadastrar();
    const { body: joao } = await cadastrar({
      username: 'joao',
      email: 'joao@x.com',
    });

    await http().get('/api/users').set(bearer(joao.accessToken)).expect(403);

    await prisma.user.update({
      where: { id: ana.user.id },
      data: { role: 'ADMIN' },
    });
    const { body: admin } = await logar();

    const lista = await http()
      .get('/api/users?limit=1')
      .set(bearer(admin.accessToken))
      .expect(200);
    expect(lista.body.meta).toEqual({
      total: 2,
      page: 1,
      limit: 1,
      totalPages: 2,
    });

    const promover = await http()
      .patch(`/api/users/${joao.user.id}/role`)
      .set(bearer(admin.accessToken))
      .send({ role: 'ADMIN' })
      .expect(200);
    expect(promover.body.role).toBe('ADMIN');

    await http()
      .patch(`/api/users/${ana.user.id}/role`)
      .set(bearer(admin.accessToken))
      .send({ role: 'USER' })
      .expect(400);
    await http()
      .patch('/api/users/nao-e-uuid/role')
      .set(bearer(admin.accessToken))
      .send({ role: 'USER' })
      .expect(400);
  });
});

describe('Sistema', () => {
  it('health check e documentação', async () => {
    expect((await http().get('/api/health').expect(200)).body).toMatchObject({
      status: 'ok',
      database: 'up',
    });
    await http().get('/docs').expect(200);
  });
});
