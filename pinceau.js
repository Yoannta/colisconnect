/**
 * M-Lucetti Pinceau — annoter les pages du site (réservé aux comptes admin).
 *
 * Fonctionnalité reprise du prototype : un bouton « Mettre une remarque » en bas
 * à droite ; l'écran s'assombrit ; on dessine (pinceau) ou on pose une note
 * (texte) ; « Enregistrer » garde les annotations sur LA page concernée, même
 * après un rechargement ou un F5 dur.
 *
 * Différences avec le prototype, voulues pour le site :
 *  - les annotations sont ancrées à la PAGE (pas à la fenêtre) : en descendant
 *    dans une longue page, une note reste collée à l'endroit où elle a été posée ;
 *  - enregistrement à deux endroits : la base (table page_notes, lisible et
 *    modifiable par les admins seulement) ET le navigateur (secours hors ligne) ;
 *  - le bouton n'apparaît QUE pour un compte admin connecté (`CCCommon.state.user.role`).
 *
 * Aucune dépendance. S'auto-monte. Pour désactiver : retirer la balise <script>.
 */
(function () {
    "use strict";

    const ID_CSS = "cc-pinceau-css";
    const CLE_LOCALE = "m-lucetti-pinceau-v1:" + location.origin + location.pathname;
    const CHEMIN = location.pathname || "/";
    const DELAI_ADMIN = 20000;   // on attend la session jusqu'à 20 s
    const PAS_ADMIN = 400;

    let monte = false;
    let plusBesoin = false;

    // ── état des annotations ────────────────────────────────────────────────
    let strokes = [];
    let texts = [];
    let mode = "brush";
    let editing = false;
    let drawing = false;
    let currentStroke = null;
    let selected = null;
    let drag = null;
    let history = [];
    let baseline = null;
    let tailleInitialisee = false;

    // ── petits utilitaires ──────────────────────────────────────────────────
    const $ = (id) => document.getElementById(id);
    const neufId = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(16).slice(2));
    const clone = (o) => JSON.parse(JSON.stringify(o));
    // Coordonnées DOCUMENT (l'annotation suit la page quand on défile).
    const dX = (x) => x + window.scrollX;
    const dY = (y) => y + window.scrollY;
    const vX = (x) => x - window.scrollX;
    const vY = (y) => y - window.scrollY;

    const sb = () => window.ccSupabase || null;
    const sessionOk = () => {
        const c = sb();
        return !!(c && c.auth && typeof c.auth.getSession === "function");
    };
    async function idUtilisateur() {
        const c = sb();
        if (!c) return null;
        try {
            const { data } = await c.auth.getSession();
            return (data && data.session && data.session.user && data.session.user.id) || null;
        } catch (e) { return null; }
    }

    // ── styles (injectés, préfixe pin- : aucun risque de collision) ─────────
    const CSS = `
#pin-layer{position:fixed;top:0;left:0;z-index:2147481000;pointer-events:none;will-change:transform}
#pin-layer.pin-cache{display:none}
#pin-layer canvas{position:absolute;top:0;left:0;pointer-events:none}
.pin-note{position:absolute;pointer-events:auto;white-space:pre-wrap;min-width:45px;max-width:min(320px,80vw);
  padding:4px 7px;border:1px dashed transparent;border-radius:4px;font-weight:650;font-size:19px;line-height:1.35;
  color:#d22d36;text-shadow:0 1px 0 #fff,1px 0 0 #fff,0 -1px 0 #fff;cursor:grab;touch-action:none}
.pin-note.pin-sel{border-color:#356df3;background:#ffffffbd}
.pin-note:active{cursor:grabbing}
#pin-shade{position:fixed;inset:0;z-index:2147482000;background:rgba(13,19,31,.56);display:none;touch-action:none}
#pin-shade.pin-actif{display:block}
#pin-canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:crosshair}
#pin-barre{position:fixed;z-index:2147482100;left:50%;bottom:22px;transform:translateX(-50%);display:none;
  align-items:center;gap:8px;padding:9px;background:#fff;border:1px solid #e6eaf0;border-radius:18px;
  box-shadow:0 15px 50px #0003;max-width:calc(100vw - 24px);overflow-x:auto;scrollbar-width:thin}
#pin-barre.pin-actif{display:flex}
.pin-outil{width:46px;height:46px;border:0;border-radius:12px;background:#f2f4f8;color:#273247;display:grid;
  place-items:center;cursor:pointer;flex-shrink:0}
.pin-outil svg{width:21px;height:21px}
.pin-outil:hover{background:#e8edfa}
.pin-outil.pin-actif{background:#e2eaff;color:#2458dc;box-shadow:inset 0 0 0 1px #b9ccff}
.pin-outil.pin-save{background:#2563eb;color:#fff;width:auto;padding:0 17px;display:flex;gap:8px;font-weight:750}
.pin-outil.pin-save:hover{background:#174ac1}
.pin-outil.pin-sortie{color:#bd2634}
.pin-outil.pin-suppr{color:#c12736}
.pin-outil.pin-suppr:not(:disabled):hover{background:#ffe8eb}
.pin-outil:disabled{opacity:.35;cursor:not-allowed;box-shadow:none}
.pin-sep{height:28px;width:1px;background:#e5e9f0;margin:0 2px;flex-shrink:0}
#pin-bouton{position:fixed;right:22px;bottom:22px;z-index:2147481500;border:0;border-radius:999px;background:#1f2937;
  color:#fff;padding:14px 19px;display:flex;align-items:center;gap:10px;font:inherit;font-weight:750;
  box-shadow:0 10px 30px #10182838;cursor:pointer}
#pin-bouton:hover{transform:translateY(-1px);background:#111827}
#pin-bouton svg{width:19px;height:19px}
.pin-note-editeur{position:fixed;z-index:2147482200;display:none;width:250px;background:#fff;padding:12px;border-radius:14px;
  box-shadow:0 12px 36px #0003;color:#1f2937;font:14px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.pin-note-editeur label{display:block;font-size:12px;font-weight:750;margin-bottom:7px}
.pin-note-editeur textarea{width:100%;min-height:76px;resize:vertical;border:1px solid #d9e0eb;border-radius:9px;
  padding:9px;font:14px/1.5 inherit;outline-color:#356df3;color:#1f2937;background:#fff}
.pin-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:8px}
.pin-mini{border:0;border-radius:8px;padding:8px 11px;font-weight:700;cursor:pointer;background:#edf0f5;color:#344054}
.pin-mini.pin-primaire{background:#2563eb;color:#fff}
#pin-aide{position:fixed;z-index:2147482150;top:17px;left:50%;transform:translateX(-50%);background:#fff;color:#344054;
  border-radius:999px;padding:10px 15px;font-size:12px;font-weight:650;box-shadow:0 5px 24px #0002;
  max-width:calc(100vw - 24px);text-align:center;display:none;
  font:650 12px/1.4 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
#pin-aide.pin-actif{display:block}
#pin-avis{position:fixed;z-index:2147483000;left:50%;bottom:90px;transform:translateX(-50%);background:#172033;color:#fff;
  border-radius:12px;padding:11px 15px;font-size:13px;box-shadow:0 8px 25px #0003;opacity:0;pointer-events:none;
  transition:opacity .2s;font:600 13px/1.4 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
#pin-avis.pin-actif{opacity:1}
@media(max-width:768px){
  #pin-bouton{right:12px;bottom:88px;padding:12px 15px;font-size:14px}
  #pin-barre{bottom:12px;gap:5px;padding:7px}
  .pin-outil{width:42px;height:42px}
  .pin-outil.pin-save{padding:0 12px}
  .pin-note{font-size:17px}
}
`;

    function injecterStyles() {
        if ($(ID_CSS)) return;
        const st = document.createElement("style");
        st.id = ID_CSS;
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    // ── interface ───────────────────────────────────────────────────────────
    const ICONES = {
        crayon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5 4 4L8 20l-5 1 1-5Z"/><path d="m12 8 4 4"/></svg>',
        croix: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>',
        annuler: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-2"/></svg>',
        pinceau: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14 6 4 4M4 20c4 0 6-2 6-5l8-8a2.8 2.8 0 0 0-4-4l-8 8c-3 0-5 2-5 6v3Z"/></svg>',
        texte: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7V4h16v3M12 4v16M8 20h8"/></svg>',
        fleche: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 3 14 10-7 1-3 7-4-18Z"/></svg>',
        poubelle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></svg>',
        disquette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>'
    };

    function construireInterface() {
        const bouton = document.createElement("button");
        bouton.id = "pin-bouton";
        bouton.type = "button";
        bouton.setAttribute("aria-label", "Mettre une remarque");
        bouton.title = "Mettre une remarque sur cette page";
        bouton.innerHTML = ICONES.crayon + " Mettre une remarque";
        document.body.appendChild(bouton);

        const layer = document.createElement("div");
        layer.id = "pin-layer";
        layer.setAttribute("aria-label", "Annotations enregistrées");
        document.body.appendChild(layer);

        const shade = document.createElement("div");
        shade.id = "pin-shade";
        shade.innerHTML = '<canvas id="pin-canvas"></canvas>';
        document.body.appendChild(shade);

        const aide = document.createElement("div");
        aide.id = "pin-aide";
        aide.textContent = "Choisissez un outil dans la barre en bas.";
        document.body.appendChild(aide);

        const barre = document.createElement("div");
        barre.id = "pin-barre";
        barre.innerHTML = `
            <button class="pin-outil pin-sortie" id="pin-sortie" type="button" title="Quitter sans enregistrer" aria-label="Quitter">${ICONES.croix}</button>
            <button class="pin-outil" id="pin-annuler" type="button" title="Annuler la dernière action" aria-label="Annuler" disabled>${ICONES.annuler}</button>
            <div class="pin-sep"></div>
            <button class="pin-outil pin-actif" id="pin-pinceau" type="button" title="Pinceau" aria-label="Pinceau">${ICONES.pinceau}</button>
            <button class="pin-outil" id="pin-texte" type="button" title="Écrire du texte" aria-label="Écrire du texte">${ICONES.texte}</button>
            <button class="pin-outil" id="pin-selection" type="button" title="Sélectionner ou déplacer une annotation" aria-label="Sélectionner">${ICONES.fleche}</button>
            <button class="pin-outil pin-suppr" id="pin-suppr" type="button" title="Supprimer l’annotation sélectionnée" aria-label="Supprimer" disabled>${ICONES.poubelle}</button>
            <div class="pin-sep"></div>
            <button class="pin-outil pin-save" id="pin-save" type="button" title="Enregistrer les annotations">${ICONES.disquette} Enregistrer</button>
        `;
        document.body.appendChild(barre);

        const ed = document.createElement("div");
        ed.id = "pin-editeur";
        ed.className = "pin-note-editeur";
        ed.innerHTML = `
            <label for="pin-champ">Votre remarque</label>
            <textarea id="pin-champ" placeholder="Ex. : remplacer cette image…"></textarea>
            <div class="pin-actions">
                <button class="pin-mini" id="pin-texte-annuler" type="button">Annuler</button>
                <button class="pin-mini pin-primaire" id="pin-texte-placer" type="button">Placer le texte</button>
            </div>`;
        document.body.appendChild(ed);

        const avis = document.createElement("div");
        avis.id = "pin-avis";
        avis.setAttribute("role", "status");
        document.body.appendChild(avis);
    }

    // ── dessin ──────────────────────────────────────────────────────────────
    const canvas = () => $("pin-canvas");
    const ctx = () => canvas().getContext("2d");

    function redimensionnerCanvas() {
        const c = canvas();
        if (!c) return;
        const dpr = window.devicePixelRatio || 1;
        c.width = Math.round(window.innerWidth * dpr);
        c.height = Math.round(window.innerHeight * dpr);
        c.style.width = window.innerWidth + "px";
        c.style.height = window.innerHeight + "px";
        ctx().setTransform(dpr, 0, 0, dpr, 0, 0);
        dessinerTout();
    }

    function dessinerTrace(c, s, opts) {
        opts = opts || {};
        if (!s.points || !s.points.length) return;
        c.save();
        c.strokeStyle = opts.color || s.color || "#ff3048";
        c.lineWidth = (s.width || 4) + (opts.extra || 0);
        c.lineCap = "round";
        c.lineJoin = "round";
        if (opts.dash) c.setLineDash([7, 5]);
        c.beginPath();
        // les points sont en coordonnées DOCUMENT : on revient en vue pour l'écran
        c.moveTo(vX(s.points[0].x), vY(s.points[0].y));
        for (let i = 1; i < s.points.length; i++) c.lineTo(vX(s.points[i].x), vY(s.points[i].y));
        if (s.points.length === 1) c.lineTo(vX(s.points[0].x) + 0.1, vY(s.points[0].y) + 0.1);
        c.stroke();
        c.restore();
    }

    function dessinerTout() {
        const c = canvas();
        if (!c) return;
        const g = ctx();
        g.clearRect(0, 0, window.innerWidth, window.innerHeight);
        strokes.forEach((s) => dessinerTrace(g, s));
        if (selected && selected.type === "stroke") {
            const st = strokes.find((s) => s.id === selected.id);
            if (st) dessinerTrace(g, st, { color: "#2474ff", extra: 5, dash: true });
        }
        if (currentStroke) dessinerTrace(g, currentStroke);
        majBoutons();
    }

    function tailleDocument() {
        const w = Math.max(document.documentElement.scrollWidth, window.innerWidth);
        const h = Math.max(document.documentElement.scrollHeight, window.innerHeight);
        return { w: w, h: h };
    }

    function calerLayer() {
        const layer = $("pin-layer");
        if (layer) layer.style.transform = `translate(${-window.scrollX}px, ${-window.scrollY}px)`;
    }

    function dessinerEnregistre() {
        const layer = $("pin-layer");
        if (!layer) return;
        const { w, h } = tailleDocument();
        layer.innerHTML = "";
        const off = document.createElement("canvas");
        off.width = Math.max(1, w);
        off.height = Math.max(1, h);
        const c = off.getContext("2d");
        // le calque est calé sur la page : on dessine directement en coordonnées document
        strokes.forEach((s) => {
            if (!s.points || !s.points.length) return;
            c.strokeStyle = s.color || "#ff3048";
            c.lineWidth = s.width || 4;
            c.lineCap = "round";
            c.lineJoin = "round";
            c.beginPath();
            c.moveTo(s.points[0].x, s.points[0].y);
            for (let i = 1; i < s.points.length; i++) c.lineTo(s.points[i].x, s.points[i].y);
            if (s.points.length === 1) c.lineTo(s.points[0].x + 0.1, s.points[0].y + 0.1);
            c.stroke();
        });
        layer.appendChild(off);
        off.style.position = "absolute";
        off.style.top = "0";
        off.style.left = "0";
        off.style.width = w + "px";
        off.style.height = h + "px";

        texts.forEach((t) => {
            const el = document.createElement("div");
            el.className = "pin-note" + (selected && selected.type === "text" && selected.id === t.id ? " pin-sel" : "");
            el.textContent = t.text;
            el.style.left = t.x + "px";
            el.style.top = t.y + "px";
            el.dataset.id = t.id;
            el.addEventListener("pointerdown", (e) => {
                e.stopPropagation();
                if (editing) return;                     // en édition, les notes sont sur le calque d'édition
                selected = { type: "text", id: t.id };
                drag = { type: "text", id: t.id, dx: dX(e.clientX) - t.x, dy: dY(e.clientY) - t.y, moved: false };
                try { el.setPointerCapture(e.pointerId); } catch (_) { }
                el.classList.add("pin-sel");
                majBoutons();
            });
            layer.appendChild(el);
        });
        calerLayer();
    }

    // ── sauvegarde / chargement ─────────────────────────────────────────────
    function enregistrerLocal() {
        try {
            localStorage.setItem(CLE_LOCALE, JSON.stringify({
                strokes: strokes, texts: texts, updatedAt: new Date().toISOString()
            }));
        } catch (e) { }
    }

    async function enregistrer() {
        if (currentStroke) { strokes.push(currentStroke); currentStroke = null; drawing = false; }
        enregistrerLocal();
        baseline = clone({ strokes: strokes, texts: texts });
        const c = sb();
        if (!c) return { ok: true, base: false };
        try {
            const uid = await idUtilisateur();
            if (!uid) return { ok: true, base: false };
            const r = await c.from("page_notes").upsert({
                path: CHEMIN, strokes: strokes, texts: texts,
                updated_at: new Date().toISOString(), updated_by: uid
            }, { onConflict: "path" });
            if (r && r.error) return { ok: true, base: false, erreur: r.error.message };
            return { ok: true, base: true };
        } catch (e) {
            return { ok: true, base: false, erreur: e && e.message };
        }
    }

    async function charger() {
        let donnees = null;
        const c = sb();
        if (c) {
            try {
                const r = await c.from("page_notes").select("strokes,texts").eq("path", CHEMIN).maybeSingle();
                if (r && !r.error && r.data) donnees = r.data;
            } catch (e) { }
        }
        if (!donnees) {
            try { donnees = JSON.parse(localStorage.getItem(CLE_LOCALE) || "null"); } catch (e) { }
        }
        if (donnees) {
            strokes = (donnees.strokes || []).map((s) => Object.assign({}, s, { id: s.id || neufId() }));
            texts = (donnees.texts || []).map((t) => Object.assign({}, t, { id: t.id || neufId() }));
        }
        baseline = clone({ strokes: strokes, texts: texts });
    }

    function majBoutons() {
        const a = $("pin-annuler");
        const s = $("pin-suppr");
        if (a) a.disabled = history.length === 0 && !currentStroke;
        if (s) s.disabled = !selected;
    }

    function point() {
        history.push(clone({ strokes: strokes, texts: texts }));
        if (history.length > 100) history.shift();
        majBoutons();
    }

    function avis(message) {
        const el = $("pin-avis");
        if (!el) return;
        el.textContent = message;
        el.classList.add("pin-actif");
        clearTimeout(avis._t);
        avis._t = setTimeout(() => el.classList.remove("pin-actif"), 2600);
    }

    // ── ouverture / fermeture ───────────────────────────────────────────────
    function ouvrir() {
        editing = true;
        baseline = clone({ strokes: strokes, texts: texts });
        history = [];
        selected = null;
        drag = null;
        $("pin-shade").classList.add("pin-actif");
        $("pin-barre").classList.add("pin-actif");
        $("pin-bouton").style.display = "none";
        $("pin-aide").classList.add("pin-actif");
        redimensionnerCanvas();
        setMode("brush");
        majBoutons();
    }

    function fermer(abandonner) {
        if (abandonner && baseline) {
            strokes = clone(baseline.strokes);
            texts = clone(baseline.texts);
        }
        editing = false;
        drawing = false;
        currentStroke = null;
        selected = null;
        drag = null;
        $("pin-shade").classList.remove("pin-actif");
        $("pin-barre").classList.remove("pin-actif");
        $("pin-bouton").style.display = "flex";
        $("pin-aide").classList.remove("pin-actif");
        $("pin-editeur").style.display = "none";
        $("pin-layer").classList.remove("pin-cache");
        enregistrerLocal();
        dessinerEnregistre();
        dessinerTout();
    }

    function setMode(suivant) {
        mode = suivant;
        $("pin-pinceau").classList.toggle("pin-actif", mode === "brush");
        $("pin-texte").classList.toggle("pin-actif", mode === "text");
        $("pin-selection").classList.toggle("pin-actif", mode === "select");
        const c = canvas();
        c.style.cursor = mode === "brush" ? "crosshair" : mode === "text" ? "text" : "default";
        $("pin-aide").textContent = mode === "brush"
            ? "Dessinez librement. Utilisez la flèche retour pour annuler."
            : mode === "text"
                ? "Cliquez à l’endroit où placer votre texte."
                : "Cliquez sur un dessin ou une note pour le sélectionner, puis utilisez la corbeille. Une note se déplace en la faisant glisser.";
        majBoutons();
    }

    // ── éditeur de texte ────────────────────────────────────────────────────
    function ouvrirEditeur(x, y, id) {
        const w = 250, h = 170;
        const px = Math.max(8, Math.min(x, window.innerWidth - w - 8));
        const py = Math.max(55, Math.min(y, window.innerHeight - h));
        const ed = $("pin-editeur");
        ed.dataset.x = px + window.scrollX;
        ed.dataset.y = py + window.scrollY;
        ed.dataset.id = id || "";
        $("pin-champ").value = id ? ((texts.find((t) => t.id === id) || {}).text || "") : "";
        ed.style.left = px + "px";
        ed.style.top = py + "px";
        ed.style.display = "block";
        $("pin-champ").focus();
    }

    function distanceSegment(p, a, b) {
        const dx = b.x - a.x, dy = b.y - a.y;
        if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
        const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
        return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    }

    function toucherTrace(dx, dy) {
        const p = { x: dx, y: dy };
        for (let i = strokes.length - 1; i >= 0; i--) {
            const pts = strokes[i].points || [];
            if (pts.length === 1 && Math.hypot(dx - pts[0].x, dy - pts[0].y) <= 14) return strokes[i].id;
            for (let j = 1; j < pts.length; j++) {
                if (distanceSegment(p, pts[j - 1], pts[j]) <= 12) return strokes[i].id;
            }
        }
        return null;
    }

    function toucherNote(dx, dy) {
        const notes = Array.from(document.querySelectorAll("#pin-layer .pin-note"));
        for (let i = notes.length - 1; i >= 0; i--) {
            const el = notes[i];
            const g = el.getBoundingClientRect();
            const x1 = g.left + window.scrollX - 6, y1 = g.top + window.scrollY - 6;
            if (dx >= x1 && dx <= x1 + g.width + 12 && dy >= y1 && dy <= y1 + g.height + 12) return el.dataset.id;
        }
        return null;
    }

    function annuler() {
        if (currentStroke) {
            currentStroke = null;
            drawing = false;
            dessinerTout();
            avis("Dessin annulé.");
            return;
        }
        const prec = history.pop();
        if (!prec) { majBoutons(); return; }
        strokes = prec.strokes;
        texts = prec.texts;
        selected = null;
        dessinerEnregistre();
        dessinerTout();
        avis("Dernière action annulée.");
    }

    function supprimer() {
        if (!selected) return;
        point();
        if (selected.type === "stroke") strokes = strokes.filter((s) => s.id !== selected.id);
        else texts = texts.filter((t) => t.id !== selected.id);
        selected = null;
        dessinerEnregistre();
        dessinerTout();
        avis("Annotation supprimée. Cliquez sur Enregistrer pour confirmer.");
    }

    // ── câblage ─────────────────────────────────────────────────────────────
    function cabler() {
        const c = canvas();
        $("pin-bouton").addEventListener("click", ouvrir);
        $("pin-sortie").addEventListener("click", () => { fermer(true); avis("Modifications non enregistrées abandonnées."); });
        $("pin-annuler").addEventListener("click", annuler);
        $("pin-pinceau").addEventListener("click", () => setMode("brush"));
        $("pin-texte").addEventListener("click", () => setMode("text"));
        $("pin-selection").addEventListener("click", () => setMode("select"));
        $("pin-suppr").addEventListener("click", supprimer);
        $("pin-save").addEventListener("click", async () => {
            const r = await enregistrer();
            fermer(false);
            if (r && r.base) avis("Annotations enregistrées (page « " + CHEMIN + " »).");
            else if (r && r.erreur) avis("Gardées dans ce navigateur ; base : " + r.erreur);
            else avis("Annotations enregistrées sur cette page.");
        });

        c.addEventListener("pointerdown", (e) => {
            if (!editing) return;
            if (mode === "text") { ouvrirEditeur(e.clientX, e.clientY, null); return; }
            if (mode === "select") {
                const idNote = toucherNote(dX(e.clientX), dY(e.clientY));
                if (idNote) {
                    const t = texts.find((x) => x.id === idNote);
                    selected = { type: "text", id: idNote };
                    drag = { type: "text", id: idNote, dx: dX(e.clientX) - t.x, dy: dY(e.clientY) - t.y, moved: false };
                    try { c.setPointerCapture(e.pointerId); } catch (_) { }
                    dessinerTout();
                    return;
                }
                const idTrace = toucherTrace(dX(e.clientX), dY(e.clientY));
                selected = idTrace ? { type: "stroke", id: idTrace } : null;
                dessinerTout();
                return;
            }
            point();
            drawing = true;
            try { c.setPointerCapture(e.pointerId); } catch (_) { }
            currentStroke = { id: neufId(), color: "#ff3048", width: 4, points: [{ x: dX(e.clientX), y: dY(e.clientY) }] };
            dessinerTout();
        });

        c.addEventListener("pointermove", (e) => {
            if (!editing) return;
            if (drag && drag.type === "text") {
                const t = texts.find((x) => x.id === drag.id);
                if (!t) return;
                const { w, h } = tailleDocument();
                t.x = Math.max(0, Math.min(w - 50, dX(e.clientX) - drag.dx));
                t.y = Math.max(0, Math.min(h - 30, dY(e.clientY) - drag.dy));
                drag.moved = true;
                dessinerApercuNote(t);
            } else if (drawing && currentStroke) {
                currentStroke.points.push({ x: dX(e.clientX), y: dY(e.clientY) });
                dessinerTout();
            }
        });

        const finTrace = () => {
            if (drawing && currentStroke) {
                strokes.push(currentStroke);
                currentStroke = null;
                drawing = false;
                dessinerTout();
            }
        };
        c.addEventListener("pointerup", finTrace);
        c.addEventListener("pointercancel", finTrace);
        // pendant l'édition, les notes vivent sur le calque d'écran : on les redessine
        c.addEventListener("pointerup", () => { if (editing) dessinerEnregistre(); });

        $("pin-texte-placer").addEventListener("click", () => {
            const ed = $("pin-editeur");
            const valeur = $("pin-champ").value.trim();
            if (!valeur) { ed.style.display = "none"; return; }
            point();
            const id = ed.dataset.id;
            if (id) {
                const t = texts.find((x) => x.id === id);
                if (t) t.text = valeur;
            } else {
                texts.push({ id: neufId(), text: valeur, x: parseInt(ed.dataset.x, 10), y: parseInt(ed.dataset.y, 10) });
            }
            ed.style.display = "none";
            selected = null;
            setMode("select");
            dessinerEnregistre();     // la note apparaît tout de suite sur la page
            avis("Texte placé. Vous pouvez le déplacer avec le mode sélection.");
        });
        $("pin-texte-annuler").addEventListener("click", () => { $("pin-editeur").style.display = "none"; });

        // déplacement d'une note HORS édition (les annotations sont visibles en permanence)
        document.addEventListener("pointermove", (e) => {
            if (!drag || drag.type !== "text" || editing) return;
            const t = texts.find((x) => x.id === drag.id);
            if (!t) return;
            const { w, h } = tailleDocument();
            t.x = Math.max(0, Math.min(w - 50, dX(e.clientX) - drag.dx));
            t.y = Math.max(0, Math.min(h - 30, dY(e.clientY) - drag.dy));
            drag.moved = true;
            const el = document.querySelector('#pin-layer .pin-note[data-id="' + drag.id + '"]');
            if (el) { el.style.left = t.x + "px"; el.style.top = t.y + "px"; }
        });
        document.addEventListener("pointerup", () => {
            if (!drag) return;
            const termine = drag;
            drag = null;
            if (termine.moved) { enregistrerLocal(); avis("Position de la note enregistrée."); }
        });

        window.addEventListener("keydown", (e) => {
            if (!editing) return;
            if (e.key === "Escape") {
                $("pin-editeur").style.display = "none";
                fermer(true);
            }
            if ((e.key === "Delete" || e.key === "Backspace") && selected && document.activeElement !== $("pin-champ")) {
                e.preventDefault();
                supprimer();
            }
            if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === "z") {
                e.preventDefault();
                annuler();
            }
        });

        window.addEventListener("scroll", () => { calerLayer(); if (editing) dessinerTout(); }, { passive: true });
        window.addEventListener("resize", () => {
            redimensionnerCanvas();
            dessinerEnregistre();
        });
    }

    function dessinerApercuNote(t) {
        // en édition, la note sélectionnée est affichée en direct sur le calque d'édition
        const el = document.querySelector('#pin-layer .pin-note[data-id="' + t.id + '"]');
        if (el) { el.style.left = t.x + "px"; el.style.top = t.y + "px"; }
    }

    // ── montage (réservé admin) ─────────────────────────────────────────────
    function estAdmin() {
        const u = window.CCCommon && window.CCCommon.state && window.CCCommon.state.user;
        return !!u && String(u.role || "").toLowerCase() === "admin";
    }

    async function monter() {
        if (monte || plusBesoin) return;
        monte = true;
        injecterStyles();
        construireInterface();
        cabler();
        await charger();
        dessinerEnregistre();
        window.addEventListener("scroll", calerLayer, { passive: true });
        console.log("[Pinceau] actif sur", CHEMIN, "—", strokes.length, "dessin(s),", texts.length, "note(s)");
    }

    function guetterAdmin() {
        const fin = Date.now() + DELAI_ADMIN;
        const tic = () => {
            if (monte || plusBesoin) return;
            if (estAdmin()) { monter(); return; }
            if (Date.now() > fin) { plusBesoin = true; return; }
            setTimeout(tic, PAS_ADMIN);
        };
        tic();
    }

    window.CCPinceau = {
        monter: monter,
        version: "1.0.0",
        // pour vérifier depuis la console : CCPinceau.etat()
        etat: function () {
            return {
                chemin: CHEMIN, admin: estAdmin(), monte: monte,
                dessins: strokes.length, notes: texts.length,
                stockage: CLE_LOCALE
            };
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", guetterAdmin);
    } else {
        guetterAdmin();
    }
})();
