# Supervision, alertes et journaux

## Objectif

Détecter rapidement une indisponibilité, une erreur applicative ou une anomalie de sécurité, sans exposer inutilement de données sensibles.

## Contrôles de disponibilité

À surveiller au minimum :

- site public accessible en HTTPS ;
- portail accessible ;
- route de santé du backend ;
- route de disponibilité incluant la base ;
- certificat TLS valide ;
- expiration du domaine ;
- échecs répétés de déploiement.

## Alertes recommandées

| Événement | Priorité | Destinataire | Action initiale |
|---|---|---|---|
| Site ou portail indisponible | Haute | Responsable technique | Vérifier fournisseur et version |
| Base indisponible | Critique | Responsable technique | Stopper les changements et diagnostiquer |
| Taux d’erreurs élevé | Haute | Responsable technique | Consulter journaux et revenir en arrière si nécessaire |
| Certificat proche de l’expiration | Moyenne | Responsable domaine | Corriger avant interruption |
| Échecs de connexion inhabituels | Haute | Responsable sécurité | Vérifier comptes et limiter l’accès |
| Sauvegarde échouée | Critique | Technique + Lucia | Corriger et relancer |
| Stockage ou quotas proches de la limite | Moyenne | Responsable technique | Ajuster avant blocage |

## Journaux

Les journaux doivent aider au diagnostic sans enregistrer inutilement :

- mots de passe ;
- secrets ;
- codes de double vérification ;
- corps médicaux complets ;
- données personnelles non nécessaires ;
- jetons de session.

À conserver lorsque pertinent :

- date et heure ;
- identifiant de requête ;
- route appelée ;
- résultat technique ;
- durée ;
- type d’événement de sécurité ;
- identifiant interne pseudonymisé lorsque nécessaire.

## Accès et conservation

- accès limité aux responsables désignés ;
- double vérification sur l’outil de supervision ;
- durée de conservation à décider ;
- export et suppression possibles selon la politique retenue ;
- aucune transmission vers un outil tiers sans validation préalable.

## Routine de contrôle

Quotidien : vérifier les alertes critiques et la disponibilité.

Hebdomadaire : vérifier les erreurs récurrentes, sauvegardes et quotas.

Mensuel : revoir les accès, alertes inutiles, volumes de journaux et incidents.

## Test avant production

- provoquer une indisponibilité contrôlée en préproduction ;
- confirmer la réception de l’alerte ;
- vérifier le contenu du message ;
- mesurer le délai ;
- documenter la prise en charge ;
- confirmer que les journaux ne contiennent aucun secret.
