var inputfile = process.argv[2]; //value will be input file path
var outputfile = process.argv[3]; //value will be output file path

console.log('Input File: ' + inputfile);

var fs = require('fs');
var csv = require('csv');
var Promise = require('bluebird');
var _ = require('underscore');

var crimeData = require('./crime-data');

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

              headers.push('Crime - Overall');
              headers.push('Crime - Personal');
              headers.push('Crime - Property');

              callback(null, headers);
              return;
          }

          data = [];

          // Clean data
          row.forEach(function(item, index) {
              data[headers[index]] = item.replace('?', '').replace('??', '');
          });

		console.log('Looking for ' + data['Zip'].replace(" ", ""));

console.log(data);

          var crime = _.findWhere(crimeData, {
            mid : data['Zip'].replace(" ", ""),
          });

console.log(crime);

          row.push(crime ? crime.overall : '-');
          row.push(crime ? crime.personsafe : '-');
          row.push(crime ? crime.propsafe : '-');

          callback(null, row);
        });
    }, {parallel: 8})
    .on('close', function(count){
            console.log('Number of lines: '+count);
    })
    .on('error', function(error){
            console.log(error.message);
    });

console.log('Output File: ' + outputfile);