'use strict';

var jsdom = require('jsdom'),
    HTMLElement = require('jsdom/lib/jsdom/living').HTMLElement,
    Promise = require('bluebird'),
    _ = require('lodash');

// Configure.
var jsdomAsync = Promise.promisify(jsdom.env, { context: jsdom });

// Patch jsdom.
Object.defineProperties(HTMLElement.prototype, {
    clientWidth: {
        get: function() {
            return 1024;
        }
    },
    clientHeight: {
        get: function() {
            return 768;
        }
    }
});

/**
 * Closes a page.
 * @param {Object} Page opened by jsdom
 * @return {void}
 */
function cleanup(page) {
    return page.close();
}

/**
 * Load a page.
 * @param  {String}  src
 * @param  {Object}  options
 * @return {Promise}
 */
function fromSource(src, options) {
    var config = {
        features: {
            FetchExternalResources: ['script'],
            ProcessExternalResources: ['script']
        },
        virtualConsole: jsdom.createVirtualConsole().sendTo(console)
    };
    return jsdomAsync(src, config).delay(options.timeout).disposer(cleanup);
}

/**
 * Extract stylesheets' hrefs from dom
 * @param  {Object}  window     A jsdom window
 * @param  {Object}  options    Options, as passed to UnCSS
 * @return {Array}
 */
function getStylesheets(window, options) {
    if (Array.isArray(options.media) === false) {
        options.media = [options.media];
    }

    var media = _.union(['', 'all', 'screen'], options.media);
    var elements = window.document.querySelectorAll('link[rel="stylesheet"]');

    return Array.prototype.map.call(elements, function(link) {
        return {
            href: link.getAttribute('href'),
            media: link.getAttribute('media') || ''
        };
    }).filter(function (sheet) {
        return media.indexOf(sheet.media) !== -1;
    }).map(function (sheet) {
        return sheet.href;
    });
}

/**
 * Filter unused selectors.
 * @param  {Object}  window A jsdom window
 * @param  {Array}   sels   List of selectors to be filtered
 * @return {Array}
 */
function findAll(window, sels) {
    var document = window.document;

    // Unwrap noscript elements.
    var elements = document.getElementsByTagName('noscript');
    Array.prototype.forEach.call(elements, function(ns) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = ns.textContent;
        // Insert each child of the <noscript> as its sibling
        Array.prototype.forEach.call(wrapper.children, function (child) {
            ns.parentNode.insertBefore(child, ns);
        });
    });

    // Do the filtering.
    return sels.filter(function (selector) {
        try {
            return document.querySelector(selector);
        } catch (e) {
            return true;
        }
    });
}

module.exports = {
    fromSource: fromSource,
    findAll: findAll,
    getStylesheets: getStylesheets
};
