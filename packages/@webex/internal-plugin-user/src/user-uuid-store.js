/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

import {patterns} from '@webex/common';

const usersByEmail = new WeakMap();
const usersById = new WeakMap();

/**
 * @class
 */
export default class UserUUIDStore {
  /**
   * @constructs {UserUUIDStore}
   */
  constructor() {
    usersByEmail.set(this, new Map());
    usersById.set(this, new Map());
  }

  /**
   * Adds a user object to the store
   * @param {Object} user
   * @param {string} user.id
   * @param {string} user.emailAddress
   * @returns {Promise}
   */
  add(user) {
    if (!user.id) {
      return Promise.reject(new Error('`user.id` is required'));
    }

    if (!user.emailAddress) {
      return Promise.reject(new Error('`user.emailAddress` is required'));
    }

    if (!patterns.uuid.test(user.id)) {
      return Promise.reject(new Error('`user.id` does not appear to be a uuid'));
    }

    if (!patterns.email.test(user.emailAddress)) {
      return Promise.reject(new Error('`user.emailAddress` does not appear to be an email address'));
    }

    const p1 = this.getById(user.id)
      .then((u) => usersById.get(this).set(user.id, Object.assign({}, u, user)))
      .catch(() => usersById.get(this).set(user.id, Object.assign({}, user)));

    const p2 = this.getByEmail(user.emailAddress)
      .then((u) => usersByEmail.get(this).set(user.emailAddress, Object.assign({}, u, user)))
      .catch(() => usersByEmail.get(this).set(user.emailAddress, Object.assign({}, user)));

    return Promise.all([p1, p2]);
  }

  /**
   * Retrievves the specified user object from the store
   * @param {string} id
   * @returns {Promise<Object>}
   */
  get(id) {
    if (patterns.uuid.test(id)) {
      return this.getById(id);
    }

    if (patterns.email.test(id)) {
      return this.getByEmail(id);
    }

    return Promise.reject(new Error('`id` does not appear to be a valid user identifier'));
  }

  /**
   * Retrieves the specified user object by id from the store
   * @param {Object} id
   * @returns {Promise<Object>}
   */
  getById(id) {
    const ret = usersById.get(this).get(id);

    if (ret) {
      return Promise.resolve(ret);
    }

    return Promise.reject(new Error('No user found by specified id'));
  }


  /**
   * Retrieves the specified user object by id from the store
   * @param {Object} email
   * @returns {Promise<Object>}
   */
  getByEmail(email) {
    const ret = usersByEmail.get(this).get(email);

    if (ret) {
      return Promise.resolve(ret);
    }

    return Promise.reject(new Error('No user found by specified email address'));
  }
}
