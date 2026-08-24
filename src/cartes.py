# -*- coding: utf-8 -*-
"""Bibliothèque de cartes d’Astréïa : murs + décor, en coordonnées de cases."""

def _runs(occ):
    """Fusionne un ensemble de cases en rectangles (horizontal puis vertical)."""
    rects = []
    par_ligne = {}
    for (x, y) in occ:
        par_ligne.setdefault(y, []).append(x)
    for y in sorted(par_ligne):
        xs = sorted(par_ligne[y]); a = p = xs[0]
        for x in xs[1:]:
            if x == p + 1: p = x
            else: rects.append([a, y, p - a + 1, 1]); a = p = x
        rects.append([a, y, p - a + 1, 1])
    # fusion verticale des rectangles de meme x/largeur sur lignes contigues
    rects.sort(key=lambda r: (r[0], r[2], r[1]))
    out = []
    for r in rects:
        if out and out[-1][0] == r[0] and out[-1][2] == r[2] and out[-1][1] + out[-1][3] == r[1]:
            out[-1][3] += r[3]
        else:
            out.append(list(r))
    return out

def perim(cols, rows, portes=()):
    """Pourtour epais d'une case, avec ouvertures.
    portes : ('n'|'s'|'e'|'o', debut, longueur)"""
    occ = set()
    for x in range(cols):
        occ.add((x, 0)); occ.add((x, rows - 1))
    for y in range(rows):
        occ.add((0, y)); occ.add((cols - 1, y))
    for cote, deb, lon in portes:
        for i in range(deb, deb + lon):
            if   cote == 'n': occ.discard((i, 0))
            elif cote == 's': occ.discard((i, rows - 1))
            elif cote == 'o': occ.discard((0, i))
            elif cote == 'e': occ.discard((cols - 1, i))
    return _runs(occ)

def piliers(xs, ys):
    return [["pilier", x, y, 1, 1] for y in ys for x in xs]

def carte(key, nom, lieu, terrain, cols, rows, notes, murs=(), deco=()):
    return {"key": key, "nom": nom, "lieu": lieu, "terrain": terrain,
            "cols": cols, "rows": rows, "notes": notes,
            "murs": [list(m) for m in murs], "deco": [list(d) for d in deco],
            "tokens": []}

ELV, MTS, SOU, AIL = "Forteresse d’Elvaris", "Monts Brumeux", "Souterrains", "Ailleurs"

