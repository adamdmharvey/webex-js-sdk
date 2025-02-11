/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

import {assert} from '@webex/test-helper-chai';
import Avatar from '@webex/internal-plugin-avatar';
import MockWebex from '@webex/test-helper-mock-webex';

/* eslint camelcase: 0 */
describe('plugin-avatar', () => {
  const item1_40 = {
    uuid: '88888888-4444-4444-4444-aaaaaaaaaaa0', size: 40, url: 'http://www-40.example.com', cacheControl: 300
  };
  const item1_50 = {
    uuid: '88888888-4444-4444-4444-aaaaaaaaaaa0', size: 50, url: 'http://www-50.example.com', cacheControl: 300
  };
  const item1_80 = {
    uuid: '88888888-4444-4444-4444-aaaaaaaaaaa0', size: 80, url: 'http://www-80.example.com', cacheControl: 300
  };
  const item1_110 = {
    uuid: '88888888-4444-4444-4444-aaaaaaaaaaa0', size: 110, url: 'http://www-110.example.com', cacheControl: 300
  };
  const item1_192 = {
    uuid: '88888888-4444-4444-4444-aaaaaaaaaaa0', size: 192, url: 'http://www-192.example.com', cacheControl: 300
  };
  const item1_640 = {
    uuid: '88888888-4444-4444-4444-aaaaaaaaaaa0', size: 640, url: 'http://www-640.example.com', cacheControl: 300
  };
  const item1_1600 = {
    uuid: '88888888-4444-4444-4444-aaaaaaaaaaa0', size: 1600, url: 'http://www-1600.example.com', cacheControl: 300
  };
  const item2_80 = {
    uuid: '88888888-4444-4444-4444-aaaaaaaaaaa1', size: 80, url: 'http://www2.example.com', cacheControl: 300
  };
  const item3_80 = {
    uuid: '88888888-4444-4444-4444-aaaaaaaaaaa2', size: 80, url: 'http://www3.example.com', cacheControl: 300
  };

  describe('AvatarUrlStore', () => {
    let store;
    let webex;

    beforeEach(() => {
      webex = new MockWebex({
        children: {
          avatar: Avatar
        }
      });
      store = webex.internal.avatar.store;
    });

    it('add item failures', () => Promise.all([
      assert.isRejected(store.add(), '`item` is required'),
      assert.isRejected(store.add({}), '`item.uuid` is required'),
      assert.isRejected(store.add({uuid: 'id1'}), '`item.size` is required'),
      assert.isRejected(store.add({uuid: 'id1', size: 80}), '`item.uuid` does not appear to be a uuid'),
      assert.isRejected(store.add({uuid: '88888888-4444-4444-4444-aaaaaaaaaaa0', size: 80}), '`item.url` is required'),
      assert.isRejected(store.add({uuid: '88888888-4444-4444-4444-aaaaaaaaaaa0', size: 80, url: 'http://www.example.com'}), '`item.cacheControl` is required'),
      assert.isRejected(store.add({
        uuid: '88888888-4444-4444-4444-aaaaaaaaaaa0', size: 80, url: 'http://www.example.com', cacheControl: 0
      }), '`item.cacheControl` is required')
    ]));

    it('get item failures', () => Promise.all([
      assert.isRejected(store.get(), '`item` is required'),
      assert.isRejected(store.get({}), '`item.uuid` is required'),
      assert.isRejected(store.get({uuid: 'id1'}), '`item.size` is required'),
      assert.isRejected(store.get({uuid: 'id1', size: 80}), '`item.uuid` does not appear to be a uuid'),
      assert.isRejected(store.get({uuid: '88888888-4444-4444-4444-aaaaaaaaaaa0', size: 80}), 'No URL found by specified id')
    ]));

    it('set / get / remove', () => Promise.all([
      store.add(item1_80),
      store.add(item2_80),
      store.add(item3_80),
      store.get(item1_80)
        .then((result) => assert.deepEqual(result, item1_80)),
      store.get(item2_80)
        .then((result) => assert.deepEqual(result, item2_80)),
      store.get(item3_80)
        .then((result) => assert.deepEqual(result, item3_80)),
      store.remove(item2_80),
      store.remove(item3_80),
      assert.isRejected(store.get(item3_80)),
      assert.isRejected(store.get(item2_80)),
      store.add(item1_40),
      store.add(item1_50),
      store.add(item1_110),
      store.add(item1_192),
      store.add(item1_640),
      store.add(item1_1600),
      store.remove({uuid: '88888888-4444-4444-4444-aaaaaaaaaaa0'}),
      assert.isRejected(store.get(item1_40)),
      assert.isRejected(store.get(item1_50)),
      assert.isRejected(store.get(item1_80)),
      assert.isRejected(store.get(item1_110)),
      assert.isRejected(store.get(item1_192)),
      assert.isRejected(store.get(item1_640)),
      assert.isRejected(store.get(item1_1600))
    ]));
  });
});
