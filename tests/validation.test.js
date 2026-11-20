const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const env = require('../src/config/env');

describe('Validação e autenticação (sem banco)', () => {
  it('rejeita senha fraca no cadastro', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', username: 'ana', email: 'ana@x.com', password: 'abcdefgh' });
    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.mensagem)).toEqual(
      expect.arrayContaining(['A senha deve conter uma letra maiúscula']),
    );
  });

  it('rejeita e-mail e username inválidos', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', username: 'a b', email: 'nao-e-email', password: 'Senha123' });
    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.campo).sort()).toEqual(['email', 'username']);
  });

  it('exige token nas rotas protegidas', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token não fornecido');
  });

  it('rejeita token com assinatura inválida', async () => {
    const token = jwt.sign({ sub: '1' }, 'outra-chave', { issuer: 'jwt-auth-api' });
    const res = await request(app).get('/api/users/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token inválido');
  });

  it('rejeita token expirado', async () => {
    const token = jwt.sign({ sub: '1', role: 'user' }, env.JWT_SECRET, {
      issuer: 'jwt-auth-api',
      expiresIn: -10,
    });
    const res = await request(app).get('/api/users/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token expirado');
  });

  it('bloqueia rota de admin para usuário comum', async () => {
    const token = jwt.sign({ sub: '665f1c2b8a1e4b6d2c3f4a5b', role: 'user' }, env.JWT_SECRET, {
      issuer: 'jwt-auth-api',
    });
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('não expõe o x-powered-by', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
