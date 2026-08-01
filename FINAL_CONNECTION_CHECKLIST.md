# Checklist de connexion finale

La connexion reste volontairement désactivée jusqu'à la fourniture et à la validation de l'infrastructure. N'utiliser aucune donnée patient réelle pendant la recette.

## Backend

- [ ] Renseigner `DATABASE_URL` avec la base PostgreSQL définitive.
- [ ] Renseigner `SESSION_SECRET` via le gestionnaire de secrets de l'hébergeur.
- [ ] Renseigner `PUBLIC_SITE_ORIGINS` et `PORTAL_ORIGINS` avec les origines HTTPS exactes.
- [ ] Régler `POSTGRES_TLS=require` et valider la chaîne de confiance TLS.
- [ ] Déployer la plateforme médicale sans modifier les routes publiques canoniques.
- [ ] Exécuter les migrations existantes sur la base cible selon le runbook de la plateforme.
- [ ] Vérifier `GET /api/health`.
- [ ] Vérifier `GET /api/readiness`.

La limitation d'interface du formulaire complète, mais ne remplace jamais, la limitation de débit et les protections anti-abus côté serveur.

## Site public

- [ ] Renseigner l'URL HTTPS définitive du backend dans `baseUrl`.
- [ ] Renseigner éventuellement l'URL HTTPS du portail patient dans `patientPortalUrl` (ne jamais utiliser le portail professionnel à sa place).
- [ ] Conserver `enabled: false` et tester le formulaire, le message de non-transmission et l'assistant local.
- [ ] Effectuer un test fictif autorisé après déploiement du backend et vérifier CORS, le contrat et l'idempotence.
- [ ] Définir explicitement `environment: "staging"` ou `environment: "production"`, puis passer `enabled: true`.
- [ ] Redéployer le site public.
- [ ] Vérifier la réception et l'audit de la demande dans le portail médecin/secrétariat.

## Rollback

- [ ] Remettre `enabled: false` sans vider ni remplacer les URL de production dans une opération d'urgence.
- [ ] Republier le site public.
- [ ] Vérifier que le chatbot local répond sans requête backend.
- [ ] Vérifier qu'aucune nouvelle demande de rendez-vous n'est envoyée.

## Valeurs indispensables restant à fournir

```text
BACKEND_PUBLIC_URL=
PUBLIC_SITE_URL=
PORTAL_URL=
DATABASE_URL=
SESSION_SECRET=
POSTGRES_TLS=
PUBLIC_SITE_ORIGINS=
PORTAL_ORIGINS=
COOKIE_SECURE=
```
