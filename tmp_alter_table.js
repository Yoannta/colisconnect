const {Client} = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:DIh%20000474272@db.cftijcrpawnjmmpkigei.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});
(async () => {
  await client.connect();
  await client.query("ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS kg INTEGER DEFAULT 0");
  await client.query("ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0");
  await client.query("ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT ''");
  console.log('Colonnes ajoutees avec succes !');
  const {rows} = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name IN ('reservations','offers') ORDER BY table_name, ordinal_position");
  console.table(rows);
  await client.end();
})().catch(err => { console.error('ERREUR:', err.message); process.exit(1); });
