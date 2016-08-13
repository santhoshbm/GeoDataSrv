'use strict';

var Promise        = require('bluebird');
var cheerio        = require('cheerio');
var qs             = require('querystring');
var request        = require('request');
var numeral        = require('numeral');

function scrubInput(input) {
  if ( ! input) {
    return '';
  }

  var value = input.replace(/[^\d.]+/g, '');

  if (input.indexOf('M') !== -1 ) {
   value = value * 1000000;
  }

  if (input.indexOf('K') !== -1) {
   value = value * 1000;
  }

  return value;
}

function makeRequest(options) {

  options.headers = {
    'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.90 Safari/537.36'
  };

  return new Promise(function(resolve, reject) {
    request.get(options, function(error, response, body) {
      if (error) {
        return reject(error);
      }

      return resolve(body);
    });
  });
}

function calculateScore(high, low) {

  if ( ! high || ! low) {
    return '-';
  }

  var score = ((high - low) / (high));

  if (score > 0.25) {
    return 'C';
  } else if (score > 0.10) {
    return 'B';
  } else {
    return 'A';
  }
}

function parsePageContents(contents) {
  var $ = cheerio.load(contents);

  var propertyData = {};

  $('.zest-content').each(function() {
    var title = $('.zest-title', this).first().contents().filter(function() {
        return this.type === 'text';
    }).text();

    if (title.indexOf('Rent') === 0) {
      propertyData.rentLow = scrubInput($('.zest-range-bar-low', this).text());
      propertyData.rentHigh = scrubInput($('.zest-range-bar-high', this).text());
      propertyData.rent = scrubInput($('.zest-value', this).text());
      propertyData.rentScore = calculateScore(propertyData.rentHigh, propertyData.rentLow);
    } else if (title.indexOf('Zestimate forecast') === 0) {
      propertyData.forecast = scrubInput($('.zest-value', this).text());
    } else if(title.indexOf('Zestimate') === 0) {
      propertyData.valueLow = scrubInput($('.zest-range-bar-low', this).text());
      propertyData.valueHigh = scrubInput($('.zest-range-bar-high', this).text());
      propertyData.value = scrubInput($('.zest-value', this).text());
      propertyData.valueScore = calculateScore(propertyData.valueHigh, propertyData.valueLow);
    } else {
      console.log('unknown');
    }
  });

  return propertyData;

}

function pullApiData(url) {

  var options = {
    json : true,
    url : url + '?' + qs.stringify({
      mobile : true,
      isJson : true,
      dl : true,
    }),
  };

  return makeRequest(options)
    .then(function(body) {

      var data = parsePageContents(body.details);

      return data;
    });
}

function findPropertyLink(address) {

  var url = 'https://www.zillow.com/widgets/zestimate/ZestimateSmallWidget.htm';

  url = url + '?' + qs.stringify({
    did : 'zillow-shv-small-iframe-widget',
    type : 'iframe',
    address : address,
  });

  var options = {
    url : url,
    headers : {
      'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.90 Safari/537.36',
    },
  };

  return makeRequest(options)
    .then(function(body) {
      var $ = cheerio.load(body);

      var seeMoreLink = $('#see-more-details-link').attr('href');

      if ($('#see-more-details-link').length) {
        return seeMoreLink;
      }

      var hasOptions = $('.second-error');

      if (! hasOptions.length) {
        throw new Error('No results');
      }

      var zpid = $('.more-link:first-child').attr('zpid');

      if (! zpid) {
        throw new Error('Error selecting property');
      }

      return 'https://www.zillow.com/homedetails/lookup/' + zpid + '_zpid/';
    });
}

function getZillowData(address) {

  return findPropertyLink(address)
    .then(function(link) {
      var zpid = link.substring(0, link.length - 6);
      zpid = zpid.substring(zpid.lastIndexOf('/') + 1);

      return pullApiData('http://www.zillow.com/homedetails/' + zpid + '_zpid/');
    });
}

module.exports = {
  getData : getZillowData
};
