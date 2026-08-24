# Les Chroniques d'Astréïa — table en direct

Version hébergée du site : **tout le monde voit tout, tout de suite.**
Quand un joueur déplace un pion, les autres le voient bouger pendant le geste.

## Ce que ça fait

Un vrai site, à ton adresse, que tes joueurs ouvrent dans leur navigateur —
ou **installent comme une application** avec l'icône d'Astréïa sur le bureau.

Tout est connecté en direct :

- un joueur pose un pion → les autres le voient apparaître aussitôt ;
- un joueur déplace un pion → les autres le voient bouger **pendant le geste** ;
- le meneur change de carte → tout le monde bascule sur la nouvelle scène ;
- le Codex, l'initiative et les personnages publiés sont communs à la table ;
- les joueurs connectés s'affichent en haut de l'écran.

Restent privés à chaque navigateur : les comptes, les fiches non publiées et
les jets personnels.

## L'installer sur le bureau

Une fois le site en ligne, chacun ouvre le lien puis :

- **Chrome / Edge** — l'icône d'installation à droite de la barre d'adresse,
  ou menu ⋮ → « Installer ».
- **Safari (Mac)** — menu Fichier → « Ajouter au Dock ».
- **iPhone / iPad** — bouton Partager → « Sur l'écran d'accueil ».

L'onglet **Compte** propose aussi un bouton « Installer sur le bureau »
quand le navigateur le permet. L'application retient la dernière table
ouverte : l'icône du bureau rouvre directement votre partie.

## Mettre en ligne

1. Installe Node.js si ce n'est pas déjà fait : https://nodejs.org
2. Ouvre un terminal dans ce dossier et lance :

```bash
npx wrangler login
```

3. Puis déploie :

```bash
npx wrangler deploy
```

Wrangler affiche l'adresse finale, du type
`https://astreia.<ton-sous-domaine>.workers.dev`. C'est le lien à donner
à tes joueurs.

## Plusieurs tables

Ajoute `?table=` à l'adresse. Chaque nom est une partie séparée, avec ses
propres cartes, pions et Codex :

- `https://…workers.dev/?table=campagne-principale`
- `https://…workers.dev/?table=one-shot-du-samedi`

Sans paramètre, tout le monde arrive sur la table `astreia`.

## Essayer en local d'abord

```bash
npx wrangler dev
```

Puis ouvre `http://localhost:8787` dans deux fenêtres pour voir la
synchronisation à l'œuvre.

## Comment c'est fait

- `public/index.html` — l'application entière, un seul fichier (logo, dés 3D,
  monde en relief, cartes, Codex). Aucune dépendance externe hormis les
  polices Google.
- `worker.js` — le serveur. Un *Durable Object* par table conserve l'état de
  campagne et le rediffuse par WebSocket. Deux messages seulement : `etat`
  (l'état complet, qui fait autorité) et `pion` (un déplacement en cours).
- `wrangler.toml` — la configuration. Les Durable Objects sont déclarés en
  stockage SQLite, la variante disponible sur le plan gratuit.
- `public/manifest.json`, `public/sw.js`, `public/icones/` — ce qui rend le
  site installable et utilisable même sans réseau.

Ce qui reste **local à chaque navigateur** : les comptes, les fiches non
publiées et les jets personnels. Ce qui est **commun à la table** : les
cartes et leurs pions, l'initiative, le Codex, la chronique des jets et les
personnages publiés.

## Régénérer `public/index.html`

Tout `public/` est produit par le script de construction :

```bash
cd src && python3 campagne.py && python3 build.py
```

à partir de `src.html`, `campagne.py` / `cartes.py` (le lore et les 22 cartes),
`logo.png`, `manifest.json` et `sw.js`. Ne modifie pas `public/index.html`
à la main : il serait écrasé.

`node src/verif.js` relance les contrôles automatiques.
