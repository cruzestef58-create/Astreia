/**
 * Controles de la fusion par autorite (worker.js).
 *
 * C'est la piece qui fait tenir la promesse « le meneur seul modifie la
 * campagne ». Elle est pure, donc entierement testable hors ligne : si un de
 * ces controles tombe, un joueur ordinaire peut faire quelque chose qu'il ne
 * devrait pas.
 */
import { fusionner } from "../worker.js";

let ok = true;
const chk = (c, m) => { if (!c) { ok = false; console.log("ECHEC :", m); } else console.log("  ok  :", m); };

const MENEUR = { nom: "Esteban", role: "meneur" };
const JOUEUR = { nom: "Lena",    role: "joueur" };
const AUTRE  = { nom: "Marc",    role: "joueur" };

const base = () => ({
  rev: 4, updatedAt: 1, updatedBy: "Esteban", titre: "Astreia",
  activeMapId: "m-hall", turn: 2, initiative: [{ id: "i1", nom: "Lena" }],
  codex: [{ id: "c1", titre: "Les Flux" }],
  maps: [
    { id: "m-hall", nom: "Grand Hall", tokens: [ { id: "t1", nom: "Lena", x: 10, y: 10 },
                                                 { id: "t2", nom: "Garde", x: 50, y: 50 } ] },
    { id: "m-crypte", nom: "Crypte", tokens: [] },
  ],
  roster: [{ id: "p1", nom: "Lyra", joueur: "Lena" }, { id: "p2", nom: "Orin", joueur: "Marc" }],
  chronique: [{ id: "r1", ts: 100, texte: "d20 = 14" }, { id: "r2", ts: 90, texte: "d6 = 3" }],
});

const clone = o => JSON.parse(JSON.stringify(o));

/* ---- 1. le meneur passe partout ---- */
{
  const p = clone(base());
  p.activeMapId = "m-crypte"; p.codex = []; p.titre = "Autre";
  const { camp, refus } = fusionner(base(), p, MENEUR);
  chk(camp.activeMapId === "m-crypte" && camp.codex.length === 0 && camp.titre === "Autre",
      "le meneur change carte, Codex et titre");
  chk(refus.length === 0, "le meneur ne recoit aucun refus");
}

/* ---- 2. le joueur ne touche pas a la campagne ---- */
{
  const p = clone(base());
  p.activeMapId = "m-crypte";
  p.codex = [{ id: "c1", titre: "PIRATE" }];
  p.titre = "Table de Lena";
  p.initiative = [];
  p.turn = 99;
  const { camp, refus } = fusionner(base(), p, JOUEUR);
  chk(camp.activeMapId === "m-hall", "un joueur ne change pas la carte affichee");
  chk(camp.codex[0].titre === "Les Flux", "un joueur ne reecrit pas le Codex");
  chk(camp.titre === "Astreia", "un joueur ne renomme pas la campagne");
  chk(camp.initiative.length === 1, "un joueur ne vide pas l'initiative");
  chk(camp.turn === 2, "un joueur ne change pas le tour");
  chk(refus.length === 5, "les cinq tentatives sont signalees a l'expediteur");
}

/* ---- 3. mais il deplace les pions : c'est le jeu ---- */
{
  const p = clone(base());
  p.maps[0].tokens[0].x = 42; p.maps[0].tokens[0].y = 77;
  const { camp } = fusionner(base(), p, JOUEUR);
  const t = camp.maps[0].tokens[0];
  chk(t.x === 42 && t.y === 77, "un joueur deplace un pion existant");
}

/* ---- 4. il n'ajoute ni ne retire pions et cartes ---- */
{
  const p = clone(base());
  p.maps[0].tokens.push({ id: "t9", nom: "Dragon", x: 1, y: 1 });
  p.maps.push({ id: "m-triche", nom: "Salle secrete", tokens: [] });
  const { camp } = fusionner(base(), p, JOUEUR);
  chk(camp.maps[0].tokens.length === 2, "un joueur n'ajoute pas de pion");
  chk(camp.maps.length === 2, "un joueur n'ajoute pas de carte");
}
{
  const p = clone(base());
  p.maps[0].tokens = [];
  const { camp } = fusionner(base(), p, JOUEUR);
  chk(camp.maps[0].tokens.length === 2, "un joueur ne supprime pas les pions des autres");
}

