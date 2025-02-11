/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

import {get, has, isArray, isFunction, merge, union} from 'lodash';

/**
 * Mixes a plugin system into an AmpState object (specifically, into WebexCore)
 * @param {AmpState} State
 * @param {Object} config
 * @param {Object} interceptors
 * @returns {AmpState}
 */
export default function mixinWebexInternalCorePlugins(State, config, interceptors) {
  // eslint-disable-next-line complexity
  State.registerPlugin = function registerPlugin(name, constructor, options = {}) {
    if (State.prototype._children[name] && !options.replace) {
      return;
    }

    State.prototype._children[name] = constructor;

    if (options.proxies) {
      throw new Error('Proxies are not currently supported for private plugins');
    }

    if (options.interceptors) {
      Object.keys(options.interceptors).forEach((key) => {
        interceptors[key] = options.interceptors[key];
      });
    }

    if (options.config) {
      merge(config, options.config);
    }

    if (has(options, 'payloadTransformer.predicates')) {
      config.payloadTransformer.predicates = config.payloadTransformer.predicates.concat(
        get(options, 'payloadTransformer.predicates')
      );
    }

    if (has(options, 'payloadTransformer.transforms')) {
      config.payloadTransformer.transforms = config.payloadTransformer.transforms.concat(
        get(options, 'payloadTransformer.transforms')
      );
    }

    if (options.onBeforeLogout) {
      config.onBeforeLogout = config.onBeforeLogout || [];
      const onBeforeLogout = isArray(options.onBeforeLogout) ? options.onBeforeLogout : [options.onBeforeLogout];

      onBeforeLogout.forEach((fn) =>
        config.onBeforeLogout.push({
          plugin: name,
          fn
        }));
    }

    // Only mess with the plugin's derived properties if it's an amp-state plugin
    if (constructor.prototype._definition && constructor.prototype._definition.ready) {
      const {fn, depList} = State.prototype._derived.ready;
      const def = {
        deps: depList.concat(`${name}.ready`),
        fn
      };

      createDerivedProperty(State.prototype, 'ready', def);
    }
  };

  return State;
}

/**
 * Extracted from ampersand-state
 * @param {Object} modelProto
 * @param {string} name
 * @param {Object} definition
 * @private
 * @returns {undefined}
 */
function createDerivedProperty(modelProto, name, definition) {
  const def = (modelProto._derived[name] = {
    fn: isFunction(definition) ? definition : definition.fn,
    cache: definition.cache !== false,
    depList: definition.deps || []
  });

  // add to our shared dependency list
  def.depList.forEach((dep) => {
    modelProto._deps[dep] = union(modelProto._deps[dep] || [], [name]);
  });

  // defined a top-level getter for derived names
  Reflect.defineProperty(modelProto, name, {
    get() {
      return this._getDerivedProperty(name);
    },
    set() {
      throw new TypeError(`\`${name}\` is a derived property, it can't be set directly.`);
    }
  });
}
