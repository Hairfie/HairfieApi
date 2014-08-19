# Database de coiffeurs


Plusieurs sources de données. A titre info en France il y aurait entre 60 000 et 80 000 salons de coiffure.

## Fichier Diane
Le fichier Diane est un fichier d'environ 20 000 salons de coiffeurs ayant tous les code NAF des coiffeurs : 9602A.

* \+ Pas mal d'infos dans ce fichier, pas forcément la même quantité d'infos partout.
* \- Il y a les sièges des franchises par exemple : elles ont le bon code NAF mais ne correspondent pas à un coiffeur physique.

Une version JSON est disponible. A titre info, voilà les informations qu'on a pour un coiffeur (mais on a pas partout le même niveau de données).

	{
      "Company Name": "PASCAL COSTE COIFFURE",
      "Sign": "PASCAL COSTE COIFFURE",
      "Number and street": "42 AVENUE MARECHAL FOCH",
      "Postal Code": "06000",
      "CEDEX": "06048",
      "Delivery office": "NICE CEDEX 1",
      "City": "NICE",
      "ISO country code": "FR",
      "Country": "France",
      "HEXAVIA code": "00074466",
      "Community Code (5)": "06088",
      "Community Code (8)": "06299088",
      "Community": "Nice",
      "Canton (code)": "99",
      "Canton": "Nice [Canton non précisé]",
      "District (code)": "2",
      "District": "Nice",
      "Department (code)": "06",
      "Department": "Alpes-Maritimes",
      "Region (code)": "93",
      "Region": "Provence-Alpes-Côte d'Azur",
      "Phone number": "04 93 62 91 92",
      "Fax number": "04 93 62 20 40",
      "Website": "www.pascalcoste.com",
      "Siren Number": "440339471",
      "Siret Number": "440339471-00011",
      "RCS number": "440 339 471",
      "Legal form": "Société par actions simplifiée (SAS)",
      "Date of incorporation": "17/11/2001",
      "Number of branches": "65"
	} 
	
#### TODO
* Creuser les infos à l'intérieur de ce fichier, comme le nombre de branche ou d'autres infos.
* Utiliser le site internet quand on l'a ?


## Pages Jaunes

Difficile de savoir combien il y en a, mais il y en a beaucoup. On a la plupart du temps un numéro de téléphone et des horaires, mais pas grand chose de plus.

Pour faire le lien avec le fichier Diane, ils affichent le numéro de Siren ce qui est assez pratique.

Plusieurs parties du sites sont accessibles uniquement via un navigateur headless (comme la recherche). Pour chercher un salon par SIREN par exemple, il faut aller sur cette page : http://www.pagesjaunes.fr/pagespro et soumettre le formulaire.

Pas de blocage connu pour le moment des requêtes.

## L'Oreal Expert

	var url = "http://geowebservices.maporama.com/loreal/tables/Professionnel.json?t=1408001971976&maporamakey=biryrJ8Phxs%3D"
	    + "&searchType=proxy&searchDistance=100000&searchCenter=48.856614,2.3522219000000177"
	    + "&showDistance=true&sortBy=distance&sortMode=asc&&customFilter1_and=and,active,yes,"
	    + "&rowCount=" + count + "&rowOffset=" + offset + "&isajax=true";

Un webservice trouvé sur le site de L'Oreal qui permet de récupérer des salons, des numéros de téléphone et leur localisation, ainsi que des infos sur les produits L'Oreal utilisés dans ce même salon.
4853 salons en tout, par contre pas de Siret/Siren pour merger facilement avec le reste.

## Meilleur Coiffeur

Ils disent avoir 72814 coiffeurs référencés. Pas de numéro de téléphone ou de SIREN, mais par contre des tarifs régulièrement voir des avis (à récupérer ?).

Par contre, pas de système de recherche pour parcourir le site de manière très intelligente :

* Recherche full text : via Google, on est donc assez rapidement bloqué par Google en faisant les requêtes.
* Recherche Géographique : submission de formulaire

En gros, il faudrait parcourir les classements par région / département et ce de manière récursive pour arriver à obtenir un truc clean.