# Procédure de déploiement

## Préconditions

- fournisseur et régions validés ;
- préproduction et production créées séparément ;
- PostgreSQL disponible ;
- domaines et certificats prêts ;
- variables et secrets renseignés ;
- sauvegarde initiale possible ;
- comptes responsables identifiés ;
- PR concernées fusionnées et CI verte.

## Déploiement de préproduction

1. créer la base PostgreSQL de préproduction ;
2. configurer les secrets de préproduction ;
3. déployer le backend depuis `main` ;
4. vérifier `/api/health` et `/api/readiness` ;
5. appliquer les migrations ;
6. vérifier le schéma et le statut des migrations ;
7. créer uniquement les comptes et données fictifs de recette ;
8. déployer le site public de préproduction ;
9. configurer son URL backend HTTPS ;
10. activer l’intégration publique uniquement en préproduction ;
11. exécuter la recette navigateur publique et portail ;
12. vérifier les rôles, la double vérification et la purge ;
13. tester une sauvegarde et une restauration ;
14. tester le retour à la version précédente ;
15. consigner le résultat et obtenir la validation de recette.

## Préparation de production

1. créer une base de production vide ;
2. configurer des secrets nouveaux et distincts ;
3. vérifier `APP_ENV=production` ;
4. vérifier l’absence de comptes et données fictifs ;
5. déployer le backend sans ouvrir immédiatement le site public ;
6. appliquer les migrations ;
7. créer les comptes nominatifs ;
8. inscrire la double vérification ;
9. vérifier les droits de chaque rôle ;
10. déployer le site public avec l’intégration désactivée ;
11. contrôler les domaines, TLS, pages et mentions ;
12. effectuer une sauvegarde de référence ;
13. valider le plan de mise en ligne.

## Mise en ligne

1. annoncer le début de l’intervention ;
2. figer les modifications non urgentes ;
3. relever les versions et commits déployés ;
4. vérifier la sauvegarde la plus récente ;
5. activer les domaines de production ;
6. vérifier le portail ;
7. activer l’intégration publique ;
8. transmettre une demande fictive clairement identifiée puis la supprimer ;
9. vérifier les journaux et alertes ;
10. obtenir la validation métier de Lucia ;
11. annoncer la fin de mise en ligne.

## Vérifications obligatoires

- pages publiques accessibles ;
- formulaire de demande opérationnel ;
- assistant conforme à son périmètre ;
- connexion et double vérification ;
- rôles médecin/secrétariat ;
- base sans données fictives ;
- HTTPS et cookies sécurisés ;
- origines exactes ;
- sauvegarde récente ;
- alertes actives ;
- retour arrière prêt.

## Compte rendu

Consigner : date, responsables, commits, migrations, domaines, contrôles réalisés, anomalies, décisions, heure de fin et validation finale.
