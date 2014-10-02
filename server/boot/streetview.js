'use strict';

module.exports = function (app) {
    app.get('/service/google/streetview/:latitude/:longitude', function (req, res) {
        var latitude  = req.params.latitude,
            longitude = req.params.longitude,
            width     = req.query.width || 600,
            height    = req.query.height || 400;

        res.redirect('http://maps.googleapis.com/maps/api/streetview?size='+width+'x'+height+'&location='+latitude+','+longitude);
    });
};
