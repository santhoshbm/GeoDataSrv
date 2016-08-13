var fs = require('fs');
var csv = require('csv');
var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var _ = require('underscore');
var qs = require('querystring');
var waterfall = require('async-waterfall');
var cheerio = require('cheerio');
var numeral = require('numeral');

var zillow = require('./lib/zillow');

var request = require('request');

var importedFile = csv();

var count = 0;
var headers;

importedFile
    .from.path(__dirname+'/Palace School_Crime_Zillow.csv', { delimiter: ',', escape: '"'})
    .to.stream(fs.createWriteStream(__dirname+'/Palace School_Crime_Zillow-zillow.csv'))
    .to.options({
        newColumns : true
    })
    .transform(function(row, index, callback) {
        process.nextTick(function() {

            var data = [];

            count += 1;

            console.log('Row ' + count);

            if ( ! headers) {
                headers = row;

                headers.push('Zillow - Value');
                headers.push('Zillow - Value Low');
                headers.push('Zillow - Value High');
                headers.push('Zillow - Value Reliability');

                headers.push('Zillow - Rent');
                headers.push('Zillow - Rent Low');
                headers.push('Zillow - Rent High');
                headers.push('Zillow - Rent Reliability');

                callback(null, headers);

                return;
            }

            // Clean data
            row.forEach(function(item, index) {
                data[headers[index]] = item;
            });

            var addressParts = _.compact([
              data['Address'],
              data['City'],
              data['State'],
			 data['Zip'],
            ]);

            var address = addressParts.join(' ');

			console.log(address);

            zillow.getData(address)
                .then(function(results) {
					console.log(results);
                    row.push(results.value);
                    row.push(results.valueLow);
                    row.push(results.valueHigh);
                    row.push(results.valueScore);

                    row.push(results.rent);
                    row.push(results.rentLow);
                    row.push(results.rentHigh);
                    row.push(results.rentScore);
                })
                .catch(function(error) {
                    row.push('-');
                    row.push('-');
                    row.push('-');
                    row.push('-');

                    row.push('-');
                    row.push('-');
                    row.push('-');
                    row.push('-');
                    console.log(address, error);
                })
                .finally(function() {
                    callback(null, row);
                });

        });
    }, {parallel: 10})
    .on('close', function(count){
            console.log('Number of lines: '+count);
    })
    .on('error', function(error){
            console.log(error.message);
    });
