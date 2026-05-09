/**
 * Registre des monnaies par pays (ColisConnect)
 */
const COUNTRY_CURRENCIES = {
    // Afrique de l'Ouest (XOF)
    "Bénin": "XOF", "Burkina Faso": "XOF", "Côte d'Ivoire": "XOF", "Guinée-Bissau": "XOF", "Mali": "XOF", "Niger": "XOF", "Sénégal": "XOF", "Togo": "XOF",
    // Afrique Centrale (XAF)
    "Cameroun": "XAF", "République centrafricaine": "XAF", "République du Congo": "XAF", "Gabon": "XAF", "Guinée équatoriale": "XAF", "Tchad": "XAF",
    // Afrique du Nord
    "Algérie": "DZD", "Égypte": "EGP", "Libye": "LYD", "Maroc": "MAD", "Tunisie": "TND", "Sahara occidental": "MAD",
    // Reste de l'Afrique
    "Afrique du Sud": "ZAR", "Angola": "AOA", "Botswana": "BWP", "Burundi": "BIF", "Cap-Vert": "CVE", "Comores": "KMF", "Djibouti": "DJF", "Érythrée": "ERN", "Éthiopie": "ETB", "Gambie": "GMD", "Ghana": "GHS", "Guinée": "GNF", "Kenya": "KES", "Lesotho": "LSL", "Liberia": "LRD", "Madagascar": "MGA", "Malawi": "MWK", "Maurice": "MUR", "Mauritanie": "MRU", "Mozambique": "MZN", "Namibie": "NAD", "Nigeria": "NGN", "Ouganda": "UGX", "Rwanda": "RWF", "Sao Tomé-et-Principe": "STN", "Seychelles": "SCR", "Sierra Leone": "SLL", "Somalie": "SOS", "Soudan": "SDG", "Soudan du Sud": "SSP", "Eswatini": "SZL", "Tanzanie": "TZS", "Zambie": "ZMW", "Zimbabwe": "ZWL", "République démocratique du Congo": "CDF",
    // Europe (Euro)
    "Allemagne": "EUR", "Andorre": "EUR", "Autriche": "EUR", "Belgique": "EUR", "Chypre": "EUR", "Croatie": "EUR", "Espagne": "EUR", "Estonie": "EUR", "Finlande": "EUR", "France": "EUR", "Grèce": "EUR", "Irlande": "EUR", "Italie": "EUR", "Lettonie": "EUR", "Lituanie": "EUR", "Luxembourg": "EUR", "Malte": "EUR", "Monaco": "EUR", "Monténégro": "EUR", "Pays-Bas": "EUR", "Portugal": "EUR", "Saint-Marin": "EUR", "Slovaquie": "EUR", "Slovénie": "EUR", "Vatican": "EUR",
    // Reste de l'Europe
    "Albanie": "ALL", "Arménie": "AMD", "Azerbaïdjan": "AZN", "Biélorussie": "BYN", "Bosnie-Herzégovine": "BAM", "Bulgarie": "BGN", "Danemark": "DKK", "Géorgie": "GEL", "Hongrie": "HUF", "Islande": "ISK", "Kazakhstan": "KZT", "Liechtenstein": "CHF", "Macédoine du Nord": "MKD", "Moldavie": "MDL", "Norvège": "NOK", "Pologne": "PLN", "Roumanie": "RON", "Royaume-Uni": "GBP", "Russie": "RUB", "Serbie": "RSD", "Suède": "SEK", "Suisse": "CHF", "République tchèque": "CZK", "Turquie": "TRY", "Ukraine": "UAH",
    // Moyen-Orient
    "Arabie Saoudite": "SAR", "Bahreïn": "BHD", "Émirats Arabes Unis": "AED", "Irak": "IQD", "Iran": "IRR", "Israël": "ILS", "Jordanie": "JOD", "Koweït": "KWD", "Liban": "LBP", "Oman": "OMR", "Palestine": "ILS", "Qatar": "QAR", "Syrie": "SYP", "Yémen": "YER",
    // Asie
    "Afghanistan": "AFN", "Bangladesh": "BDT", "Bhoutan": "BTN", "Birmanie": "MMK", "Brunei": "BND", "Cambodge": "KHR", "Chine": "CNY", "Corée du Nord": "KPW", "Corée du Sud": "KRW", "Hong Kong": "HKD", "Inde": "INR", "Indonésie": "IDR", "Japon": "JPY", "Kirghizistan": "KGS", "Laos": "LAK", "Macao": "MOP", "Malaisie": "MYR", "Maldives": "MVR", "Mongolie": "MNT", "Népal": "NPR", "Ouzbékistan": "UZS", "Pakistan": "PKR", "Philippines": "PHP", "Singapour": "SGD", "Sri Lanka": "LKR", "Tadjikistan": "TJS", "Taïwan": "TWD", "Thaïlande": "THB", "Timor oriental": "USD", "Turkménistan": "TMT", "Vietnam": "VND",
    // Amériques
    "Bahamas": "BSD", "Barbade": "BBD", "Belize": "BZD", "Canada": "CAD", "Costa Rica": "CRC", "Cuba": "CUP", "Dominique": "XCD", "États-Unis": "USD", "Grenade": "XCD", "Guatemala": "GTQ", "Haïti": "HTG", "Honduras": "HNL", "Jamaïque": "JMD", "Mexique": "MXN", "Nicaragua": "NIO", "Panama": "USD", "République dominicaine": "DOP", "Saint-Kitts-et-Nevis": "XCD", "Sainte-Lucie": "XCD", "Saint-Vincent-et-les Grenadines": "XCD", "Salvador": "USD", "Trinité-et-Tobago": "TTD",
    "Argentine": "ARS", "Bolivie": "BOB", "Brésil": "BRL", "Chili": "CLP", "Colombie": "COP", "Équateur": "USD", "Guyana": "GYD", "Paraguay": "PYG", "Pérou": "PEN", "Suriname": "SRD", "Uruguay": "UYU", "Venezuela": "VES",
    // Océanie
    "Australie": "AUD", "Fidji": "FJD", "Kiribati": "AUD", "Nauru": "AUD", "Nouvelle-Zélande": "NZD", "Palaos": "USD", "Papouasie-Nouvelle-Guinée": "PGK", "Salomon": "SBD", "Samoa": "WST", "Tonga": "TOP", "Tuvalu": "AUD", "Vanuatu": "VUV"
};

/**
 * Retourne le code de monnaie pour un pays donné.
 * Par défaut renvoie EUR si non trouvé.
 */
function getCurrencyByCountry(countryName) {
    if (!countryName) return "EUR";
    return COUNTRY_CURRENCIES[countryName] || "EUR";
}

module.exports = { COUNTRY_CURRENCIES, getCurrencyByCountry };
