'use strict';

var loopback = require('loopback');

module.exports = function (app) {
    var Hairfie  = app.models.Hairfie,
        Business = app.models.Business;

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

    app.get('/business/:id/:slug', function (req, res) {
        Business.findById(req.params.id, function (error, business) {
            if (error) return res.status(500);
            if (!business) return res.status(404);

            var title          = business.name,
                metas          = [],
                canonicalUrl   = app.urlGenerator.business(business),
                homeUrl        = app.urlGenerator.home();

            metas.push({property: "fb:app_id", content: app.get('facebookAppId')});
            metas.push({property: "og:type", content: app.get('facebookAppNamespace')+':business'});
            metas.push({property: "og:url", content: canonicalUrl});
            metas.push({property: "og:title", content: title});

            if (business.address) {
                metas.push({property: "business:contact_data:street_address", content: business.address.street});
                metas.push({property: "business:contact_data:locality", content: business.address.city});
                metas.push({property: "business:contact_data:postal_code", content: business.address.zipCode});
                metas.push({property: "business:contact_data:country_name", content: business.address.country});
            }

            if (business.timetable) {
                for (var day in business.timetable) {
                    var timeWindows = business.timetable[day];
                    for (var i = 0; i < Math.min(timeWindows.length, 2); i++) {
                        var timeWindow = timeWindows[i];
                        metas.push({property: "business:hours:"+day.toLowerCase()+"_"+(i+1)+"_open", content: timeWindow.startTime});
                        metas.push({property: "business:hours:"+day.toLowerCase()+"_"+(i+1)+"_close", content: timeWindow.endTime});
                    }
                }
            }

            if (business.gps) {
                metas.push({property: "place:location:latitude", content: business.gps.lat});
                metas.push({property: "place:location:longitude", content: business.gps.lng});
            }

            business.pictureObjects().map(function (picture) {
                metas.push({property: "og:image", content: picture.url()});
            });

            if (business.description) {
                metas.push({property: "og:description", business: hairfie.description});
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
};
