const request = require("supertest");
const app = require("../service");
const { Role, DB } = require("../database/database.js");

const testUser = {
  name: "franchiseRouter test user",
  email: "reg@test.com",
  password: "a",
};
let testUserAuthToken;
let adminUser;
let adminUserAuthToken;
let testFranchiseId;
let testStoreId;

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
  let user = { password: "toomanysecrets", roles: [{ role: Role.Admin }] };
  user.name = "franchiseRouter testAdmin";
  user.email = randomName() + "@admin.com";

  user = await DB.addUser(user);

  user.password = "toomanysecrets";
  return user;
}

beforeAll(async () => {
  testUser.email = randomName() + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;

  adminUser = await createAdminUser();
  const adminLoginRes = await request(app)
    .put("/api/auth")
    .send({ email: adminUser.email, password: adminUser.password });
  adminUserAuthToken = adminLoginRes.body.token;
});

test("getFranchises", async () => {
  const res = await request(app)
    .get("/api/franchise")
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(res.statusCode).toEqual(200);
  expect(res.body).toBeInstanceOf(Array);
});

test("getUserFranchises", async () => {
  const res = await request(app)
    .get(`/api/franchise/${testUser.id}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(res.statusCode).toEqual(200);
  expect(res.body).toBeInstanceOf(Array);
});

test("createFranchise", async () => {
  const franchiseData = {
    name: randomName(),
    admins: [{ email: adminUser.email }],
  };
  const res = await request(app)
    .post("/api/franchise")
    .send(franchiseData)
    .set("Authorization", `Bearer ${adminUserAuthToken}`);
  expect(res.statusCode).toEqual(200);
  expect(res.body.name).toEqual(franchiseData.name);
  testFranchiseId = res.body.id;
});

test("deleteFranchise", async () => {
  const res = await request(app)
    .delete(`/api/franchise/${testFranchiseId}`)
    .set("Authorization", `Bearer ${adminUserAuthToken}`);
  expect(res.statusCode).toEqual(200);
  expect(res.body.message).toEqual("franchise deleted");
});

test("createStore", async () => {
  const franchiseData = {
    name: randomName(),
    admins: [{ email: adminUser.email }],
  };
  const createFranchiseRes = await request(app)
    .post("/api/franchise")
    .send(franchiseData)
    .set("Authorization", `Bearer ${adminUserAuthToken}`);
  testFranchiseId = createFranchiseRes.body.id;

  const storeData = { franchiseId: testFranchiseId, name: "SLC" };
  const res = await request(app)
    .post(`/api/franchise/${testFranchiseId}/store`)
    .send(storeData)
    .set("Authorization", `Bearer ${adminUserAuthToken}`);
  expect(res.statusCode).toEqual(200);
  expect(res.body.name).toEqual(storeData.name);
});

test("deleteStore", async () => {
  const res = await request(app)
    .delete(`/api/franchise/${testFranchiseId}/store/${testStoreId}`)
    .set("Authorization", `Bearer ${adminUserAuthToken}`);
  expect(res.statusCode).toEqual(200);
  expect(res.body.message).toEqual("store deleted");
});
