const path = require("node:path");
const { request } = require("@playwright/test");
const { DatabaseSync } = require("node:sqlite");

const DB_PATH = path.join(__dirname, "..", "..", "backend", "colisconnect.sqlite");
const FIXTURE_DIR = path.join(__dirname, "..", "..", ".playwright");
const FIXTURE_PATH = path.join(FIXTURE_DIR, "fixtures.json");

function nowIso() {
  return new Date().toISOString();
}

function plusDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function ensureVerifiedUser(db, email) {
  db.prepare(`
    UPDATE users
    SET
      phone_number = ?,
      identity_document = ?,
      profile_photo = ?,
      identity_document_approved = 1,
      profile_photo_approved = 1,
      is_verified = 1,
      kyc_status = 'approved',
      identity_rejection_reason = NULL
    WHERE email = ?
  `).run(
    "+33123456789",
    "data:image/png;base64,test-id",
    "data:image/png;base64,test-photo",
    email
  );
}

async function registerUser(apiContext, user) {
  const response = await apiContext.post("/api/auth/register", {
    data: {
      fullName: user.fullName,
      email: user.email,
      password: user.password,
      role: "user",
      country: user.country
    }
  });

  if (![200, 201, 409].includes(response.status())) {
    throw new Error(`Registration failed for ${user.email}: ${response.status()} ${await response.text()}`);
  }
}

async function loginUser(apiContext, user) {
  const response = await apiContext.post("/api/auth/login", {
    data: {
      email: user.email,
      password: user.password
    }
  });

  if (!response.ok()) {
    throw new Error(`Login failed for ${user.email}: ${response.status()} ${await response.text()}`);
  }

  return response.json();
}

async function createOffer(apiContext, token, offer) {
  const response = await apiContext.post("/api/offers", {
    headers: {
      Authorization: `Bearer ${token}`
    },
    data: offer
  });

  if (!response.ok()) {
    throw new Error(`Offer creation failed: ${response.status()} ${await response.text()}`);
  }

  return response.json();
}

module.exports = async () => {
  const fs = require("node:fs");
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  const buyer = {
    fullName: "Playwright Buyer",
    email: "playwright-buyer@example.com",
    password: "Playwright123!",
    country: "France"
  };

  const seller = {
    fullName: "Playwright Seller",
    email: "playwright-seller@example.com",
    password: "Playwright123!",
    country: "France"
  };

  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON");

  db.prepare("DELETE FROM users WHERE email IN (?, ?)").run(buyer.email, seller.email);

  const apiContext = await request.newContext({
    baseURL: "http://127.0.0.1:8080"
  });

  await registerUser(apiContext, buyer);
  await registerUser(apiContext, seller);

  ensureVerifiedUser(db, buyer.email);
  ensureVerifiedUser(db, seller.email);

  const buyerLogin = await loginUser(apiContext, buyer);
  const sellerLogin = await loginUser(apiContext, seller);

  db.prepare("DELETE FROM offers WHERE user_id = ?").run(Number(sellerLogin.user.id));

  const seededOffer = await createOffer(apiContext, sellerLogin.token, {
    title: "Trajet test Paris vers Abidjan",
    origin: "France",
    destination: "Cote d'Ivoire",
    departureDate: plusDays(7),
    availableKg: 12,
    pricePerKg: 25,
    baseCurrency: "EUR",
    paymentMethod: "bank",
    paymentQr: "+2250102030405",
    referralCode: ""
  });

  fs.writeFileSync(
    FIXTURE_PATH,
    JSON.stringify(
      {
        generatedAt: nowIso(),
        buyer,
        seller,
        seededOfferId: seededOffer.id
      },
      null,
      2
    )
  );

  await apiContext.dispose();
  db.close();
};
