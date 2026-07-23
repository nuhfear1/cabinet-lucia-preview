# Tâche 7 — Procédure de rollback

## Rollback immédiat

Remettre la configuration publique à :

```js
window.CABINET_LUCIA_BACKEND_CONFIG = {
  enabled: false,
  baseUrl: "",
  timeoutMs: 8000,
  environment: "preview"
};
```

Puis republier uniquement le fichier de configuration ou la page qui l’injecte.

## Effet attendu

- aucune requête réseau vers le backend ;
- assistant local sécurisé réactivé automatiquement ;
- formulaire de rendez-vous revient au mode démonstration sans transmission ;
- portail et base PostgreSQL restent inchangés ;
- aucune migration ou restauration de base nécessaire.

## Vérification

1. Ouvrir les outils réseau du navigateur.
2. Poser une question à l’assistant : aucune requête `/api/public/assistant` ne doit apparaître.
3. Terminer le formulaire : le message doit indiquer qu’aucune donnée n’a été transmise.
4. Exécuter `npm run verify`.

Le test automatisé `rollback mode performs no network request` protège explicitement ce comportement.
