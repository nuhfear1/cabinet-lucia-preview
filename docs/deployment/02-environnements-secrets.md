# Environnements, variables et secrets

## Règle générale

Aucun secret ne doit être stocké dans GitHub, dans le code, dans une capture d’écran ou dans un document partagé sans protection.

## Environnements

### Développement

- données fictives uniquement ;
- cookies non sécurisés possibles uniquement en local ;
- mots de passe de démonstration autorisés uniquement dans cet environnement ;
- aucune connexion à une base réelle.

### Préproduction

- données fictives uniquement ;
- comptes de recette distincts ;
- domaine et base séparés ;
- configuration proche de la production ;
- HTTPS obligatoire ;
- backend public activable pour la recette.

### Production

- comptes nominatifs uniquement ;
- double vérification obligatoire ;
- aucun secret par défaut ;
- aucune donnée fictive ;
- cookies sécurisés ;
- origines exactes ;
- sauvegarde et supervision actives.

## Variables attendues côté backend

| Variable | Préproduction | Production | Remarque |
|---|---|---|---|
| `APP_ENV` | `staging` | `production` | Contrôle les garde-fous de production. |
| `DATABASE_URL` | secret distinct | secret distinct | Ne jamais partager entre environnements. |
| `POSTGRES_TLS` | selon fournisseur | selon fournisseur | À configurer selon l’offre retenue. |
| `SESSION_SECRET` | secret aléatoire | secret aléatoire distinct | Long, unique et rotatif. |
| `COOKIE_SECURE` | `true` | `true` | Obligatoire hors local. |
| `PUBLIC_SITE_ORIGINS` | URL exacte de préproduction | URL exacte de production | Aucune étoile. |
| `PORTAL_ORIGINS` | URL exacte du portail de préproduction | URL exacte du portail de production | Aucune étoile. |
| `RATE_LIMIT_PEPPER` | secret distinct | secret distinct | À générer séparément. |
| `PORT` | selon plateforme | selon plateforme | Non secret. |

Les autres variables présentes dans le dépôt backend devront être recensées avant déploiement et classées en : obligatoire, optionnelle, secrète ou publique.

## Variables attendues côté site public

Le site public ne doit contenir que des informations publiques :

- URL HTTPS du backend ;
- indicateur d’activation de l’intégration ;
- éventuelle version de configuration.

Aucune clé privée, aucun mot de passe, aucun secret d’API ne doit être envoyé au navigateur.

## Génération des secrets

Chaque secret doit être :

- généré avec une source aléatoire cryptographique ;
- unique par environnement ;
- suffisamment long ;
- stocké dans le gestionnaire de secrets du fournisseur ;
- transmis uniquement aux responsables autorisés ;
- remplacé après suspicion d’exposition.

## Inventaire à tenir

| Secret ou accès | Environnement | Propriétaire | Dernière rotation | Prochaine rotation | Statut |
|---|---|---|---|---|---|
| Compte hébergeur | — | À désigner | — | — | À créer |
| Base PostgreSQL | Préproduction | À désigner | — | — | À créer |
| Base PostgreSQL | Production | À désigner | — | — | À créer |
| `SESSION_SECRET` | Préproduction | Technique | — | — | À générer |
| `SESSION_SECRET` | Production | Technique | — | — | À générer |
| `RATE_LIMIT_PEPPER` | Préproduction | Technique | — | — | À générer |
| `RATE_LIMIT_PEPPER` | Production | Technique | — | — | À générer |
| Compte domaine/DNS | — | À désigner | — | — | À confirmer |

## Comptes applicatifs

Avant la production :

1. créer le compte nominatif de Lucia ;
2. créer le ou les comptes nominatifs du secrétariat ;
3. ne pas réutiliser les comptes de recette ;
4. inscrire la double vérification pour chaque personne ;
5. vérifier les rôles ;
6. tester la désactivation d’un compte ;
7. conserver une procédure de récupération contrôlée.

## Contrôle avant activation

- [ ] aucun secret réel dans l’historique Git ;
- [ ] aucun mot de passe de démonstration actif ;
- [ ] toutes les variables obligatoires sont définies ;
- [ ] les origines correspondent exactement aux domaines ;
- [ ] les secrets de préproduction et de production sont différents ;
- [ ] l’accès aux secrets est limité ;
- [ ] la procédure de rotation est connue.
