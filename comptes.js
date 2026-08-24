/**
 * Les Chroniques d'Astreia — registre des comptes.
 *
 * Un seul Durable Object pour tout le site (idFromName("comptes")) : les
 * comptes doivent suivre le joueur d'une table a l'autre et d'un appareil a
 * l'autre, donc ils ne peuvent pas vivre dans le DO d'une table.
 *
 * Ce qu'il range :
 *   u:<cle>     le compte     {pseudo, cle, sel, hash, tours, cree, role}
 *   d:<cle>     ses fiches    (JSON opaque, decoupe en morceaux si besoin)
 *   j:<jeton>   une session   {cle, expire}
 *   nb          combien de comptes existent (le premier cree devient meneur)
 *
 * Le mot de passe n'est jamais range en clair ni renvoye : seul un derive
 * PBKDF2-SHA256 est conserve, avec un sel propre a chaque compte.
 */

const TOURS = 210000;                       // iterations PBKDF2
const DUREE_JETON = 90 * 24 * 3600 * 1000;  // 90 jours
const TAILLE_MORCEAU = 96 * 1024;           // le stockage borne la taille par cle
const MAX_DONNEES = 2 * 1024 * 1024;        // 2 Mo de fiches par compte

const PSEUDO_MIN = 2, PSEUDO_MAX = 24, MDP_MIN = 6;

/* ---- petits outils ---- */

const enc = new TextEncoder();
const json = (o, statut = 200) =>
  new Response(JSON.stringify(o), { status: statut, headers: { "content-type": "application/json; charset=utf-8" } });

const hex = buf => [...new Uint8Array(buf)].map(o => o.toString(16).padStart(2, "0")).join("");
const alea = (n = 32) => hex(crypto.getRandomValues(new Uint8Array(n)));

/** Clef de rangement : deux pseudos qui ne different que par la casse ou les
 *  accents sont le meme compte, sinon « Esteban » et « esteban » coexistent. */
