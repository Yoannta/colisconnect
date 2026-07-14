#!/usr/bin/env node
/**
 * update-exchange-rates.js
 * 
 * Met à jour les taux de change dans Supabase depuis fawazahmed0/currency-api
 * 
 * Utilisation :
 *   node scripts/update-exchange-rates.js
 * 
 * Peut être exécuté manuellement ou via une tâche CRON (quotidiennement)
 * 
 * Source : https://github.com/fawazahmed0/exchange-api
 * CDN    : https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json
 */

const SUPABASE_URL = "https://cftijcrpawnjmmpkigei.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmdGlqY3JwYXduam1tcGtpZ2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTkwNzMsImV4cCI6MjA5NTc3NTA3M30.9gsGiyL9mxUKbKwwoUK9ToNOApYgZcfT15mszBVJfLM";
const API_URL = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json";
const API_FALLBACK = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.min.json";

async function main() {
  console.log("[update-exchange-rates] Démarrage...");

  // 1. Fetch des taux depuis l'API
  let data;
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.warn("[update-exchange-rates] Échec API principale, tentative fallback...", err.message);
    try {
      const res = await fetch(API_FALLBACK);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (err2) {
      throw new Error(`Impossible de récupérer les taux: ${err2.message}`);
    }
  }

  const date = data.date;
  const rates = data.eur;

  if (!rates || !date) {
    throw new Error("Format de données invalide: " + JSON.stringify(data).substring(0, 200));
  }

  // Filtrer uniquement les devises ISO 4217 (3 lettres, minuscules, pas de crypto)
  // On garde les crypto mais on les marque différemment... Non, on les exclut.
  // Liste des devises à exclure (cryptos et tokens)
  const cryptoSet = new Set([
    "1inch","aave","ada","akt","algo","amp","ape","apt","ar","arb","atom","avax","axs",
    "bat","bch","blur","bnb","btc","celo","chr","chz","comp","cro","crv","cvx","dai",
    "dash","doge","dot","egld","enj","eos","etc","eth","fet","fil","floki","flow",
    "ftm","fxs","gala","gmx","grt","hbar","hnt","icp","imx","inj","iost","iotx",
    "jup","kava","kcs","kda","klay","ksm","ldo","link","lrc","lsi","lto","luna",
    "man","mana","matic","meme"," Mina","mkr","near","neo","nexo","nkn","nMR",
    "ocean","okb","omg","ondo","one","ont","op","orca","pepe","pyth","qnt",
    "rbn","rndr","rose","rune","sand","sei","shib","snx","sol","stark","steth",
    "storj","stx","sui","sushi","theta","tia","ton","trx","tusd","uni","usdc",
    "usdd","usdp","usdt","vet","wbtc","wld","woo","xdc","xem","xlm","xmr",
    "xrp","xtz","yfi","zec","zen","zil","zrx"
  ]);

  // Convertir en tableau pour upsert
  const today = date; // Déjà au format YYYY-MM-DD
  const rows = [];
  let skippedCrypto = 0;

  for (const [code, rate] of Object.entries(rates)) {
    if (cryptoSet.has(code)) {
      skippedCrypto++;
      continue;
    }
    if (typeof rate !== "number" || rate <= 0) continue;
    rows.push({
      currency_code: code.toUpperCase(),
      rate_to_eur: rate,
      updated_at: today
    });
  }

  console.log(`[update-exchange-rates] ${rows.length} devises à mettre à jour (${skippedCrypto} crypto ignorées)`);
  console.log(`[update-exchange-rates] Date des taux: ${today}`);

  // 2. Upsert dans Supabase
  const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Insert par lots de 50 pour éviter les timeouts
  const BATCH_SIZE = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    try {
      // Upsert: on insère ou on met à jour si le code devise existe déjà
      const { error } = await supabase
        .from("exchange_rates")
        .upsert(batch, { onConflict: "currency_code" });

      if (error) {
        console.error(`[update-exchange-rates] Erreur batch ${i / BATCH_SIZE + 1}:`, error.message);
        errors++;
      } else {
        inserted += batch.length;
      }
    } catch (err) {
      console.error(`[update-exchange-rates] Exception batch ${i / BATCH_SIZE + 1}:`, err.message);
      errors++;
    }

    // Petite pause entre les lots
    if (i + BATCH_SIZE < rows.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`[update-exchange-rates] ✅ Terminé: ${inserted} devises insérées/mises à jour, ${errors} erreurs`);
}

/**
 * Crée un client Supabase minimal (sans dépendance npm)
 */
function createSupabaseClient(url, anonKey) {
  const supabase = {
    from: (table) => ({
      upsert: async (rows, opts = {}) => {
        let endpoint = `${url}/rest/v1/${table}`;
        if (opts.onConflict) {
          endpoint += `?on_conflict=${opts.onConflict}`;
        }
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": anonKey,
            "Authorization": `Bearer ${anonKey}`,
            "Prefer": "resolution=merge-duplicates"
          },
          body: JSON.stringify(rows)
        });
        if (!res.ok) {
          const text = await res.text();
          return { error: new Error(`HTTP ${res.status}: ${text}`) };
        }
        return { error: null };
      }
    })
  };
  return supabase;
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("[update-exchange-rates] ❌ Erreur fatale:", err.message);
    process.exit(1);
  });
