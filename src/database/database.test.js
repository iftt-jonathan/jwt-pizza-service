const { Role, DB } = require("../database/database.js");

const testUser = {
  name: "DB test user",
  email: "reg@test.com",
  password: "b",
  roles: [{ role: Role.Diner }],
};

const testAdmin = {
  name: "DB test admin",
  email: "reg@admin.com",
  password: "c",
  roles: [{ role: Role.Admin }],
};

const testFranchise = {
  name: "DB test franchise",
  admins: [{ email: "" }],
};

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

let connection;

beforeAll(async () => {
  connection = await DB.getConnection();
  testUser.email = randomName() + "@test.com";
  testAdmin.email = randomName() + "@admin.com";
  testFranchise.name = randomName() + " franchise";
  testFranchise.admins[0].email = testAdmin.email;
});

afterAll(async () => {
  connection.end();
});

test("addUser", async () => {
  const user = { ...testUser, roles: [{ role: Role.Diner }] };
  const addedUser = await DB.addUser(user);

  expect(addedUser).toMatchObject({
    name: user.name,
    email: user.email,
    roles: user.roles,
    id: expect.any(Number),
    password: undefined,
  });

  const [rows] = await connection.query("SELECT * FROM user WHERE email=?", [
    user.email,
  ]);

  expect(rows.length).toBe(1);
  expect(rows[0].name).toBe(user.name);
  expect(rows[0].email).toBe(user.email);
});

test("getUser", async () => {
  const user = await DB.getUser(testUser.email, testUser.password);
  expect(user).toMatchObject({
    name: testUser.name,
    email: testUser.email,
    roles: testUser.roles,
    id: expect.any(Number),
    password: undefined,
  });
});

test("updateUser", async () => {
  const testUserId = await DB.getID(
    connection,
    "email",
    testUser.email,
    "user"
  );
  const user = await DB.updateUser(
    testUserId,
    "newEmail" + testUser.email,
    testUser.password
  );
  expect(user).toMatchObject({
    name: testUser.name,
    email: "newEmail" + testUser.email,
    roles: testUser.roles,
    id: testUserId,
    password: undefined,
  });
});

test("createFranchise", async () => {
  await DB.addUser(testAdmin);
  const franchise = await DB.createFranchise(testFranchise);
  expect(franchise).toMatchObject({
    admins: [{ email: testAdmin.email }],
  });
});

test("deleteFranchise", async () => {
  const franchiseId = await DB.getID(
    connection,
    "name",
    testFranchise.name,
    "franchise"
  );
  await DB.deleteFranchise(franchiseId);

  const [rows] = await connection.query("SELECT * FROM franchise WHERE id=?", [
    franchiseId,
  ]);

  expect(rows.length).toBe(0);
});

test("getFranchise", async () => {
  const franchise = await DB.createFranchise(testFranchise);
  const fetchedFranchise = await DB.getFranchise(franchise);
  expect(fetchedFranchise).toMatchObject({
    name: testFranchise.name,
    admins: [{ email: testAdmin.email }],
  });
});

test("getUserFranchises", async () => {
  const userId = await DB.getID(connection, "email", testAdmin.email, "user");
  const userFranchises = await DB.getUserFranchises(userId);
  expect(userFranchises).toMatchObject([
    {
      name: testFranchise.name,
      admins: [{ email: testAdmin.email }],
    },
  ]);
});

test("createStore", async () => {
  testFranchise.name = randomName() + " franchise";
  const franchise = await DB.createFranchise(testFranchise);
  const store = await DB.createStore(franchise.id, { name: "test store" });
  expect(store).toMatchObject({
    name: "test store",
    franchiseId: franchise.id,
  });
});

test("deleteStore", async () => {
  testFranchise.name = randomName() + " franchise";
  const franchise = await DB.createFranchise(testFranchise);
  const store = await DB.createStore(franchise.id, { name: "test store" });
  await DB.deleteStore(franchise.id, store.id);

  const [rows] = await connection.query("SELECT * FROM store WHERE id=?", [
    store.id,
  ]);

  expect(rows.length).toBe(0);
});

test("getID", async () => {
  const user = await DB.addUser(testUser);
  const id = await DB.getID(connection, "email", testUser.email, "user");
  expect(id).toBe(user.id);
});
