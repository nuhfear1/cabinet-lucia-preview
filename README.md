# Cabinet Lucia — site public

Site public statique du cabinet de cardiologie de la Docteure Lucia Cespedes-Ocampo.

## Vérification

```bash
npm ci
npm run verify
npm run test:browser
```

## Connexion au backend

Le site public est connecté au backend de production Scalingo via `backend-config.js`.

Configuration actuellement attendue :

- `enabled: true` ;
- environnement `production` ;
- backend HTTPS : `https://cabinet-lucia-medical-platform.osc-fr1.scalingo.io` ;
- portail patient public non activé tant qu’aucune URL dédiée n’est disponible.

Le flux public de demande de rendez-vous a été validé de bout en bout avec des données fictives : site public → API → PostgreSQL → portail MAINTAINER. Les données fictives utilisées pour cette recette ont été supprimées après validation.

- Checklist de connexion et d’exploitation : `FINAL_CONNECTION_CHECKLIST.md`
- Procédure de déploiement : `TASK7_DEPLOYMENT.md`
- Retour arrière : `TASK7_ROLLBACK.md`
- Blocages juridiques factuels restants : `LEGAL_FINAL_BLOCKERS.md`

## Sécurité de recette

Aucune donnée patient réelle ne doit être utilisée pendant les tests techniques ou les recettes non médicales.
