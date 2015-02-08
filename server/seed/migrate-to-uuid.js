'use strict';

var _ = require('lodash');
var Q = require('q');
var UUID = require('uuid');


var app = require('../..');

Q()
    .then(log('Tag categories'))
    .then(migrateTagCategories)
    .then(log('Tags'))
    .then(migrateTags)
    .then(log('Users'))
    .then(migrateUsers)
    .then(log('User identities'))
    .then(migrateUserIdentities)
    .then(log('Hairfie likes'))
    .then(migrateHairfieLikes)
    .then(log('Hairfie shares'))
    .then(migrateHairfieShares)
    .then(log('Hairfies'))
    .then(migrateHairfies)
    .then(log('Business claims'))
    .then(migrateBusinessClaims)
    .then(log('Businesses'))
    .then(migrateBusinesses)
    .then(log('Business members'))
    .then(migrateBusinessMembers)
    .then(log('Business member favorites'))
    .then(migrateBusinessMemberFavorites)
    .then(log('Business reviews'))
    .then(migrateBusinessReviews)
    .then(log('Business review requests'))
    .then(migrateBusinessReviewRequests)
    .then(log('Business services'))
    .then(migrateBusinessServices)
    .then(log('Bookings'))
    .then(migrateBookings)
    .then(log('Places'))
    .then(migratePlaces)
    .then(function () {
        process.exit(0);
    }, function (e) {
        console.log('Error:', e.stack);
        process.exit(1);
    });

function migratePlaces() {
    return find(app.models.Place).then(all(changeId.bind(null, app.models.Place)));
};

function migrateBookings() {
    return find(app.models.Booking).then(all(changeId.bind(null, app.models.Booking)));
}

function migrateBusinessMembers() {
    return find(app.models.BusinessMember).then(all(function (member) {
        return changeId(app.models.BusinessMember, member)
            .then(function (member) {
                return updateRelated(member, app.models.BusinessMemberFavorite, 'businessMemberId');
            });
    }));
}

function migrateBusinessMemberFavorites() {
    return find(app.models.BusinessMemberFavorite).then(all(changeId.bind(null, app.models.BusinessMemberFavorite)));
}

function migrateBusinessReviews() {
    return find(app.models.BusinessReview).then(all(function (review) {
        return changeId(app.models.BusinessReview, review)
            .then(function (review) {
                return updateRelated(review, app.models.BusinessReviewRequest, 'reviewId');
            });
    }));
}

function migrateBusinessReviewRequests() {
    return find(app.models.BusinessReviewRequest).then(all(changeId.bind(null, app.models.BusinessReviewRequest)));
}

function migrateBusinessServices() {
    return find(app.models.BusinessService).then(all(changeId.bind(null, app.models.BusinessService)));
}

function migrateBusinesses() {

    function migrateBusiness(business) {
        return changeId(app.models.Business, business)
            .then(function (business) {
                return Q.all([
                    updateRelated(business, app.models.BusinessClaim, 'businessId'),
                    updateRelated(business, app.models.BusinessService, 'businessId'),
                    updateRelated(business, app.models.BusinessMember, 'businessId'),
                    updateRelated(business, app.models.BusinessMemberClaim, 'businessId'),
                    updateRelated(business, app.models.BusinessReview, 'businessId'),
                    updateRelated(business, app.models.BusinessReviewRequest, 'businessId'),
                    updateRelated(business, app.models.Booking, 'businessId'),
                    updateRelated(business, app.models.Hairfie, 'businessId'),
                ]);
            });
    }

    var chunkSize = 100;

    return find(app.models.Business, {where: {oldId: {eq: null}}, limit: chunkSize})
        .then(function (businesses) {
            return all(migrateBusiness)(businesses)
                .then(function () {
                    if ((businesses.length || 0) < chunkSize) return Q();
                    console.log('Next businesses');
                    return migrateBusinesses();
                });
        });


    return find(app.models.Business)
}

