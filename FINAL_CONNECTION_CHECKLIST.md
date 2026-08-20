# Checklist de connexion finale

Le backend de production et le site public sont désormais connectés. PostgreSQL de production est configuré, HTTPS et CORS ont été testés, et un test fictif du parcours public → API → base de données a réussi. **Aucune donnée patient réelle ne doit être utilisée en recette.**

## Éléments validés

- [x] Backend de production connecté.
- [x] PostgreSQL de production configuré.
- [x] Connexions HTTPS et politique CORS testées.
- [x] Site public connecté au backend.
- [x] Test avec des données fictives du site public vers l’API puis la base de données réussi.

## Contrôles d’exploitation à maintenir

- [ ] Surveiller `GET /api/health` et `GET /api/readiness` en exploitation.
- [ ] Vérifier après chaque déploiement la réception et l’audit d’une demande strictement fictive dans le portail médecin/secrétariat.
- [ ] Conserver les secrets et URL de production dans les mécanismes de configuration prévus, sans les documenter ici.

La limitation d’interface du formulaire complète, mais ne remplace jamais, la limitation de débit et les protections anti-abus côté serveur.

## Recette

- Utiliser exclusivement des identités et informations fictives.
- Ne jamais saisir de donnée patient réelle dans les tests du formulaire, de l’API, de la base de données ou du portail.
- Ne marquer un nouveau contrôle comme validé qu’après l’avoir réellement exécuté dans l’environnement concerné.

## Rollback

- [ ] Appliquer le runbook de rollback sans vider ni remplacer les URL de production.
- [ ] Republier le site public si sa configuration doit être restaurée.
- [ ] Vérifier qu’aucune demande inattendue n’est transmise pendant l’intervention.
