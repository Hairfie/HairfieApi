HairfieApi
==========

The backend API

# Setup

## Prérequis

* Mongodb

    node 0.11.33
    npm install -g strongloop
    npm install -g yo
    npm install -g node-gyp

## Seed

Un fichier de 100 salons est présent dans le code source. Pour le seeder, il suffit de lancer la commande `node server/seed/import.js`


# Useful tips

* Debugging loopback : http://docs.strongloop.com/display/LB/Debugging+LoopBack+apps

# Deployment

    $ bundle install

    $ cap staging deploy
