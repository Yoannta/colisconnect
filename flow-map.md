# Flow Map

- Root: `C:\Users\hp\.gemini\antigravity\scratch\colis_connect`
- Files scanned: `74`

## Entry Points

| File | Reason |
|---|---|
| backend\server.js | filename:server.js |
| index.html | filename:index.html |
| main.js | filename:main.js |
| test save\backend\server.js | filename:server.js |
| test save\index.html | filename:index.html |
| test save\main.js | filename:main.js |

## UI Navigation Edges

| Source | Line | Target | Kind | Evidence |
|---|---:|---|---|---|
| .agent\skills\ui-ux-pro-max\scripts\design_system.py | 82 | - | client-nav | keywords = ui_cat.replace("/", " ").replace("-", " ").split() |
| .agent\skills\ui-ux-pro-max\scripts\design_system.py | 82 | / | client-nav | keywords = ui_cat.replace("/", " ").replace("-", " ").split() |
| .agent\skills\ui-ux-pro-max\scripts\design_system.py | 444 | + | client-nav | lines.append(f"- {anti_patterns.replace(' + ', newline_bullet)}") |
| .agent\skills\ui-ux-pro-max\scripts\design_system.py | 508 |  | client-nav | project_slug = project_name.lower().replace(' ', '-') |
| .agent\skills\ui-ux-pro-max\scripts\design_system.py | 529 |  | client-nav | page_file = pages_dir / f"{page.lower().replace(' ', '-')}.md" |
| .agent\skills\ui-ux-pro-max\scripts\design_system.py | 809 | - | client-nav | page_title = page_name.replace("-", " ").replace("_", " ").title() |
| .agent\skills\ui-ux-pro-max\scripts\design_system.py | 809 | _ | client-nav | page_title = page_name.replace("-", " ").replace("_", " ").title() |
| .agent\skills\ui-ux-pro-max\scripts\search.py | 62 | store_true | form-action | parser.add_argument("--json", action="store_true", help="Output as JSON") |
| .agent\skills\ui-ux-pro-max\scripts\search.py | 64 | store_true | form-action | parser.add_argument("--design-system", "-ds", action="store_true", help="Generate complete design system recommendation") |
| .agent\skills\ui-ux-pro-max\scripts\search.py | 68 | store_true | form-action | parser.add_argument("--persist", action="store_true", help="Save design system to design-system/MASTER.md (creates hierarchical structure)") |
| .agent\skills\ui-ux-pro-max\scripts\search.py | 88 |  | client-nav | project_slug = args.project_name.lower().replace(' ', '-') if args.project_name else "default" |
| .agent\skills\ui-ux-pro-max\scripts\search.py | 93 |  | client-nav | page_filename = args.page.lower().replace(' ', '-') |
| .codex\skills\ui-ux-pro-max\scripts\design_system.py | 82 | - | client-nav | keywords = ui_cat.replace("/", " ").replace("-", " ").split() |
| .codex\skills\ui-ux-pro-max\scripts\design_system.py | 82 | / | client-nav | keywords = ui_cat.replace("/", " ").replace("-", " ").split() |
| .codex\skills\ui-ux-pro-max\scripts\design_system.py | 444 | + | client-nav | lines.append(f"- {anti_patterns.replace(' + ', newline_bullet)}") |
| .codex\skills\ui-ux-pro-max\scripts\design_system.py | 508 |  | client-nav | project_slug = project_name.lower().replace(' ', '-') |
| .codex\skills\ui-ux-pro-max\scripts\design_system.py | 529 |  | client-nav | page_file = pages_dir / f"{page.lower().replace(' ', '-')}.md" |
| .codex\skills\ui-ux-pro-max\scripts\design_system.py | 809 | - | client-nav | page_title = page_name.replace("-", " ").replace("_", " ").title() |
| .codex\skills\ui-ux-pro-max\scripts\design_system.py | 809 | _ | client-nav | page_title = page_name.replace("-", " ").replace("_", " ").title() |
| .codex\skills\ui-ux-pro-max\scripts\search.py | 62 | store_true | form-action | parser.add_argument("--json", action="store_true", help="Output as JSON") |
| .codex\skills\ui-ux-pro-max\scripts\search.py | 64 | store_true | form-action | parser.add_argument("--design-system", "-ds", action="store_true", help="Generate complete design system recommendation") |
| .codex\skills\ui-ux-pro-max\scripts\search.py | 68 | store_true | form-action | parser.add_argument("--persist", action="store_true", help="Save design system to design-system/MASTER.md (creates hierarchical structure)") |
| .codex\skills\ui-ux-pro-max\scripts\search.py | 88 |  | client-nav | project_slug = args.project_name.lower().replace(' ', '-') if args.project_name else "default" |
| .codex\skills\ui-ux-pro-max\scripts\search.py | 93 |  | client-nav | page_filename = args.page.lower().replace(' ', '-') |
| admin.html | 15 | https://fonts.googleapis.com | link | <link rel="preconnect" href="https://fonts.googleapis.com"> |
| admin.html | 16 | https://fonts.gstatic.com | link | <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> |
| admin.html | 18 | https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap | link | href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap" |
| admin.html | 20 | style.css | link | <link rel="stylesheet" href="style.css"> |
| admin.html | 21 | admin-refonte.css | link | <link rel="stylesheet" href="admin-refonte.css"> |
| admin.html | 29 | #admin-content | link | <a class="skip-link" href="#admin-content">Aller au contenu principal</a> |
| admin.html | 92 | index.html | link | <a href="index.html" class="btn secondary sm" style="width:100%">Accueil</a> |
| admin.html | 173 | approvals.html | link | <a href="approvals.html" class="btn primary sm" style="margin-top:12px">Voir les |
| admin.html | 352 | index.html | link | <a href="index.html" class="mob-nav-item"> |
| admin.html | 360 | results.html | link | <a href="results.html" class="mob-nav-item"> |
| admin.html | 368 | post_trip.html | link | <a href="post_trip.html" class="mob-nav-item highlight"> |
| admin.html | 371 | chat.html | link | <a href="chat.html" class="mob-nav-item"> |
| admin.html | 379 | dashboard.html | link | <a href="dashboard.html" class="mob-nav-item"> |
| admin.html | 388 | admin.html | link | <a href="admin.html" id="mobile-admin-link" class="mob-nav-item active"> |
| admin.js | 129 | tel | client-nav | if (rows.includes("phoneNumber")) labels.push("tel"); |
| admin.js | 130 | piece | client-nav | if (rows.includes("identityDocument")) labels.push("piece"); |
| admin.js | 131 | photo | client-nav | if (rows.includes("profilePhoto")) labels.push("photo"); |
| admin.js | 560 | auth.html | link | window.location.href = "auth.html"; |
| admin.js | 560 | auth.html | location-assign | window.location.href = "auth.html"; |
| admin.js | 571 | index.html | link | window.location.href = "index.html"; |
| admin.js | 571 | index.html | location-assign | window.location.href = "index.html"; |
| approvals.html | 9 | https://fonts.googleapis.com | link | <link rel="preconnect" href="https://fonts.googleapis.com"> |
| approvals.html | 10 | https://fonts.gstatic.com | link | <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> |
| approvals.html | 12 | https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap | link | href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" |
| approvals.html | 14 | style.css | link | <link rel="stylesheet" href="style.css"> |
| approvals.html | 36 | admin.html | link | <a href="admin.html" class="nav-link is-active" |
| approvals.html | 62 | index.html#home | link | <a class="btn secondary" href="index.html#home">Retour accueil</a> |
| approvals.html | 94 | index.html | link | <a href="index.html" class="mob-nav-item"> |
| approvals.html | 102 | results.html | link | <a href="results.html" class="mob-nav-item"> |
| approvals.html | 110 | post_trip.html | link | <a href="post_trip.html" class="mob-nav-item highlight"> |
| approvals.html | 113 | chat.html | link | <a href="chat.html" class="mob-nav-item"> |
| approvals.html | 121 | dashboard.html | link | <a href="dashboard.html" class="mob-nav-item"> |
| approvals.html | 130 | admin.html | link | <a href="admin.html" id="mobile-admin-link" class="mob-nav-item active"> |
| approvals.js | 123 | tel | client-nav | if (rows.includes("phoneNumber")) labels.push("tel"); |
| approvals.js | 124 | piece | client-nav | if (rows.includes("identityDocument")) labels.push("piece"); |
| approvals.js | 125 | photo | client-nav | if (rows.includes("profilePhoto")) labels.push("photo"); |
| approvals.js | 226 | auth.html | link | window.location.href = "auth.html"; |
| approvals.js | 226 | auth.html | location-assign | window.location.href = "auth.html"; |
| approvals.js | 238 | index.html | link | window.location.href = "index.html"; |
| approvals.js | 238 | index.html | location-assign | window.location.href = "index.html"; |
| auth.html | 14 | https://fonts.googleapis.com | link | <link rel="preconnect" href="https://fonts.googleapis.com"> |
| auth.html | 15 | https://fonts.gstatic.com | link | <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> |
| auth.html | 17 | https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap | link | href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" |
| auth.html | 19 | style.css | link | <link rel="stylesheet" href="style.css"> |
| auth.html | 49 | index.html | link | <a href="index.html" class="nav-link">Accueil</a> |
| auth.html | 50 | results.html | link | <a href="results.html" class="nav-link">Explorer</a> |
| auth.html | 51 | post_trip.html | link | <a href="post_trip.html" class="nav-link">Publier</a> |
| auth.html | 52 | chat.html | link | <a href="chat.html" class="nav-link">Messages</a> |
| auth.html | 53 | partner.html | link | <a href="partner.html" id="nav-partner-link" class="nav-link hidden">Partenaire</a> |
| auth.html | 58 | admin.html | link | <a id="admin-link" href="admin.html" class="btn secondary hidden">Admin</a> |
| auth.html | 59 | auth.html | link | <a id="auth-open-btn" href="auth.html" class="btn primary">Login</a> |
| auth.html | 118 | index.html | link | <a href="index.html" class="mob-nav-item"> |
| auth.html | 126 | results.html | link | <a href="results.html" class="mob-nav-item"> |
| auth.html | 134 | post_trip.html | link | <a href="post_trip.html" class="mob-nav-item highlight"> |
| auth.html | 137 | chat.html | link | <a href="chat.html" class="mob-nav-item"> |
| auth.html | 145 | partner.html | link | <a href="partner.html" id="mobile-partner-link" class="mob-nav-item hidden"> |
| auth.html | 153 | dashboard.html | link | <a href="dashboard.html" class="mob-nav-item active"> |
| backend\server.js | 266 | phoneNumber | client-nav | if (!hasPhone) missingFields.push("phoneNumber"); |
| backend\server.js | 267 | identityDocument | client-nav | if (!hasIdentityDocument) missingFields.push("identityDocument"); |
| backend\server.js | 268 | profilePhoto | client-nav | if (!hasProfilePhoto) missingFields.push("profilePhoto"); |
| backend\server.js | 1167 | phone_number = ? | client-nav | updates.push("phone_number = ?"); |
| backend\server.js | 1173 | identity_document = ? | client-nav | updates.push("identity_document = ?"); |
| backend\server.js | 1175 | identity_document_approved = 0 | client-nav | updates.push("identity_document_approved = 0"); |
| backend\server.js | 1176 | is_verified = 0 | client-nav | updates.push("is_verified = 0"); |
| backend\server.js | 1181 | profile_photo = ? | client-nav | updates.push("profile_photo = ?"); |
| backend\server.js | 1183 | profile_photo_approved = 0 | client-nav | updates.push("profile_photo_approved = 0"); |
| chat.html | 14 | https://fonts.googleapis.com | link | <link rel="preconnect" href="https://fonts.googleapis.com"> |
| chat.html | 15 | https://fonts.gstatic.com | link | <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> |
| chat.html | 17 | https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap | link | href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" |
| chat.html | 19 | style.css | link | <link rel="stylesheet" href="style.css"> |
| chat.html | 51 | index.html | link | <a href="index.html" class="nav-link">Accueil</a> |
| chat.html | 52 | results.html | link | <a href="results.html" class="nav-link">Explorer</a> |
| chat.html | 53 | post_trip.html | link | <a href="post_trip.html" class="nav-link">Publier</a> |
| chat.html | 54 | chat.html | link | <a href="chat.html" class="nav-link is-active">Messages</a> |
| chat.html | 55 | partner.html | link | <a href="partner.html" id="nav-partner-link" class="nav-link hidden">Partenaire</a> |
| chat.html | 60 | admin.html | link | <a id="admin-link" href="admin.html" class="btn secondary hidden">Admin</a> |
| chat.html | 61 | auth.html | link | <a id="auth-open-btn" href="auth.html" class="btn primary">Login</a> |
| chat.html | 219 | index.html | link | <a href="index.html" class="mob-nav-item"> |
| chat.html | 227 | results.html | link | <a href="results.html" class="mob-nav-item"> |
| chat.html | 235 | post_trip.html | link | <a href="post_trip.html" class="mob-nav-item highlight"> |
| chat.html | 238 | chat.html | link | <a href="chat.html" class="mob-nav-item active"> |
| chat.html | 246 | partner.html | link | <a href="partner.html" id="mobile-partner-link" class="mob-nav-item hidden"> |
| chat.html | 254 | dashboard.html | link | <a href="dashboard.html" class="mob-nav-item"> |
| dashboard.html | 14 | https://fonts.googleapis.com | link | <link rel="preconnect" href="https://fonts.googleapis.com"> |
| dashboard.html | 15 | https://fonts.gstatic.com | link | <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> |
| dashboard.html | 17 | https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap | link | href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" |
| dashboard.html | 19 | style.css | link | <link rel="stylesheet" href="style.css"> |
| dashboard.html | 50 | index.html | link | <a href="index.html" class="nav-link">Accueil</a> |
| dashboard.html | 51 | results.html | link | <a href="results.html" class="nav-link">Explorer</a> |
| dashboard.html | 52 | post_trip.html | link | <a href="post_trip.html" class="nav-link">Publier</a> |
| dashboard.html | 53 | chat.html | link | <a href="chat.html" class="nav-link">Messages</a> |
| dashboard.html | 54 | partner.html | link | <a href="partner.html" id="nav-partner-link" class="nav-link hidden">Partenaire</a> |
| dashboard.html | 59 | admin.html | link | <a id="admin-link" href="admin.html" class="btn secondary hidden">Admin</a> |
| dashboard.html | 60 | auth.html | link | <a id="auth-open-btn" href="auth.html" class="btn primary">Login</a> |
| dashboard.html | 81 | post_trip.html | link | <a href="post_trip.html" class="btn primary btn-sm">Nouveau trajet</a> |
| dashboard.html | 141 | index.html | link | <a href="index.html" class="mob-nav-item"> |
| dashboard.html | 149 | results.html | link | <a href="results.html" class="mob-nav-item"> |
| dashboard.html | 157 | post_trip.html | link | <a href="post_trip.html" class="mob-nav-item highlight"> |
| dashboard.html | 160 | chat.html | link | <a href="chat.html" class="mob-nav-item"> |
| dashboard.html | 168 | partner.html | link | <a href="partner.html" id="mobile-partner-link" class="mob-nav-item hidden"> |
| dashboard.html | 176 | dashboard.html | link | <a href="dashboard.html" class="mob-nav-item active"> |
| dashboard.js | 28 | numero de telephone | client-nav | if (missing.includes("phoneNumber")) labels.push("numero de telephone"); |
| dashboard.js | 29 | piece justificative | client-nav | if (missing.includes("identityDocument")) labels.push("piece justificative"); |
| dashboard.js | 30 | photo de profil | client-nav | if (missing.includes("profilePhoto")) labels.push("photo de profil"); |
| dashboard.js | 113 | post_trip.html | link | <a href="post_trip.html" class="btn secondary sm">Creer un trajet</a> |
| dashboard.js | 214 | chat.html?id=${encodeURIComponent(threadId)} | location-assign | window.location.href = `chat.html?id=${encodeURIComponent(threadId)}`; |
| index.html | 16 | https://fonts.googleapis.com | link | <link rel="preconnect" href="https://fonts.googleapis.com"> |
| index.html | 17 | https://fonts.gstatic.com | link | <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> |
| index.html | 19 | https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap | link | href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" |
| index.html | 21 | style.css | link | <link rel="stylesheet" href="style.css"> |
| index.html | 52 | index.html | link | <a href="index.html" class="nav-link">Accueil</a> |
| index.html | 53 | results.html | link | <a href="results.html" class="nav-link">Explorer</a> |
| index.html | 54 | post_trip.html | link | <a href="post_trip.html" class="nav-link">Publier</a> |
| index.html | 55 | chat.html | link | <a href="chat.html" class="nav-link">Messages</a> |
| index.html | 56 | partner.html | link | <a href="partner.html" id="nav-partner-link" class="nav-link hidden">Partenaire</a> |
| index.html | 61 | admin.html | link | <a id="admin-link" href="admin.html" class="btn secondary hidden">Admin</a> |
| index.html | 62 | dashboard.html | link | <a id="auth-open-btn" href="dashboard.html" class="btn primary">Login</a> |
| index.html | 78 | results.html | link | <a href="results.html" class="btn primary">Explorer les offres</a> |
| index.html | 79 | post_trip.html | link | <a href="post_trip.html" class="btn secondary">Publier un trajet</a> |
| index.html | 84 | results.html | link | <a href="results.html" class="triangle-action top"> |
| index.html | 87 | post_trip.html | link | <a href="post_trip.html" class="triangle-action bottom"> |
| index.html | 98 | results.html | link | <a href="results.html" class="btn secondary">Aller a la recherche</a> |
| index.html | 103 | post_trip.html | link | <a href="post_trip.html" class="btn secondary">Publier une offre</a> |
| index.html | 108 | chat.html | link | <a href="chat.html" class="btn secondary">Ouvrir les messages</a> |
| index.html | 116 | index.html | link | <a href="index.html" class="mob-nav-item"> |
| index.html | 124 | results.html | link | <a href="results.html" class="mob-nav-item"> |
| index.html | 132 | post_trip.html | link | <a href="post_trip.html" class="mob-nav-item highlight"> |
| index.html | 135 | chat.html | link | <a href="chat.html" class="mob-nav-item"> |
| index.html | 143 | partner.html | link | <a href="partner.html" id="mobile-partner-link" class="mob-nav-item hidden"> |
| index.html | 151 | dashboard.html | link | <a href="dashboard.html" class="mob-nav-item"> |
| main.js | 100 | phoneNumber | client-nav | if (String(user?.phoneNumber \|\| "").trim().length < 8) missingFields.push("phoneNumber"); |
| main.js | 101 | identityDocument | client-nav | if (!user?.hasIdentityDocument) missingFields.push("identityDocument"); |
| main.js | 102 | profilePhoto | client-nav | if (!user?.hasProfilePhoto) missingFields.push("profilePhoto"); |
| main.js | 130 | numero de telephone | client-nav | if (missingFields.includes("phoneNumber")) labels.push("numero de telephone"); |
| main.js | 131 | piece justificative | client-nav | if (missingFields.includes("identityDocument")) labels.push("piece justificative"); |
| main.js | 132 | photo de profil | client-nav | if (missingFields.includes("profilePhoto")) labels.push("photo de profil"); |
| main.js | 355 | # | client-nav | const value = window.location.hash.replace("#", "").trim(); |
| main.js | 561 | home | client-nav | await navigate("home", { skipGuard: true }); |
| main.js | 670 | chat.html?offerId=${offerIdParam} | location-assign | window.location.href = `chat.html?offerId=${offerIdParam}`; |
| main.js | 715 | search | client-nav | await navigate("search", { skipGuard: true }); |
| messages.html | 7 | chat.html | client-nav | <script>window.location.replace("chat.html");</script> |
| messages.html | 10 | chat.html | link | <p>Redirection vers les messages... <a href="chat.html">Continuer</a></p> |
| partner.html | 14 | https://fonts.googleapis.com | link | <link rel="preconnect" href="https://fonts.googleapis.com"> |
| partner.html | 15 | https://fonts.gstatic.com | link | <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> |
| partner.html | 17 | https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap | link | href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" |
| partner.html | 19 | style.css | link | <link rel="stylesheet" href="style.css"> |
| partner.html | 113 | index.html | link | <a href="index.html" class="nav-link">Accueil</a> |
| partner.html | 114 | results.html | link | <a href="results.html" class="nav-link">Explorer</a> |
| partner.html | 115 | post_trip.html | link | <a href="post_trip.html" class="nav-link">Publier</a> |
| partner.html | 116 | chat.html | link | <a href="chat.html" class="nav-link">Messages</a> |
| partner.html | 117 | dashboard.html | link | <a href="dashboard.html" class="nav-link">Dashboard</a> |
| partner.html | 118 | partner.html | link | <a href="partner.html" id="nav-partner-link" class="nav-link is-active">Partenaire</a> |
| partner.html | 122 | admin.html | link | <a id="admin-link" href="admin.html" class="btn secondary hidden">Admin</a> |
| partner.html | 123 | auth.html | link | <a id="auth-open-btn" href="auth.html" class="btn primary">Login</a> |
| partner.html | 188 | index.html | link | <a href="index.html" class="mob-nav-item"> |
| partner.html | 196 | results.html | link | <a href="results.html" class="mob-nav-item"> |
| partner.html | 204 | post_trip.html | link | <a href="post_trip.html" class="mob-nav-item highlight"> |
| partner.html | 207 | chat.html | link | <a href="chat.html" class="mob-nav-item"> |
| partner.html | 215 | dashboard.html | link | <a href="dashboard.html" class="mob-nav-item"> |
| partner.js | 33 | dashboard.html | link | window.location.href = "dashboard.html"; |
| partner.js | 33 | dashboard.html | location-assign | window.location.href = "dashboard.html"; |
| partner.js | 122 | index.html | link | window.location.href = "index.html"; |
| partner.js | 122 | index.html | location-assign | window.location.href = "index.html"; |
| post_trip.html | 14 | https://fonts.googleapis.com | link | <link rel="preconnect" href="https://fonts.googleapis.com"> |
| post_trip.html | 15 | https://fonts.gstatic.com | link | <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> |
| post_trip.html | 17 | https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap | link | href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" |
| post_trip.html | 19 | style.css | link | <link rel="stylesheet" href="style.css"> |
| post_trip.html | 53 | index.html | link | <a href="index.html" class="nav-link">Accueil</a> |
| post_trip.html | 54 | results.html | link | <a href="results.html" class="nav-link">Explorer</a> |
| post_trip.html | 55 | post_trip.html | link | <a href="post_trip.html" class="nav-link is-active">Publier</a> |
| post_trip.html | 56 | chat.html | link | <a href="chat.html" class="nav-link">Messages</a> |
| post_trip.html | 57 | partner.html | link | <a href="partner.html" id="nav-partner-link" class="nav-link hidden">Partenaire</a> |
| post_trip.html | 62 | admin.html | link | <a id="admin-link" href="admin.html" class="btn secondary hidden">Admin</a> |
| post_trip.html | 63 | auth.html | link | <a id="auth-open-btn" href="auth.html" class="btn primary">Login</a> |
| post_trip.html | 241 | index.html | link | <a href="index.html" class="mob-nav-item"> |
| post_trip.html | 249 | results.html | link | <a href="results.html" class="mob-nav-item"> |
| post_trip.html | 257 | post_trip.html | link | <a href="post_trip.html" class="mob-nav-item active highlight"> |
| post_trip.html | 260 | chat.html | link | <a href="chat.html" class="mob-nav-item"> |
| post_trip.html | 268 | partner.html | link | <a href="partner.html" id="mobile-partner-link" class="mob-nav-item hidden"> |
| post_trip.html | 276 | dashboard.html | link | <a href="dashboard.html" class="mob-nav-item"> |
| post_trip.js | 241 | results.html | link | window.location.href = "results.html"; |
| post_trip.js | 241 | results.html | location-assign | window.location.href = "results.html"; |
| proposer.html | 7 | post_trip.html | client-nav | <script>window.location.replace("post_trip.html");</script> |
| proposer.html | 10 | post_trip.html | link | <p>Redirection vers la proposition... <a href="post_trip.html">Continuer</a></p> |
| result.html | 7 | results.html | client-nav | <script>window.location.replace("results.html");</script> |
| result.html | 10 | results.html | link | <p>Redirection vers la recherche... <a href="results.html">Continuer</a></p> |
| results.html | 14 | https://fonts.googleapis.com | link | <link rel="preconnect" href="https://fonts.googleapis.com"> |
| results.html | 15 | https://fonts.gstatic.com | link | <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> |
| results.html | 17 | https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap | link | href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" |
| results.html | 19 | style.css | link | <link rel="stylesheet" href="style.css"> |
| results.html | 51 | index.html | link | <a href="index.html" class="nav-link">Accueil</a> |
| results.html | 52 | results.html | link | <a href="results.html" class="nav-link is-active">Explorer</a> |
| results.html | 53 | post_trip.html | link | <a href="post_trip.html" class="nav-link">Publier</a> |
| results.html | 54 | chat.html | link | <a href="chat.html" class="nav-link">Messages</a> |
| results.html | 55 | partner.html | link | <a href="partner.html" id="nav-partner-link" class="nav-link hidden">Partenaire</a> |
| results.html | 60 | admin.html | link | <a id="admin-link" href="admin.html" class="btn secondary hidden">Admin</a> |
| results.html | 61 | auth.html | link | <a id="auth-open-btn" href="auth.html" class="btn primary">Login</a> |
| results.html | 135 | index.html | link | <a href="index.html" class="mob-nav-item"> |
| results.html | 143 | results.html | link | <a href="results.html" class="mob-nav-item active"> |
| results.html | 151 | post_trip.html | link | <a href="post_trip.html" class="mob-nav-item highlight"> |
| results.html | 154 | chat.html | link | <a href="chat.html" class="mob-nav-item"> |
| results.html | 162 | partner.html | link | <a href="partner.html" id="mobile-partner-link" class="mob-nav-item hidden"> |
| results.html | 170 | dashboard.html | link | <a href="dashboard.html" class="mob-nav-item"> |
| results.js | 109 | chat.html?offerId=${offerIdParam} | location-assign | window.location.href = `chat.html?offerId=${offerIdParam}`; |
| script.js | 88 | http://127.0.0.1:8080 | client-nav | bases.push("http://127.0.0.1:8080"); |
| script.js | 318 | dashboard.html | link | window.location.href = "dashboard.html"; |
| script.js | 318 | dashboard.html | location-assign | window.location.href = "dashboard.html"; |
| script.js | 349 | dashboard.html | link | window.location.href = "dashboard.html"; |
| script.js | 349 | dashboard.html | location-assign | window.location.href = "dashboard.html"; |
| script.js | 381 | dashboard.html | link | window.location.href = "dashboard.html"; |
| script.js | 381 | dashboard.html | location-assign | window.location.href = "dashboard.html"; |
| script.js | 450 | auth.html | link | login.href = "auth.html"; |
| script.js | 452 | auth.html#register | link | register.href = "auth.html#register"; |
| script.js | 459 | dashboard.html | link | login.href = "dashboard.html"; |
| script.js | 461 | # | link | register.href = "#"; |
| script.js | 467 | index.html | link | window.location.href = "index.html"; |
| script.js | 467 | index.html | location-assign | window.location.href = "index.html"; |
| script.js | 704 | chat.html?thread=${encodeURIComponent(thread.id)}&reservation=${encodeURIComponent(reservation.id)}&prefill=${encodeURIComponent(prefill)} | location-assign | window.location.href = `chat.html?thread=${encodeURIComponent(thread.id)}&reservation=${encodeURIComponent(reservation.id)}&prefill=${encodeURIComponent(prefill)}`; |
| script.js | 856 | dashboard.html | link | window.location.href = "dashboard.html"; |
| script.js | 856 | dashboard.html | location-assign | window.location.href = "dashboard.html"; |
| script.js | 1119 | chat.html?thread=${encodeURIComponent(item.id)} | link | renderList("dash-conversations", conversations \|\| [], "Aucune conversation.", (item) => `<article class="dash-item"><header><h4>${escapeHtml(item.travelerName \|\| "Contact")}</h4><div class="dash-offer-head-actions"><button type="button" class="btn btn-danger-icon" data-delete-conversation="${escapeHtml(item.id)}" title="Supprimer la conversation" aria-label="Supprimer la conversation"><ion-icon name="trash-outline"></ion-icon></button></div></header><p>${escapeHtml(item.offerTitle \|\| "")}</p><a class="btn btn-secondary btn-sm" href="chat.html?thread=${encodeURIComponent(item.id)}">Continuer</a></article>`); |
| standalone-common.js | 167 | phoneNumber | client-nav | if (!hasPhone) missingFields.push("phoneNumber"); |
| standalone-common.js | 168 | identityDocument | client-nav | if (!hasIdentityDocument) missingFields.push("identityDocument"); |
| standalone-common.js | 169 | profilePhoto | client-nav | if (!hasProfilePhoto) missingFields.push("profilePhoto"); |
| standalone-common.js | 316 | numero de telephone | client-nav | if (missingFields.includes("phoneNumber")) labels.push("numero de telephone"); |
| standalone-common.js | 317 | piece justificative | client-nav | if (missingFields.includes("identityDocument")) labels.push("piece justificative"); |
| standalone-common.js | 318 | photo de profil | client-nav | if (missingFields.includes("profilePhoto")) labels.push("photo de profil"); |
| standalone-common.js | 542 | dashboard.html | link | window.location.href = "dashboard.html"; |
| standalone-common.js | 542 | dashboard.html | location-assign | window.location.href = "dashboard.html"; |
| standalone-common.js | 656 | admin.html | link | a.href = "admin.html"; |
| standalone-common.js | 680 | partner.html | link | a.href = "partner.html"; |
| standalone-common.js | 776 | index.html | link | window.location.href = "index.html"; |
| standalone-common.js | 776 | index.html | location-assign | window.location.href = "index.html"; |
| test save\admin.html | 15 | https://fonts.googleapis.com | link | <link rel="preconnect" href="https://fonts.googleapis.com"> |
| test save\admin.html | 16 | https://fonts.gstatic.com | link | <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> |
| test save\admin.html | 18 | https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap | link | href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" |
| test save\admin.html | 20 | style.css | link | <link rel="stylesheet" href="style.css"> |
| test save\admin.html | 89 | index.html | link | <a href="index.html" class="btn secondary sm" style="width:100%">Retour Site</a> |
| test save\admin.html | 140 | approvals.html | link | <a href="approvals.html" class="btn primary sm" style="margin-top:12px">Voir les |
| test save\admin.js | 128 | tel | client-nav | if (rows.includes("phoneNumber")) labels.push("tel"); |
| test save\admin.js | 129 | piece | client-nav | if (rows.includes("identityDocument")) labels.push("piece"); |
| test save\admin.js | 130 | photo | client-nav | if (rows.includes("profilePhoto")) labels.push("photo"); |
| test save\admin.js | 558 | index.html#home | link | window.location.href = "index.html#home"; |
| test save\admin.js | 558 | index.html#home | location-assign | window.location.href = "index.html#home"; |
| test save\admin.js | 569 | index.html#home | link | window.location.href = "index.html#home"; |
| test save\admin.js | 569 | index.html#home | location-assign | window.location.href = "index.html#home"; |
| test save\approvals.html | 9 | https://fonts.googleapis.com | link | <link rel="preconnect" href="https://fonts.googleapis.com"> |
| test save\approvals.html | 10 | https://fonts.gstatic.com | link | <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> |
| test save\approvals.html | 12 | https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap | link | href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" |
| test save\approvals.html | 14 | style.css | link | <link rel="stylesheet" href="style.css"> |
| test save\approvals.html | 35 | admin.html | link | <a href="admin.html" class="nav-link is-active" |
| test save\approvals.html | 61 | index.html#home | link | <a class="btn secondary" href="index.html#home">Retour accueil</a> |
| test save\approvals.js | 123 | tel | client-nav | if (rows.includes("phoneNumber")) labels.push("tel"); |
| test save\approvals.js | 124 | piece | client-nav | if (rows.includes("identityDocument")) labels.push("piece"); |
| test save\approvals.js | 125 | photo | client-nav | if (rows.includes("profilePhoto")) labels.push("photo"); |
| test save\approvals.js | 225 | index.html#home | link | window.location.href = "index.html#home"; |
| test save\approvals.js | 225 | index.html#home | location-assign | window.location.href = "index.html#home"; |
| test save\approvals.js | 237 | index.html#home | link | window.location.href = "index.html#home"; |
| test save\approvals.js | 237 | index.html#home | location-assign | window.location.href = "index.html#home"; |
| test save\auth.html | 14 | https://fonts.googleapis.com | link | <link rel="preconnect" href="https://fonts.googleapis.com"> |
| test save\auth.html | 15 | https://fonts.gstatic.com | link | <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> |
| test save\auth.html | 17 | https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap | link | href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" |
| test save\auth.html | 19 | style.css | link | <link rel="stylesheet" href="style.css"> |
| test save\auth.html | 49 | index.html#home | link | <a href="index.html#home" class="nav-link">Accueil</a> |
| test save\auth.html | 50 | results.html | link | <a href="results.html" class="nav-link">Explorer</a> |
| test save\auth.html | 51 | post_trip.html | link | <a href="post_trip.html" class="nav-link">Publier</a> |
| test save\auth.html | 52 | chat.html | link | <a href="chat.html" class="nav-link">Messages</a> |
| test save\auth.html | 57 | admin.html | link | <a id="admin-link" href="admin.html" class="btn secondary hidden">Admin</a> |
| test save\auth.html | 58 | auth.html | link | <a id="auth-open-btn" href="auth.html" class="btn primary">Login</a> |
| test save\auth.html | 95 | index.html | link | <a href="index.html" class="mob-nav-item"> |
| test save\auth.html | 103 | results.html | link | <a href="results.html" class="mob-nav-item"> |
| test save\auth.html | 111 | post_trip.html | link | <a href="post_trip.html" class="mob-nav-item highlight"> |
| test save\auth.html | 114 | chat.html | link | <a href="chat.html" class="mob-nav-item"> |
| test save\auth.html | 122 | dashboard.html | link | <a href="dashboard.html" class="mob-nav-item active"> |
| test save\backend\server.js | 265 | phoneNumber | client-nav | if (!hasPhone) missingFields.push("phoneNumber"); |
| test save\backend\server.js | 266 | identityDocument | client-nav | if (!hasIdentityDocument) missingFields.push("identityDocument"); |
| test save\backend\server.js | 267 | profilePhoto | client-nav | if (!hasProfilePhoto) missingFields.push("profilePhoto"); |
| test save\backend\server.js | 1159 | phone_number = ? | client-nav | updates.push("phone_number = ?"); |
| test save\backend\server.js | 1165 | identity_document = ? | client-nav | updates.push("identity_document = ?"); |
| test save\backend\server.js | 1167 | identity_document_approved = 0 | client-nav | updates.push("identity_document_approved = 0"); |
| test save\backend\server.js | 1168 | is_verified = 0 | client-nav | updates.push("is_verified = 0"); |
| test save\backend\server.js | 1173 | profile_photo = ? | client-nav | updates.push("profile_photo = ?"); |
| test save\backend\server.js | 1175 | profile_photo_approved = 0 | client-nav | updates.push("profile_photo_approved = 0"); |
| test save\chat.html | 14 | https://fonts.googleapis.com | link | <link rel="preconnect" href="https://fonts.googleapis.com"> |
| test save\chat.html | 15 | https://fonts.gstatic.com | link | <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> |
| test save\chat.html | 17 | https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap | link | href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" |
| test save\chat.html | 19 | style.css | link | <link rel="stylesheet" href="style.css"> |
| test save\chat.html | 50 | index.html#home | link | <a href="index.html#home" class="nav-link">Accueil</a> |
| test save\chat.html | 51 | results.html | link | <a href="results.html" class="nav-link">Explorer</a> |
| test save\chat.html | 52 | post_trip.html | link | <a href="post_trip.html" class="nav-link">Publier</a> |
| test save\chat.html | 53 | chat.html | link | <a href="chat.html" class="nav-link is-active">Messages</a> |
| test save\chat.html | 58 | admin.html | link | <a id="admin-link" href="admin.html" class="btn secondary hidden">Admin</a> |
| test save\chat.html | 59 | auth.html | link | <a id="auth-open-btn" href="auth.html" class="btn primary">Login</a> |
| test save\chat.html | 152 | index.html | link | <a href="index.html" class="mob-nav-item"> |
| test save\chat.html | 160 | results.html | link | <a href="results.html" class="mob-nav-item"> |
| test save\chat.html | 168 | post_trip.html | link | <a href="post_trip.html" class="mob-nav-item highlight"> |
| test save\chat.html | 171 | chat.html | link | <a href="chat.html" class="mob-nav-item active"> |
| test save\chat.html | 179 | dashboard.html | link | <a href="dashboard.html" class="mob-nav-item"> |
| test save\dashboard.html | 14 | https://fonts.googleapis.com | link | <link rel="preconnect" href="https://fonts.googleapis.com"> |
| test save\dashboard.html | 15 | https://fonts.gstatic.com | link | <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> |
| test save\dashboard.html | 17 | https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap | link | href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" |
| test save\dashboard.html | 19 | style.css | link | <link rel="stylesheet" href="style.css"> |
| test save\dashboard.html | 50 | index.html#home | link | <a href="index.html#home" class="nav-link">Accueil</a> |
| test save\dashboard.html | 51 | results.html | link | <a href="results.html" class="nav-link">Explorer</a> |
| test save\dashboard.html | 52 | post_trip.html | link | <a href="post_trip.html" class="nav-link">Publier</a> |
| test save\dashboard.html | 53 | chat.html | link | <a href="chat.html" class="nav-link">Messages</a> |
| test save\dashboard.html | 58 | admin.html | link | <a id="admin-link" href="admin.html" class="btn secondary hidden">Admin</a> |
| test save\dashboard.html | 59 | auth.html | link | <a id="auth-open-btn" href="auth.html" class="btn primary">Login</a> |
| test save\dashboard.html | 80 | post_trip.html | link | <a href="post_trip.html" class="btn primary btn-sm">Nouveau trajet</a> |
| test save\dashboard.html | 140 | index.html | link | <a href="index.html" class="mob-nav-item"> |
| test save\dashboard.html | 148 | results.html | link | <a href="results.html" class="mob-nav-item"> |
| test save\dashboard.html | 156 | post_trip.html | link | <a href="post_trip.html" class="mob-nav-item highlight"> |
| test save\dashboard.html | 159 | chat.html | link | <a href="chat.html" class="mob-nav-item"> |
| test save\dashboard.html | 167 | dashboard.html | link | <a href="dashboard.html" class="mob-nav-item active"> |
| test save\dashboard.js | 28 | numero de telephone | client-nav | if (missing.includes("phoneNumber")) labels.push("numero de telephone"); |
| test save\dashboard.js | 29 | piece justificative | client-nav | if (missing.includes("identityDocument")) labels.push("piece justificative"); |
| test save\dashboard.js | 30 | photo de profil | client-nav | if (missing.includes("profilePhoto")) labels.push("photo de profil"); |
| test save\dashboard.js | 113 | post_trip.html | link | <a href="post_trip.html" class="btn secondary sm">Creer un trajet</a> |
| test save\dashboard.js | 219 | chat.html?id=${encodeURIComponent(threadId)} | location-assign | window.location.href = `chat.html?id=${encodeURIComponent(threadId)}`; |
| test save\index.html | 16 | https://fonts.googleapis.com | link | <link rel="preconnect" href="https://fonts.googleapis.com"> |
| test save\index.html | 17 | https://fonts.gstatic.com | link | <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> |
| test save\index.html | 19 | https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap | link | href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" |
| test save\index.html | 21 | style.css | link | <link rel="stylesheet" href="style.css"> |
| test save\index.html | 60 | admin.html | link | <a id="admin-link" href="admin.html" class="btn secondary hidden">Admin</a> |
| test save\index.html | 262 | index.html | link | <a href="index.html" class="mob-nav-item active"> |
| test save\index.html | 270 | results.html | link | <a href="results.html" class="mob-nav-item"> |
| test save\index.html | 278 | post_trip.html | link | <a href="post_trip.html" class="mob-nav-item highlight"> |
| test save\index.html | 281 | chat.html | link | <a href="chat.html" class="mob-nav-item"> |
| test save\index.html | 289 | dashboard.html | link | <a href="dashboard.html" class="mob-nav-item"> |
| test save\main.js | 99 | phoneNumber | client-nav | if (String(user?.phoneNumber \|\| "").trim().length < 8) missingFields.push("phoneNumber"); |
| test save\main.js | 100 | identityDocument | client-nav | if (!user?.hasIdentityDocument) missingFields.push("identityDocument"); |
| test save\main.js | 101 | profilePhoto | client-nav | if (!user?.hasProfilePhoto) missingFields.push("profilePhoto"); |
| test save\main.js | 129 | numero de telephone | client-nav | if (missingFields.includes("phoneNumber")) labels.push("numero de telephone"); |
| test save\main.js | 130 | piece justificative | client-nav | if (missingFields.includes("identityDocument")) labels.push("piece justificative"); |
| test save\main.js | 131 | photo de profil | client-nav | if (missingFields.includes("profilePhoto")) labels.push("photo de profil"); |
| test save\main.js | 344 | # | client-nav | const value = window.location.hash.replace("#", "").trim(); |
| test save\main.js | 540 | home | client-nav | await navigate("home", { skipGuard: true }); |
| test save\main.js | 649 | chat.html?offerId=${offerIdParam} | location-assign | window.location.href = `chat.html?offerId=${offerIdParam}`; |
| test save\main.js | 689 | search | client-nav | await navigate("search", { skipGuard: true }); |
| test save\messages.html | 7 | chat.html | client-nav | <script>window.location.replace("chat.html");</script> |
| test save\messages.html | 10 | chat.html | link | <p>Redirection vers les messages... <a href="chat.html">Continuer</a></p> |
| test save\post_trip.html | 14 | https://fonts.googleapis.com | link | <link rel="preconnect" href="https://fonts.googleapis.com"> |
| test save\post_trip.html | 15 | https://fonts.gstatic.com | link | <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> |
| test save\post_trip.html | 17 | https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap | link | href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" |
| test save\post_trip.html | 19 | style.css | link | <link rel="stylesheet" href="style.css"> |
| test save\post_trip.html | 53 | index.html#home | link | <a href="index.html#home" class="nav-link">Accueil</a> |
| test save\post_trip.html | 54 | results.html | link | <a href="results.html" class="nav-link">Explorer</a> |
| test save\post_trip.html | 55 | post_trip.html | link | <a href="post_trip.html" class="nav-link is-active">Publier</a> |
| test save\post_trip.html | 56 | chat.html | link | <a href="chat.html" class="nav-link">Messages</a> |
| test save\post_trip.html | 61 | admin.html | link | <a id="admin-link" href="admin.html" class="btn secondary hidden">Admin</a> |
| test save\post_trip.html | 62 | auth.html | link | <a id="auth-open-btn" href="auth.html" class="btn primary">Login</a> |
| test save\post_trip.html | 233 | index.html | link | <a href="index.html" class="mob-nav-item"> |
| test save\post_trip.html | 241 | results.html | link | <a href="results.html" class="mob-nav-item"> |
| test save\post_trip.html | 249 | post_trip.html | link | <a href="post_trip.html" class="mob-nav-item active highlight"> |
| test save\post_trip.html | 252 | chat.html | link | <a href="chat.html" class="mob-nav-item"> |
| test save\post_trip.html | 260 | dashboard.html | link | <a href="dashboard.html" class="mob-nav-item"> |
| test save\post_trip.js | 235 | results.html | link | window.location.href = "results.html"; |
| test save\post_trip.js | 235 | results.html | location-assign | window.location.href = "results.html"; |
| test save\proposer.html | 7 | post_trip.html | client-nav | <script>window.location.replace("post_trip.html");</script> |
| test save\proposer.html | 10 | post_trip.html | link | <p>Redirection vers la proposition... <a href="post_trip.html">Continuer</a></p> |
| test save\result.html | 7 | results.html | client-nav | <script>window.location.replace("results.html");</script> |
| test save\result.html | 10 | results.html | link | <p>Redirection vers la recherche... <a href="results.html">Continuer</a></p> |
| test save\results.html | 14 | https://fonts.googleapis.com | link | <link rel="preconnect" href="https://fonts.googleapis.com"> |
| test save\results.html | 15 | https://fonts.gstatic.com | link | <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> |
| test save\results.html | 17 | https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap | link | href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" |
| test save\results.html | 19 | style.css | link | <link rel="stylesheet" href="style.css"> |
| test save\results.html | 51 | index.html#home | link | <a href="index.html#home" class="nav-link">Accueil</a> |
| test save\results.html | 52 | results.html | link | <a href="results.html" class="nav-link is-active">Explorer</a> |
| test save\results.html | 53 | post_trip.html | link | <a href="post_trip.html" class="nav-link">Publier</a> |
| test save\results.html | 54 | chat.html | link | <a href="chat.html" class="nav-link">Messages</a> |
| test save\results.html | 59 | admin.html | link | <a id="admin-link" href="admin.html" class="btn secondary hidden">Admin</a> |
| test save\results.html | 60 | auth.html | link | <a id="auth-open-btn" href="auth.html" class="btn primary">Login</a> |
| test save\results.html | 134 | index.html | link | <a href="index.html" class="mob-nav-item"> |
| test save\results.html | 142 | results.html | link | <a href="results.html" class="mob-nav-item active"> |
| test save\results.html | 150 | post_trip.html | link | <a href="post_trip.html" class="mob-nav-item highlight"> |
| test save\results.html | 153 | chat.html | link | <a href="chat.html" class="mob-nav-item"> |
| test save\results.html | 161 | dashboard.html | link | <a href="dashboard.html" class="mob-nav-item"> |
| test save\results.js | 93 | chat.html?offerId=${offerIdParam} | location-assign | window.location.href = `chat.html?offerId=${offerIdParam}`; |
| test save\script.js | 88 | http://127.0.0.1:8080 | client-nav | bases.push("http://127.0.0.1:8080"); |
| test save\script.js | 318 | dashboard.html | link | window.location.href = "dashboard.html"; |
| test save\script.js | 318 | dashboard.html | location-assign | window.location.href = "dashboard.html"; |
| test save\script.js | 349 | dashboard.html | link | window.location.href = "dashboard.html"; |
| test save\script.js | 349 | dashboard.html | location-assign | window.location.href = "dashboard.html"; |
| test save\script.js | 381 | dashboard.html | link | window.location.href = "dashboard.html"; |
| test save\script.js | 381 | dashboard.html | location-assign | window.location.href = "dashboard.html"; |
| test save\script.js | 450 | auth.html | link | login.href = "auth.html"; |
| test save\script.js | 452 | auth.html#register | link | register.href = "auth.html#register"; |
| test save\script.js | 459 | dashboard.html | link | login.href = "dashboard.html"; |
| test save\script.js | 461 | # | link | register.href = "#"; |
| test save\script.js | 467 | index.html | link | window.location.href = "index.html"; |
| test save\script.js | 467 | index.html | location-assign | window.location.href = "index.html"; |
| test save\script.js | 704 | chat.html?thread=${encodeURIComponent(thread.id)}&reservation=${encodeURIComponent(reservation.id)}&prefill=${encodeURIComponent(prefill)} | location-assign | window.location.href = `chat.html?thread=${encodeURIComponent(thread.id)}&reservation=${encodeURIComponent(reservation.id)}&prefill=${encodeURIComponent(prefill)}`; |
| test save\script.js | 856 | dashboard.html | link | window.location.href = "dashboard.html"; |
| test save\script.js | 856 | dashboard.html | location-assign | window.location.href = "dashboard.html"; |
| test save\script.js | 1119 | chat.html?thread=${encodeURIComponent(item.id)} | link | renderList("dash-conversations", conversations \|\| [], "Aucune conversation.", (item) => `<article class="dash-item"><header><h4>${escapeHtml(item.travelerName \|\| "Contact")}</h4><div class="dash-offer-head-actions"><button type="button" class="btn btn-danger-icon" data-delete-conversation="${escapeHtml(item.id)}" title="Supprimer la conversation" aria-label="Supprimer la conversation"><ion-icon name="trash-outline"></ion-icon></button></div></header><p>${escapeHtml(item.offerTitle \|\| "")}</p><a class="btn btn-secondary btn-sm" href="chat.html?thread=${encodeURIComponent(item.id)}">Continuer</a></article>`); |
| test save\standalone-common.js | 161 | phoneNumber | client-nav | if (!hasPhone) missingFields.push("phoneNumber"); |
| test save\standalone-common.js | 162 | identityDocument | client-nav | if (!hasIdentityDocument) missingFields.push("identityDocument"); |
| test save\standalone-common.js | 163 | profilePhoto | client-nav | if (!hasProfilePhoto) missingFields.push("profilePhoto"); |
| test save\standalone-common.js | 310 | numero de telephone | client-nav | if (missingFields.includes("phoneNumber")) labels.push("numero de telephone"); |
| test save\standalone-common.js | 311 | piece justificative | client-nav | if (missingFields.includes("identityDocument")) labels.push("piece justificative"); |
| test save\standalone-common.js | 312 | photo de profil | client-nav | if (missingFields.includes("profilePhoto")) labels.push("photo de profil"); |
| test save\standalone-common.js | 498 | dashboard.html | link | window.location.href = "dashboard.html"; |
| test save\standalone-common.js | 498 | dashboard.html | location-assign | window.location.href = "dashboard.html"; |
| test save\standalone-common.js | 573 | index.html#home | link | window.location.href = "index.html#home"; |
| test save\standalone-common.js | 573 | index.html#home | location-assign | window.location.href = "index.html#home"; |
| test save\verification.html | 14 | https://fonts.googleapis.com | link | <link rel="preconnect" href="https://fonts.googleapis.com"> |
| test save\verification.html | 15 | https://fonts.gstatic.com | link | <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> |
| test save\verification.html | 17 | https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap | link | href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" |
| test save\verification.html | 19 | style.css | link | <link rel="stylesheet" href="style.css"> |
| test save\verification.html | 51 | index.html#home | link | <a href="index.html#home" class="nav-link">Accueil</a> |
| test save\verification.html | 52 | results.html | link | <a href="results.html" class="nav-link">Explorer</a> |
| test save\verification.html | 53 | post_trip.html | link | <a href="post_trip.html" class="nav-link">Publier</a> |
| test save\verification.html | 54 | chat.html | link | <a href="chat.html" class="nav-link">Messages</a> |
| test save\verification.html | 55 | dashboard.html | link | <a href="dashboard.html" class="nav-link">Dashboard</a> |
| test save\verification.html | 60 | admin.html | link | <a id="admin-link" href="admin.html" class="btn secondary hidden">Admin</a> |
| test save\verification.html | 61 | auth.html | link | <a id="auth-open-btn" href="auth.html" class="btn primary">Login</a> |
| test save\verification.html | 153 | index.html | link | <a href="index.html" class="mob-nav-item"> |
| test save\verification.html | 161 | results.html | link | <a href="results.html" class="mob-nav-item"> |
| test save\verification.html | 169 | post_trip.html | link | <a href="post_trip.html" class="mob-nav-item highlight"> |
| test save\verification.html | 172 | chat.html | link | <a href="chat.html" class="mob-nav-item"> |
| test save\verification.html | 180 | dashboard.html | link | <a href="dashboard.html" class="mob-nav-item active"> |
| test save\verification.js | 24 | numero de telephone | client-nav | if (missing.includes("phoneNumber")) labels.push("numero de telephone"); |
| test save\verification.js | 25 | piece justificative | client-nav | if (missing.includes("identityDocument")) labels.push("piece justificative"); |
| test save\verification.js | 26 | photo de profil | client-nav | if (missing.includes("profilePhoto")) labels.push("photo de profil"); |
| verification.html | 14 | https://fonts.googleapis.com | link | <link rel="preconnect" href="https://fonts.googleapis.com"> |
| verification.html | 15 | https://fonts.gstatic.com | link | <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> |
| verification.html | 17 | https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap | link | href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" |
| verification.html | 19 | style.css | link | <link rel="stylesheet" href="style.css"> |
| verification.html | 51 | index.html | link | <a href="index.html" class="nav-link">Accueil</a> |
| verification.html | 52 | results.html | link | <a href="results.html" class="nav-link">Explorer</a> |
| verification.html | 53 | post_trip.html | link | <a href="post_trip.html" class="nav-link">Publier</a> |
| verification.html | 54 | chat.html | link | <a href="chat.html" class="nav-link">Messages</a> |
| verification.html | 55 | partner.html | link | <a href="partner.html" id="nav-partner-link" class="nav-link hidden">Partenaire</a> |
| verification.html | 60 | admin.html | link | <a id="admin-link" href="admin.html" class="btn secondary hidden">Admin</a> |
| verification.html | 61 | auth.html | link | <a id="auth-open-btn" href="auth.html" class="btn primary">Login</a> |
| verification.html | 106 | index.html | link | onclick="window.CCCommon.setSession(null, null); window.location.href='index.html';" |
| verification.html | 106 | index.html | location-assign | onclick="window.CCCommon.setSession(null, null); window.location.href='index.html';" |
| verification.html | 158 | index.html | link | <a href="index.html" class="mob-nav-item"> |
| verification.html | 166 | results.html | link | <a href="results.html" class="mob-nav-item"> |
| verification.html | 174 | post_trip.html | link | <a href="post_trip.html" class="mob-nav-item highlight"> |
| verification.html | 177 | chat.html | link | <a href="chat.html" class="mob-nav-item"> |
| verification.html | 185 | partner.html | link | <a href="partner.html" id="mobile-partner-link" class="mob-nav-item hidden"> |
| verification.html | 193 | dashboard.html | link | <a href="dashboard.html" class="mob-nav-item active"> |
| verification.js | 24 | numero de telephone | client-nav | if (missing.includes("phoneNumber")) labels.push("numero de telephone"); |
| verification.js | 25 | piece justificative | client-nav | if (missing.includes("identityDocument")) labels.push("piece justificative"); |
| verification.js | 26 | photo de profil | client-nav | if (missing.includes("profilePhoto")) labels.push("photo de profil"); |