function migrateUsers() {
    return find(app.models.user).then(all(function (user) {
        return changeId(app.models.user, user)
            .then(function (user) {
                return Q.all([
                    updateRelated(user, app.models.HairfieLike, 'userId'),
                    updateRelated(user, app.models.HairfieShare, 'authorId'),
                    updateRelated(user, app.models.Hairfie, 'authorId'),
                    updateRelated(user, app.models.BusinessMemberFavorite, 'userId'),
                    updateRelated(user, app.models.BusinessReview, 'authorId'),
                    updateRelated(user, app.models.BusinessMember, 'userId'),
                    updateRelated(user, app.models.BusinessMemberClaim, 'userId'),
                    updateRelated(user, app.models.BusinessClaim, 'authorId'),
                    updateRelated(user, app.models.userIdentity, 'userId'),
                    updateRelated(user, app.models.accessToken, 'userId')
                ]);
            });
    }));
}

function migrateHairfies() {
    return find(app.models.Hairfie)
        .then(all(function (hairfie) {
            return changeId(app.models.Hairfie, hairfie)
                .then(function (hairfie) {
                    return Q.all([
                        updateRelated(hairfie, app.models.BusinessReviewRequest, 'hairfieId'),
                        updateRelated(hairfie, app.models.HairfieShare, 'hairfieId'),
                        updateRelated(hairfie, app.models.HairfieLike, 'hairfieId'),
                    ]);
                });
        }));
}

function migrateBusinessClaims() {
    return find(app.models.BusinessClaim).then(all(changeId.bind(null, app.models.BusinessClaim)));
}

function migrateHairfieLikes() {
    return find(app.models.HairfieLike).then(all(changeId.bind(null, app.models.HairfieLike)));
}

function migrateHairfieShares() {
    return find(app.models.HairfieShare).then(all(changeId.bind(null, app.models.HairfieShare)));
}

function migrateUserIdentities() {
    return find(app.models.userIdentity).then(all(changeId.bind(null, app.models.userIdentity)));
}

function migrateTagCategories() {
    return find(app.models.TagCategory)
        .then(all(function (category) {
            return changeId(app.models.TagCategory, category)
                .then(function (category) {
                    return updateRelated(category, app.models.Tag, 'categoryId');
                });
        }));
}

function migrateTags() {
    return find(app.models.Tag).then(all(function (tag) {
        return changeId(app.models.Tag, tag)
            .then(function (tag) {
                return find(app.models.Hairfie, {where: {tags: tag.oldId.toString()}});
            })
            .then(all(function (hairfie) {
                return update(
                    app.models.Hairfie,
                    {$and: [{tags: tag.oldId.toString()}, {tags: {$ne: tag.id}}]},
                    {$push: {tags: tag.id}}
                )
                    .then(function () {
                        return update(
                            app.models.Hairfie,
                            {tags: tag.oldId.toString()},
                            {$pull: {tags: tag.oldId.toString()}}
                        );
                    });
            }));
    }))
}

function changeId(Model, model) {
    if (model.oldId) return Q.resolve(model); // already defined

    model.oldId = model.id;
    model.id = UUID.v4();

    return save(model)
        .then(function () {
            return Q.ninvoke(Model, 'destroyById', model.oldId);
        })
        .then(function () {
            return model;
        });
}

function all(fn) {
    return function (items) {
        return Q.all(items.map(fn));
    };
}

function find(Model, filter) {
    return Q.ninvoke(Model, 'find', filter);
}

function log(message) {
    return function () {
        console.log(message);
        return Q.resolve();
    };
}

function updateRelated(model, Related, key) {
    var where = {};
    where[key] = objectId(Related, model.oldId);

    var $set = {};
    $set[key] = model.id;

    return update(Related, where, {$set: $set});
}

function save(model) {
    return Q.ninvoke(model, 'save', {validate: false});
}

function collection(Model) {
    return Model.dataSource.connector.collection(Model.definition.name);
}

function objectId(Model, val) {
    return new Model.dataSource.ObjectID(val);
}

function update(Model, where, update) {
    return Q.ninvoke(collection(Model), 'update', where, update, {multi: true});
}
