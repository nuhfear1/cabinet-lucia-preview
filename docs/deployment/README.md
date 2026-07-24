# Préparation du déploiement — Cabinet Lucia

## Objectif

Préparer tout ce qui peut l’être avant de choisir et payer l’infrastructure d’hébergement.

Ce dossier ne déploie rien et ne prétend pas que le service est déjà disponible en ligne. Il fournit un cadre exécutable pour passer ensuite de la préproduction locale à une vraie préproduction, puis à la production.

## Périmètre

Le projet comprend deux dépôts :

- `nuhfear1/cabinet-lucia-preview` : site public statique ;
- `nuhfear1/cabinet-lucia-medical-platform` : portail professionnel, API et base PostgreSQL.

## Documents

1. [Architecture cible](01-architecture-cible.md)
2. [Environnements, variables et secrets](02-environnements-secrets.md)
3. [Domaines, DNS et TLS](03-domaines-dns-tls.md)
4. [Procédure de déploiement](04-runbook-deploiement.md)
5. [Sauvegarde, restauration et retour arrière](05-sauvegarde-restauration-retour-arriere.md)
6. [Supervision, alertes et journaux](06-supervision-alertes-journaux.md)
7. [Checklist préproduction et mise en ligne](07-checklist-preproduction-mise-en-ligne.md)
8. [Fiche de décision hébergeur](08-fiche-decision-hebergeur.md)

## Principes imposés

- séparation stricte entre préproduction et production ;
- aucun compte ou mot de passe de démonstration en production ;
- aucune donnée fictive injectée automatiquement en production ;
- aucune donnée réelle utilisée pendant les recettes de préproduction ;
- HTTPS obligatoire ;
- secrets stockés hors du dépôt ;
- origines web autorisées définies exactement ;
- sauvegarde et restauration testées avant la mise en ligne ;
- possibilité de revenir à la version précédente ;
- activation du site public vers le backend uniquement après validation en préproduction.

## Ce qui reste volontairement non décidé

- fournisseur d’hébergement ;
- prix et contrat ;
- noms de domaine définitifs ;
- politique de conservation des journaux ;
- fréquence de sauvegarde définitive ;
- responsables nominatifs des alertes ;
- date de mise en ligne.

Ces décisions devront être prises avant la tâche de préproduction réelle.