## API Calls

| Source | Line | Method | Endpoint | Evidence |
|---|---:|---|---|---|
| backend\anti_slop_test.js | 8 | GET | http://localhost:8080${path} | const res = await fetch(`http://localhost:8080${path}`, { |
| backend\server.js | 83 | GET | https://api.aviationstack.com/v1/flights?${params.toString()} | const response = await fetch(`https://api.aviationstack.com/v1/flights?${params.toString()}`, { |
| test save\backend\server.js | 82 | GET | https://api.aviationstack.com/v1/flights?${params.toString()} | const response = await fetch(`https://api.aviationstack.com/v1/flights?${params.toString()}`, { |

## State Parameter Tracking

### Produced Parameters

| Param | Source | Line |
|---|---|---:|
| days | admin.js | 520 |
| days | script.js | 564 |
| days | test save\admin.js | 519 |
| days | test save\script.js | 564 |
| display | admin.html | 18 |
| display | approvals.html | 12 |
| display | auth.html | 17 |
| display | chat.html | 17 |
| display | dashboard.html | 17 |
| display | index.html | 19 |
| display | partner.html | 17 |
| display | post_trip.html | 17 |
| display | results.html | 17 |
| display | test save\admin.html | 18 |
| display | test save\approvals.html | 12 |
| display | test save\auth.html | 17 |
| display | test save\chat.html | 17 |
| display | test save\dashboard.html | 17 |
| display | test save\index.html | 19 |
| display | test save\post_trip.html | 17 |
| display | test save\results.html | 17 |
| display | test save\verification.html | 17 |
| display | verification.html | 17 |
| family | admin.html | 18 |
| family | admin.html | 18 |
| family | approvals.html | 12 |
| family | approvals.html | 12 |
| family | auth.html | 17 |
| family | auth.html | 17 |
| family | chat.html | 17 |
| family | chat.html | 17 |
| family | dashboard.html | 17 |
| family | dashboard.html | 17 |
| family | index.html | 19 |
| family | index.html | 19 |
| family | partner.html | 17 |
| family | partner.html | 17 |
| family | post_trip.html | 17 |
| family | post_trip.html | 17 |
| family | results.html | 17 |
| family | results.html | 17 |
| family | test save\admin.html | 18 |
| family | test save\admin.html | 18 |
| family | test save\approvals.html | 12 |
| family | test save\approvals.html | 12 |
| family | test save\auth.html | 17 |
| family | test save\auth.html | 17 |
| family | test save\chat.html | 17 |
| family | test save\chat.html | 17 |
| family | test save\dashboard.html | 17 |
| family | test save\dashboard.html | 17 |
| family | test save\index.html | 19 |
| family | test save\index.html | 19 |
| family | test save\post_trip.html | 17 |
| family | test save\post_trip.html | 17 |
| family | test save\results.html | 17 |
| family | test save\results.html | 17 |
| family | test save\verification.html | 17 |
| family | test save\verification.html | 17 |
| family | verification.html | 17 |
| family | verification.html | 17 |
| id | dashboard.js | 214 |
| id | test save\dashboard.js | 219 |
| limit | admin.js | 527 |
| limit | script.js | 605 |
| limit | test save\admin.js | 526 |
| limit | test save\script.js | 605 |
| next | main.js | 125 |
| next | standalone-common.js | 235 |
| next | test save\main.js | 124 |
| next | test save\standalone-common.js | 229 |
| offerId | main.js | 670 |
| offerId | results.js | 109 |
| offerId | test save\main.js | 649 |
| offerId | test save\results.js | 93 |
| pageSize | chat.js | 420 |
| pageSize | chat.js | 433 |
| pageSize | dashboard.js | 98 |
| pageSize | main.js | 599 |
| pageSize | test save\chat.js | 256 |
| pageSize | test save\chat.js | 269 |
| pageSize | test save\dashboard.js | 98 |
| pageSize | test save\main.js | 578 |
| prefill | script.js | 704 |
| prefill | test save\script.js | 704 |
| reservation | script.js | 704 |
| reservation | test save\script.js | 704 |
| returnTo | script.js | 125 |
| returnTo | test save\script.js | 125 |
| scope | dashboard.js | 98 |
| scope | main.js | 599 |
| scope | test save\dashboard.js | 98 |
| scope | test save\main.js | 578 |
| thread | script.js | 704 |
| thread | script.js | 1119 |
| thread | test save\script.js | 704 |
| thread | test save\script.js | 1119 |
| type | approvals.js | 173 |
| type | test save\approvals.js | 173 |
| u | backend\server.js | 1018 |
| u | backend\server.js | 1764 |
| u | backend\server.js | 1765 |
| u | mock-api.js | 12 |
| u | mock-api.js | 25 |
| u | mock-api.js | 38 |
| u | mock-api.js | 51 |
| u | mock-api.js | 64 |
| u | mock-api.js | 81 |
| u | mock-api.js | 89 |
| u | mock-api.js | 277 |
| u | script.js | 636 |
| u | script.js | 878 |
| u | script.js | 894 |
| u | test save\backend\server.js | 1015 |
| u | test save\backend\server.js | 1630 |
| u | test save\backend\server.js | 1631 |
| u | test save\mock-api.js | 12 |
| u | test save\mock-api.js | 25 |
| u | test save\mock-api.js | 38 |
| u | test save\mock-api.js | 51 |
| u | test save\mock-api.js | 64 |
| u | test save\mock-api.js | 81 |
| u | test save\mock-api.js | 89 |
| u | test save\mock-api.js | 277 |
| u | test save\script.js | 636 |
| u | test save\script.js | 878 |
| u | test save\script.js | 894 |

