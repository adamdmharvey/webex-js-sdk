/* eslint-disable no-underscore-dangle */
/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

/* eslint-env browser */

// Note: several code paths are ignored in this file. As far as I can tell, any
// error conditions that would provoke those paths are otherwise prevented and
// reported.

import {defaults, isArray, pick} from 'lodash';
import qs from 'qs';

import xhr from '../lib/xhr';
import detect from '../lib/detect';

/**
 * @name request
 * @param {Object} options
 * @returns {Promise}
 */
export default function _request(options) {
  return new Promise((resolve) => {
    const params = pick(options, 'method', 'uri', 'withCredentials', 'headers', 'timeout', 'responseType');

    // Set `response` to `true` to approximate an `HttpResponse` object
    params.response = true;

    setXhr(params);
    bindProgressEvents(params, options);
    setAuth(params, options);
    setCookies(params, options);
    setDefaults(params, options);
    setResponseType(params, options);
    setContentType(params, options);
    setPayload(params, options);
    setQs(params, options);

    options.logger.debug(`start http ${options.method ? options.method : 'request'} to ${options.uri}`);

    const x = xhr(params, (error, response) => {
      /* istanbul ignore next */
      if (error) {
        options.logger.warn(error);
      }

      /* istanbul ignore else */
      if (response) {
        if (response.statusCode >= 400) {
          options.logger.warn(`http ${options.method ? options.method : 'request'} to ${options.uri} result: ${response.statusCode}`);
        }
        else {
          options.logger.debug(`http ${options.method ? options.method : 'request'} to ${options.uri} result: ${response.statusCode}`);
        }
        response.options = options;
        processResponseJson(response, params);
        resolve(response);
      }
      else {
        resolve({
          statusCode: 0,
          options,
          headers: options.headers,
          method: options.method,
          url: options.uri,
          body: error
        });
      }
    });

    x.onprogress = options.download.emit.bind(options.download, 'progress');
  })
    .catch((error) => {
      options.logger.warn(error);

      /* eslint arrow-body-style: [0] */
      /* istanbul ignore next */
      return {
        statusCode: 0,
        options,
        headers: options.headers,
        method: options.method,
        url: options.uri,
        body: error
      };
    });

  /**
   * @param {Object} params
   * @param {Object} o
   * @private
   * @returns {undefined}
   */
  function bindProgressEvents(params, o) {
    if (params.method && ['PATCH', 'POST', 'PUT'].includes(params.method.toUpperCase())) {
      if (!params.xhr) {
        params.xhr = new XMLHttpRequest();
      }
      params.xhr.upload.onprogress = o.upload.emit.bind(o.upload, 'progress');
    }
  }

  /**
   * @param {Object} params
   * @param {Object} o
   * @private
   * @returns {undefined}
   */
  function setXhr(params) {
    params.xhr = new XMLHttpRequest();
  }

  /**
   * @param {Object} params
   * @param {Object} o
   * @private
   * @returns {undefined}
   */
  function setAuth(params, o) {
    if (o.auth) {
      if (o.auth.bearer) {
        params.headers.authorization = `Bearer ${o.auth.bearer}`;
      }
      else {
        const user = o.auth.user || o.auth.username;
        const pass = o.auth.pass || o.auth.password;

        const token = btoa(`${user}:${pass}`);

        params.headers.authorization = `Basic ${token}`;
      }
    }
  }

  /**
   * @param {Object} params
   * @param {Object} o
   * @private
   * @returns {undefined}
   */
  function setCookies(params, o) {
    if (o.jar) {
      params.withCredentials = true;
    }
  }

  /**
   * @param {Object} params
   * @param {Object} o
   * @private
   * @returns {undefined}
   */
  function setDefaults(params, o) {
    const defs = {
      cors: true,
      // raynos/xhr defaults withCredentials to true if cors is true, so we need
      // to make it explicitly false by default
      withCredentials: false,
      timeout: 0
    };

    defaults(params, pick(o, Object.keys(defs)), defs);
  }

  /**
   * @param {Object} params
   * @param {Object} o
   * @private
   * @returns {undefined}
   */
  function setResponseType(params, o) {
    if (o.responseType === 'buffer') {
      params.responseType = 'arraybuffer';
    }
  }

  /**
   * @param {Object} params
   * @param {Object} o
   * @private
   * @returns {undefined}
   */
  async function setContentType(params, o) {
    if (o.body instanceof Blob || o.body instanceof ArrayBuffer) {
      o.json = params.json = false;
      params.headers['content-type'] = params.headers['content-type'] || await detect(o.body);
    }
  }

  /**
   * @param {Object} params
   * @param {Object} o
   * @private
   * @returns {undefined}
   */
  function setQs(params, o) {
    if (o.qs) {
      params.uri += `?${qs.stringify(o.qs)}`;
    }
  }

  /**
   * Converts arraybuffers to blobs before uploading them
   * @param {mixed} file
   * @private
   * @returns {mixed}
   */
  function ensureBlob(file) {
    if (file instanceof ArrayBuffer) {
      const ret = file.type ? new Blob([file], {type: file.type}) : new Blob([file]);

      ret.filename = file.filename || file.name || 'untitled';

      return ret;
    }

    return file;
  }

  /**
   * Appends an item to a form
   * @param {FormData} form
   * @param {string} key
   * @param {mixed} value
   * @returns {undefined}
   */
  function append(form, key, value) {
    if (isArray(value)) {
      for (const v of value) {
        append(form, key, v);
      }

      return;
    }

    value = ensureBlob(value);
    if (value.name) {
      value.filename = value.name;
      form.append(key, value, value.name);
    }
    else {
      form.append(key, value);
    }
  }

  /**
   * @param {Object} params
   * @param {Object} o
   * @private
   * @returns {undefined}
   */
  function setPayload(params, o) {
    if ((!('json' in o) || o.json === true) && o.body) {
      params.json = o.body;
    }
    else if (o.form) {
      params.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      params.body = qs.stringify(o.form);
      Reflect.deleteProperty(params, 'json');
    }
    else if (o.formData) {
      params.body = Object.keys(o.formData).reduce((fd, key) => {
        const value = o.formData[key];

        append(fd, key, value);

        return fd;
      }, new FormData());
    }
    else {
      params.body = o.body;
      Reflect.deleteProperty(params, 'json');
    }
  }

  /**
   * @param {Object} response
   * @param {Object} params
   * @private
   * @returns {undefined}
   */
  function processResponseJson(response, params) {
    // If params.json is not defined, xhr won't deserialize the response
    // so we should give it a shot just in case.
    if (!params.json && typeof response.body !== 'object') {
      try {
        response.body = JSON.parse(response.body);
      }
      catch (e) {
        /* eslint no-empty: [0] */
      }
    }
  }
}
