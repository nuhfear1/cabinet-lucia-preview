# Sauvegarde, restauration et retour arrière

## Objectifs

- éviter qu’une panne, une erreur humaine ou un déploiement défectueux entraîne une perte durable ;
- pouvoir restaurer la base ;
- pouvoir remettre en service la version précédente ;
- prouver que les procédures fonctionnent avant la production.

## Sauvegardes PostgreSQL

La solution retenue devra permettre :

- sauvegardes automatiques ;
- conservation sur une durée à définir ;
- stockage distinct de l’instance principale ;
- chiffrement ;
- contrôle des accès ;
- restauration dans une nouvelle instance ou un environnement isolé.

## Paramètres à décider

| Élément | Décision attendue |
|---|---|
| Fréquence des sauvegardes | À décider |
| Durée de conservation | À décider |
| Restauration à un instant précis | Selon fournisseur |
| Responsable des contrôles | À désigner |
| Fréquence des tests de restauration | Recommandation initiale : trimestrielle, à valider |

## Test de restauration avant production

1. générer une sauvegarde de préproduction ;
2. créer une base de restauration isolée ;
3. restaurer la sauvegarde ;
4. appliquer les contrôles de schéma ;
5. vérifier les données fictives attendues ;
6. démarrer temporairement le backend contre la base restaurée ;
7. vérifier connexion, rendez-vous et assistant ;
8. détruire l’environnement de test après compte rendu.

## Retour arrière applicatif

Avant chaque mise en ligne :

- identifier le commit actuellement en production ;
- identifier le nouveau commit ;
- conserver l’artefact ou la version précédente ;
- vérifier si les migrations sont compatibles avec un retour arrière ;
- préparer la commande ou l’action fournisseur permettant de revenir à la version précédente.

## Cas d’une migration incompatible

Une restauration applicative seule peut être insuffisante. La procédure doit alors prévoir :

1. arrêt des écritures ;
2. sauvegarde immédiate de l’état défectueux ;
3. décision entre migration corrective et restauration de base ;
4. validation du responsable technique ;
5. information de Lucia ;
6. exécution dans un environnement contrôlé ;
7. vérification complète avant réouverture.

## Déclencheurs de retour arrière

- connexion impossible pour tous les utilisateurs ;
- indisponibilité répétée ;
- erreur de migration ;
- exposition de fonctions non autorisées ;
- perte ou incohérence de données ;
- formulaire public inutilisable ;
- erreur de sécurité significative ;
- absence de solution corrective rapide et sûre.

## Compte rendu obligatoire

- incident ou changement concerné ;
- heure de détection ;
- version défectueuse ;
- sauvegarde utilisée ;
- actions réalisées ;
- vérifications après restauration ;
- personnes informées ;
- cause racine et action préventive.