### Consumed Parameters

| Param | Source | Line |
|---|---|---:|
| accessibility | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 302 |
| accessibility | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 400 |
| accessibility | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 302 |
| accessibility | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 400 |
| availableKg | main.js | 695 |
| availableKg | test save\main.js | 674 |
| best_for | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 299 |
| best_for | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 324 |
| best_for | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 398 |
| best_for | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 423 |
| best_for | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 743 |
| best_for | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 299 |
| best_for | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 324 |
| best_for | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 398 |
| best_for | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 423 |
| best_for | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 743 |
| color_strategy | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 388 |
| color_strategy | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 388 |
| conversion | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 285 |
| conversion | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 384 |
| conversion | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 755 |
| conversion | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 285 |
| conversion | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 384 |
| conversion | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 755 |
| css_import | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 329 |
| css_import | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 427 |
| css_import | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 601 |
| css_import | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 329 |
| css_import | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 427 |
| css_import | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 601 |
| cta_placement | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 287 |
| cta_placement | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 386 |
| cta_placement | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 757 |
| cta_placement | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 287 |
| cta_placement | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 386 |
| cta_placement | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 757 |
| days | backend\server.js | 2087 |
| days | test save\backend\server.js | 1841 |
| departureDate | main.js | 694 |
| departureDate | test save\main.js | 673 |
| description | main.js | 697 |
| description | test save\main.js | 676 |
| destination | backend\server.js | 1273 |
| destination | backend\server.js | 1425 |
| destination | main.js | 571 |
| destination | main.js | 693 |
| destination | results.js | 20 |
| destination | test save\backend\server.js | 1231 |
| destination | test save\backend\server.js | 1376 |
| destination | test save\main.js | 550 |
| destination | test save\main.js | 672 |
| destination | test save\results.js | 16 |
| email | main.js | 517 |
| email | main.js | 537 |
| email | standalone-common.js | 396 |
| email | standalone-common.js | 411 |
| email | test save\main.js | 497 |
| email | test save\main.js | 517 |
| email | test save\standalone-common.js | 390 |
| email | test save\standalone-common.js | 405 |
| fullName | main.js | 536 |
| fullName | standalone-common.js | 410 |
| fullName | test save\main.js | 516 |
| fullName | test save\standalone-common.js | 404 |
| get | backend\server.js | 424 |
| get | backend\server.js | 425 |
| get | chat.js | 631 |
| get | script.js | 609 |
| get | script.js | 610 |
| get | script.js | 610 |
| get | script.js | 611 |
| get | script.js | 612 |
| get | script.js | 963 |
| get | script.js | 964 |
| get | script.js | 965 |
| get | standalone-common.js | 228 |
| get | test save\backend\server.js | 420 |
| get | test save\backend\server.js | 421 |
| get | test save\chat.js | 414 |
| get | test save\script.js | 609 |
| get | test save\script.js | 610 |
| get | test save\script.js | 610 |
| get | test save\script.js | 611 |
| get | test save\script.js | 612 |
| get | test save\script.js | 963 |
| get | test save\script.js | 964 |
| get | test save\script.js | 965 |
| get | test save\standalone-common.js | 222 |
| google_fonts_url | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 327 |
| google_fonts_url | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 425 |
| google_fonts_url | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 598 |
| google_fonts_url | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 327 |
| google_fonts_url | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 425 |
| google_fonts_url | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 598 |
| keywords | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 296 |
| keywords | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 396 |
| keywords | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 740 |
| keywords | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 296 |
| keywords | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 396 |
| keywords | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 740 |
| limit | backend\server.js | 2817 |
| limit | test save\backend\server.js | 2562 |
| lower | .agent\skills\ui-ux-pro-max\scripts\core.py | 192 |
| lower | .codex\skills\ui-ux-pro-max\scripts\core.py | 192 |
| maxPrice | backend\server.js | 1274 |
| maxPrice | main.js | 573 |
| maxPrice | test save\backend\server.js | 1232 |
| maxPrice | test save\main.js | 552 |
| maxPrice | test save\results.js | 18 |
| minKg | backend\server.js | 1275 |
| minKg | main.js | 572 |
| minKg | results.js | 21 |
| minKg | test save\backend\server.js | 1233 |
| minKg | test save\main.js | 551 |
| minKg | test save\results.js | 17 |
| mood | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 321 |
| mood | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 421 |
| mood | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 596 |
| mood | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 321 |
| mood | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 421 |
| mood | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 596 |
| notes | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 314 |
| notes | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 413 |
| notes | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 587 |
| notes | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 314 |
| notes | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 413 |
| notes | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 587 |
| origin | main.js | 692 |
| origin | test save\main.js | 671 |
| password | main.js | 518 |
| password | main.js | 538 |
| password | standalone-common.js | 397 |
| password | standalone-common.js | 412 |
| password | test save\main.js | 498 |
| password | test save\main.js | 518 |
| password | test save\standalone-common.js | 391 |
| password | test save\standalone-common.js | 406 |
| performance | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 302 |
| performance | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 400 |
| performance | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 302 |
| performance | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 400 |
| pricePerKg | main.js | 696 |
| pricePerKg | test save\main.js | 675 |
| q | backend\server.js | 2108 |
| q | backend\server.js | 2473 |
| q | test save\backend\server.js | 1862 |
| q | test save\backend\server.js | 2218 |
| scope | backend\server.js | 1277 |
| scope | backend\server.js | 1424 |
| scope | test save\backend\server.js | 1235 |
| scope | test save\backend\server.js | 1375 |
| set | backend\server.js | 76 |
| set | script.js | 531 |
| set | script.js | 798 |
| set | script.js | 799 |
| set | script.js | 800 |
| set | script.js | 801 |
| set | test save\backend\server.js | 75 |
| set | test save\script.js | 531 |
| set | test save\script.js | 798 |
| set | test save\script.js | 799 |
| set | test save\script.js | 800 |
| set | test save\script.js | 801 |
| stack | .agent\skills\ui-ux-pro-max\scripts\search.py | 36 |
| stack | .codex\skills\ui-ux-pro-max\scripts\search.py | 36 |
| status | backend\server.js | 1508 |
| status | test save\backend\server.js | 1459 |
| title | main.js | 691 |
| title | test save\main.js | 670 |
| toString | backend\server.js | 83 |
| toString | main.js | 587 |
| toString | results.js | 33 |
| toString | script.js | 481 |
| toString | script.js | 522 |
| toString | script.js | 532 |
| toString | script.js | 568 |
| toString | script.js | 577 |
| toString | script.js | 802 |
| toString | script.js | 802 |
| toString | test save\backend\server.js | 82 |
| toString | test save\main.js | 566 |
| toString | test save\results.js | 31 |
| toString | test save\script.js | 481 |
| toString | test save\script.js | 522 |
| toString | test save\script.js | 532 |
| toString | test save\script.js | 568 |
| toString | test save\script.js | 577 |
| toString | test save\script.js | 802 |
| toString | test save\script.js | 802 |
| type | backend\server.js | 2212 |
| type | test save\backend\server.js | 1957 |
| upper | .agent\skills\ui-ux-pro-max\scripts\design_system.py | 198 |
| upper | .codex\skills\ui-ux-pro-max\scripts\design_system.py | 198 |
| userRole | main.js | 539 |
| userRole | standalone-common.js | 413 |
| verifiedOnly | backend\server.js | 1276 |
| verifiedOnly | test save\backend\server.js | 1234 |

## Potential Orphan Entry Points

No obvious orphan entry points detected.
