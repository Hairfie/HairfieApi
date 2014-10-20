'use strict';

var loopback = require('loopback');

module.exports = function (app) {
    var Hairfie = app.models.Hairfie;

    app.get('/hairfie/:id', function (req, res) {
        Hairfie.findById(req.params.id, function (error, hairfie) {
            if (error) return res.status(500);
            if (!hairfie) return res.status(404);

            hairfie.author(function (error, author) {
                if (error) return res.status(500);

                hairfie.business(function (error, business) {
                    if (error) return res.status(500);

                    var title          = 'Hairfie posted by '+author.firstName+' '+author.lastName.substr(0, 1)+'.',
                        metas          = [],
                        canonicalUrl   = app.urlGenerator.hairfie(hairfie),
                        homeUrl        = app.urlGenerator.home(),
                        authorUrl      = author ? app.urlGenerator.user(author) : null,
                        businessUrl    = business ? app.urlGenerator.business(business) : null,
                        hairdresserUrl = null

                    metas.push({property: "fb:app_id", content: app.get('facebookAppId')});
                    metas.push({property: "og:type", content: app.get('facebookAppNamespace')+':hairfie'});
                    metas.push({property: "og:url", content: canonicalUrl});
                    metas.push({property: "og:title", content: title});
                    metas.push({property: "og:image", content: hairfie.pictureObject().url()});
                    if (hairfie.description) {
                        metas.push({property: "og:description", content: hairfie.description});
                    }
                    if (authorUrl) {
                        metas.push({property: "hairfie:author", content: authorUrl});
                    }
                    if (businessUrl) {
                        metas.push({property: "hairfie:business", content: businessUrl});
                    }
                    if (hairdresserUrl) {
                        metas.push({property: "hairfie:hairdresser", content: hairdresserUrl});
                    }

                    res.status(200);
                    res.send(loopback.template(__dirname+'/../views/landingPages/landingPage.html.ejs')({
                        title           : title,
                        metas           : metas,
                        canonicalUrl    : canonicalUrl,
                        homeUrl         : homeUrl
                    }));
                });
            });
        });
    });
};
