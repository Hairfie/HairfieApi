'use strict';

var md5 = require('MD5');
var Promise = require('../../common/utils/Promise');
var Q = require('q');
var _ = require('lodash');
var Uuid = require('uuid');
var Hooks = require('./hooks');


module.exports = function(User) {
    Hooks.generateId(User);
    Hooks.updateTimestamps(User);
    Hooks.hasImages(User, {
        picture: {
            container: 'users'
        }
    });

    User.observe('save', function (ctx, next) {
        if (ctx.instance && !ctx.instance.locale) ctx.instance.locale = User.app.get('locales')[0];
        next();
    });

    User.GENDER_MALE = 'MALE';
    User.GENDER_FEMALE = 'FEMALE';

    User.prototype.equals = function (user) {
        return this.id && user && this.id.toString() == user.id.toString();
    };

    User.prototype.toRemoteObject = function (context) {
        var user = this.toRemoteShortObject(context);

        if (this.accessToken) { // BC mobile
            user.accessToken = this.accessToken.toRemoteShortObject(context);
        }

        if (!this.equals(context.getUser())) {
            return user;
        }

        user.phoneNumber = this.phoneNumber;
        user.email = this.email;
        user.locale = this.locale;
        user.newsletter = this.newsletter;

        if (context.isApiVersion('<1')) { // BC mobile
            user.language = this.locale;
        }

        return user;
    };

    User.prototype.toRemoteShortObject = function (context) {
        var Hairfie             = User.app.models.Hairfie,
            BusinessReview      = User.app.models.BusinessReview,
            picture             = this.pictures && this.picture.toRemoteShortObject(context),
            numHairfies         = Promise.ninvoke(Hairfie, 'count', {authorId: this.id}),
            numBusinessReviews  = Promise.ninvoke(BusinessReview, 'count', {authorId: this.id});

        if (!picture && this.facebookId) {
            // fallback to facebook picture
            picture = User.app.models.Image.instanceFromFacebookId(this.facebookId).toRemoteShortObject(context);
        }

        return {
            id                  : this.id,
            href                : User.app.urlGenerator.api('users/'+this.id),
            gender              : this.gender,
            firstName           : this.firstName,
            lastName            : this.lastName,
            picture             : picture,
            numHairfies         : numHairfies,
            numBusinessReviews  : numBusinessReviews
        };
    };

    User.prototype.isManagerOfBusiness = function (businessId) {
        var deferred = Q.defer();
        var BusinessMember = User.app.models.BusinessMember;
        var where = {};
        where.userId = this.id;
        where.businessId = businessId;
        where.active = true;

        if(this.admin) {
            deferred.resolve(true);
        } else {
            BusinessMember.findOne({where: where}, function (error, bm) {
                if (error) deferred.reject(error);
                deferred.resolve(!!bm);
            });
        }

        return deferred.promise;
    };

    User.prototype.getPermissions = function () {
        var perms = [];
        if (this.admin) perms.push('IMPERSONATE_TOKEN');

        return perms;
    };

    User.validatesInclusionOf('gender', {in: [User.GENDER_MALE, User.GENDER_FEMALE]});


    User.afterCreate = function (next) {
        var user  = this,
            Email = User.app.models.email;

        // emails should not be blocking
        Email.welcomeUser(user).fail(console.log);
        Email.notifyAll('user registered', {
            'ID'        : user.id,
            'Gender'    : user.gender,
            'First name': user.firstName,
            'Last name' : user.lastName,
            'Email'     : user.email,
            'Phone'     : user.phoneNumber,
            'Facebook?' : user.facebookId ? 'YES' : 'NO'
        }).fail(console.log);

        next();
    }

    User.afterRemote('create', function injectAccessToken(ctx, user, next) { // BC mobile
        user.createAccessToken({/* no options */}, function (error, token) {
            if (error) return next(error);
            ctx.result.accessToken = token;
            next();
        });
    });

    User.afterIdentityCreate = function (identity, next) {
        if (identity.profile.provider != 'facebook') return next();
        identity.user(function (error, user) {
            if (error) return next(error);
            if (!user) return next('Identity\'s user not found');

            user.facebookId = identity.externalId;
            user.save(next);
        });
    };

    User.profileToUser = function(provider, profile) {
        // Let's create a user for that
        var email = profile.emails && profile.emails[0] && profile.emails[0].value;
        if (!email) {
            // Fake an e-mail
            email = (profile.username || profile.id) + '@hairfie.'
            + (profile.provider || provider) + '.com';
          }
        var username = provider + '.' + (profile.username || profile.id);
        var password = Uuid.v4();
        var gender = profile.gender;

        var userObj = {
            username: username,
            password: password,
            email: email,
            firstName: profile.name && profile.name.givenName,
            lastName: profile.name && profile.name.familyName,
            gender: gender ? gender.toUpperCase() : null,
            locale: (profile.locale || '').substr(0, 2)
        };

        return userObj;
    }

    User.on('resetPasswordRequest', function (info) {
        var url = User.app.urlGenerator.resetPassword(info.user, info.accessToken);
        User.app.models.email.resetUserPassword(info.user, url);
    });

    User.prototype.getFullEmail = function () {
        return this.getFullName()+ ' <'+this.email+'>';
    };

    User.prototype.getFullName = function () {
        return this.firstName+' '+this.lastName;
    };

    User.getHairfieLikes = function (userId, until, limit, skip, callback) {
        var limit       = Math.min(limit || 10, 50),
            skip        = skip || 0,
            HairfieLike = User.app.models.HairfieLike

        User.findById(userId, function (error, user) {
            if (error) return callback(error);
            if (!user) return callback({statusCode: 404});

            var filter = {where: {userId: user.id}, order: 'createdAt DESC', limit: limit, skip: skip};
            if (until) filter.where.createdAt = {lte: until};

            HairfieLike.find(filter, callback);
        });
    };

    User.likedHairfie = function (userId, hairfieId, callback) {
        var HairfieLike = User.app.models.HairfieLike,
            likeData    = {userId: userId, hairfieId: hairfieId};

        HairfieLike.findOne({where: likeData}, function (error, like) {
            if (error) return callback(error);
            if (!like) return callback({statusCode: 404});
            callback();
        });
    };

    User.likeHairfie = function (userId, hairfieId, callback) {
        var HairfieLike = User.app.models.HairfieLike,
            likeData    = {userId: userId, hairfieId: hairfieId};

        HairfieLike.findOrCreate({where: likeData}, likeData, function (error) {
            if (error) return callback(error);
            callback(null, null);
        });
    };

    User.unlikeHairfie = function (userId, hairfieId, callback) {
        var HairfieLike = User.app.models.HairfieLike;

        HairfieLike.remove({userId: userId, hairfieId: hairfieId}, function (error) {
            if (error) return callback(error);
            callback(null, null);
        });
    };

    User.isFavoriteBusinessMember = function (userId, businessMemberId, callback) {
        var BusinessMemberFavorite = User.app.models.BusinessMemberFavorite,
            favoriteData           = {userId: userId, businessMemberId: businessMemberId};

        BusinessMemberFavorite.findOne({where: favoriteData}, function (error, favorite) {
            if (error) return callback(error);
            if (!favorite) return callback({statusCode: 404});
            callback();
        });
    };
    User.getFavoriteBusinessMembers = function (userId, until, limit, skip, callback) {
        var limit                  = Math.min(limit || 10, 50),
            skip                   = skip || 0,
            BusinessMemberFavorite = User.app.models.BusinessMemberFavorite;

        User.findById(userId, function (error, user) {
            if (error) return callback(error);
            if (!user) return callback({statusCode: 404});

            var filter = {where: {userId: user.id}, order: 'createdAt DESC', limit: limit, skip: skip};
            if (until) filter.where.createdAt = {lte: until};

            BusinessMemberFavorite.find(filter, callback);
        });
    };
    User.favoriteBusinessMember = function (userId, businessMemberId, callback) {
        var BusinessMemberFavorite = User.app.models.BusinessMemberFavorite,
            favoriteData           = {userId: userId, businessMemberId: businessMemberId};

        BusinessMemberFavorite.findOrCreate({where: favoriteData}, favoriteData, function (error) {
            if (error) return callback(error);
            callback(null, null);
        });
    };
    User.unfavoriteBusinessMember = function (userId, businessMemberId, callback) {
        var BusinessMemberFavorite = User.app.models.BusinessMemberFavorite,
            favoriteData           = {userId: userId, businessMemberId: businessMemberId};

        BusinessMemberFavorite.remove(favoriteData, function (error) {
            if (error) return callback(error);
            callback(null, null);
        });
    };

    User.managedBusinesses = function (userId, callback) {
        var Business       = User.app.models.Business,
            BusinessMember = User.app.models.BusinessMember;

        BusinessMember.find({where: {userId: userId, active: true}}, function (error, bms) {
            if (error) return callback(error);

            Business.findByIds(_.pluck(bms, 'businessId'), callback);
        });
    };

    User.query = function (q, cb) {
        var collection = User.dataSource.connector.collection(User.definition.name);

        var pipe = [];
        pipe.push({$match: {$text: {$search: q}}});
        pipe.push({$project: {_id: true}});
        pipe.push({$sort: {score: {$meta: "textScore"}}});

        collection.aggregate(pipe, function (error, results) {
            if (error) return cb(error);

            console.log('results', results);

            var ids = results.map(function (r) { return r._id});
            User.findByIds(ids, cb);
        });
    };

    function loggedInAsSubjectUser(ctx, _, next) {
        var user = ctx.req.user;
        if (!user) return next({statusCode: 401});
        if (user.id.toString() != ctx.req.params.id.toString()) return next({statusCode: 403});
        next();
    }

    User.beforeRemote('**', function renameLanguageToLocale(ctx, user, next) { // BC mobile
        if (ctx.req.body && ctx.req.body.language) ctx.req.body.locale = ctx.req.body.language;
        next();
    });

    User.beforeRemote('findById', loggedInAsSubjectUser);
    User.beforeRemote('*.updateAttributes', loggedInAsSubjectUser);

    User.beforeRemote([
            'likedHairfie',
            'likedHairfies',
            'likeHairfie',
            'unlikeHairfie',
            'isBusinessMemberFavorite',
            'getFavoriteBusinessMembers',
            'favoriteBusinessMember',
            'unfavoriteBusinessMember',
    ], function (ctx, _, next) {
        var user = ctx.req.user;
        if (!user) return next({statusCode: 401});
        if (!user.id.toString() != ctx.req.params.userId.toString()) return next({statusCode: 403});
        next();
    });

    User.afterRemote('create', function (ctx, _, next) {
        ctx.res.status(201);
        next();
    });

    User.observe('access', function(ctx, next){
        if (ctx.query.where !== undefined && ctx.query.where.email !== undefined ) {
            ctx.query.where.email = ctx.query.where.email.toLowerCase();
        }
        next();
    });

    User.observe('before save', function(ctx, next){
        if (ctx.instance !== undefined && ctx.instance.email !== undefined){
            ctx.instance.email = ctx.instance.email.toLowerCase();
        } else if (ctx.data.email !== undefined){
            ctx.data.email = ctx.data.email.toLowerCase();
        }
        next();
    });

    User.sharedClass.find('find', true).shared = false;

    User.remoteMethod('query', {
        description: 'Returns users list',
        accepts: [
            {arg: 'q', type: 'string', required: true, description: 'Fulltext search query'}
        ],
        returns: {arg: 'users', root: true},
        http: { path: '/', verb: 'GET' }
    });
    User.remoteMethod('likedHairfie', {
        description: 'Returns a hairfie liked by the user (or 404 if not liked)',
        accepts: [
            {arg: 'userId', type: 'string', required: true, description: 'Identifier of the user'},
            {arg: 'hairfieId', type: 'string', required: true, description: 'Identifier of the hairfie'}
        ],
        http: { path: '/:userId/liked-hairfies/:hairfieId', verb: 'HEAD' }
    });
    User.remoteMethod('getHairfieLikes', {
        description: 'List of hairfies liked by the user',
        accepts: [
            {arg: 'userId', type: 'string', required: true, description: 'Identifier of the user'},
            {arg: 'until', type: 'string', description: 'Ignore hairfies liked after this date'},
            {arg: 'limit', type: 'number', description: 'Maximum number of hairfies to return'},
            {arg: 'skip', type: 'number', description: 'Number of hairfies to skip'}
        ],
        returns: {arg: 'hairfies', root: true},
        http: { path: '/:userId/liked-hairfies', verb: 'GET' }
    });
    User.remoteMethod('likeHairfie', {
        description: 'Like a hairfie',
        accepts: [
            {arg: 'userId', type: 'string', required: true, description: 'Identifier of the user'},
            {arg: 'hairfieId', type: 'string', required: true, description: 'Identifier of the hairfie'},
        ],
        http: { path: '/:userId/liked-hairfies/:hairfieId', verb: 'PUT' }
    });
    User.remoteMethod('unlikeHairfie', {
        description: 'Unlike a hairfie',
        accepts: [
            {arg: 'userId', type: 'string', required: true, description: 'Identifier of the user'},
            {arg: 'hairfieId', type: 'string', required: true, description: 'Identifier of the hairfie'},
        ],
        http: { path: '/:userId/liked-hairfies/:hairfieId', verb: 'DELETE' }
    });
    User.remoteMethod('isFavoriteBusinessMember', {
        description: 'Indicates whether the specified business member is one of the user\'s favorites',
        accepts: [
            {arg: 'userId', type: 'string', required: true, description: 'Identifier of the user'},
            {arg: 'businessMemberId', type: 'string', required: true, description: 'Identifier of the business member'}
        ],
        http: { path: '/:userId/favorite-business-members/:businessMemberId', verb: 'HEAD' }
    });
    User.remoteMethod('getFavoriteBusinessMembers', {
        description: 'List the favorite business members of the user',
        accepts: [
            {arg: 'userId', type: 'string', required: true, description: 'Identifier of the user'},
            {arg: 'until', type: 'string', description: 'Ignore hairdressers favorited after this date'},
            {arg: 'limit', type: 'number', description: 'Maximum number of hairdressers to return'},
            {arg: 'skip', type: 'number', description: 'Number of hairdressers to skip'}
        ],
        returns: {arg: 'business-members', root: true},
        http: { path: '/:userId/favorite-business-members', verb: 'GET' }
    });
    User.remoteMethod('favoriteBusinessMember', {
        description: 'Adds a business member to the user\'s favorites',
        accepts: [
            {arg: 'userId', type: 'string', required: true, description: 'Identifier of the user'},
            {arg: 'businessMemberId', type: 'string', required: true, description: 'Identifier of the business member'},
        ],
        http: { path: '/:userId/favorite-business-members/:businessMemberId', verb: 'PUT' }
    });
    User.remoteMethod('unfavoriteBusinessMember', {
        description: 'Removes a business member from the user\'s favorites',
        accepts: [
            {arg: 'userId', type: 'string', required: true, description: 'Identifier of the user'},
            {arg: 'businessMemberId', type: 'string', required: true, description: 'Identifier of the business member'},
        ],
        http: { path: '/:userId/favorite-business-members/:businessMemberId', verb: 'DELETE' }
    });
    User.remoteMethod('managedBusinesses', {
        description: 'Gets the businesses managed by the user',
        accepts: [
            {arg: 'userId', type: 'string', required: true, description: 'Identifier of the user'}
        ],
        returns: {arg: 'businesses', root: true},
        http: { path: '/:userId/managed-businesses', verb: 'GET' }
    });
}
