'use strict';

let request = require('request');
let async = require('async');
let Logger;

const BASE_URI = 'http://httpbin.org/get';

/**
 * The startup method is called once when the integration is first loaded by the server.  It can be used
 * to do any initializations required (e.g., setting up persistent database connections)
 *
 * @param logger logger object
 */
function startup(logger) {
    Logger = logger;
}

/**
 * @param entities array of entity objects
 * @param options user options object
 * @param cb callback function
 */
function doLookup(entities, options, cb) {
    let lookupResults = [];

    async.each(entities, function (entityObj, next) {
        _lookupEntity(entityObj, options, function (err, result) {
            if (err) {
                next(err);
            } else {
                lookupResults.push(result);
                next(null);
            }
        });
    }, function (err) {
        cb(err, lookupResults);
    });
}

function _lookupEntity(entityObj, options, cb) {
    let uri = BASE_URI;

    if (options.apiKey.length > 0) {
        uri += '?apiKey=' + options.apiKey;
    }

    request({
        uri: uri,
        method: 'GET',
        json: true
    }, function (err, response, body) {
        // check for a request error
        if (err) {
            cb({
                detail: 'Error Making HTTP Request',
                debug: err
            });
            return;
        }

        // If we get a 404 then cache a miss
        if(response.statusCode === 404){
            cb(null, {
                entity: entityObj,
                data: null  // setting data to null indicates to the server that this entity lookup was a "miss"
            });
            return;
        }

        if (response.statusCode !== 200) {
            cb({
                detail: 'Unexpected HTTP Status Code Received',
                debug: body
            });
            return;
        }

        // The lookup results returned is an array of lookup objects with the following format
        cb(null, {
            // Required: This is the entity object passed into the integration doLookup method
            entity: entityObj,
            // Required: An object containing everything you want passed to the template
            data: {
                // Required: These are the tags that are displayed in your template
                summary: [body.origin],
                // Data that you want to pass back to the notification window details block
                details: body
            }
        });
    });
}

module.exports = {
    doLookup: doLookup,
    startup: startup
};