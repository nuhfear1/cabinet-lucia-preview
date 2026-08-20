# Tâche 7 — Procédure de rollback

## Contexte actuel

Le site public est connecté au backend de production. Le rollback doit donc désactiver explicitement cette connexion sans modifier la base PostgreSQL ni les données déjà enregistrées.

## Rollback immédiat

Remettre la configuration publique à un mode désactivé sûr, en conservant l’URL de production si elle doit être réutilisée ensuite :

```js
window.CABINET_LUCIA_BACKEND_CONFIG = {
  enabled: false,
  baseUrl: "https://cabinet-lucia-medical-platform.osc-fr1.scalingo.io",
  timeoutMs: 8000,
  environment: "production",
  patientPortalUrl: ""
};
```

Puis republier uniquement la configuration ou le site public concerné.

## Effet attendu

- aucune nouvelle requête publique vers le backend depuis le site ;
- assistant local sécurisé utilisé lorsque le comportement de fallback prévu le permet ;
- aucune nouvelle demande de rendez-vous transmise au backend ;
- portail et base PostgreSQL restent inchangés ;
- aucune migration ou restauration de base n’est nécessaire.

## Vérification

1. Ouvrir les outils réseau du navigateur.
2. Vérifier qu’aucune nouvelle requête publique inattendue n’est envoyée au backend.
3. Vérifier le comportement du formulaire et de l’assistant en mode désactivé.
4. Exécuter `npm run verify`.
5. Exécuter la recette navigateur en CI.

## Réactivation

Après correction de l’incident, remettre `enabled: true` uniquement après vérification du backend, de HTTPS/CORS et des endpoints concernés.

Ne jamais supprimer ou remplacer les URL de production dans l’urgence si une simple désactivation du flag suffit.