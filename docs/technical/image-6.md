# Image 6 — article de prévention

L’image 6 originale ne s’affichait pas. L’image 2, déjà fonctionnelle, a donc été placée temporairement au même emplacement et s’est correctement affichée sur `article-prevention.html`. Ce test a confirmé que l’emplacement HTML, le conteneur, le CSS et le chargeur JavaScript fonctionnaient : le problème venait de l’ancienne source de l’image 6, de son traitement ou de références concurrentes, et non de la page.

L’image 6 définitive a ensuite été réencodée dans un fichier Base64 unique et chargée avec le mécanisme `data-base64-src` déjà validé. Les anciennes tentatives devenues inutiles ont été supprimées afin d’empêcher le chargement d’une mauvaise source.
