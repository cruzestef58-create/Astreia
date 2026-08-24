/**
 * Les Chroniques d'Astréïa — serveur de table en direct.
 *
 * Un Durable Object par table : il garde l'état de campagne et le rediffuse
 * à toutes les fenêtres ouvertes. Deux messages seulement :
 *   {t:"etat", camp}            état complet, fait autorité
 *   {t:"pion", m, id, x, y}     déplacement en cours, diffusé au fil du geste
 */

const TAILLE_MORCEAU = 96 * 1024;   // le stockage borne la taille par clé

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

  noms() { return [...this.sessions].map(s => s.nom); }

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

    const url = new URL(req.url);
    const nom = (url.searchParams.get("nom") || "?").slice(0, 24);
    await this.charger();

    const paire = new WebSocketPair();
    const ws = paire[1];
    ws.accept();
    const s = { ws, nom };
    this.sessions.add(s);

    ws.send(JSON.stringify({ t: "init", camp: this.camp, joueurs: this.noms() }));
    this.diffuser({ t: "qui", joueurs: this.noms() }, s);

    ws.addEventListener("message", async ev => {
      let m;
      try { m = JSON.parse(ev.data); } catch { return; }

      if (m.t === "etat" && m.camp) {
        this.camp = m.camp;
        this.diffuser({ t: "etat", camp: this.camp, par: nom }, s);
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
    if (url.pathname === "/ws") {
      const table = (url.searchParams.get("table") || "astreia").slice(0, 48);
      return env.TABLES.get(env.TABLES.idFromName(table)).fetch(req);
    }
    return env.ASSETS.fetch(req);
  }
};
