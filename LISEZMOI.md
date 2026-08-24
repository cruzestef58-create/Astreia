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

## Les comptes

Chacun se crée un compte sur le site : pseudo et mot de passe. Le compte vit
sur le serveur, donc **il te suit** — même compte depuis le PC, le téléphone
ou chez un ami, avec tes fiches. Le mot de passe n'est jamais stocké en clair :
seul un dérivé PBKDF2-SHA256 salé est conservé.

**Le premier compte créé est le meneur.** Lui seul peut changer de carte,
écrire le Codex, régler l'initiative ou ajouter des pions ; il promeut ou
rétrograde les autres. Ce n'est pas qu'une affaire de boutons : le serveur
refuse ces modifications quand elles viennent d'un joueur, même si son
navigateur est trafiqué.

Ce qu'un joueur peut faire : déplacer les pions, publier et modifier **sa**
fiche, ajouter ses jets à la chronique. Rien de ce qui appartient aux autres.

Restent privés : les fiches non publiées et les jets personnels.

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
