# -*- coding: utf-8 -*-
"""Genere campagne.json : l'etat de campagne partage embarque dans la page."""
import sys
import json, pathlib, hashlib, cartes
# Windows : la console est en cp1252 et les fleches/accents des messages la font
# planter. On force la sortie en UTF-8 quand c'est possible.
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

def E(cat, titre, corps):
    sid = hashlib.sha1(titre.encode("utf-8")).hexdigest()[:8]
    return {"id": "seed-" + sid, "cat": cat, "titre": titre, "corps": corps}

CODEX = [
E("Histoire", "L’Astréïon",
"À l’origine de toute chose existait une énergie primordiale : l’Astréïon.\n\n"
"Il n’était pas simplement une source d’énergie. Il était la vie, la volonté, l’esprit, la magie, "
"la matière, la mort — le potentiel de toute chose.\n\n"
"Toutes les formes d’énergie connues dans Astréïa en proviennent indirectement. Nul ne sait s’il était "
"une énergie, une entité, ou quelque chose de plus ancien encore."),
E("Histoire", "La Fracture Céleste",
"Il y a environ 900 ans, l’Astréïon se brisa. Son énergie se dispersa dans le monde et prit différentes "
"formes : les Flux.\n\nC’est pourquoi des systèmes de pouvoir complètement différents coexistent dans le "
"même monde.\n\nPersonne ne connaît la véritable cause. Certains accusent un ancien sorcier. D’autres, une "
"divinité qui aurait tenté de contrôler l’Astréïon. D’autres encore pensent qu’il s’est brisé de lui-même.\n\n"
"(La vérité doit rester un mystère au début de l’aventure.)"),
E("Histoire", "La Nuit des Quatre Couronnes",
"Il y a environ 200 ans, les quatre Maisons entrèrent en conflit — pour une raison encore partiellement "
"inconnue.\n\nToutes cherchaient le contrôle d’un même lieu : la Chambre du Cœur Astral.\n\n"
"Un accord mit fin à la guerre. Les affrontements cessèrent officiellement. Les tensions, elles, n’ont "
"jamais disparu."),
E("Histoire", "Les Anomalies",
"Depuis quelques années, quelque chose change. Les Flux deviennent instables.\n\n"
"· des objets changent momentanément de nature\n· des zones du château se transforment\n"
"· certaines personnes développent des capacités inhabituelles\n· des créatures inconnues apparaissent\n"
"· des Flux semblent parfois se mélanger\n· des souvenirs peuvent être altérés\n"
"· des portes apparaissent là où il n’y en avait pas\n\n"
"Ces événements deviennent de plus en plus fréquents au fil de la campagne."),
E("Histoire", "La Prophétie Brisée",
"Retrouvée dans une partie interdite de la bibliothèque :\n\n"
"« Lorsque les Quatre se rencontreront en un seul cœur,\nl’Astréïon choisira son hôte.\n"
"Le monde sera sauvé…\nou consumé. »\n\n"
"Sa signification réelle doit rester inconnue au début. Le Gardien la révèle progressivement."),

E("Flux", "Flux Vital",
"🛡️ Lié au corps, à l’énergie physique et à la force intérieure.\n\n"
"· améliorer les capacités physiques\n· renforcer le corps\n· augmenter vitesse et réflexes\n"
"· développer des techniques de combat\n· manipuler l’énergie interne\n\n"
"Le Chakra est une manifestation du Flux Vital.\nMaison associée : Dravaryn."),
E("Flux", "Flux Spirituel",
"👁️ Lié à l’esprit, à la volonté et à l’identité.\n\n"
"Chaque utilisateur développe une capacité extrêmement personnelle : deux utilisateurs peuvent avoir des "
"pouvoirs totalement différents.\n\nLe Nen en est une manifestation particulièrement avancée. Ce Flux "
"récompense la créativité, la personnalité et la maîtrise de soi.\nMaison associée : Vaelith."),
E("Flux", "Flux Arcanique",
"🪄 Une énergie structurée par la connaissance.\n\n"
"· lancer des sorts\n· créer des enchantements\n· utiliser des runes\n· fabriquer des artefacts\n"
"· réaliser des rituels\n· manipuler différentes formes de magie\n\n"
"La magie des sorciers appartient principalement à ce Flux. Sa maîtrise dépend beaucoup de "
"l’apprentissage.\nMaison associée : Eldrane."),
E("Flux", "Flux Occulte",
"🌑 Une énergie dangereuse, liée aux émotions, aux peurs, aux traumatismes et aux aspects sombres de "
"l’esprit.\n\n· techniques occultes\n· manipulation d’énergie négative\n· manifestations surnaturelles\n"
"· techniques personnelles extrêmement puissantes\n· parfois : un domaine, un espace lié à l’utilisateur\n\n"
"Elle est difficile à contrôler. Plus son utilisateur perd le contrôle, plus elle devient dangereuse — "
"surveille la jauge de Contrôle de ta fiche.\nMaison associée : Noctheris."),

E("Maisons", "Maison Dravaryn",
"🛡️ Maîtres du Flux Vital.\n« Le corps est le premier temple. »\n\n"
"Réputés pour leur discipline, leur force physique et leur maîtrise du combat. Traditionnellement les "
"guerriers et protecteurs d’Elvaris."),
E("Maisons", "Maison Vaelith",
"👁️ Héritiers du Flux Spirituel.\n« La volonté façonne la réalité. »\n\n"
"Connus pour leurs capacités uniques : chaque membre développe une manifestation différente. Mystérieux "
"et imprévisibles."),
E("Maisons", "Maison Eldrane",
"🪄 Maîtres du Flux Arcanique.\n« La connaissance est la vraie puissance. »\n\n"
"Une famille d’érudits, de mages et de chercheurs. Grande influence sur la bibliothèque et les recherches "
"magiques d’Elvaris."),
E("Maisons", "Maison Noctheris",
"🌑 Enfants du Flux Occulte.\n« Dans l’ombre naît la vérité. »\n\n"
"Ils étudient les formes les plus dangereuses du Flux. Respectés autant que craints. Certains membres "
"auraient autrefois pratiqué des expériences interdites."),

E("Lieux", "Forteresse d’Elvaris",
"La principale académie connue d’Astréïa, au sommet des Monts Brumeux.\n\n"
"Un immense château ancien, d’architecture médiévale et magique : murs de pierre, grandes salles, "
"couloirs interminables, torches, chandeliers, escaliers, tableaux enchantés, armures, bibliothèques, "
"salles d’entraînement, passages secrets, salles interdites, anciennes tours.\n\n"
"Astréïa n’est pas un monde moderne : aucune technologie moderne dans la vie quotidienne."),
E("Lieux", "Les Monts Brumeux",
"L’immense région montagneuse qui porte Elvaris à son sommet. La brume ne se lève jamais complètement."),
E("Lieux", "La Chambre du Cœur Astral",
"Au cœur d’Elvaris, une salle secrète. Elle contiendrait un fragment extrêmement pur de l’Astréïon.\n\n"
"Scellée depuis plusieurs siècles. Personne ne sait exactement ce qui se trouve derrière la porte. Chaque "
"Maison en détient des informations différentes. La plupart des élèves en ignorent jusqu’à l’existence."),

E("Organisations", "L’Ordre du Voile Noir",
"Une organisation secrète, dans l’ombre.\n\nSes membres pensent que la Fracture Céleste ne doit pas être "
"réparée : ils veulent réunir les Flux afin de recréer l’Astréïon originel.\n\n"
"Leur véritable objectif reste inconnu. Certains pensent qu’ils veulent sauver le monde. D’autres, le "
"contrôler. Et certains pensent que leur chef connaît la véritable raison de la Fracture."),

E("Règles", "Les Flux ne sont pas des classes",
"Un joueur ne choisit pas une « classe » : il choisit une voie énergétique.\n\n"
"Deux personnages du même Flux peuvent être totalement différents. Un utilisateur du Flux Spirituel peut "
"être combattant, stratège, assassin, protecteur, spécialiste, guérisseur — ou inventer quelque chose "
"d’inédit.\n\nLe Gardien encourage la créativité tout en maintenant l’équilibre."),
E("Règles", "Règles du RP",
"· Pas de godmod — on ne décide pas qu’une attaque touche automatiquement un autre joueur.\n"
"· Pas de powergaming abusif — on ne possède pas toutes les capacités dès le début.\n"
"· Cohérence — même les personnages puissants ont des limites.\n"
"· Liberté créative — invente tes techniques et ton style de combat."),
E("Règles", "Le Gardien des Chroniques",
"Le titre du MJ. Il contrôle le monde, les PNJ, les événements, les ennemis, les anomalies, les secrets, "
"les conséquences des actions des joueurs et l’évolution du scénario.\n\n"
"Il peut modifier ou ajouter du lore pour faire avancer l’histoire — y compris de nouveaux Flux."),
E("Règles", "L’arrivée à Astréïa",
"Les personnages ne sont pas forcément originaires d’Astréïa : ils peuvent venir de mondes différents.\n\n"
"Avant leur arrivée, chacun mène une existence normale. Puis une lumière astrale apparaît devant lui. "
"À son contact, le monde semble s’arrêter, et une voix inconnue déclare :\n\n"
"« Ton âme a été reconnue. »\n\nUne marque lumineuse apparaît brièvement sur son corps. Puis tout "
"disparaît. Le personnage se réveille à Astréïa, dans un lieu inconnu, sans comprendre comment il est "
"arrivé là. Ensemble ou séparément — puis conduits vers Elvaris."),
E("Règles", "Progression",
"Les personnages commencent relativement faibles et doivent apprendre à maîtriser leur Flux.\n\n"
"La progression peut apporter : nouvelles techniques, meilleure maîtrise énergétique, transformations, "
"armes ou artefacts, capacités personnelles, éveil, évolution du Flux, découverte de pouvoirs cachés.\n\n"
"Aucun personnage ne commence avec un pouvoir invincible. La puissance se gagne au cours de l’histoire."),
]

def main():
    lib = cartes.bibliotheque()
    for i, m in enumerate(lib):
        m["id"] = "m-" + m["key"]
    camp = {
        "rev": 0, "updatedAt": None, "updatedBy": None,
        "titre": "Les Chroniques d’Astréïa",
        "maps": lib,
        "activeMapId": lib[0]["id"],
        "initiative": [], "turn": 0,
        "codex": CODEX,
        "roster": [],
        "chronique": [],
    }
    p = pathlib.Path(__file__).parent / "campagne.json"
    p.write_text(json.dumps(camp, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"campagne.json : {len(lib)} cartes, {len(CODEX)} entrées de codex, {p.stat().st_size:,} octets")

if __name__ == "__main__":
    main()
