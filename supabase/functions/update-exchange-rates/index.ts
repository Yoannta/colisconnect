import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Source fiable : fawazahmed0/exchange-api — mise à jour quotidienne
const API_URL = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json";
const API_FALLBACK = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.min.json";

// Cryptomonnaies à exclure (on ne garde que les devises FIAT)
const CRYPTO_SET = new Set([
  "1inch","aave","ada","akt","algo","amp","ape","apt","ar","arb","atom","avax","axs",
  "bat","bch","blur","bnb","btc","celo","chr","chz","comp","cro","crv","cvx","dai",
  "dash","doge","dot","egld","enj","eos","etc","eth","fet","fil","floki","flow",
  "ftm","fxs","gala","gmx","grt","hbar","hnt","icp","imx","inj","iost","iotx",
  "jup","kava","kcs","kda","klay","ksm","ldo","link","lrc","lsi","lto","luna",
  "man","mana","matic","meme","mina","mkr","near","neo","nexo","nkn","nmr",
  "ocean","okb","omg","ondo","one","ont","op","orca","pepe","pyth","qnt",
  "rbn","rndr","rose","rune","sand","sei","shib","snx","sol","stark","steth",
  "storj","stx","sui","sushi","theta","tia","ton","trx","tusd","uni","usdc",
  "usdd","usdp","usdt","vet","wbtc","wld","woo","xdc","xem","xlm","xmr",
  "xrp","xtz","yfi","zec","zen","zil","zrx"
]);

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const startTime = Date.now();

  try {
    // 1. Récupérer les taux depuis l'API
    const rates = await fetchExchangeRates();
    const { date, fiatRates } = rates;

    console.log(`[update-exchange-rates] ${fiatRates.length} devises FIAT récupérées (date: ${date})`);

    // 2. Connexion Supabase avec le service_role (autorisé en Edge Function)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Upsert par lots dans exchange_rates
    const BATCH_SIZE = 50;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < fiatRates.length; i += BATCH_SIZE) {
      const batch = fiatRates.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("exchange_rates")
        .upsert(batch, { onConflict: "currency_code" });

      if (error) {
        console.error(`[update-exchange-rates] Erreur batch ${i / BATCH_SIZE + 1}:`, error.message);
        errors++;
      } else {
        inserted += batch.length;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const message = `✅ ${inserted} devises mises à jour (date: ${date}) en ${elapsed}s — ${errors} erreurs`;

    console.log(`[update-exchange-rates] ${message}`);

    return new Response(
      JSON.stringify({
        success: true,
        message,
        date,
        currencies_count: inserted,
        errors,
        elapsed_seconds: parseFloat(elapsed),
      }),
      {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const errorMsg = err instanceof Error ? err.message : String(err);

    console.error(`[update-exchange-rates] ❌ Erreur: ${errorMsg}`);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
        elapsed_seconds: parseFloat(elapsed),
      }),
      {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

async function fetchExchangeRates(): Promise<{ date: string; fiatRates: Array<{ currency_code: string; rate_to_eur: number; updated_at: string }> }> {
  let data: any;

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (_err) {
    console.warn("[update-exchange-rates] Fallback vers l'API secondaire...");
    const res = await fetch(API_FALLBACK);
    if (!res.ok) throw new Error(`Fallback HTTP ${res.status}`);
    data = await res.json();
  }

  const date = data.date;
  const eurRates = data.eur;

  if (!eurRates || !date) {
    throw new Error("Format de données invalide depuis l'API");
  }

  const fiatRates: Array<{ currency_code: string; rate_to_eur: number; updated_at: string }> = [];

  for (const [code, rate] of Object.entries(eurRates)) {
    // Ignorer les cryptomonnaies
    if (CRYPTO_SET.has(code)) continue;
    if (typeof rate !== "number" || rate <= 0) continue;

    fiatRates.push({
      currency_code: code.toUpperCase(),
      rate_to_eur: rate,
      updated_at: date,
    });
  }

  return { date, fiatRates };
}
