const { DatabaseSync } = require('node:sqlite');
const assert = require('assert');

async function test() {
    const api = async (path, method = 'GET', body = null, token = null) => {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`http://localhost:8080${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        });
        const data = await res.json();
        if (!res.ok) {
            const errorMsg = data.detail ? `${data.error} (Detail: ${data.detail})` : data.error;
            throw new Error(errorMsg);
        }
        return data;
    };

    try {
        console.log("Registering Bob (User A)");
        const bob = await api("/api/auth/register", "POST", { fullName: "Bob", email: `bob${Date.now()}@test.com`, password: "password123" });
        // Force verification in DB
        const db = new DatabaseSync('colisconnect.sqlite');
        db.prepare("UPDATE users SET is_verified = 1, role = 'user' WHERE id = ?").run(bob.user.id);

        console.log("Registering Alice (User B)");
        const alice = await api("/api/auth/register", "POST", { fullName: "Alice", email: `alice${Date.now()}@test.com`, password: "password123" });
        db.prepare("UPDATE users SET is_verified = 1, role = 'user' WHERE id = ?").run(alice.user.id);

        console.log("Bob creates offer...");
        const offer = await api("/api/offers", "POST", {
            title: "Paris -> Dakar",
            origin: "Paris",
            destination: "Dakar",
            departureDate: "2026-10-10",
            availableKg: 10,
            pricePerKg: 15
        }, bob.token);

        console.log("Initial DB Reservations count...");
        const resCount1 = db.prepare('SELECT count(*) as c FROM reservations').get().c;

        console.log("Alice opens conversation for Bob's offer...");
        const thread = await api("/api/conversations/by-offer", "POST", { offerId: offer.id }, alice.token);
        console.log("Thread created:", thread);

        console.log("Checking DB Reservations after thread creation...");
        const resCount2 = db.prepare('SELECT count(*) as c FROM reservations').get().c;
        console.log(`Reservations before: ${resCount1}, after: ${resCount2} (should be equal!)`);

        assert.strictEqual(resCount1, resCount2, "Slop action detected! A reservation was created by mistake!");
        assert.strictEqual(thread.offerId, offer.id, "Thread must have offerId populated");
        assert.strictEqual(thread.reservationId, null, "Thread reservationId must be null");

        console.log("Alice checking her inbox...");
        const aliceInbox = await api("/api/conversations", "GET", null, alice.token);
        assert.strictEqual(aliceInbox.length, 1);
        assert.strictEqual(aliceInbox[0].offerTitle, offer.title, "Offer title must be correctly fetched via JOIN");

        console.log("Alice pays for the offer...");
        const payment = await api(`/api/conversations/${thread.id}/payment`, "POST", {
            receiptImage: "data:image/png;base64,payment",
            amountPaid: 150
        }, alice.token);

        console.log("Payment completed. Reservation dynamically created...");
        const resCount3 = db.prepare('SELECT count(*) as c FROM reservations').get().c;
        console.log(`Reservations after payment: ${resCount3} (should be ${resCount1 + 1})`);
        assert.strictEqual(resCount3, resCount1 + 1, "Reservation was strictly created upon payment");

        console.log("VERIFICATION SUCCESS - Anti-Slop measures are active.");
    } catch (e) {
        console.error("TEST FAILED:", e.message);
    }
}

test();
