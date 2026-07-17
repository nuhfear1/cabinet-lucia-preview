# Recette technique — Cabinet Lucia

Version contrôlée : 2026-07-17

## Contrôles intégrés

- Navigation et footer communs injectés par `site.js`.
- Navigation mobile avec `aria-expanded`, fermeture extérieure et touche Échap.
- Indication de page active avec `aria-current="page"`.
- Lien d’évitement vers le contenu principal.
- Assistant limité aux informations pratiques, avec refus des demandes médicales et message d’urgence.
- Parcours de rendez-vous en quatre étapes, validation des champs et récapitulatif.
- Prise en charge de `prefers-reduced-motion`.
- Page 404 dédiée.
- Ressources principales versionnées pour éviter les anciens fichiers en cache.

## Contrôles manuels avant publication

- Chrome, Safari, Firefox et Edge.
- Largeurs 320 px, 375 px, 768 px, 1024 px et écran large.
- Parcours clavier complet : menu, assistant, FAQ et rendez-vous.
- Contrastes avec axe, WAVE ou Lighthouse.
- Vérification de tous les liens et ressources externes.
- Vérification des textes, images et données validés par la docteure.
- Connexion réelle à l’agenda et tests de bout en bout.
