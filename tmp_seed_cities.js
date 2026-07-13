const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:DIh%20000474272@db.cftijcrpawnjmmpkigei.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000
});

async function run() {
  await client.connect();
  console.log('Connecté');

  // 1. Créer les tables
  await client.query(`
    CREATE TABLE IF NOT EXISTS countries (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );
  `);
  console.log('Table countries OK');

  await client.query(`
    CREATE TABLE IF NOT EXISTS cities (
      id SERIAL PRIMARY KEY,
      country_code TEXT NOT NULL REFERENCES countries(code),
      name TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cities_country ON cities(country_code);
    CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);
  `);
  console.log('Table cities OK');

  // 2. Pays depuis COUNTRY_CURRENCIES (correspondance nom -> code)
  const countryCodes = {
    "France":"FR","Sénégal":"SN","Côte d'Ivoire":"CI","Mali":"ML","Burkina Faso":"BF",
    "Niger":"NE","Togo":"TG","Bénin":"BJ","Cameroun":"CM","Congo":"CG","Gabon":"GA",
    "Guinée":"GN","Guinée-Bissau":"GW","Guinée équatoriale":"GQ","Angola":"AO",
    "Cap-Vert":"CV","Sao Tomé-et-Principe":"ST","Mauritanie":"MR","Madagascar":"MG",
    "Maroc":"MA","Algérie":"DZ","Tunisie":"TN","Égypte":"EG","Nigeria":"NG",
    "Ghana":"GH","Kenya":"KE","Afrique du Sud":"ZA","Éthiopie":"ET","Rwanda":"RW",
    "Belgique":"BE","Suisse":"CH","Canada":"CA","États-Unis":"US","Allemagne":"DE",
    "Italie":"IT","Espagne":"ES","Portugal":"PT","Pays-Bas":"NL","Royaume-Uni":"GB",
    "Chine":"CN","Inde":"IN","Brésil":"BR","Japon":"JP","Turquie":"TR","Russie":"RU",
    "Congo RDC":"CD","République centrafricaine":"CF","Tchad":"TD","Soudan":"SD",
    "Soudan du Sud":"SS","Burundi":"BI","Tanzanie":"TZ","Zambie":"ZM","Zimbabwe":"ZW",
    "Mozambique":"MZ","Malawi":"MW","Namibie":"NA","Botswana":"BW","Lesotho":"LS",
    "Eswatini":"SZ","Liberia":"LR","Sierra Leone":"SL","Somalie":"SO","Érythrée":"ER",
    "Djibouti":"DJ","Gambie":"GM","Comores":"KM","Maurice":"MU","Seychelles":"SC",
    "Émirats Arabes Unis":"AE","Arabie Saoudite":"SA","Qatar":"QA","Koweït":"KW",
    "Israël":"IL","Liban":"LB","Jordanie":"JO","Vietnam":"VN","Thaïlande":"TH",
    "Indonésie":"ID","Malaisie":"MY","Singapour":"SG","Philippines":"PH",
    "Corée du Sud":"KR","Australie":"AU","Nouvelle-Zélande":"NZ","Mexique":"MX",
    "Colombie":"CO","Argentine":"AR","Pérou":"PE","Chili":"CL","Venezuela":"VE",
    "Suède":"SE","Norvège":"NO","Danemark":"DK","Finlande":"FI","Irlande":"IE",
    "Pologne":"PL","République tchèque":"CZ","Autriche":"AT","Hongrie":"HU",
    "Roumanie":"RO","Bulgarie":"BG","Grèce":"GR","Estonie":"EE","Lettonie":"LV",
    "Lituanie":"LT","Slovaquie":"SK","Slovénie":"SI","Croatie":"HR",
    "Bosnie-Herzégovine":"BA","Serbie":"RS","Monténégro":"ME","Macédoine du Nord":"MK",
    "Albanie":"AL","Ukraine":"UA","Biélorussie":"BY","Moldavie":"MD","Géorgie":"GE",
    "Arménie":"AM","Azerbaïdjan":"AZ","Kazakhstan":"KZ","Ouzbékistan":"UZ",
    "Pakistan":"PK","Bangladesh":"BD","Sri Lanka":"LK","Népal":"NP","Afghanistan":"AF",
    "Yémen":"YE","Oman":"OM","Bahreïn":"BH","Irak":"IQ","Iran":"IR","Syrie":"SY",
    "Mongolie":"MN","Cuba":"CU","République dominicaine":"DO","Haïti":"HT",
    "Panama":"PA","Costa Rica":"CR","Guatemala":"GT","Uruguay":"UY","Paraguay":"PY",
    "Bolivie":"BO","Équateur":"EC","Honduras":"HN","Nicaragua":"NI","Salvador":"SV",
    "Barbade":"BB","Trinité-et-Tobago":"TT","Andorre":"AD","Liechtenstein":"LI",
    "Malte":"MT","Monaco":"MC","Saint-Marin":"SM","Vatican":"VA","Bhoutan":"BT",
    "Maldives":"MV","Brunei":"BN","Fidji":"FJ","Kiribati":"KI","Nauru":"NR",
    "Palaos":"PW","Papouasie-Nouvelle-Guinée":"PG","Salomon":"SB","Samoa":"WS",
    "Tonga":"TO","Tuvalu":"TV","Vanuatu":"VU","Timor oriental":"TL","Bahamas":"BS",
    "Belize":"BZ","Dominique":"DM","Grenade":"GD","Saint-Kitts-et-Nevis":"KN",
    "Sainte-Lucie":"LC","Saint-Vincent-et-les Grenadines":"VC","Suriname":"SR",
    "Guyana":"GY","Sahara occidental":"EH","Libye":"LY","Botswana":"BW"
  };

  // Insérer les pays
  for (const [name, code] of Object.entries(countryCodes)) {
    await client.query(
      'INSERT INTO countries (code, name) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING',
      [code, name]
    );
  }
  console.log('Pays insérés');

  // 3. Insérer les villes depuis le fichier JSON
  const citiesData = require('./cities.json');
  let count = 0;
  for (const [countryName, villes] of Object.entries(citiesData)) {
    const code = countryCodes[countryName];
    if (!code || !Array.isArray(villes)) continue;
    for (const ville of villes) {
      try {
        await client.query(
          'INSERT INTO cities (country_code, name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [code, ville]
        );
        count++;
      } catch (e) {
        // ignore doublons
      }
    }
  }
  console.log(`${count} villes insérées`);
  await client.end();
  console.log('Terminé');
}

run().catch(err => { console.error('Erreur:', err.message); process.exit(1); });
