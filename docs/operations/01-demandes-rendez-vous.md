# Procédure — Traitement des demandes de rendez-vous

## But

Traiter chaque demande reçue depuis le site public de manière cohérente, sans la confondre avec un rendez-vous confirmé.

## Responsabilité

- **Secrétariat** : réception, contrôle, rappel du patient, proposition et enregistrement du rendez-vous.
- **Lucia** : arbitrage des demandes médicalement sensibles ou des cas non prévus par les règles validées.

## Statuts recommandés

- `REÇUE` : demande nouvellement transmise.
- `EN COURS` : vérification ou rappel en cours.
- `CONFIRMÉE` : rendez-vous créé et confirmé au patient.
- `AUTRE CRÉNEAU PROPOSÉ` : attente de réponse du patient.
- `REFUSÉE / NON ADAPTÉE` : demande ne pouvant pas être satisfaite selon les règles du cabinet.
- `SANS RÉPONSE` : patient injoignable après le nombre de tentatives validé.
- `DOUBLON` : demande déjà traitée dans un autre dossier.

## Étapes

1. Ouvrir la demande et vérifier les champs essentiels : identité, téléphone, motif, cabinet, date souhaitée.
2. Rechercher un éventuel doublon avant toute création.
3. Vérifier que le motif correspond à une prestation validée par Lucia.
4. Contrôler les règles associées au motif : ordonnance, durée, cabinet, préparation et documents.
5. Contacter le patient selon le canal validé.
6. Confirmer que la date indiquée est une préférence et non une réservation déjà acquise.
7. Proposer un créneau réellement disponible.
8. Créer le rendez-vous uniquement après accord du patient.
9. Rappeler le cabinet, la date, l’heure, les documents et les consignes validées.
10. Mettre à jour le statut de la demande et laisser une trace de l’action.

## Délai de traitement

`À VALIDER AVEC LUCIA` : délai cible de première prise en charge pendant les jours d’ouverture.

## Modèle de premier contact

> Bonjour, Cabinet de la Dre Lucia Cespedes-Ocampo. Nous avons bien reçu votre demande de rendez-vous pour [motif]. La date indiquée était une préférence. Nous vous contactons afin de vérifier les informations et de vous proposer un créneau disponible.

## Avant confirmation

Le secrétariat doit vérifier :

- identité et moyen de contact ;
- motif exact ;
- cabinet retenu ;
- prescription éventuelle ;
- durée correcte ;
- absence de conflit dans l’agenda ;
- documents et préparation à communiquer.

## Escalade vers Lucia

Escalader sans donner d’avis médical lorsque :

- le motif est ambigu ou absent de la liste validée ;
- le patient décrit une situation médicale préoccupante sans urgence manifeste ;
- une dérogation de durée, de prescription ou de cabinet est demandée ;
- le secrétariat ne peut pas appliquer une règle existante ;
- un conflit de priorité doit être arbitré.

## Interdictions

- Ne jamais promettre un rendez-vous avant confirmation réelle.
- Ne jamais interpréter les symptômes pour déterminer un diagnostic.
- Ne jamais ajouter une règle de prise en charge non validée par Lucia.
- Ne jamais saisir de données réelles dans l’environnement de préproduction.
