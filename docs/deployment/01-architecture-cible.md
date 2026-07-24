# Architecture cible

## Vue d’ensemble

L’architecture cible doit séparer clairement :

- le site public ;
- le portail professionnel et les API ;
- la base PostgreSQL ;
- les secrets ;
- les journaux et alertes ;
- les environnements de préproduction et de production.

## Composants

### Site public

Rôle :

- présenter Lucia, les consultations, les cabinets et les contenus pratiques ;
- recueillir une demande de rendez-vous ;
- proposer un assistant strictement administratif et pratique ;
- ne jamais exposer de donnée professionnelle interne.

Contraintes :

- HTTPS obligatoire ;
- déploiement statique ou équivalent ;
- activation du backend public par configuration ;
- aucune clé secrète dans le navigateur ;
- cache maîtrisé ;
- pages d’erreur cohérentes.

### Portail professionnel et API

Rôle :

- authentification et double vérification ;
- gestion des patients, rendez-vous et demandes publiques ;
- gouvernance de l’assistant ;
- journalisation et contrôle des droits ;
- exposition des routes publiques contrôlées.

Contraintes :

- exécution Node.js compatible avec la version du projet ;
- variables d’environnement protégées ;
- cookies sécurisés en production ;
- accès réseau limité à la base ;
- vérifications de santé et de disponibilité ;
- redémarrage automatique maîtrisé.

### Base PostgreSQL

Rôle :

- stocker les comptes, sessions, données métier, demandes publiques, événements et journaux applicatifs prévus par le schéma.

Contraintes :

- instance distincte pour chaque environnement ;
- accès non public ;
- chiffrement des connexions selon l’offre retenue ;
- sauvegardes automatiques ;
- restauration testée ;
- migrations appliquées avant activation de la nouvelle version.

## Séparation des environnements

### Préproduction

Utilisation :

- validation technique ;
- démonstration ;
- recette avec comptes et données fictifs ;
- activation contrôlée entre site public et backend.

Interdictions :

- aucune donnée réelle ;
- aucun mot de passe de production ;
- aucun domaine ou secret partagé avec la production.

### Production

Utilisation :

- comptes nominatifs ;
- données réelles ;
- site public définitif ;
- procédures de sauvegarde, supervision et incident actives.

Interdictions :

- aucun compte générique ou de démonstration ;
- aucun jeu de données fictives automatique ;
- aucune origine web large ou temporaire ;
- aucun secret enregistré dans GitHub ou dans un fichier versionné.

## Flux réseau attendus

1. Le navigateur public charge le site public en HTTPS.
2. Le site public appelle uniquement les routes publiques autorisées du backend.
3. Le portail appelle les routes privées du même backend.
4. Le backend accède à PostgreSQL sur un réseau privé ou restreint.
5. Les sauvegardes sont stockées dans un espace distinct de l’instance principale.
6. Les alertes sont envoyées vers les responsables désignés.

## Critères de choix d’architecture

- localisation et garanties contractuelles adaptées au contexte médical ;
- séparation claire des environnements ;
- support de PostgreSQL managé ;
- sauvegardes et restauration disponibles ;
- journalisation accessible ;
- secrets gérés hors du code ;
- TLS automatisé ;
- coût prévisible ;
- possibilité de revenir rapidement à une version précédente ;
- documentation et support suffisamment fiables.

## Décisions attendues

- fournisseur retenu : `À DÉCIDER` ;
- région d’hébergement : `À DÉCIDER` ;
- responsable du compte fournisseur : `À DÉCIDER` ;
- responsable technique du déploiement : `À DÉCIDER` ;
- responsable de validation métier : Lucia ;
- propriétaire des domaines : `À DÉCIDER`.
