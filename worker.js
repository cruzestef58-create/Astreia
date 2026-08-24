/**
 * Les Chroniques d'Astréïa — serveur de table en direct.
 *
 * Un Durable Object par table : il garde l'état de campagne et le rediffuse
 * à toutes les fenêtres ouvertes. Deux messages seulement :
 *   {t:"etat", camp}            état complet, proposé par un client
 *   {t:"pion", m, id, x, y}     déplacement en cours, diffusé au fil du geste
 *
 * Le client propose, le serveur dispose : `fusionner` ne retient de la
 * proposition que les zones où l'expéditeur a autorité. Un joueur ordinaire ne
 * peut donc pas changer de carte, réécrire le Codex ni toucher aux fiches des
 * autres, même en trafiquant son navigateur.
 *
 * Les comptes vivent dans un Durable Object à part (comptes.js) : ils suivent
 * le joueur d'une table à l'autre et d'un appareil à l'autre.
 */

export { Comptes } from "./comptes.js";

const TAILLE_MORCEAU = 96 * 1024;   // le stockage borne la taille par clé
const MAX_CHRONIQUE = 60;           // le client en garde autant, on s'aligne

/* ============================================================
   FUSION PAR AUTORITÉ
   ============================================================ */

/** Positions des pions : tout le monde y a droit, c'est le jeu. On reprend la
 *  structure du serveur et on n'y applique que les x/y de pions existants. */
function fusionnerPions(cartesServeur, cartesProposees) {
  if (!Array.isArray(cartesServeur) || !Array.isArray(cartesProposees)) return cartesServeur;
  const parId = new Map(cartesProposees.map(c => [c && c.id, c]));
  return cartesServeur.map(carte => {
    const prop = parId.get(carte.id);
    if (!prop || !Array.isArray(prop.tokens) || !Array.isArray(carte.tokens)) return carte;
    const pos = new Map(prop.tokens.map(t => [t && t.id, t]));
    return {
      ...carte,
      tokens: carte.tokens.map(tk => {
        const p = pos.get(tk.id);
        if (!p || typeof p.x !== "number" || typeof p.y !== "number") return tk;
        return { ...tk, x: p.x, y: p.y };
      }),
    };
  });
}

/** Chronique des jets : chacun ajoute les siens, personne n'efface ceux des
 *  autres. Union par id, du plus récent au plus ancien. */
function fusionnerChronique(serveur, propose) {
  // Le serveur d'abord : pour un id deja connu, c'est sa version qui reste.
  // Dans l'autre sens, un joueur pourrait reecrire le jet d'un autre.
  const vus = new Map();
  for (const e of [...(serveur || []), ...(propose || [])]) {
    if (e && e.id && !vus.has(e.id)) vus.set(e.id, e);
  }
  return [...vus.values()].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, MAX_CHRONIQUE);
}

/** Fiches publiées : chacun la sienne. On garde celles des autres telles que le
 *  serveur les connaît, et on ne prend de la proposition que celles signées du
 *  pseudo de l'expéditeur. */
function fusionnerRoster(serveur, propose, pseudo) {
  const autres = (serveur || []).filter(r => r && r.joueur !== pseudo);
  const miennes = (propose || []).filter(r => r && r.joueur === pseudo);
  return [...autres, ...miennes];
}

/**
 * @param {object|null} serveur  l'état qui fait foi
 * @param {object} propose       ce que le client envoie
 * @param {{nom:string, role:string}} qui
 * @returns {{camp:object, refus:string[]}}
 */
export function fusionner(serveur, propose, qui) {
  if (!propose || typeof propose !== "object") return { camp: serveur, refus: ["proposition illisible"] };

  // Table vierge : le premier arrivé l'amorce. La campagne de départ est celle
  // embarquée dans la page, identique chez tout le monde — rien à arbitrer.
  if (!serveur) return { camp: propose, refus: [] };

  if (qui.role === "meneur") return { camp: propose, refus: [] };

  const refus = [];
  const garde = (champ, libelle) => {
    if (JSON.stringify(serveur[champ]) !== JSON.stringify(propose[champ])) refus.push(libelle);
    return serveur[champ];
  };

  return {
    camp: {
      ...serveur,
      titre:       garde("titre", "le titre de la campagne"),
      codex:       garde("codex", "le Codex"),
      activeMapId: garde("activeMapId", "la carte affichée"),
      initiative:  garde("initiative", "l'ordre d'initiative"),
      turn:        garde("turn", "le tour en cours"),
      maps:        fusionnerPions(serveur.maps, propose.maps),
      roster:      fusionnerRoster(serveur.roster, propose.roster, qui.nom),
      chronique:   fusionnerChronique(serveur.chronique, propose.chronique),
      rev:         (serveur.rev || 0) + 1,
      updatedAt:   Date.now(),
      updatedBy:   qui.nom,
    },
    refus,
  };
}