/* ---- 5. les fiches publiees : chacun la sienne ---- */
{
  const p = clone(base());
  p.roster = [{ id: "p1", nom: "Lyra la Grande", joueur: "Lena" },
              { id: "p2", nom: "PIRATE",         joueur: "Marc" }];
  const { camp } = fusionner(base(), p, JOUEUR);
  const lyra = camp.roster.find(r => r.id === "p1");
  const orin = camp.roster.find(r => r.id === "p2");
  chk(lyra.nom === "Lyra la Grande", "un joueur met a jour sa propre fiche");
  chk(orin.nom === "Orin", "un joueur ne touche pas a la fiche d'un autre");
}
{
  // Se faire passer pour un autre en signant de son pseudo ne marche pas non
  // plus : seules les entrees signees de l'EXPEDITEUR sont retenues.
  const p = clone(base());
  p.roster.push({ id: "p3", nom: "Faux", joueur: "Marc" });
  const { camp } = fusionner(base(), p, JOUEUR);
  chk(!camp.roster.some(r => r.id === "p3"), "un joueur ne publie pas de fiche au nom d'un autre");
}
{
  const p = clone(base());
  p.roster = p.roster.filter(r => r.joueur !== "Lena");
  const { camp } = fusionner(base(), p, JOUEUR);
  chk(camp.roster.length === 1 && camp.roster[0].joueur === "Marc",
      "un joueur retire sa propre fiche sans toucher aux autres");
}

/* ---- 6. la chronique s'ajoute, elle ne s'efface pas ---- */
{
  const p = clone(base());
  p.chronique = [{ id: "r3", ts: 120, texte: "d20 = 20" }];   // il n'envoie que le sien
  const { camp } = fusionner(base(), p, JOUEUR);
  chk(camp.chronique.length === 3, "les jets des autres survivent a un envoi partiel");
  chk(camp.chronique[0].id === "r3", "le jet le plus recent arrive en tete");
}
{
  const p = clone(base());
  p.chronique = p.chronique.map(e => ({ ...e, texte: "PIRATE" }));
  const { camp } = fusionner(base(), p, JOUEUR);
  chk(camp.chronique.every(e => e.texte !== "PIRATE"), "un joueur ne reecrit pas un jet deja enregistre");
}

/* ---- 7. table vierge et garde-fous ---- */
{
  const { camp } = fusionner(null, base(), JOUEUR);
  chk(camp && camp.maps.length === 2, "une table vierge est amorcee par le premier arrive");
}
{
  const { camp, refus } = fusionner(base(), null, JOUEUR);
  chk(camp.titre === "Astreia" && refus.length === 1, "une proposition illisible ne casse rien");
}
{
  const p = clone(base());
  p.maps = "n'importe quoi";
  const { camp } = fusionner(base(), p, JOUEUR);
  chk(Array.isArray(camp.maps) && camp.maps.length === 2, "des cartes malformees sont ignorees");
}

/* ---- 8. la revision avance, la signature est celle du serveur ---- */
{
  const p = clone(base());
  p.rev = 9999; p.updatedBy = "Quelqu'un d'autre";
  p.maps[0].tokens[0].x = 5;
  const { camp } = fusionner(base(), p, JOUEUR);
  chk(camp.rev === 5, "la revision est celle du serveur, pas celle annoncee");
  chk(camp.updatedBy === "Lena", "la signature est le pseudo authentifie de l'expediteur");
}

console.log(ok ? "\nAUTORITE : TOUS LES CONTROLES PASSENT" : "\nAUTORITE : DES CONTROLES ONT ECHOUE");
process.exit(ok ? 0 : 1);
