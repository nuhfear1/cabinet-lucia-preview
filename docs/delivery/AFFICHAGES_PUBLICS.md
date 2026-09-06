# Affichages publics — stratégie de livraison

## Objectif

Permettre une livraison rapide du site public sans inventer d'informations professionnelles ou médicales, sans imposer de photo de la Dre Lucia Cespedes-Ocampo et sans modifier le fonctionnement entre le site public et le backend.

## Affichage A — V1 éditoriale complète à reprendre plus tard

L'Affichage A correspond **exactement** à l'état du site public au commit :

`300a4fb6c6424c12fa6afb097d14d06b9e5c3347`

Référence Git permanente :

`archive/affichage-a-v1-2026-09-06`

Cet affichage conserve les emplacements et propositions éditoriales prévus pour :

- une éventuelle photo de la docteure ;
- une présentation professionnelle plus développée ;
- les contenus détaillés des consultations et examens ;
- les informations pratiques complémentaires à valider.

Il pourra être repris ultérieurement **uniquement si Lucia souhaite publier ces éléments et après validation des informations concernées**.

La photo de la docteure n'est pas considérée comme un prérequis de livraison.

## Affichage B — version de livraison minimale

Branche de travail :

`delivery/affichage-b-v1`

Principes :

1. conserver la charte graphique existante ;
2. conserver le parcours de rendez-vous et les appels API existants ;
3. conserver l'assistant public et ses règles de sécurité ;
4. conserver les deux cabinets, leurs photos validées et la carte validée ;
5. ne modifier ni le backend ni les contrats API ;
6. supprimer de l'affichage public les placeholders, mentions de prévisualisation et promesses de contenus futurs non nécessaires ;
7. ne pas publier de biographie, diplôme complémentaire, association professionnelle, durée d'acte, préparation ou autre information médicale non confirmée ;
8. ne pas afficher de photo personnelle de Lucia sans choix explicite de sa part ;
9. conserver et compléter les mentions légales obligatoires dès réception des trois informations encore manquantes.

## Données Lucia encore nécessaires pour la fermeture légale

- adresse e-mail professionnelle officielle ;
- numéro de téléphone professionnel actuel ;
- État membre de l'Union européenne ayant octroyé le titre professionnel.

Ces informations ne doivent jamais être inventées ou déduites.

## Retour vers l'Affichage A

L'Affichage A ne doit pas être reconstruit manuellement. Pour le retrouver, utiliser la branche d'archive ou le SHA indiqué ci-dessus, puis reporter volontairement les contenus validés dans une nouvelle branche de travail.

## Zones gelées

Les éléments suivants ne doivent pas être modifiés dans le cadre de l'Affichage B, sauf régression démontrée :

- carte des cabinets ;
- photo du cabinet de Morne-à-l'Eau ;
- photo du cabinet de Sainte-Rose ;
- `site.js` et son loader d'images ;
- `app.js` et le fonctionnement de l'assistant ;
- parcours de rendez-vous ;
- intégration backend / API.
