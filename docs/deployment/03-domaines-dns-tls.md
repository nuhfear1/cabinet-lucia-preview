# Domaines, DNS et TLS

## Noms à prévoir

Les noms définitifs restent à décider. La structure recommandée est :

- site public : `www.[domaine]` ou `[domaine]` ;
- portail professionnel : `portail.[domaine]` ;
- API : `api.[domaine]` si elle n’est pas servie par le même domaine que le portail ;
- préproduction : sous-domaines distincts comportant clairement `staging` ou `preprod`.

## Propriété et accès

- le domaine doit être enregistré au nom de l’entité ou de la personne désignée par contrat ;
- au moins deux responsables doivent pouvoir récupérer l’accès ;
- la double vérification doit être activée chez le registraire ;
- les codes de récupération doivent être conservés dans un espace protégé ;
- aucun compte personnel non documenté ne doit être l’unique propriétaire.

## Plan DNS à compléter

| Nom | Type | Destination | Environnement | Statut |
|---|---|---|---|---|
| domaine principal | A/AAAA/CNAME | fournisseur public | Production | À décider |
| `www` | CNAME | domaine principal | Production | À décider |
| `portail` | CNAME/A | fournisseur backend | Production | À décider |
| `api` | CNAME/A | fournisseur backend | Production | Selon architecture |
| `staging` | CNAME/A | site public de préproduction | Préproduction | À décider |
| `portail-staging` | CNAME/A | backend de préproduction | Préproduction | À décider |

## TLS

- HTTPS obligatoire sur toutes les interfaces ;
- redirection permanente de HTTP vers HTTPS ;
- certificat renouvelé automatiquement ;
- aucun certificat auto-signé pour les utilisateurs finaux ;
- cookies de production marqués sécurisés ;
- vérification du certificat après chaque changement DNS.

## Ordre de mise en place

1. confirmer la propriété des domaines ;
2. créer les environnements chez le fournisseur ;
3. relever les destinations DNS exactes ;
4. créer d’abord les sous-domaines de préproduction ;
5. attendre la propagation ;
6. vérifier HTTPS ;
7. configurer les origines autorisées avec les URL exactes ;
8. tester les parcours ;
9. préparer ensuite les entrées de production ;
10. ne basculer le domaine public qu’après validation de mise en ligne.

## Contrôles

- [ ] domaine accessible en HTTPS ;
- [ ] aucun avertissement de certificat ;
- [ ] redirection HTTP correcte ;
- [ ] portail non indexé par les moteurs ;
- [ ] domaines de préproduction clairement distingués ;
- [ ] origines backend conformes aux domaines ;
- [ ] liens internes et externes vérifiés après bascule ;
- [ ] procédure de retour vers l’ancienne destination DNS documentée.
