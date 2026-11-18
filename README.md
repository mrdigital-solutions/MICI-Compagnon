# MICI Compagnon

Application web installable (PWA), pensée pour le mobile, pour suivre au quotidien une MICI
(maladie de Crohn, rectocolite hémorragique) : calendrier des injections ou prises de
traitement, journal des symptômes, bilans biologiques et rapport à présenter au médecin.

## Fonctionnalités

- **Calendrier du traitement** : planning automatique selon le cycle, rotation des zones
  d'injection, décalage d'une prise avec recalcul des suivantes, stock de stylos, rappel à
  ajouter à son agenda (`.ics`). Les traitements oraux (Imurel, Rinvoq…) sont gérés sans zone
  ni stock. Possibilité d'ajouter un 2e traitement (combothérapie).
- **Journal quotidien** : douleurs, fatigue, migraines, transit, fièvre, humeur, sommeil,
  aliments suspectés, facteurs déclenchants.
- **Bilans biologiques** : import d'un PDF de laboratoire avec lecture automatique (CRP,
  calprotectine, transaminases, GGT, NFS), graphiques d'évolution, normes selon le sexe.
- **Rapport médecin** : synthèse de la période, effet « fin de dose », export PDF.
- **Carte urgence** : carte toilettes, fiche secours et photo de la carte de priorité.

## Confidentialité

Toutes les données restent sur l'appareil (IndexedDB). Il n'y a ni compte ni serveur. La
seule requête externe est une mesure d'audience anonyme (GoatCounter, sans cookie) qui ne
reçoit aucune donnée de santé. La sauvegarde JSON (Paramètres) contient les données en clair :
elle doit être conservée en lieu sûr.

## Développement

Prérequis : Node.js 22 ou plus récent.

```bash
npm install
npm run dev        # serveur local sur http://localhost:5175
npm test           # tests unitaires (Vitest)
npm run lint       # oxlint
npm run typecheck  # vérification TypeScript
npm run build      # build de production dans dist/
```

## Déploiement

Chaque push sur `main` lance le workflow `.github/workflows/deploy.yml` : lint, tests, build
puis publication sur GitHub Pages.

## Structure

```
src/
  components/   écrans (Calendar, Journal, Labs, Report, Settings, Emergency, Wellness)
  db/           base locale Dexie, planning des prises, sauvegarde / restauration
  utils/        dates, lecture des bilans, rapport, rappels, agenda .ics
  config/       version, nouveautés, liste des traitements
```

## Avertissement

MICI Compagnon est un outil de suivi personnel. Il ne remplace pas l'avis d'un médecin. Les
valeurs de référence affichées sont indicatives : seules celles du laboratoire font foi.

---

© 2026 MR Digital Solutions
