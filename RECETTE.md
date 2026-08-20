# Recette technique — Cabinet Lucia

Version contrôlée : 2026-08-20

## Contrôles intégrés

- Navigation et footer communs injectés par `site.js`.
- Navigation mobile avec `aria-expanded`, fermeture extérieure et touche Échap.
- Indication de page active avec `aria-current="page"`.
- Lien d’évitement vers le contenu principal.
- Assistant limité aux informations pratiques, avec refus des demandes médicales et message d’urgence.
- Parcours de rendez-vous en quatre étapes, validation des champs et récapitulatif.
- Connexion du site public au backend de production activée.
- Demande fictive validée de bout en bout jusqu’au portail MAINTAINER puis supprimée.
- Prise en charge de `prefers-reduced-motion`.
- Page 404 dédiée.
- Ressources principales versionnées pour éviter les anciens fichiers en cache.
- Recette navigateur automatisée exécutée par la CI GitHub.

## Contrôles restant à réaliser avant passation finale

- Recette manuelle finale sur Chrome, Safari, Firefox et Edge.
- Vérification finale aux largeurs 320 px, 375 px, 768 px, 1024 px et écran large.
- Parcours clavier complet : menu, assistant, FAQ et rendez-vous.
- Contrastes avec axe, WAVE ou Lighthouse si nécessaire.
- Vérification finale de tous les liens et ressources externes.
- Vérification des textes, images et informations professionnelles dépendant de la Dre Lucia Cespedes-Ocampo.
- Recette réelle du compte DOCTOR après onboarding de Lucia.

Aucune donnée patient réelle ne doit être utilisée pour ces contrôles techniques.