function normaliser(pseudo) {
  return String(pseudo || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

async function derive(mdp, sel, tours = TOURS) {
  const cle = await crypto.subtle.importKey("raw", enc.encode(mdp), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(sel), iterations: tours, hash: "SHA-256" }, cle, 256);
  return hex(bits);
}

/** Comparaison a duree constante : ne pas laisser le temps de reponse trahir
 *  combien de caracteres du hash sont corrects. */
function memeHash(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const publiable = c => ({ pseudo: c.pseudo, role: c.role, cree: c.cree });

export class Comptes {
  constructor(ctx) {
    this.ctx = ctx;
    this.echecs = new Map();   // cle -> {n, jusqu'a} : freine les essais en rafale
  }

  /* ---- rangement des fiches privees, decoupe en morceaux ---- */

  async lireDonnees(cle) {
    const n = (await this.ctx.storage.get("dn:" + cle)) || 0;
    if (!n) return null;
    let txt = "";
    for (let i = 0; i < n; i++) txt += (await this.ctx.storage.get(`d:${cle}:${i}`)) || "";
    try { return JSON.parse(txt); } catch { return null; }
  }

  async rangerDonnees(cle, donnees) {
    const txt = JSON.stringify(donnees);
    const n = Math.max(1, Math.ceil(txt.length / TAILLE_MORCEAU));
    const avant = (await this.ctx.storage.get("dn:" + cle)) || 0;
    const lot = { ["dn:" + cle]: n };
    for (let i = 0; i < n; i++) lot[`d:${cle}:${i}`] = txt.slice(i * TAILLE_MORCEAU, (i + 1) * TAILLE_MORCEAU);
    await this.ctx.storage.put(lot);
    for (let i = n; i < avant; i++) await this.ctx.storage.delete(`d:${cle}:${i}`);
  }

  /* ---- sessions ---- */

  async ouvrirSession(cle) {
    const jeton = alea(32);
    await this.ctx.storage.put("j:" + jeton, { cle, expire: Date.now() + DUREE_JETON });
    return jeton;
  }

  async parJeton(jeton) {
    if (!jeton) return null;
    const s = await this.ctx.storage.get("j:" + jeton);
    if (!s) return null;
    if (s.expire < Date.now()) { await this.ctx.storage.delete("j:" + jeton); return null; }
    const compte = await this.ctx.storage.get("u:" + s.cle);
    return compte || null;
  }

  /* ---- routage ---- */

  async fetch(req) {
    const url = new URL(req.url);
    const voie = url.pathname.replace(/^\/api\/?/, "");
    let corps = {};
    if (req.method === "POST") { try { corps = await req.json(); } catch { corps = {}; } }

    switch (voie) {
      case "inscription":  return this.inscription(corps);
      case "connexion":    return this.connexion(corps);
      case "moi":          return this.moi(corps);
      case "donnees":      return this.donnees(corps);
      case "deconnexion":  return this.deconnexion(corps);
      case "membres":      return this.membres(corps);
      case "role":         return this.role(corps);
      case "valider":      return this.valider(corps);   // interne : appele par la table
      default:             return json({ ok: false, err: "voie inconnue" }, 404);
    }
  }

  async inscription({ pseudo, mdp }) {
    const propre = String(pseudo || "").trim();
    if (propre.length < PSEUDO_MIN || propre.length > PSEUDO_MAX)
      return json({ ok: false, err: `Le pseudo doit faire entre ${PSEUDO_MIN} et ${PSEUDO_MAX} caracteres.` }, 400);
    if (String(mdp || "").length < MDP_MIN)
      return json({ ok: false, err: `Le mot de passe doit faire au moins ${MDP_MIN} caracteres.` }, 400);

    const cle = normaliser(propre);
    if (!cle) return json({ ok: false, err: "Pseudo invalide." }, 400);
    if (await this.ctx.storage.get("u:" + cle))
      return json({ ok: false, err: "Ce pseudo est deja pris." }, 409);

    const nb = (await this.ctx.storage.get("nb")) || 0;
    const sel = alea(16);
    const compte = {
      pseudo: propre, cle, sel, tours: TOURS,
      hash: await derive(mdp, sel),
      cree: Date.now(),
      role: nb === 0 ? "meneur" : "joueur",   // le premier inscrit tient la table
    };
    await this.ctx.storage.put({ ["u:" + cle]: compte, nb: nb + 1 });
    return json({ ok: true, jeton: await this.ouvrirSession(cle), compte: publiable(compte), donnees: null });
  }

  async connexion({ pseudo, mdp }) {
    const cle = normaliser(pseudo);
    const frein = this.echecs.get(cle);
    if (frein && frein.jusqua > Date.now())
      return json({ ok: false, err: "Trop d'essais. Reessaie dans un instant." }, 429);

    const compte = await this.ctx.storage.get("u:" + cle);
    // Sur compte inconnu on derive quand meme, au meme cout : sinon le temps de
    // reponse revele quels pseudos existent.
    const sel = compte ? compte.sel : "sel-absent-cout-identique";
    const propose = await derive(mdp, sel, compte ? (compte.tours || TOURS) : TOURS);
    const attendu = compte ? compte.hash : propose.replace(/./, c => (c === "0" ? "1" : "0"));

    if (!compte || !memeHash(attendu, propose)) {
      const n = (frein && frein.n || 0) + 1;
      this.echecs.set(cle, { n, jusqua: n >= 5 ? Date.now() + 30000 : 0 });
      return json({ ok: false, err: "Pseudo ou mot de passe incorrect." }, 401);
    }
    this.echecs.delete(cle);
    return json({
      ok: true, jeton: await this.ouvrirSession(cle),
      compte: publiable(compte), donnees: await this.lireDonnees(cle),
    });
  }

  async moi({ jeton }) {
    const compte = await this.parJeton(jeton);
    if (!compte) return json({ ok: false, err: "Session expiree." }, 401);
    return json({ ok: true, compte: publiable(compte), donnees: await this.lireDonnees(compte.cle) });
  }

  async donnees({ jeton, donnees }) {
    const compte = await this.parJeton(jeton);
    if (!compte) return json({ ok: false, err: "Session expiree." }, 401);
    if (JSON.stringify(donnees || null).length > MAX_DONNEES)
      return json({ ok: false, err: "Tes fiches depassent la taille autorisee." }, 413);
    await this.rangerDonnees(compte.cle, donnees);
    return json({ ok: true });
  }

  async deconnexion({ jeton }) {
    if (jeton) await this.ctx.storage.delete("j:" + jeton);
    return json({ ok: true });
  }

  async membres({ jeton }) {
    const compte = await this.parJeton(jeton);
    if (!compte) return json({ ok: false, err: "Session expiree." }, 401);
    if (compte.role !== "meneur") return json({ ok: false, err: "Reserve au meneur." }, 403);
    const tout = await this.ctx.storage.list({ prefix: "u:" });
    return json({ ok: true, membres: [...tout.values()].map(publiable).sort((a, b) => a.cree - b.cree) });
  }

  async role({ jeton, cible, role }) {
    const compte = await this.parJeton(jeton);
    if (!compte) return json({ ok: false, err: "Session expiree." }, 401);
    if (compte.role !== "meneur") return json({ ok: false, err: "Reserve au meneur." }, 403);
    if (role !== "meneur" && role !== "joueur") return json({ ok: false, err: "Role inconnu." }, 400);

    const cle = normaliser(cible);
    const vise = await this.ctx.storage.get("u:" + cle);
    if (!vise) return json({ ok: false, err: "Compte introuvable." }, 404);

    // Ne pas se retirer le dernier meneur : la table deviendrait inmodifiable.
    if (vise.cle === compte.cle && role === "joueur") {
      const tout = await this.ctx.storage.list({ prefix: "u:" });
      const meneurs = [...tout.values()].filter(c => c.role === "meneur");
      if (meneurs.length <= 1)
        return json({ ok: false, err: "Tu es le seul meneur : nomme quelqu'un d'autre d'abord." }, 409);
    }
    vise.role = role;
    await this.ctx.storage.put("u:" + cle, vise);
    return json({ ok: true, compte: publiable(vise) });
  }

  /** Appele par le Durable Object d'une table, jamais par le navigateur. */
  async valider({ jeton }) {
    const compte = await this.parJeton(jeton);
    if (!compte) return json({ ok: false }, 401);
    return json({ ok: true, pseudo: compte.pseudo, cle: compte.cle, role: compte.role });
  }
}
