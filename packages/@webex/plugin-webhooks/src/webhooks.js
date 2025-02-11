/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

import {WebexPlugin, Page} from '@webex/webex-core';

/**
 * @typedef {Object} WebhookObject
 * @property {string} id - (server generated) Unique identifier for the webhook
 * @property {string} resource - The resource type for the webhook
 * @property {string} event - The event type for the webhook
 * @property {string} filter - The filter that defines the webhook scope
 * @property {string} targetUrl - The URL that receives POST requests for each event
 * @property {string} name - A user-friendly name for this webhook
 * @property {string} created - (server generated) The date and time that the webhook was created
 */

/**
 * Webhooks allow your app to be notified via HTTP when a specific event
 * occurs on Webex. For example, your app can register a webhook to be
 * notified when a new message is posted into a specific room.
 * @class
 */
const Webhooks = WebexPlugin.extend({
  /**
   * Posts a webhook.
   * @instance
   * @memberof Webhooks
   * @param {WebhookObject} webhook
   * @returns {Promise<Webhook>}
   * @example
   * webex.rooms.create({title: 'Create Webhook Example'})
   *   .then(function(room) {
   *     return webex.webhooks.create({
   *       resource: 'messages',
   *       event: 'created',
   *       filter: 'roomId=' + room.id,
   *       targetUrl: 'https://example.com/webhook',
   *       name: 'Test Webhook'
   *     });
   *   })
   *   .then(function(webhook) {
   *     var assert = require('assert');
   *     assert(webhook.id);
   *     assert(webhook.resource);
   *     assert(webhook.event);
   *     assert(webhook.filter);
   *     assert(webhook.targetUrl);
   *     assert(webhook.name);
   *     return 'success';
   *   });
   *   // => success
   */
  create(webhook) {
    return this.request({
      method: 'POST',
      service: 'hydra',
      resource: 'webhooks',
      body: webhook
    })
      .then((res) => res.body);
  },

  /**
   * Shows details for a webhook.
   * @instance
   * @memberof Webhooks
   * @param {Webhook|string} webhook
   * @returns {Promise<Webhook>}
   * @example
   * var webhook;
   * webex.rooms.create({title: 'Get Webhook Example'})
   *   .then(function(room) {
   *     return webex.webhooks.create({
   *       resource: 'messages',
   *       event: 'created',
   *       filter: 'roomId=' + room.id,
   *       targetUrl: 'https://example.com/webhook',
   *       name: 'Test Webhook'
   *     });
   *   })
   *   .then(function(w) {
   *     webhook = w;
   *     return webex.webhooks.get(webhook.id);
   *   })
   *   .then(function(webhook2) {
   *     var assert = require('assert');
   *     assert.deepEqual(webhook2, webhook);
   *     return 'success';
   *   });
   *   // => success
   */
  get(webhook) {
    const id = webhook.id || webhook;

    return this.request({
      service: 'hydra',
      resource: `webhooks/${id}`
    })
      .then((res) => res.body.items || res.body);
  },

  /**
   * Lists all webhooks.
   * @instance
   * @memberof Webhooks
   * @param {Object} options
   * @param {integer} options.max Limit the maximum number of webhooks in the response.
   * @returns {Promise<Array<Webhook>>}
   * @example
   * var room, webhook;
   * webex.rooms.create({title: 'List Webhooks Example'})
   *   .then(function(r) {
   *     room = r;
   *     return webex.webhooks.create({
   *       resource: 'messages',
   *       event: 'created',
   *       filter: 'roomId=' + room.id,
   *       targetUrl: 'https://example.com/webhook',
   *       name: 'Test Webhook'
   *     });
   *   })
   *   .then(function(w) {
   *     webhook = w;
   *     return webex.webhooks.list();
   *   })
   *   .then(function(webhooks) {
   *     var assert = require('assert');
   *     assert.equal(webhooks.items.filter(function(w) {
   *       return w.id === webhook.id;
   *     }).length, 1);
   *     return 'success';
   *   });
   *   // => success
   */
  list(options) {
    return this.request({
      service: 'hydra',
      resource: 'webhooks/',
      qs: options
    })
      .then((res) => new Page(res, this.webex));
  },

  /**
   * Delete a webhook.
   * @instance
   * @memberof Webhooks
   * @param {Webhook|string} webhook
   * @returns {Promise}
   * @example
   * var room, webhook;
   * webex.rooms.create({title: 'Remove Webhook Example'})
   *   .then(function(r) {
   *     room = r;
   *     return webex.webhooks.create({
   *       resource: 'messages',
   *       event: 'created',
   *       filter: 'roomId=' + room.id,
   *       targetUrl: 'https://example.com/webhook',
   *       name: 'Test Webhook'
   *     });
   *   })
   *   .then(function(w) {
   *     webhook = w;
   *     return webex.webhooks.remove(webhook);
   *   })
   *   .then(function() {
   *     return webex.webhooks.list();
   *   })
   *   .then(function(webhooks) {
   *     var assert = require('assert');
   *     assert.equal(webhooks.items.filter(function(w) {
   *       return w.id === webhook.id;
   *     }).length, 0);
   *     return 'success';
   *   });
   *   // => success
   */
  remove(webhook) {
    const id = webhook.id || webhook;

    return this.request({
      method: 'DELETE',
      service: 'hydra',
      resource: `webhooks/${id}`
    })
      .then((res) => {
        // Firefox has some issues with 204s and/or DELETE. This should move to
        // http-core
        if (res.statusCode === 204) {
          return undefined;
        }

        return res.body;
      });
  },

  /**
   * Update a webhook.
   * @instance
   * @memberof Webhooks
   * @param {Webhook} webhook
   * @returns {Promise<Webhook>}
   * @example
   * var webhook;
   * webex.rooms.create({title: 'Webhook Example'})
   *   .then(function(room) {
   *     return webex.webhooks.create({
   *       resource: 'messages',
   *       event: 'created',
   *       filter: 'roomId=' + room.id,
   *       targetUrl: 'https://example.com/webhook',
   *       name: 'Test Webhook'
   *     });
   *   })
   *   .then(function(w) {
   *     webhook = w;
   *     webhook.targetUrl = 'https://example.com/webhook/newtarget';
   *     return webex.webhooks.update(webhook);
   *   })
   *   .then(function() {
   *     return webex.webhooks.get(webhook);
   *   })
   *   .then(function(webhook) {
   *     var assert = require('assert');
   *     assert.equal(webhook.targetUrl, 'https://example.com/webhook/newtarget');
   *     return 'success';
   *   });
   *   // => success
   */
  update(webhook) {
    const {id} = webhook;

    return this.request({
      method: 'PUT',
      service: 'hydra',
      resource: `webhooks/${id}`,
      body: webhook
    })
      .then((res) => res.body);
  }
});

export default Webhooks;
