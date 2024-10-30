const request = require("supertest");
const app = require("../service");
const { Role, DB } = require("../database/database.js");

const testUser = {
  name: "orderRouter test user",
  email: "reg@test.com",
  password: "a",
};
let adminUser;
let adminUserAuthToken;
let testUserAuthToken;

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
  let user = { password: "toomanysecrets", roles: [{ role: Role.Admin }] };
  user.name = "orderRouter testAdmin";
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

// test("getMenu", async () => {
//   const res = await request(app).get("/api/order/menu");
//   expect(res.statusCode).toEqual(200);
//   expect(res.body).toEqual(
//     expect.arrayContaining([
//       expect.objectContaining({
//         id: expect.any(Number),
//         title: expect.any(String),
//         image: expect.any(String),
//         price: expect.any(Number),
//         description: expect.any(String),
//       }),
//     ])
//   );
// });

test("addMenuItem", async () => {
  const newItem = {
    title: "Buffalo Chicken",
    description: "For the brave",
    image: "pizza.png",
    price: 0.0001,
  };
  const res = await request(app)
    .put("/api/order/menu")
    .set("Authorization", `Bearer ${adminUserAuthToken}`)
    .send(newItem);
  expect(res.statusCode).toEqual(200);
  expect(res.body).toEqual(
    expect.arrayContaining([expect.objectContaining(newItem)])
  );
});

test("addMenuItem no admin role", async () => {
  const newItem = {
    title: "Buffalo Chicken",
    description: "For the brave",
    image: "pizza.png",
    price: 0.0001,
  };
  const res = await request(app)
    .put("/api/order/menu")
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send(newItem);
  expect(res.statusCode).toEqual(403);
});

test("getOrders", async () => {
  const res = await request(app)
    .get("/api/order")
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(res.statusCode).toEqual(200);
  expect(res.body).toHaveProperty("orders");
  expect(res.body.orders).toBeInstanceOf(Array);
});

// test("createOrder", async () => {
//   const newOrder = {
//     franchiseId: 1,
//     storeId: 1,
//     items: [{ menuId: 6, description: "Buffalo Chicken", price: 0.0001 }],
//   };
//   const res = await request(app)
//     .post("/api/order")
//     .set("Authorization", `Bearer ${testUserAuthToken}`)
//     .send(newOrder);
//   expect(res.statusCode).toEqual(200);
//   expect(res.body).toHaveProperty("order");
//   expect(res.body.order).toEqual(expect.objectContaining(newOrder));
//   expect(res.body).toHaveProperty("jwt");
// });
