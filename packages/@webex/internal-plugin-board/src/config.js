/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

export default {
  board: {
    /**
     * Number of contents per batch when adding contents to a channel
     * @type {number}
     */
    numberContentsPerPageForAdd: 150,

    /**
     * Number of contents per batch when getting contents from a channel
     * @type {number}
     */
    numberContentsPerPageForGet: 1000,

    /**
     * Milliseconds between pings sent up the socket
     * @type {number}
     */
    pingInterval: process.env.MERCURY_PING_INTERVAL || 15000,

    /**
     * Milliseconds to wait for a pong before declaring the connection dead
     * @type {number}
     */
    pongTimeout: process.env.MERCURY_PONG_TIMEOUT || 14000,

    /**
     * Milliseconds to wait for a close frame before declaring the socket dead and
     * discarding it
     * @type {[type]}
     */
    forceCloseDelay: process.env.MERCURY_FORCE_CLOSE_DELAY || 2000,

    /**
     * The prefix for board binding when open a new socket connection
     * @type {string}
     */
    mercuryBindingPrefix: 'board.'
  }
};
