'use strict';

var Promise = require('../../common/utils/Promise');
var _ = require('lodash');
var Hooks = require('./hooks');

module.exports = function (HairfieLike) {
    Hooks.generateId(HairfieLike);
    Hooks.updateTimestamps(HairfieLike);

    // update the related Hairfie
    function saveHairfie(ctx, next) {
        var Hairfie = HairfieLike.app.models.Hairfie;
        var hairfieIds = [];

        var updateHairfies = function (hairfieIds) {
            next(); // run updates in background

            _.map(hairfieIds, function (id) {
                Hairfie.findById(id, function (error, hairfie) {
                    if (!hairfie) return;
                    hairfie.save(_.noop);
                });
            });
        };

        if (ctx.instance) {
            updateHairfies([ctx.instance.hairfieId]);
        } else {
            HairfieLike.find({where: ctx.where, limit: 100}, function (error, likes) {
                updateHairfies(_.pluck(likes, 'hairfieId'));
            });
        }
    }
    HairfieLike.observe('before save', saveHairfie);
    HairfieLike.observe('before delete', saveHairfie);

    HairfieLike.prototype.toRemoteObject = function (context) {
        return {
            hairfie : Promise.ninvoke(this.hairfie).then(function (hairfie) {
                console.log("hairfie", hairfie);
                return hairfie ? hairfie.toRemoteObject(context) : null;
            }),
            createdAt: this.createdAt
        };
    };

    HairfieLike.validateAsync('userId', function (onError, onDone) {
        this.user(function (error, user) {
            if (error || !user) onError();
            onDone();
        });
    }, {message: 'exists'});

    HairfieLike.validateAsync('hairfieId', function (onError, onDone) {
        this.hairfie(function (error, hairfie) {
            if (error || !hairfie) onError();
            onDone();
        });
    }, {message: 'exists'});
};
