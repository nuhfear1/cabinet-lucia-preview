# Tâche 7 — Connexion contrôlée du site public

## État par défaut

La connexion backend est **désactivée**. Le site conserve son assistant local sécurisé et le parcours de rendez-vous ne transmet aucune donnée.

Le fichier `backend-config.js` lit une configuration injectée avant `app.js` :

```html
<script>
window.CABINET_LUCIA_BACKEND_CONFIG = {
  enabled: false,
  baseUrl: "",
  timeoutMs: 8000,
  environment: "connection-ready",
  patientPortalUrl: ""
};
</script>
```

L’activation est refusée si `baseUrl` n’utilise pas HTTPS, si l’environnement n’est pas explicitement `staging` ou `production`, ou si l’hôte contient `example`, `localhost` ou `.invalid`.

## Activation de préproduction

1. Déployer le backend avec PostgreSQL vide et migrations appliquées.
2. Configurer côté backend :
   - `APP_ENV=staging`
   - `PUBLIC_SITE_ORIGINS=https://URL_DU_SITE_PUBLIC`
   - `PORTAL_ORIGINS=https://URL_DU_PORTAIL`
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `COOKIE_SECURE=true`
3. Vérifier `GET /api/health` et `GET /api/readiness`.
4. Tester les preflights CORS depuis l’origine publique exacte.
5. Injecter `CABINET_LUCIA_BACKEND_CONFIG` avec `enabled: true` et l’URL HTTPS du backend.
6. Tester : assistant, urgence, refus médical, demande de rendez-vous, rejeu idempotent et réception dans le portail.
7. Ne fusionner l’activation définitive qu’après recette et validation du rollback.

## Contrats utilisés

- `POST /api/public/assistant`
- `POST /api/public/appointment-requests`

Les requêtes publiques utilisent `credentials: omit`, `Cache-Control: no-store`, `X-Request-Id` et une clé d’idempotence stable pour la demande en cours.

## Limites

Cette préparation ne constitue ni un hébergement de production ni une validation HDS/RGPD. Aucune donnée patient réelle ne doit être utilisée tant que l’infrastructure, les contrats et les validations réglementaires ne sont pas achevés.
