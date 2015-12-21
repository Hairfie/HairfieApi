print("name,street,city,phone");
db.getCollection('businesses').find({"address.city":"Paris", "timetable.MON":{ $exists: true, $not: {$size: 0} }}).forEach(function(business){
  print(business.name + ',' + business.address.street + ',' + business.address.city + ',' + business.phoneNumber);
});