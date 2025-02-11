/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */


/* istanbul ignore next */
if (typeof Promise === 'undefined') {
  // eslint-disable-next-line global-require
  require('es6-promise').polyfill();
}

// Reminder: this is intentionally a different instance of chai than
// @webex/test-helper-chai.
const path = require('path');

const chai = require('chai');
// Note: this is probably the only place we should use chai-as-promised; it's
// incompatible with IE 11, so can't go into browser tests. Once we move to
// wdio, it can be removed from here as well.
const chaiAsPromised = require('chai-as-promised');
const {defaults} = require('lodash');
const requireDir = require('require-dir');
const wd = require('wd');

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

requireDir(path.join(__dirname, 'wd'));

module.exports = {
  /**
   * Resolves with a wd browser instance
   * @param {Object} pkg package.json as JavaScript Object
   * @param {Object} browserDef wd-compatible browser definition
   * @returns {Promise}
   */
  createBrowser: function createBrowser(pkg, browserDef) {
    if (!pkg) {
      throw new Error('pkg is required');
    }

    if (!browserDef) {
      browserDef = {browserName: 'chrome'};
    }

    if (!browserDef) {
      throw new Error('No browser definition available');
    }

    browserDef = defaults(browserDef, {
      build: process.env.BUILD_NUMBER || `local-${process.env.USER}-${pkg.name}-${Date.now()}`,
      name: `${pkg.name} (automation)`,
      public: 'team',
      tunnelIdentifier: process.env.SC_TUNNEL_IDENTIFIER
    });

    const browser = process.env.SC_TUNNEL_IDENTIFIER ? wd.promiseChainRemote('ondemand.saucelabs.com', 80) : wd.promiseChainRemote();

    return browser.init(browserDef)
      .setImplicitWaitTimeout(10000)
      .setWindowSize(1600, 1200)
      .then(() => browser);
  },

  wd
};
