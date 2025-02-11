/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

import {EventEmitter} from 'events';

import SCR from 'node-scr';
import {proxyEvents, transferEvents} from '@webex/common';
import {WebexPlugin} from '@webex/webex-core';
import {filter, map, pick, some} from 'lodash';
import {detectFileType, processImage} from '@webex/helper-image';
import sha256 from 'crypto-js/sha256';

export const EMITTER_SYMBOL = Symbol('EMITTER_SYMBOL');
export const FILE_SYMBOL = Symbol('FILE_SYMBOL');
const PROMISE_SYMBOL = Symbol('PROMISE_SYMBOL');

/**
 * @class
 */
const ShareActivity = WebexPlugin.extend({
  getSymbols() {
    return {
      file: FILE_SYMBOL,
      emitter: EMITTER_SYMBOL
    };
  },

  namespace: 'Conversation',

  derived: {
    target: {
      deps: ['conversation'],
      fn() {
        return this.conversation;
      }
    }
  },

  session: {
    claimedFileType: 'string',
    conversation: {
      required: true,
      type: 'object'
    },

    content: 'string',

    clientTempId: 'string',

    displayName: 'string',

    enableThumbnails: {
      default: true,
      type: 'boolean'
    },

    hiddenSpaceUrl: 'object',

    mentions: 'object',

    spaceUrl: 'object',

    uploads: {
      type: 'object',
      default() {
        return new Map();
      }
    }
  },

  initialize(attrs, options) {
    Reflect.apply(WebexPlugin.prototype.initialize, this, [attrs, options]);

    if (attrs && attrs.conversation) {
      this.spaceUrl = Promise.resolve(attrs.conversation._spaceUrl || this._retrieveSpaceUrl(`${attrs.conversation.url}/space`)
        .then((url) => {
          attrs.conversation._spaceUrl = url;

          return url;
        }));
      this.hiddenSpaceUrl = Promise.resolve(attrs.conversation._hiddenSpaceUrl || this._retrieveSpaceUrl(`${attrs.conversation.url}/space/hidden`)
        .then((url) => {
          attrs.conversation._hiddenSpaceUrl = url;

          return url;
        }));
    }
  },

  /**
   * Adds an additional GIF to the share activity
   * Different from regular add to skip uploading to webex files service
   * @param {File} gif
   * @param {File} gif.image // thumbnail
   * @param {Object} options
   * @param {Object} options.actions
   * @returns {Promise}
   */
  addGif(gif, options) {
    let gifToAdd = this.uploads.get(gif);

    // If the gif already exists, then don't do anything
    if (gifToAdd) {
      return Promise.resolve();
    }

    gifToAdd = Object.assign({
      displayName: gif.name,
      fileSize: gif.size || gif.byteLength || gif.length,
      mimeType: gif.type,
      url: 'https://giphy.com',
      objectType: 'file',
      height: gif.height,
      width: gif.width,
      image: {
        height: gif.image.height,
        width: gif.image.width,
        url: 'https://giphy.com'
      },
      [FILE_SYMBOL]: gif
    }, pick(options, 'actions'));

    this.uploads.set(gif, gifToAdd);

    /* Instead of encryptBinary, which produces a encrypted version of
     * the file for upload and a SCR (contains info needed to encrypt the
     * SCR itself and the displayName), we directly create an SCR.
     * Because we are skipping uploading, the encrypted file is not needed.
     */
    return SCR.create()
      .then((scr) => {
        scr.loc = gif.url;
        gifToAdd.scr = scr;

        return SCR.create();
      })
      .then((thumbnailScr) => {
        thumbnailScr.loc = gif.image.url;
        gifToAdd.image.scr = thumbnailScr;
      });
  },

  /**
   * Adds an additional file to the share and begins submitting it to webex
   * files
   * @param {File} file
   * @param {Object} options
   * @param {Object} options.actions
   * @returns {EventEmittingPromise}
   */
  add(file, options) {
    options = options || {};
    options.claimedFileType = file.displayName.substring(file.displayName.lastIndexOf('.'));
    let upload = this.uploads.get(file);

    if (upload) {
      return upload[PROMISE_SYMBOL];
    }
    const emitter = new EventEmitter();

    upload = Object.assign({
      displayName: file.name,
      fileSize: file.size || file.byteLength || file.length,
      mimeType: file.type,
      objectType: 'file',
      [EMITTER_SYMBOL]: emitter,
      [FILE_SYMBOL]: file
    }, pick(options, 'actions'));

    this.uploads.set(file, upload);
    const promise = detectFileType(file, this.logger)
      .then((type) => {
        upload.mimeType = type;

        return processImage({
          file,
          type,
          thumbnailMaxWidth: this.config.thumbnailMaxWidth,
          thumbnailMaxHeight: this.config.thumbnailMaxHeight,
          enableThumbnails: this.enableThumbnails,
          logger: this.logger
        });
      })
      .then((imageData) => {
        const main = this.webex.internal.encryption.encryptBinary(file)
          .then(({scr, cdata}) => {
            upload.scr = scr;

            return Promise.all([cdata, this.spaceUrl]);
          })
          .then(([cdata, spaceUrl]) => {
            const uploadPromise = this._upload(cdata, `${spaceUrl}/upload_sessions`, options);

            transferEvents('progress', uploadPromise, emitter);

            return uploadPromise;
          })
          .then((metadata) => {
            upload.url = upload.scr.loc = metadata.downloadUrl;
          });


        let thumb;

        if (imageData) {
          const [thumbnail, fileDimensions, thumbnailDimensions] = imageData;

          Object.assign(upload, fileDimensions);

          if (thumbnail && thumbnailDimensions) {
            upload.image = thumbnailDimensions;
            thumb = this.webex.internal.encryption.encryptBinary(thumbnail)
              .then(({scr, cdata}) => {
                upload.image.scr = scr;

                return Promise.all([cdata, this.hiddenSpaceUrl]);
              })
              .then(([cdata, spaceUrl]) => this._upload(cdata, `${spaceUrl}/upload_sessions`))
              .then((metadata) => {
                upload.image.url = upload.image.scr.loc = metadata.downloadUrl;
              });
          }
        }

        return Promise.all([main, thumb]);
      });


    upload[PROMISE_SYMBOL] = promise;

    proxyEvents(emitter, promise);

    return promise;
  },

  /**
   * Fetches the files from the share
   * @returns {Array}
   */
  getFiles() {
    const files = [];

    for (const [key] of this.uploads) {
      files.push(this.uploads.get(key)[FILE_SYMBOL]);
    }

    return files;
  },


  /**
   * @param {File} file
   * @param {string} uri
   * @param {Object} uploadOptions - Optional object adding additional params to request body
   * @private
   * @returns {Promise}
   */
  _upload(file, uri, uploadOptions) {
    const fileSize = file.length || file.size || file.byteLength;
    const fileHash = sha256(file).toString();
    const {role, claimedFileType} = uploadOptions ?? {};
    const initializeBody = Object.assign({fileSize}, {claimedFileType}, role && {role});

    return this.webex.upload({
      uri,
      file,
      qs: {
        transcode: true
      },
      phases: {
        initialize: {
          body: initializeBody
        },
        upload: {
          $url(session) {
            return session.uploadUrl;
          }
        },
        finalize: {
          $uri(session) {
            return session.finishUploadUrl;
          },
          body: {fileSize, fileHash}
        }
      }
    });
  },

  /**
   * Removes the specified file from the share (Does not currently delete the
   * uploaded file)
   * @param {File} file
   * @returns {Promise}
   */
  remove(file) {
    this.uploads.delete(file);

    // Returns a promise for future-proofiness.
    return Promise.resolve();
  },

  /**
   * @private
   * @returns {Promise<Object>}
   */
  prepare() {
    if (!this.uploads.size) {
      throw new Error('Cannot submit a share activity without atleast one file');
    }

    const activity = {
      verb: 'share',
      object: {
        objectType: 'content',
        displayName: this.object && this.object.displayName ? this.object.displayName : undefined,
        content: this.object && this.object.content ? this.object.content : undefined,
        mentions: this.object && this.object.mentions ? this.object.mentions : undefined,
        files: {
          items: []
        }
      },
      clientTempId: this.clientTempId
    };

    const promises = [];

    this.uploads.forEach((item) => {
      activity.object.files.items.push(item);
      promises.push(item[PROMISE_SYMBOL]);
    });

    activity.object.contentCategory = this._determineContentCategory(activity.object.files.items);

    return Promise.all(promises)
      .then(() => activity);
  },

  /**
   * @param {Array} items
   * @param {string} mimeType
   * @private
   * @returns {boolean}
   */
  _itemContainsActionWithMimeType(items, mimeType) {
    return some(items.map((item) => some(item.actions, {mimeType})));
  },

  /**
   * @param {Array} items
   * @private
   * @returns {string}
   */
  _determineContentCategory(items) {
    // determine if the items contain an image
    if (this._itemContainsActionWithMimeType(items, 'application/x-cisco-webex-whiteboard')) {
      return 'documents';
    }

    const mimeTypes = filter(map(items, 'mimeType'));

    if (mimeTypes.length !== items.length) {
      return 'documents';
    }

    const contentCategory = mimeTypes[0].split('/').shift();

    if (contentCategory !== 'video' && contentCategory !== 'image') {
      return 'documents';
    }

    for (const mimeType of mimeTypes) {
      if (mimeType.split('/').shift() !== contentCategory) {
        return 'documents';
      }
    }

    return `${contentCategory}s`;
  },

  /**
   * @param {string} uri
   * @returns {Promise}
   */
  _retrieveSpaceUrl(uri) {
    return this.webex.request({
      method: 'PUT',
      uri
    })
      .then((res) => res.body.spaceUrl);
  }
});

/**
 * Instantiates a ShareActivity
 * @param {Object} conversation
 * @param {ShareActivity|Object|array} object
 * @param {ProxyWebex} webex
 * @returns {ShareActivity}
 */
ShareActivity.create = function create(conversation, object, webex) {
  if (object instanceof ShareActivity) {
    return object;
  }

  let files;

  if (object?.object?.files) {
    files = object.object.files;
    Reflect.deleteProperty(object.object, 'files');
  }

  const share = new ShareActivity(Object.assign({
    conversation
  }, object), {
    parent: webex
  });

  files = files?.items ?? files;
  if (files) {
    files.forEach((file) => share.add(file));
  }

  return share;
};

export default ShareActivity;
