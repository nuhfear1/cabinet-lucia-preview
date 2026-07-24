# Checklist préproduction et mise en ligne

## Avant création de la préproduction

- [ ] fournisseur présélectionné ;
- [ ] conditions contractuelles examinées ;
- [ ] région d’hébergement choisie ;
- [ ] responsables du compte et de la facturation désignés ;
- [ ] domaines de préproduction décidés ;
- [ ] inventaire des variables terminé ;
- [ ] secrets préparés hors du dépôt.

## Préproduction technique

- [ ] base PostgreSQL distincte ;
- [ ] backend déployé depuis `main` ;
- [ ] migrations appliquées et vérifiées ;
- [ ] routes de santé opérationnelles ;
- [ ] site public déployé ;
- [ ] HTTPS valide ;
- [ ] origines exactes configurées ;
- [ ] comptes de recette créés ;
- [ ] double vérification testée ;
- [ ] données exclusivement fictives ;
- [ ] intégration publique activée uniquement pour la recette.

## Recette de préproduction

- [ ] CI des deux dépôts verte ;
- [ ] pages publiques contrôlées sur ordinateur et mobile ;
- [ ] demande de rendez-vous reçue dans le portail ;
- [ ] assistant administratif testé ;
- [ ] refus médical et message d’urgence testés ;
- [ ] rôles médecin et secrétariat vérifiés ;
- [ ] création, modification et annulation de rendez-vous testées ;
- [ ] purge des données fictives testée ;
- [ ] sauvegarde effectuée ;
- [ ] restauration effectuée ;
- [ ] retour arrière applicatif testé ;
- [ ] alertes reçues ;
- [ ] rapport de recette signé.

## Avant production

- [ ] contenus validés par Lucia ;
- [ ] photos approuvées et intégrées localement ;
- [ ] consultations, durées, prescriptions et cabinets validés ;
- [ ] règles du secrétariat validées ;
- [ ] mentions et politique de confidentialité finalisées ;
- [ ] prestataires et responsabilités documentés ;
- [ ] procédures internes approuvées ;
- [ ] utilisateurs nominatifs connus ;
- [ ] date et fenêtre de mise en ligne décidées.

## Production technique

- [ ] base de production vide et distincte ;
- [ ] secrets de production uniques ;
- [ ] `APP_ENV=production` ;
- [ ] `COOKIE_SECURE=true` ;
- [ ] aucune donnée ou identification de démonstration ;
- [ ] aucun secret dans Git ;
- [ ] migrations appliquées ;
- [ ] comptes nominatifs créés ;
- [ ] double vérification inscrite ;
- [ ] sauvegarde de référence disponible ;
- [ ] supervision et alertes actives ;
- [ ] domaine et TLS vérifiés ;
- [ ] procédure de retour arrière prête.

## Jour de mise en ligne

- [ ] commits et versions consignés ;
- [ ] sauvegarde confirmée ;
- [ ] portail vérifié avant ouverture publique ;
- [ ] site public vérifié avec intégration désactivée ;
- [ ] intégration activée ;
- [ ] test de demande contrôlé puis supprimé ;
- [ ] journaux vérifiés ;
- [ ] validation finale de Lucia ;
- [ ] fin d’intervention communiquée.

## Après mise en ligne

- [ ] surveillance renforcée pendant 24 à 48 heures ;
- [ ] traitement immédiat des erreurs critiques ;
- [ ] revue après une semaine ;
- [ ] compte rendu et liste des améliorations ;
- [ ] rotation des secrets temporaires éventuels ;
- [ ] suppression des accès de déploiement devenus inutiles.
