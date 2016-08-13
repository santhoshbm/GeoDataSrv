
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

var findSchoolDistrictByLocation = function(options) {
    return request({
        url: 'http://www.greatschools.org/geo/boundary/ajax/getSchoolByLocation.json?' +
        querystring.stringify(options)
    })
    .then(function(results) {
        return parseSchoolDistrictData(results);
    });
};

var parseSchoolDistrictData = function(results) {
    try {
        results = JSON.parse(results[1]);
    }
    catch (e) {
        return null;
    }

    if (results.schools && results.schools.length > 0) {
      return _.findWhere(results.schools, {
        schoolType : 'public',
      });
    } else {
        return null;
    }
};

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

                headers.push('Elem School Name');
                headers.push('Elem School Rating');
                headers.push('Middle School Name');
                headers.push('Middle School Rating');
                headers.push('High School Name');
                headers.push('High School Rating');

                callback(null, headers);
                return;
            }

            data = [];

            // Clean data
            row.forEach(function(item, index) {
                data[headers[index]] = item.replace('?', '').replace('??', '');
            });

            Promise
            .props({
              elem : findSchoolDistrictByLocation({ lat: data.Latitude, lon: data.Longitude, level: 'e'}),
              middle : findSchoolDistrictByLocation({ lat: data.Latitude, lon: data.Longitude, level: 'm'}),
              high : findSchoolDistrictByLocation({ lat: data.Latitude, lon: data.Longitude, level: 'h'}),
            })
            .then(function(results) {
              console.log(results);
              row.push((results.elem ? results.elem.name : ''));
              row.push(results.elem ? results.elem.rating : '');

              row.push(results.middle ? results.middle.name : '');
              row.push(results.middle ? results.middle.rating : '');

              row.push(results.high ? results.high.name : '');
              row.push(results.high ? results.high.rating : '');

              setTimeout(function() {
                  callback(null, row);
              }, 100);
            });
        });
    }, {parallel: 8})
    .on('close', function(count){
            console.log('Number of lines: '+count);
    })
    .on('error', function(error){
            console.log(error.message);
    });

console.log('Output File: ' + outputfile);