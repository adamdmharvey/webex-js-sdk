/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

export default {
  credentials: {
    /**
     * Controls whether {@link Authorization#initiateLogin()} requests a token
     * or an auth code. Anything other than 'confidential' will be treated as
     * 'public'
     * @private
     * @type {string}
     */
    clientType: 'public'
  }
};
