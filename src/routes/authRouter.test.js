const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);

  user.password = 'toomanysecrets';
  return user;
}

beforeAll(async () => {
  testUser.email = randomName() + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

  const { password, ...user } = { ...testUser, roles: [{ role: 'diner' }] };
  expect(loginRes.body.user).toMatchObject(user);
});

test('logout', async () => {
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toBe('logout successful');
});

test('logout no auth token', async () => {
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer `);
  expect(logoutRes.status).toBe(401);
  expect(logoutRes.body.message).toBe('unauthorized');
});

test('register', async () => {
  const registerRes = await request(app).post('/api/auth').send(testUser);
  expect(registerRes.status).toBe(200);
  expect(registerRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
});

test('missing name register', async () => {
  delete testUser.name;
  const registerRes = await request(app).post('/api/auth').send(testUser);
  expect(registerRes.status).toBe(400);
  expect(registerRes.body.message).toBe('name, email, and password are required');
});

test('missing email register', async () => {
  delete testUser.email;
  const registerRes = await request(app).post('/api/auth').send(testUser);
  expect(registerRes.status).toBe(400);
  expect(registerRes.body.message).toBe('name, email, and password are required');
});

test('missing password register', async () => {
  delete testUser.password;
  const registerRes = await request(app).post('/api/auth').send(testUser);
  expect(registerRes.status).toBe(400);
  expect(registerRes.body.message).toBe('name, email, and password are required');
});

test('missing all fields register', async () => { 
  const registerRes = await request(app).post('/api/auth').send({});
  expect(registerRes.status).toBe(400);
  expect(registerRes.body.message).toBe('name, email, and password are required');
});

test('updateUser', async () => {
  let testAdmin = await createAdminUser();
  const loginRes = await request(app).put('/api/auth').send(testAdmin);
  let testAdminAuthToken = loginRes.body.token;

  const updatedEmail = 'updated' + testAdmin.email;
  testAdmin.email = updatedEmail;
  
  const updateUserRes = await request(app)
    .put(`/api/auth/${testAdmin.id}`)
    .set('Authorization', `Bearer ${testAdminAuthToken}`)
    .send(testAdmin);

  expect(updateUserRes.status).toBe(200);
  expect(updateUserRes.body.email).toBe(updatedEmail);
});
