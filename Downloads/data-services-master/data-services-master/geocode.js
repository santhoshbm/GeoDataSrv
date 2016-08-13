var inputfile = process.argv[2]; //value will be input file path
var outputfile = process.argv[3]; //value will be output file path

console.log('Input File: ' + inputfile);

var fs = require('fs');
var csv = require('csv');
var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var googlemaps = require('googlemaps');
var _ = require('underscore');
var querystring = require('querystring');
var waterfall = require('async-waterfall');

googlemaps.config({
    'google-client-id': 'gme-colonyamericanhomes1',
    'google-private-key': 'hG39I7TPZ08s3qyemv5lhO0dQ7o=',
});

var geocodeAddress = Promise.promisify(googlemaps.geocode);

var importedFile = csv();

var count = 0;
var headers;

importedFile
    .from.path(__dirname+'/'+inputfile, { delimiter: ',', escape: '"'})
    .to.stream(fs.createWriteStream(__dirname+'/'+outputfile))
    .to.options({
        newColumns : true
    })
    .transform(function(row, index, callback) {
        process.nextTick(function() {

            count += 1;

            console.log('Row ' + count);

            if ( ! headers) {
                headers = row;

                headers.push('Latitude');
                headers.push('Longitude');

                headers.push('Geolocation Type');

                callback(null, headers);
                return;
            }

            // Clean data
            row.forEach(function(item, index) {
                row[headers[index]] = item.replace('?', '').replace('??', '');
            });

            var addressParts = _.compact([
                  row['Address'],
                  row.City,
				  row.State,
                  row['Zip'],
            ]);

            var address = addressParts.join(' ');console.log(address);

            geocodeAddress(address)
				.delay(50)
                .then(function(response) {

                    var location = {
                        lat: '-',
                        lng: '-'
                    };

                    var locationType = '-';

                    if (response.results && response.results[0]) {
                        location = response.results[0].geometry.location;
                        locationType = response.results[0].geometry.location_type;
                    }

                    console.log(response.status);

                    if (response.status == 'OK') {
                        row.push(location.lat);
                        row.push(location.lng);
                        row.push(locationType);

                        setTimeout(function() {
                            callback(null, row);
                        }, 100);

                    } else {
                        row.push('-');
                        row.push('-');
                        row.push('-');

                        callback(null, row);
                    }

                })
                .catch(function(){
                    row.push('-');
                    row.push('-');
                    row.push('-');

                    callback(null, row);
                });
        });
    }, {parallel: 1})
    .on('close', function(count){
            console.log('Number of lines: '+count);
    })
    .on('error', function(error){
            console.log(error.message);
    });

console.log('Output File: ' + outputfile);