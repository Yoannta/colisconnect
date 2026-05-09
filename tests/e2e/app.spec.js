const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { DatabaseSync } = require("node:sqlite");

const FIXTURE_PATH = path.join(__dirname, "..", "..", ".playwright", "fixtures.json");
const DB_PATH = path.join(__dirname, "..", "..", "backend", "colisconnect.sqlite");

function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

function readFixtures() {
  return JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8"));
}

function approveUserForPublishing(email) {
  const db = new DatabaseSync(DB_PATH);
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
  db.close();
}

async function login(page, user) {
  await page.goto("/auth.html");
  await page.fill("#login-email", user.email);
  await page.fill("#login-password", user.password);
  await page.locator("#login-form button[type='submit']").click();
  await page.waitForURL(/dashboard\.html|verification\.html/, { timeout: 15000 });
}

test.describe("ColisConnect critical flows", () => {
  test("newly registered user is sent to verification", async ({ page }) => {
    await page.goto("/auth.html");
    await page.locator("#register-selection-panel .selection-card[data-role='user']").click();
    await page.fill("#register-name", "Playwright Fresh User");
    await page.fill("#register-email", uniqueEmail("playwright-fresh"));
    await page.fill("#register-password", "Playwright123!");
    await page.fill("#register-country", "France");
    await page.locator("#register-fields-panel button[type='submit']").click();

    await expect(page).toHaveURL(/verification\.html/);
    await expect(page.locator("#verification-progress-label")).toContainText("Profil incomplet");
  });

  test("signup to offer publishing flow works visually", async ({ page }) => {
    const email = uniqueEmail("playwright-signup-publish");
    const password = "Playwright123!";

    await page.goto("/auth.html");
    await page.locator("#register-selection-panel .selection-card[data-role='user']").click();
    await page.fill("#register-name", "Playwright Visual Seller");
    await page.fill("#register-email", email);
    await page.fill("#register-password", password);
    await page.fill("#register-country", "France");
    await page.locator("#register-fields-panel button[type='submit']").click();

    await expect(page).toHaveURL(/verification\.html/);

    // On débloque le compte de test pour éviter l'attente KYC réelle.
    approveUserForPublishing(email);

    await page.goto("/post_trip.html");
    await page.fill("#departure", "France");
    await page.fill("#destination", "Senegal");
    await page.fill("#date-depart", "2026-12-21");
    await page.fill("#kilos", "6");
    await page.fill("#price", "28");

    await page.locator("#open-payment-method-btn").click();
    await expect(page.locator("#payment-method-modal")).toBeVisible();

    const firstMethod = page.locator(".pm-text-btn").first();
    await expect(firstMethod).toBeVisible();
    await firstMethod.click();

    await page.fill("#pm-phone-number", "+221770000001");
    await page.locator("#pm-confirm-btn").click();

    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#submit-trip-btn").click();

    await expect(page).toHaveURL(/results\.html/);
  });

  test("real restricted signup flow blocks publishing before approval", async ({ page }) => {
    const email = uniqueEmail("playwright-real-restriction");

    await page.goto("/auth.html");
    await page.locator("#register-selection-panel .selection-card[data-role='user']").click();
    await page.fill("#register-name", "Playwright Restricted User");
    await page.fill("#register-email", email);
    await page.fill("#register-password", "Playwright123!");
    await page.fill("#register-country", "France");
    await page.locator("#register-fields-panel button[type='submit']").click();

    await expect(page).toHaveURL(/verification\.html/);
    await expect(page.locator("#verification-progress-label")).toContainText("Profil incomplet");

    await page.goto("/post_trip.html");
    await page.fill("#departure", "France");
    await page.fill("#destination", "Senegal");
    await page.fill("#date-depart", "2026-12-22");
    await page.fill("#kilos", "5");
    await page.fill("#price", "20");

    await page.locator("#open-payment-method-btn").click();
    await expect(page.locator("#payment-method-modal")).toBeVisible();
    await page.locator(".pm-text-btn").first().click();
    await page.fill("#pm-phone-number", "+221770000002");
    await page.locator("#pm-confirm-btn").click();

    await page.locator("#submit-trip-btn").click();

    await expect(page.locator("body")).toContainText("Profil incomplet");
  });

  test("verified buyer can browse offers and open a chat from results", async ({ page }) => {
    const fixtures = readFixtures();
    await login(page, fixtures.buyer);

    await page.goto("/results.html");
    await expect(page.locator("#offers-list .offer-compact-card").first()).toBeVisible();
    await expect(page.locator("#offers-list")).toContainText("Cote d'Ivoire");

    await page.locator("button[data-reserve-offer]").first().click();

    await expect(page).toHaveURL(/chat\.html\?offerId=/);
    await expect(page.locator("#chat-panel-header")).toBeVisible();
    await expect(page.locator("#messages-list")).toContainText("Conversation ouverte");
  });

  test("verified buyer can send a normal message in chat", async ({ page }) => {
    const fixtures = readFixtures();
    await login(page, fixtures.buyer);
    await page.goto(`/chat.html?offerId=${fixtures.seededOfferId}`);

    await expect(page.locator("#chat-panel-header")).toBeVisible();

    const message = "Bonjour equipe ColisConnect";
    await page.fill("#message-input", message);
    await page.locator("#message-form button[type='submit']").click();

    await expect(page.locator("#messages-list")).toContainText(message);
  });

  test("verified seller can publish a new trip through the UI", async ({ page }) => {
    const fixtures = readFixtures();
    await login(page, fixtures.seller);
    await page.goto("/post_trip.html");

    await page.fill("#departure", "France");
    await page.fill("#destination", "Senegal");
    await page.fill("#date-depart", "2026-12-20");
    await page.fill("#kilos", "8");
    await page.fill("#price", "30");

    await page.locator("#open-payment-method-btn").click();
    await expect(page.locator("#payment-method-modal")).toBeVisible();

    const firstMethod = page.locator(".pm-text-btn").first();
    await expect(firstMethod).toBeVisible();
    await firstMethod.click();

    await page.fill("#pm-phone-number", "+221770000000");
    await page.locator("#pm-confirm-btn").click();

    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#submit-trip-btn").click();

    await expect(page).toHaveURL(/results\.html/);
  });
});