/* ============================================================
   LA TABLE
   ============================================================ */

export class Table {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sessions = new Set();
    this.camp = undefined;          // undefined = pas encore lu ; null = table vierge
  }

  async charger() {
    if (this.camp !== undefined) return;
    const n = (await this.ctx.storage.get("morceaux")) || 0;
    if (!n) { this.camp = null; return; }
    let txt = "";
    for (let i = 0; i < n; i++) txt += (await this.ctx.storage.get("c" + i)) || "";
    try { this.camp = JSON.parse(txt); } catch { this.camp = null; }
  }

  async ranger(camp) {
    const txt = JSON.stringify(camp);
    const n = Math.max(1, Math.ceil(txt.length / TAILLE_MORCEAU));
    const avant = (await this.ctx.storage.get("morceaux")) || 0;
    const lot = { morceaux: n };
    for (let i = 0; i < n; i++) lot["c" + i] = txt.slice(i * TAILLE_MORCEAU, (i + 1) * TAILLE_MORCEAU);
    await this.ctx.storage.put(lot);
    for (let i = n; i < avant; i++) await this.ctx.storage.delete("c" + i);
  }

  /** Les joueurs présents, avec leur rôle : le bandeau du haut signale le meneur. */
  noms() { return [...this.sessions].map(s => ({ nom: s.nom, role: s.role })); }

  diffuser(msg, sauf) {
    const txt = JSON.stringify(msg);
    for (const s of this.sessions) {
      if (s === sauf) continue;
      try { s.ws.send(txt); } catch { this.sessions.delete(s); }
    }
  }

  async fetch(req) {
    if (req.headers.get("Upgrade") !== "websocket")
      return new Response("websocket attendu", { status: 426 });

    // Identité : le jeton est validé par le registre des comptes, jamais ici.
    const url = new URL(req.url);
    const jeton = url.searchParams.get("jeton");
    const rep = await this.env.COMPTES
      .get(this.env.COMPTES.idFromName("comptes"))
      .fetch("https://comptes/api/valider", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jeton }),
      });
    if (!rep.ok) return new Response("compte requis", { status: 401 });
    const qui = await rep.json();

    await this.charger();

    const paire = new WebSocketPair();
    const ws = paire[1];
    ws.accept();
    const s = { ws, nom: qui.pseudo, role: qui.role, cle: qui.cle };
    this.sessions.add(s);

    ws.send(JSON.stringify({
      t: "init", camp: this.camp, joueurs: this.noms(),
      moi: { pseudo: qui.pseudo, role: qui.role },
    }));
    this.diffuser({ t: "qui", joueurs: this.noms() }, s);

    ws.addEventListener("message", async ev => {
      let m;
      try { m = JSON.parse(ev.data); } catch { return; }

      if (m.t === "etat" && m.camp) {
        const { camp, refus } = fusionner(this.camp, m.camp, s);
        this.camp = camp;
        // L'état fusionné repart vers TOUT LE MONDE, expéditeur compris : c'est
        // ainsi qu'un client ayant tenté plus que son droit revient dans le rang.
        this.diffuser({ t: "etat", camp: this.camp, par: s.nom }, null);
        if (refus.length) {
          try { ws.send(JSON.stringify({ t: "refus", quoi: refus })); } catch {}
        }
        try { await this.ranger(this.camp); } catch (e) { console.error("rangement", e); }

      } else if (m.t === "pion") {
        if (this.camp && Array.isArray(this.camp.maps)) {
          const carte = this.camp.maps.find(x => x.id === m.m);
          const pion = carte && carte.tokens.find(x => x.id === m.id);
          if (pion) { pion.x = m.x; pion.y = m.y; }
        }
        this.diffuser({ t: "pion", m: m.m, id: m.id, x: m.x, y: m.y }, s);
      }
    });

    const fermer = () => {
      this.sessions.delete(s);
      this.diffuser({ t: "qui", joueurs: this.noms() }, null);
    };
    ws.addEventListener("close", fermer);
    ws.addEventListener("error", fermer);

    return new Response(null, { status: 101, webSocket: paire[0] });
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (url.pathname.startsWith("/api/")) {
      return env.COMPTES.get(env.COMPTES.idFromName("comptes")).fetch(req);
    }
    if (url.pathname === "/ws") {
      const table = (url.searchParams.get("table") || "astreia").slice(0, 48);
      return env.TABLES.get(env.TABLES.idFromName(table)).fetch(req);
    }
    return env.ASSETS.fetch(req);
  }
};