def bibliotheque():
    C = []

    # ---------------- Forteresse d'Elvaris ----------------
    C.append(carte("grand-hall", "Grand Hall", ELV, "elvaris", 30, 22,
        "L’entrée d’Elvaris. Les nouveaux venus arrivent par la porte sud.",
        murs=perim(30, 22, [('s', 13, 4), ('n', 14, 2)]) + [[8, 4, 1, 3], [21, 4, 1, 3]],
        deco=piliers([7, 22], [7, 11, 15]) + [
            ["tapis", 12, 5, 6, 14], ["autel", 13, 2, 4, 2],
            ["feu", 3, 3, 1, 1], ["feu", 26, 3, 1, 1],
            ["feu", 3, 18, 1, 1], ["feu", 26, 18, 1, 1],
            ["porte", 13, 21, 4, 1]]))

    C.append(carte("couloirs", "Couloirs du Rez", ELV, "elvaris", 34, 22,
        "Les couloirs interminables. Idéal pour une poursuite ou une rencontre.",
        murs=(perim(34, 22, [('n', 15, 4), ('s', 15, 4), ('o', 9, 4), ('e', 9, 4)])
              + [[6, 6, 9, 1], [6, 6, 1, 4], [19, 6, 9, 1], [27, 6, 1, 4],
                 [6, 15, 9, 1], [6, 12, 1, 4], [19, 15, 9, 1], [27, 12, 1, 4]]),
        deco=piliers([12, 21], [4, 17]) + [
            ["feu", 8, 8, 1, 1], ["feu", 25, 8, 1, 1],
            ["feu", 8, 13, 1, 1], ["feu", 25, 13, 1, 1]]))

    C.append(carte("bibliotheque", "Grande Bibliothèque", ELV, "biblio", 30, 24,
        "Le domaine des Eldrane. La section interdite est au fond, à l’est.",
        murs=perim(30, 24, [('s', 14, 3)]) + [[22, 1, 1, 14], [22, 18, 1, 5]],
        deco=[["etagere", 3, 3, 1, 8], ["etagere", 6, 3, 1, 8], ["etagere", 9, 3, 1, 8],
              ["etagere", 12, 3, 1, 8], ["etagere", 15, 3, 1, 8], ["etagere", 18, 3, 1, 8],
              ["etagere", 3, 14, 1, 7], ["etagere", 6, 14, 1, 7], ["etagere", 9, 14, 1, 7],
              ["etagere", 12, 14, 1, 7], ["etagere", 15, 14, 1, 7], ["etagere", 18, 14, 1, 7],
              ["table", 24, 4, 4, 2], ["table", 24, 9, 4, 2],
              ["autel", 24, 18, 4, 3], ["porte", 22, 15, 1, 3],
              ["feu", 26, 14, 1, 1]]))

    C.append(carte("entrainement", "Salle d’entraînement", ELV, "arene", 28, 22,
        "Où l’on apprend à maîtriser son Flux sans démolir le château.",
        murs=perim(28, 22, [('n', 12, 4)]),
        deco=[["tapis", 6, 5, 16, 12],
              ["pilier", 6, 5, 1, 1], ["pilier", 21, 5, 1, 1],
              ["pilier", 6, 16, 1, 1], ["pilier", 21, 16, 1, 1],
              ["table", 2, 3, 2, 4], ["table", 24, 3, 2, 4],
              ["table", 2, 15, 2, 4], ["table", 24, 15, 2, 4]]))

    C.append(carte("refectoire", "Réfectoire", ELV, "elvaris", 28, 20,
        "Quatre grandes tables, une par Maison. Les tensions se voient à table.",
        murs=perim(28, 20, [('o', 8, 4), ('e', 8, 4)]),
        deco=[["table", 4, 3, 3, 14], ["table", 9, 3, 3, 14],
              ["table", 15, 3, 3, 14], ["table", 20, 3, 3, 14],
              ["feu", 2, 2, 1, 1], ["feu", 25, 2, 1, 1],
              ["feu", 2, 17, 1, 1], ["feu", 25, 17, 1, 1]]))

    C.append(carte("cour", "Cour intérieure", ELV, "monts", 30, 26,
        "À ciel ouvert, cernée par le cloître. La brume descend parfois jusqu’ici.",
        murs=perim(30, 26, [('n', 14, 3), ('s', 14, 3)]),
        deco=piliers([4, 8, 12, 17, 21, 25], [4, 21]) + [
              ["eau", 12, 10, 6, 6], ["autel", 14, 12, 2, 2],
              ["tapis", 4, 12, 3, 3], ["tapis", 23, 12, 3, 3]]))

    C.append(carte("escaliers", "Escalier des Tours", ELV, "elvaris", 22, 28,
        "Un puits vertical. Chaque palier ouvre sur une tour différente.",
        murs=(perim(22, 28, [('s', 9, 4)])
              + [[6, 5, 10, 1], [6, 11, 10, 1], [6, 17, 10, 1], [6, 23, 10, 1],
                 [6, 5, 1, 6], [15, 11, 1, 6], [6, 17, 1, 6]]),
        deco=[["feu", 2, 3, 1, 1], ["feu", 19, 9, 1, 1],
              ["feu", 2, 15, 1, 1], ["feu", 19, 21, 1, 1],
              ["porte", 1, 8, 1, 2], ["porte", 20, 14, 1, 2], ["porte", 1, 20, 1, 2]]))

    C.append(carte("astrolabe", "Tour de l’Astrolabe", ELV, "coeur", 24, 24,
        "Au sommet. On y lit les Flux comme on lit le ciel.",
        murs=perim(24, 24, [('s', 11, 2)]),
        deco=piliers([5, 18], [5, 11, 18]) + [
              ["autel", 10, 10, 4, 4], ["tapis", 8, 8, 8, 8],
              ["table", 3, 3, 3, 2], ["table", 18, 19, 3, 2]]))

    C.append(carte("interdites", "Salles interdites", ELV, "elvaris", 26, 20,
        "Scellées après la Nuit des Quatre Couronnes. Les murs y sont brisés.",
        murs=(perim(26, 20, [('o', 8, 3)])
              + [[7, 1, 1, 6], [7, 10, 1, 4], [13, 5, 1, 9], [18, 1, 1, 5], [18, 9, 1, 10]]),
        deco=[["autel", 20, 8, 4, 4], ["table", 3, 14, 3, 2],
              ["tapis", 9, 15, 3, 3], ["porte", 18, 6, 1, 3]]))

    C.append(carte("passages", "Passages secrets", ELV, "caverne", 34, 18,
        "Étroits, sinueux, et pas toujours au même endroit qu’hier.",
        murs=(perim(34, 18)
              + [[4, 1, 1, 10], [4, 13, 1, 4], [9, 4, 1, 13], [14, 1, 1, 12],
                 [19, 6, 1, 11], [24, 1, 1, 11], [29, 5, 1, 12]]),
        deco=[["feu", 6, 15, 1, 1], ["feu", 21, 3, 1, 1], ["feu", 31, 14, 1, 1]]))

    for key, nom, maison in (("dortoir-dravaryn", "Quartier Dravaryn", "Dravaryn"),
                             ("dortoir-vaelith",  "Quartier Vaelith",  "Vaelith"),
                             ("dortoir-eldrane",  "Quartier Eldrane",  "Eldrane"),
                             ("dortoir-noctheris","Quartier Noctheris","Noctheris")):
        C.append(carte(key, nom, ELV, "elvaris", 26, 18,
            f"Les appartements de la Maison {maison}. On n’y entre pas sans invitation.",
            murs=perim(26, 18, [('s', 12, 3)]) + [[12, 1, 1, 9]],
            deco=[["table", 3, 3, 3, 2], ["table", 3, 8, 3, 2], ["table", 3, 13, 3, 2],
                  ["table", 20, 3, 3, 2], ["table", 20, 8, 3, 2], ["table", 20, 13, 3, 2],
                  ["tapis", 9, 12, 8, 4], ["feu", 12, 2, 1, 1],
                  ["etagere", 8, 3, 1, 5], ["etagere", 17, 3, 1, 5]]))

    C.append(carte("quatre-couronnes", "Salle des Quatre Couronnes", ELV, "elvaris", 28, 28,
        "Là où l’accord fut signé. Quatre trônes, aucun plus haut que l’autre.",
        murs=perim(28, 28, [('s', 13, 3)]),
        deco=[["autel", 13, 2, 3, 2], ["autel", 2, 13, 2, 3],
              ["autel", 24, 13, 2, 3], ["autel", 13, 24, 3, 2],
              ["tapis", 10, 10, 8, 8], ["eau", 13, 13, 2, 2]]
             + piliers([6, 21], [6, 21])))

    C.append(carte("coeur-astral", "Chambre du Cœur Astral", ELV, "coeur", 26, 26,
        "Scellée depuis des siècles. Personne ne sait ce qu’il y a derrière la porte.",
        murs=perim(26, 26),
        deco=[["porte", 11, 25, 4, 1], ["autel", 11, 11, 4, 4]]
             + piliers([4, 21], [4, 12, 21])
             + [["tapis", 8, 8, 10, 10]]))

    # ---------------- Monts Brumeux ----------------
    C.append(carte("sentier", "Sentier des Monts", MTS, "monts", 36, 20,
        "La seule voie praticable vers Elvaris. Étroite, exposée.",
        murs=[[0, 0, 36, 3], [0, 17, 36, 3], [8, 3, 3, 4], [20, 13, 4, 4], [29, 3, 3, 5]],
        deco=[["eau", 12, 8, 5, 3], ["feu", 33, 9, 1, 1]]))

    C.append(carte("plateau-brumeux", "Plateau brumeux", MTS, "monts", 32, 24,
        "Un espace ouvert où la brume avale les distances. Terrain de rencontre.",
        murs=[[5, 5, 3, 3], [24, 4, 4, 3], [9, 17, 4, 3], [22, 16, 3, 4]],
        deco=[["eau", 14, 10, 6, 5], ["autel", 15, 4, 2, 2]]))

    C.append(carte("crypte", "Crypte des Monts", SOU, "caverne", 28, 22,
        "Sous la montagne. Ce qui y dort n’est pas répertorié au Codex.",
        murs=(perim(28, 22, [('n', 13, 3)])
              + [[6, 6, 1, 11], [12, 4, 1, 8], [12, 15, 1, 6], [19, 6, 1, 11]]),
        deco=[["autel", 22, 9, 4, 4], ["feu", 9, 5, 1, 1], ["feu", 16, 17, 1, 1],
              ["eau", 8, 12, 3, 6]]))

    # ---------------- Ailleurs ----------------
    C.append(carte("faille", "Faille astrale", AIL, "anomalie", 30, 22,
        "Une anomalie ouverte. La géographie n’y tient pas en place.",
        murs=[[6, 6, 4, 2], [20, 5, 3, 3], [10, 15, 5, 2], [23, 14, 3, 4]],
        deco=[["autel", 14, 10, 3, 3], ["eau", 4, 12, 4, 4], ["eau", 24, 3, 4, 3]]))

    C.append(carte("arrivee", "Le lieu d’arrivée", AIL, "monts", 28, 20,
        "Là où les âmes reconnues se réveillent, sans comprendre comment.",
        murs=[[3, 3, 2, 2], [23, 4, 2, 2], [5, 15, 3, 2], [21, 14, 2, 3]],
        deco=[["autel", 13, 9, 3, 3], ["tapis", 11, 7, 7, 7]]))

    C.append(carte("vierge", "Carte vierge", AIL, "elvaris", 30, 22,
        "À toi de la remplir. Change l’ambiance dans la barre du haut.",
        murs=perim(30, 22, [('s', 14, 3)])))

    return C
