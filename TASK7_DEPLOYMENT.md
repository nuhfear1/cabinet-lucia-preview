# Tâche 7 — Connexion contrôlée du site public

## État actuel

La connexion au backend de production est **activée**.

`backend-config.js` fournit actuellement les valeurs de production attendues :

```js
{
  enabled: true,
  baseUrl: "https://cabinet-lucia-medical-platform.osc-fr1.scalingo.io",
  timeoutMs: 8000,
  environment: "production",
  patientPortalUrl: ""
}
```

L’activation reste refusée si `baseUrl` n’utilise pas HTTPS, si l’environnement n’est pas explicitement `staging` ou `production`, ou si l’hôte contient `example`, `localhost` ou `.invalid`.

## État validé en production

- backend Scalingo déployé ;
- PostgreSQL de production configuré ;
- HTTPS et CORS vérifiés ;
- endpoints publics connectés ;
- demande fictive testée de bout en bout : site public → API → PostgreSQL → portail MAINTAINER ;
- données fictives de cette recette supprimées après validation.

## Contrats utilisés

- `POST /api/public/assistant`
- `POST /api/public/appointment-requests`

Les requêtes publiques utilisent `credentials: omit`, `Cache-Control: no-store`, `X-Request-Id` et une clé d’idempotence stable pour la demande en cours.

## Déploiements futurs

Après toute modification affectant la connexion publique :

1. exécuter `npm run verify` ;
2. exécuter la recette navigateur en CI ;
3. vérifier que `backend-config.js` reste cohérent avec l’environnement cible ;
4. vérifier `GET /api/health` et `GET /api/readiness` côté backend ;
5. utiliser uniquement des données fictives pour un éventuel test de bout en bout ;
6. nettoyer immédiatement toute donnée fictive créée en production.

## Limites actuelles

Le portail patient public n’est pas activé : `patientPortalUrl` reste vide tant qu’aucune URL dédiée n’est disponible.

Les éléments encore dépendants de la Dre Lucia Cespedes-Ocampo sont documentés séparément et ne doivent pas être inventés.