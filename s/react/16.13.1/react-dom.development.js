/** @license React v16.13.1
 * react-dom.development.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('react')) :
  typeof define === 'function' && define.amd ? define(['exports', 'react'], factory) :
  (global = global || self, factory(global.ReactDOM = {}, global.React));
}(this, (function (exports, React) { 'use strict';

  var ReactSharedInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED; // Prevent newer renderers from RTE when used with older react package versions.
  // Current owner and dispatcher used to share the same ref,
  // but PR #14548 split them out to better support the react-debug-tools package.

  if (!ReactSharedInternals.hasOwnProperty('ReactCurrentDispatcher')) {
    ReactSharedInternals.ReactCurrentDispatcher = {
      current: null
    };
  }

  if (!ReactSharedInternals.hasOwnProperty('ReactCurrentBatchConfig')) {
    ReactSharedInternals.ReactCurrentBatchConfig = {
      suspense: null
    };
  }

  // by calls to these methods by a Babel plugin.
  //
  // In PROD (or in packages without access to React internals),
  // they are left as they are instead.

  function warn(format) {
    {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      printWarning('warn', format, args);
    }
  }
  function error(format) {
    {
      for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }

      printWarning('error', format, args);
    }
  }

  function printWarning(level, format, args) {
    // When changing this logic, you might want to also
    // update consoleWithStackDev.www.js as well.
    {
      var hasExistingStack = args.length > 0 && typeof args[args.length - 1] === 'string' && args[args.length - 1].indexOf('\n    in') === 0;

      if (!hasExistingStack) {
        var ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;
        var stack = ReactDebugCurrentFrame.getStackAddendum();

        if (stack !== '') {
          format += '%s';
          args = args.concat([stack]);
        }
      }

      var argsWithFormat = args.map(function (item) {
        return '' + item;
      }); // Careful: RN currently depends on this prefix

      argsWithFormat.unshift('Warning: ' + format); // We intentionally don't use spread (or .apply) directly because it
      // breaks IE9: https://github.com/facebook/react/issues/13610
      // eslint-disable-next-line react-internal/no-production-logging

      Function.prototype.apply.call(console[level], console, argsWithFormat);

      try {
        // --- Welcome to debugging React ---
        // This error was thrown as a convenience so that you can use this stack
        // to find the callsite that caused this warning to fire.
        var argIndex = 0;
        var message = 'Warning: ' + format.replace(/%s/g, function () {
          return args[argIndex++];
        });
        throw new Error(message);
      } catch (x) {}
    }
  }

  if (!React) {
    {
      throw Error( "ReactDOM was loaded before React. Make sure you load the React package before loading ReactDOM." );
    }
  }

  var invokeGuardedCallbackImpl = function (name, func, context, a, b, c, d, e, f) {
    var funcArgs = Array.prototype.slice.call(arguments, 3);

    try {
      func.apply(context, funcArgs);
    } catch (error) {
      this.onError(error);
    }
  };

  {
    // In DEV mode, we swap out invokeGuardedCallback for a special version
    // that plays more nicely with the browser's DevTools. The idea is to preserve
    // "Pause on exceptions" behavior. Because React wraps all user-provided
    // functions in invokeGuardedCallback, and the production version of
    // invokeGuardedCallback uses a try-catch, all user exceptions are treated
    // like caught exceptions, and the DevTools won't pause unless the developer
    // takes the extra step of enabling pause on caught exceptions. This is
    // unintuitive, though, because even though React has caught the error, from
    // the developer's perspective, the error is uncaught.
    //
    // To preserve the expected "Pause on exceptions" behavior, we don't use a
    // try-catch in DEV. Instead, we synchronously dispatch a fake event to a fake
    // DOM node, and call the user-provided callback from inside an event handler
    // for that fake event. If the callback throws, the error is "captured" using
    // a global event handler. But because the error happens in a different
    // event loop context, it does not interrupt the normal program flow.
    // Effectively, this gives us try-catch behavior without actually using
    // try-catch. Neat!
    // Check that the browser supports the APIs we need to implement our special
    // DEV version of invokeGuardedCallback
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof document !== 'undefined' && typeof document.createEvent === 'function') {
      var fakeNode = document.createElement('react');

      var invokeGuardedCallbackDev = function (name, func, context, a, b, c, d, e, f) {
        // If document doesn't exist we know for sure we will crash in this method
        // when we call document.createEvent(). However this can cause confusing
        // errors: https://github.com/facebookincubator/create-react-app/issues/3482
        // So we preemptively throw with a better message instead.
        if (!(typeof document !== 'undefined')) {
          {
            throw Error( "The `document` global was defined when React was initialized, but is not defined anymore. This can happen in a test environment if a component schedules an update from an asynchronous callback, but the test has already finished running. To solve this, you can either unmount the component at the end of your test (and ensure that any asynchronous operations get canceled in `componentWillUnmount`), or you can change the test itself to be asynchronous." );
          }
        }

        var evt = document.createEvent('Event'); // Keeps track of whether the user-provided callback threw an error. We
        // set this to true at the beginning, then set it to false right after
        // calling the function. If the function errors, `didError` will never be
        // set to false. This strategy works even if the browser is flaky and
        // fails to call our global error handler, because it doesn't rely on
        // the error event at all.

        var didError = true; // Keeps track of the value of window.event so that we can reset it
        // during the callback to let user code access window.event in the
        // browsers that support it.

        var windowEvent = window.event; // Keeps track of the descriptor of window.event to restore it after event
        // dispatching: https://github.com/facebook/react/issues/13688

        var windowEventDescriptor = Object.getOwnPropertyDescriptor(window, 'event'); // Create an event handler for our fake event. We will synchronously
        // dispatch our fake event using `dispatchEvent`. Inside the handler, we
        // call the user-provided callback.

        var funcArgs = Array.prototype.slice.call(arguments, 3);

        function callCallback() {
          // We immediately remove the callback from event listeners so that
          // nested `invokeGuardedCallback` calls do not clash. Otherwise, a
          // nested call would trigger the fake event handlers of any call higher
          // in the stack.
          fakeNode.removeEventListener(evtType, callCallback, false); // We check for window.hasOwnProperty('event') to prevent the
          // window.event assignment in both IE <= 10 as they throw an error
          // "Member not found" in strict mode, and in Firefox which does not
          // support window.event.

          if (typeof window.event !== 'undefined' && window.hasOwnProperty('event')) {
            window.event = windowEvent;
          }

          func.apply(context, funcArgs);
          didError = false;
        } // Create a global error event handler. We use this to capture the value
        // that was thrown. It's possible that this error handler will fire more
        // than once; for example, if non-React code also calls `dispatchEvent`
        // and a handler for that event throws. We should be resilient to most of
        // those cases. Even if our error event handler fires more than once, the
        // last error event is always used. If the callback actually does error,
        // we know that the last error event is the correct one, because it's not
        // possible for anything else to have happened in between our callback
        // erroring and the code that follows the `dispatchEvent` call below. If
        // the callback doesn't error, but the error event was fired, we know to
        // ignore it because `didError` will be false, as described above.


        var error; // Use this to track whether the error event is ever called.

        var didSetError = false;
        var isCrossOriginError = false;

        function handleWindowError(event) {
          error = event.error;
          didSetError = true;

          if (error === null && event.colno === 0 && event.lineno === 0) {
            isCrossOriginError = true;
          }

          if (event.defaultPrevented) {
            // Some other error handler has prevented default.
            // Browsers silence the error report if this happens.
            // We'll remember this to later decide whether to log it or not.
            if (error != null && typeof error === 'object') {
              try {
                error._suppressLogging = true;
              } catch (inner) {// Ignore.
              }
            }
          }
        } // Create a fake event type.


        var evtType = "react-" + (name ? name : 'invokeguardedcallback'); // Attach our event handlers

        window.addEventListener('error', handleWindowError);
        fakeNode.addEventListener(evtType, callCallback, false); // Synchronously dispatch our fake event. If the user-provided function
        // errors, it will trigger our global error handler.

        evt.initEvent(evtType, false, false);
        fakeNode.dispatchEvent(evt);

        if (windowEventDescriptor) {
          Object.defineProperty(window, 'event', windowEventDescriptor);
        }

        if (didError) {
          if (!didSetError) {
            // The callback errored, but the error event never fired.
            error = new Error('An error was thrown inside one of your components, but React ' + "doesn't know what it was. This is likely due to browser " + 'flakiness. React does its best to preserve the "Pause on ' + 'exceptions" behavior of the DevTools, which requires some ' + "DEV-mode only tricks. It's possible that these don't work in " + 'your browser. Try triggering the error in production mode, ' + 'or switching to a modern browser. If you suspect that this is ' + 'actually an issue with React, please file an issue.');
          } else if (isCrossOriginError) {
            error = new Error("A cross-origin error was thrown. React doesn't have access to " + 'the actual error object in development. ' + 'See https://fb.me/react-crossorigin-error for more information.');
          }

          this.onError(error);
        } // Remove our event listeners


        window.removeEventListener('error', handleWindowError);
      };

      invokeGuardedCallbackImpl = invokeGuardedCallbackDev;
    }
  }

  var invokeGuardedCallbackImpl$1 = invokeGuardedCallbackImpl;

  var hasError = false;
  var caughtError = null; // Used by event system to capture/rethrow the first error.

  var hasRethrowError = false;
  var rethrowError = null;
  var reporter = {
    onError: function (error) {
      hasError = true;
      caughtError = error;
    }
  };
  /**
   * Call a function while guarding against errors that happens within it.
   * Returns an error if it throws, otherwise null.
   *
   * In production, this is implemented using a try-catch. The reason we don't
   * use a try-catch directly is so that we can swap out a different
   * implementation in DEV mode.
   *
   * @param {String} name of the guard to use for logging or debugging
   * @param {Function} func The function to invoke
   * @param {*} context The context to use when calling the function
   * @param {...*} args Arguments for function
   */

  function invokeGuardedCallback(name, func, context, a, b, c, d, e, f) {
    hasError = false;
    caughtError = null;
    invokeGuardedCallbackImpl$1.apply(reporter, arguments);
  }
  /**
   * Same as invokeGuardedCallback, but instead of returning an error, it stores
   * it in a global so it can be rethrown by `rethrowCaughtError` later.
   * TODO: See if caughtError and rethrowError can be unified.
   *
   * @param {String} name of the guard to use for logging or debugging
   * @param {Function} func The function to invoke
   * @param {*} context The context to use when calling the function
   * @param {...*} args Arguments for function
   */

  function invokeGuardedCallbackAndCatchFirstError(name, func, context, a, b, c, d, e, f) {
    invokeGuardedCallback.apply(this, arguments);

    if (hasError) {
      var error = clearCaughtError();

      if (!hasRethrowError) {
        hasRethrowError = true;
        rethrowError = error;
      }
    }
  }
  /**
   * During execution of guarded functions we will capture the first error which
   * we will rethrow to be handled by the top level error handler.
   */

  function rethrowCaughtError() {
    if (hasRethrowError) {
      var error = rethrowError;
      hasRethrowError = false;
      rethrowError = null;
      throw error;
    }
  }
  function hasCaughtError() {
    return hasError;
  }
  function clearCaughtError() {
    if (hasError) {
      var error = caughtError;
      hasError = false;
      caughtError = null;
      return error;
    } else {
      {
        {
          throw Error( "clearCaughtError was called but no error was captured. This error is likely caused by a bug in React. Please file an issue." );
        }
      }
    }
  }

  var getFiberCurrentPropsFromNode = null;
  var getInstanceFromNode = null;
  var getNodeFromInstance = null;
  function setComponentTree(getFiberCurrentPropsFromNodeImpl, getInstanceFromNodeImpl, getNodeFromInstanceImpl) {
    getFiberCurrentPropsFromNode = getFiberCurrentPropsFromNodeImpl;
    getInstanceFromNode = getInstanceFromNodeImpl;
    getNodeFromInstance = getNodeFromInstanceImpl;

    {
      if (!getNodeFromInstance || !getInstanceFromNode) {
        error('EventPluginUtils.setComponentTree(...): Injected ' + 'module is missing getNodeFromInstance or getInstanceFromNode.');
      }
    }
  }
  var validateEventDispatches;

  {
    validateEventDispatches = function (event) {
      var dispatchListeners = event._dispatchListeners;
      var dispatchInstances = event._dispatchInstances;
      var listenersIsArr = Array.isArray(dispatchListeners);
      var listenersLen = listenersIsArr ? dispatchListeners.length : dispatchListeners ? 1 : 0;
      var instancesIsArr = Array.isArray(dispatchInstances);
      var instancesLen = instancesIsArr ? dispatchInstances.length : dispatchInstances ? 1 : 0;

      if (instancesIsArr !== listenersIsArr || instancesLen !== listenersLen) {
        error('EventPluginUtils: Invalid `event`.');
      }
    };
  }
  /**
   * Dispatch the event to the listener.
   * @param {SyntheticEvent} event SyntheticEvent to handle
   * @param {function} listener Application-level callback
   * @param {*} inst Internal component instance
   */


  function executeDispatch(event, listener, inst) {
    var type = event.type || 'unknown-event';
    event.currentTarget = getNodeFromInstance(inst);
    invokeGuardedCallbackAndCatchFirstError(type, listener, undefined, event);
    event.currentTarget = null;
  }
  /**
   * Standard/simple iteration through an event's collected dispatches.
   */

  function executeDispatchesInOrder(event) {
    var dispatchListeners = event._dispatchListeners;
    var dispatchInstances = event._dispatchInstances;

    {
      validateEventDispatches(event);
    }

    if (Array.isArray(dispatchListeners)) {
      for (var i = 0; i < dispatchListeners.length; i++) {
        if (event.isPropagationStopped()) {
          break;
        } // Listeners and Instances are two parallel arrays that are always in sync.


        executeDispatch(event, dispatchListeners[i], dispatchInstances[i]);
      }
    } else if (dispatchListeners) {
      executeDispatch(event, dispatchListeners, dispatchInstances);
    }

    event._dispatchListeners = null;
    event._dispatchInstances = null;
  }

  var FunctionComponent = 0;
  var ClassComponent = 1;
  var IndeterminateComponent = 2; // Before we know whether it is function or class

  var HostRoot = 3; // Root of a host tree. Could be nested inside another node.

  var HostPortal = 4; // A subtree. Could be an entry point to a different renderer.

  var HostComponent = 5;
  var HostText = 6;
  var Fragment = 7;
  var Mode = 8;
  var ContextConsumer = 9;
  var ContextProvider = 10;
  var ForwardRef = 11;
  var Profiler = 12;
  var SuspenseComponent = 13;
  var MemoComponent = 14;
  var SimpleMemoComponent = 15;
  var LazyComponent = 16;
  var IncompleteClassComponent = 17;
  var DehydratedFragment = 18;
  var SuspenseListComponent = 19;
  var FundamentalComponent = 20;
  var ScopeComponent = 21;
  var Block = 22;

  /**
   * Injectable ordering of event plugins.
   */
  var eventPluginOrder = null;
  /**
   * Injectable mapping from names to event plugin modules.
   */

  var namesToPlugins = {};
  /**
   * Recomputes the plugin list using the injected plugins and plugin ordering.
   *
   * @private
   */

  function recomputePluginOrdering() {
    if (!eventPluginOrder) {
      // Wait until an `eventPluginOrder` is injected.
      return;
    }

    for (var pluginName in namesToPlugins) {
      var pluginModule = namesToPlugins[pluginName];
      var pluginIndex = eventPluginOrder.indexOf(pluginName);

      if (!(pluginIndex > -1)) {
        {
          throw Error( "EventPluginRegistry: Cannot inject event plugins that do not exist in the plugin ordering, `" + pluginName + "`." );
        }
      }

      if (plugins[pluginIndex]) {
        continue;
      }

      if (!pluginModule.extractEvents) {
        {
          throw Error( "EventPluginRegistry: Event plugins must implement an `extractEvents` method, but `" + pluginName + "` does not." );
        }
      }

      plugins[pluginIndex] = pluginModule;
      var publishedEvents = pluginModule.eventTypes;

      for (var eventName in publishedEvents) {
        if (!publishEventForPlugin(publishedEvents[eventName], pluginModule, eventName)) {
          {
            throw Error( "EventPluginRegistry: Failed to publish event `" + eventName + "` for plugin `" + pluginName + "`." );
          }
        }
      }
    }
  }
  /**
   * Publishes an event so that it can be dispatched by the supplied plugin.
   *
   * @param {object} dispatchConfig Dispatch configuration for the event.
   * @param {object} PluginModule Plugin publishing the event.
   * @return {boolean} True if the event was successfully published.
   * @private
   */


  function publishEventForPlugin(dispatchConfig, pluginModule, eventName) {
    if (!!eventNameDispatchConfigs.hasOwnProperty(eventName)) {
      {
        throw Error( "EventPluginRegistry: More than one plugin attempted to publish the same event name, `" + eventName + "`." );
      }
    }

    eventNameDispatchConfigs[eventName] = dispatchConfig;
    var phasedRegistrationNames = dispatchConfig.phasedRegistrationNames;

    if (phasedRegistrationNames) {
      for (var phaseName in phasedRegistrationNames) {
        if (phasedRegistrationNames.hasOwnProperty(phaseName)) {
          var phasedRegistrationName = phasedRegistrationNames[phaseName];
          publishRegistrationName(phasedRegistrationName, pluginModule, eventName);
        }
      }

      return true;
    } else if (dispatchConfig.registrationName) {
      publishRegistrationName(dispatchConfig.registrationName, pluginModule, eventName);
      return true;
    }

    return false;
  }
  /**
   * Publishes a registration name that is used to identify dispatched events.
   *
   * @param {string} registrationName Registration name to add.
   * @param {object} PluginModule Plugin publishing the event.
   * @private
   */


  function publishRegistrationName(registrationName, pluginModule, eventName) {
    if (!!registrationNameModules[registrationName]) {
      {
        throw Error( "EventPluginRegistry: More than one plugin attempted to publish the same registration name, `" + registrationName + "`." );
      }
    }

    registrationNameModules[registrationName] = pluginModule;
    registrationNameDependencies[registrationName] = pluginModule.eventTypes[eventName].dependencies;

    {
      var lowerCasedName = registrationName.toLowerCase();
      possibleRegistrationNames[lowerCasedName] = registrationName;

      if (registrationName === 'onDoubleClick') {
        possibleRegistrationNames.ondblclick = registrationName;
      }
    }
  }
  /**
   * Registers plugins so that they can extract and dispatch events.
   */

  /**
   * Ordered list of injected plugins.
   */


  var plugins = [];
  /**
   * Mapping from event name to dispatch config
   */

  var eventNameDispatchConfigs = {};
  /**
   * Mapping from registration name to plugin module
   */

  var registrationNameModules = {};
  /**
   * Mapping from registration name to event name
   */

  var registrationNameDependencies = {};
  /**
   * Mapping from lowercase registration names to the properly cased version,
   * used to warn in the case of missing event handlers. Available
   * only in true.
   * @type {Object}
   */

  var possibleRegistrationNames =  {} ; // Trust the developer to only use possibleRegistrationNames in true

  /**
   * Injects an ordering of plugins (by plugin name). This allows the ordering
   * to be decoupled from injection of the actual plugins so that ordering is
   * always deterministic regardless of packaging, on-the-fly injection, etc.
   *
   * @param {array} InjectedEventPluginOrder
   * @internal
   */

  function injectEventPluginOrder(injectedEventPluginOrder) {
    if (!!eventPluginOrder) {
      {
        throw Error( "EventPluginRegistry: Cannot inject event plugin ordering more than once. You are likely trying to load more than one copy of React." );
      }
    } // Clone the ordering so it cannot be dynamically mutated.


    eventPluginOrder = Array.prototype.slice.call(injectedEventPluginOrder);
    recomputePluginOrdering();
  }
  /**
   * Injects plugins to be used by plugin event system. The plugin names must be
   * in the ordering injected by `injectEventPluginOrder`.
   *
   * Plugins can be injected as part of page initialization or on-the-fly.
   *
   * @param {object} injectedNamesToPlugins Map from names to plugin modules.
   * @internal
   */

  function injectEventPluginsByName(injectedNamesToPlugins) {
    var isOrderingDirty = false;

    for (var pluginName in injectedNamesToPlugins) {
      if (!injectedNamesToPlugins.hasOwnProperty(pluginName)) {
        continue;
      }

      var pluginModule = injectedNamesToPlugins[pluginName];

      if (!namesToPlugins.hasOwnProperty(pluginName) || namesToPlugins[pluginName] !== pluginModule) {
        if (!!namesToPlugins[pluginName]) {
          {
            throw Error( "EventPluginRegistry: Cannot inject two different event plugins using the same name, `" + pluginName + "`." );
          }
        }

        namesToPlugins[pluginName] = pluginModule;
        isOrderingDirty = true;
      }
    }

    if (isOrderingDirty) {
      recomputePluginOrdering();
    }
  }

  var canUseDOM = !!(typeof window !== 'undefined' && typeof window.document !== 'undefined' && typeof window.document.createElement !== 'undefined');

  var ReactInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  var _assign = ReactInternals.assign;

  var PLUGIN_EVENT_SYSTEM = 1;
  var IS_REPLAYED = 1 << 5;
  var IS_FIRST_ANCESTOR = 1 << 6;

  var restoreImpl = null;
  var restoreTarget = null;
  var restoreQueue = null;

  function restoreStateOfTarget(target) {
    // We perform this translation at the end of the event loop so that we
    // always receive the correct fiber here
    var internalInstance = getInstanceFromNode(target);

    if (!internalInstance) {
      // Unmounted
      return;
    }

    if (!(typeof restoreImpl === 'function')) {
      {
        throw Error( "setRestoreImplementation() needs to be called to handle a target for controlled events. This error is likely caused by a bug in React. Please file an issue." );
      }
    }

    var stateNode = internalInstance.stateNode; // Guard against Fiber being unmounted.

    if (stateNode) {
      var _props = getFiberCurrentPropsFromNode(stateNode);

      restoreImpl(internalInstance.stateNode, internalInstance.type, _props);
    }
  }

  function setRestoreImplementation(impl) {
    restoreImpl = impl;
  }
  function enqueueStateRestore(target) {
    if (restoreTarget) {
      if (restoreQueue) {
        restoreQueue.push(target);
      } else {
        restoreQueue = [target];
      }
    } else {
      restoreTarget = target;
    }
  }
  function needsStateRestore() {
    return restoreTarget !== null || restoreQueue !== null;
  }
  function restoreStateIfNeeded() {
    if (!restoreTarget) {
      return;
    }

    var target = restoreTarget;
    var queuedTargets = restoreQueue;
    restoreTarget = null;
    restoreQueue = null;
    restoreStateOfTarget(target);

    if (queuedTargets) {
      for (var i = 0; i < queuedTargets.length; i++) {
        restoreStateOfTarget(queuedTargets[i]);
      }
    }
  }

  var enableProfilerTimer = true; // Trace which interactions trigger each commit.

  var enableDeprecatedFlareAPI = false; // Experimental Host Component support.

  var enableFundamentalAPI = false; // Experimental Scope support.
  var warnAboutStringRefs = false;

  // the renderer. Such as when we're dispatching events or if third party
  // libraries need to call batchedUpdates. Eventually, this API will go away when
  // everything is batched by default. We'll then have a similar API to opt-out of
  // scheduled work and instead do synchronous work.
  // Defaults

  var batchedUpdatesImpl = function (fn, bookkeeping) {
    return fn(bookkeeping);
  };

  var discreteUpdatesImpl = function (fn, a, b, c, d) {
    return fn(a, b, c, d);
  };

  var flushDiscreteUpdatesImpl = function () {};

  var batchedEventUpdatesImpl = batchedUpdatesImpl;
  var isInsideEventHandler = false;
  var isBatchingEventUpdates = false;

  function finishEventHandler() {
    // Here we wait until all updates have propagated, which is important
    // when using controlled components within layers:
    // https://github.com/facebook/react/issues/1698
    // Then we restore state of any controlled component.
    var controlledComponentsHavePendingUpdates = needsStateRestore();

    if (controlledComponentsHavePendingUpdates) {
      // If a controlled event was fired, we may need to restore the state of
      // the DOM node back to the controlled value. This is necessary when React
      // bails out of the update without touching the DOM.
      flushDiscreteUpdatesImpl();
      restoreStateIfNeeded();
    }
  }

  function batchedUpdates(fn, bookkeeping) {
    if (isInsideEventHandler) {
      // If we are currently inside another batch, we need to wait until it
      // fully completes before restoring state.
      return fn(bookkeeping);
    }

    isInsideEventHandler = true;

    try {
      return batchedUpdatesImpl(fn, bookkeeping);
    } finally {
      isInsideEventHandler = false;
      finishEventHandler();
    }
  }
  function batchedEventUpdates(fn, a, b) {
    if (isBatchingEventUpdates) {
      // If we are currently inside another batch, we need to wait until it
      // fully completes before restoring state.
      return fn(a, b);
    }

    isBatchingEventUpdates = true;

    try {
      return batchedEventUpdatesImpl(fn, a, b);
    } finally {
      isBatchingEventUpdates = false;
      finishEventHandler();
    }
  } // This is for the React Flare event system
  function discreteUpdates(fn, a, b, c, d) {
    var prevIsInsideEventHandler = isInsideEventHandler;
    isInsideEventHandler = true;

    try {
      return discreteUpdatesImpl(fn, a, b, c, d);
    } finally {
      isInsideEventHandler = prevIsInsideEventHandler;

      if (!isInsideEventHandler) {
        finishEventHandler();
      }
    }
  }
  function flushDiscreteUpdatesIfNeeded(timeStamp) {
    // event.timeStamp isn't overly reliable due to inconsistencies in
    // how different browsers have historically provided the time stamp.
    // Some browsers provide high-resolution time stamps for all events,
    // some provide low-resolution time stamps for all events. FF < 52
    // even mixes both time stamps together. Some browsers even report
    // negative time stamps or time stamps that are 0 (iOS9) in some cases.
    // Given we are only comparing two time stamps with equality (!==),
    // we are safe from the resolution differences. If the time stamp is 0
    // we bail-out of preventing the flush, which can affect semantics,
    // such as if an earlier flush removes or adds event listeners that
    // are fired in the subsequent flush. However, this is the same
    // behaviour as we had before this change, so the risks are low.
    if (!isInsideEventHandler && (!enableDeprecatedFlareAPI  )) {
      flushDiscreteUpdatesImpl();
    }
  }
  function setBatchingImplementation(_batchedUpdatesImpl, _discreteUpdatesImpl, _flushDiscreteUpdatesImpl, _batchedEventUpdatesImpl) {
    batchedUpdatesImpl = _batchedUpdatesImpl;
    discreteUpdatesImpl = _discreteUpdatesImpl;
    flushDiscreteUpdatesImpl = _flushDiscreteUpdatesImpl;
    batchedEventUpdatesImpl = _batchedEventUpdatesImpl;
  }

  var DiscreteEvent = 0;
  var UserBlockingEvent = 1;
  var ContinuousEvent = 2;

  var ReactInternals$1 = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  var _ReactInternals$Sched = ReactInternals$1.Scheduler,
      unstable_cancelCallback = _ReactInternals$Sched.unstable_cancelCallback,
      unstable_now = _ReactInternals$Sched.unstable_now,
      unstable_scheduleCallback = _ReactInternals$Sched.unstable_scheduleCallback,
      unstable_shouldYield = _ReactInternals$Sched.unstable_shouldYield,
      unstable_requestPaint = _ReactInternals$Sched.unstable_requestPaint,
      unstable_getFirstCallbackNode = _ReactInternals$Sched.unstable_getFirstCallbackNode,
      unstable_runWithPriority = _ReactInternals$Sched.unstable_runWithPriority,
      unstable_next = _ReactInternals$Sched.unstable_next,
      unstable_continueExecution = _ReactInternals$Sched.unstable_continueExecution,
      unstable_pauseExecution = _ReactInternals$Sched.unstable_pauseExecution,
      unstable_getCurrentPriorityLevel = _ReactInternals$Sched.unstable_getCurrentPriorityLevel,
      unstable_ImmediatePriority = _ReactInternals$Sched.unstable_ImmediatePriority,
      unstable_UserBlockingPriority = _ReactInternals$Sched.unstable_UserBlockingPriority,
      unstable_NormalPriority = _ReactInternals$Sched.unstable_NormalPriority,
      unstable_LowPriority = _ReactInternals$Sched.unstable_LowPriority,
      unstable_IdlePriority = _ReactInternals$Sched.unstable_IdlePriority,
      unstable_forceFrameRate = _ReactInternals$Sched.unstable_forceFrameRate,
      unstable_flushAllWithoutAsserting = _ReactInternals$Sched.unstable_flushAllWithoutAsserting;

  // A reserved attribute.
  // It is handled by React separately and shouldn't be written to the DOM.
  var RESERVED = 0; // A simple string attribute.
  // Attributes that aren't in the whitelist are presumed to have this type.

  var STRING = 1; // A string attribute that accepts booleans in React. In HTML, these are called
  // "enumerated" attributes with "true" and "false" as possible values.
  // When true, it should be set to a "true" string.
  // When false, it should be set to a "false" string.

  var BOOLEANISH_STRING = 2; // A real boolean attribute.
  // When true, it should be present (set either to an empty string or its name).
  // When false, it should be omitted.

  var BOOLEAN = 3; // An attribute that can be used as a flag as well as with a value.
  // When true, it should be present (set either to an empty string or its name).
  // When false, it should be omitted.
  // For any other value, should be present with that value.

  var OVERLOADED_BOOLEAN = 4; // An attribute that must be numeric or parse as a numeric.
  // When falsy, it should be removed.

  var NUMERIC = 5; // An attribute that must be positive numeric or parse as a positive numeric.
  // When falsy, it should be removed.

  var POSITIVE_NUMERIC = 6;

  /* eslint-disable max-len */
  var ATTRIBUTE_NAME_START_CHAR = ":A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD";
  /* eslint-enable max-len */

  var ATTRIBUTE_NAME_CHAR = ATTRIBUTE_NAME_START_CHAR + "\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040";
  var ROOT_ATTRIBUTE_NAME = 'data-reactroot';
  var VALID_ATTRIBUTE_NAME_REGEX = new RegExp('^[' + ATTRIBUTE_NAME_START_CHAR + '][' + ATTRIBUTE_NAME_CHAR + ']*$');
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var illegalAttributeNameCache = {};
  var validatedAttributeNameCache = {};
  function isAttributeNameSafe(attributeName) {
    if (hasOwnProperty.call(validatedAttributeNameCache, attributeName)) {
      return true;
    }

    if (hasOwnProperty.call(illegalAttributeNameCache, attributeName)) {
      return false;
    }

    if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName)) {
      validatedAttributeNameCache[attributeName] = true;
      return true;
    }

    illegalAttributeNameCache[attributeName] = true;

    {
      error('Invalid attribute name: `%s`', attributeName);
    }

    return false;
  }
  function shouldIgnoreAttribute(name, propertyInfo, isCustomComponentTag) {
    if (propertyInfo !== null) {
      return propertyInfo.type === RESERVED;
    }

    if (isCustomComponentTag) {
      return false;
    }

    if (name.length > 2 && (name[0] === 'o' || name[0] === 'O') && (name[1] === 'n' || name[1] === 'N')) {
      return true;
    }

    return false;
  }
  function shouldRemoveAttributeWithWarning(name, value, propertyInfo, isCustomComponentTag) {
    if (propertyInfo !== null && propertyInfo.type === RESERVED) {
      return false;
    }

    switch (typeof value) {
      case 'function': // $FlowIssue symbol is perfectly valid here

      case 'symbol':
        // eslint-disable-line
        return true;

      case 'boolean':
        {
          if (isCustomComponentTag) {
            return false;
          }

          if (propertyInfo !== null) {
            return !propertyInfo.acceptsBooleans;
          } else {
            var prefix = name.toLowerCase().slice(0, 5);
            return prefix !== 'data-' && prefix !== 'aria-';
          }
        }

      default:
        return false;
    }
  }
  function shouldRemoveAttribute(name, value, propertyInfo, isCustomComponentTag) {
    if (value === null || typeof value === 'undefined') {
      return true;
    }

    if (shouldRemoveAttributeWithWarning(name, value, propertyInfo, isCustomComponentTag)) {
      return true;
    }

    if (isCustomComponentTag) {
      return false;
    }

    if (propertyInfo !== null) {
      switch (propertyInfo.type) {
        case BOOLEAN:
          return !value;

        case OVERLOADED_BOOLEAN:
          return value === false;

        case NUMERIC:
          return isNaN(value);

        case POSITIVE_NUMERIC:
          return isNaN(value) || value < 1;
      }
    }

    return false;
  }
  function getPropertyInfo(name) {
    return properties.hasOwnProperty(name) ? properties[name] : null;
  }

  function PropertyInfoRecord(name, type, mustUseProperty, attributeName, attributeNamespace, sanitizeURL) {
    this.acceptsBooleans = type === BOOLEANISH_STRING || type === BOOLEAN || type === OVERLOADED_BOOLEAN;
    this.attributeName = attributeName;
    this.attributeNamespace = attributeNamespace;
    this.mustUseProperty = mustUseProperty;
    this.propertyName = name;
    this.type = type;
    this.sanitizeURL = sanitizeURL;
  } // When adding attributes to this list, be sure to also add them to
  // the `possibleStandardNames` module to ensure casing and incorrect
  // name warnings.


  var properties = {}; // These props are reserved by React. They shouldn't be written to the DOM.

  var reservedProps = ['children', 'dangerouslySetInnerHTML', // TODO: This prevents the assignment of defaultValue to regular
  // elements (not just inputs). Now that ReactDOMInput assigns to the
  // defaultValue property -- do we need this?
  'defaultValue', 'defaultChecked', 'innerHTML', 'suppressContentEditableWarning', 'suppressHydrationWarning', 'style'];

  reservedProps.forEach(function (name) {
    properties[name] = new PropertyInfoRecord(name, RESERVED, false, // mustUseProperty
    name, // attributeName
    null, // attributeNamespace
    false);
  }); // A few React string attributes have a different name.
  // This is a mapping from React prop names to the attribute names.

  [['acceptCharset', 'accept-charset'], ['className', 'class'], ['htmlFor', 'for'], ['httpEquiv', 'http-equiv']].forEach(function (_ref) {
    var name = _ref[0],
        attributeName = _ref[1];
    properties[name] = new PropertyInfoRecord(name, STRING, false, // mustUseProperty
    attributeName, // attributeName
    null, // attributeNamespace
    false);
  }); // These are "enumerated" HTML attributes that accept "true" and "false".
  // In React, we let users pass `true` and `false` even though technically
  // these aren't boolean attributes (they are coerced to strings).

  ['contentEditable', 'draggable', 'spellCheck', 'value'].forEach(function (name) {
    properties[name] = new PropertyInfoRecord(name, BOOLEANISH_STRING, false, // mustUseProperty
    name.toLowerCase(), // attributeName
    null, // attributeNamespace
    false);
  }); // These are "enumerated" SVG attributes that accept "true" and "false".
  // In React, we let users pass `true` and `false` even though technically
  // these aren't boolean attributes (they are coerced to strings).
  // Since these are SVG attributes, their attribute names are case-sensitive.

  ['autoReverse', 'externalResourcesRequired', 'focusable', 'preserveAlpha'].forEach(function (name) {
    properties[name] = new PropertyInfoRecord(name, BOOLEANISH_STRING, false, // mustUseProperty
    name, // attributeName
    null, // attributeNamespace
    false);
  }); // These are HTML boolean attributes.

  ['allowFullScreen', 'async', // Note: there is a special case that prevents it from being written to the DOM
  // on the client side because the browsers are inconsistent. Instead we call focus().
  'autoFocus', 'autoPlay', 'controls', 'default', 'defer', 'disabled', 'disablePictureInPicture', 'formNoValidate', 'hidden', 'loop', 'noModule', 'noValidate', 'open', 'playsInline', 'readOnly', 'required', 'reversed', 'scoped', 'seamless', // Microdata
  'itemScope'].forEach(function (name) {
    properties[name] = new PropertyInfoRecord(name, BOOLEAN, false, // mustUseProperty
    name.toLowerCase(), // attributeName
    null, // attributeNamespace
    false);
  }); // These are the few React props that we set as DOM properties
  // rather than attributes. These are all booleans.

  ['checked', // Note: `option.selected` is not updated if `select.multiple` is
  // disabled with `removeAttribute`. We have special logic for handling this.
  'multiple', 'muted', 'selected' // NOTE: if you add a camelCased prop to this list,
  // you'll need to set attributeName to name.toLowerCase()
  // instead in the assignment below.
  ].forEach(function (name) {
    properties[name] = new PropertyInfoRecord(name, BOOLEAN, true, // mustUseProperty
    name, // attributeName
    null, // attributeNamespace
    false);
  }); // These are HTML attributes that are "overloaded booleans": they behave like
  // booleans, but can also accept a string value.

  ['capture', 'download' // NOTE: if you add a camelCased prop to this list,
  // you'll need to set attributeName to name.toLowerCase()
  // instead in the assignment below.
  ].forEach(function (name) {
    properties[name] = new PropertyInfoRecord(name, OVERLOADED_BOOLEAN, false, // mustUseProperty
    name, // attributeName
    null, // attributeNamespace
    false);
  }); // These are HTML attributes that must be positive numbers.

  ['cols', 'rows', 'size', 'span' // NOTE: if you add a camelCased prop to this list,
  // you'll need to set attributeName to name.toLowerCase()
  // instead in the assignment below.
  ].forEach(function (name) {
    properties[name] = new PropertyInfoRecord(name, POSITIVE_NUMERIC, false, // mustUseProperty
    name, // attributeName
    null, // attributeNamespace
    false);
  }); // These are HTML attributes that must be numbers.

  ['rowSpan', 'start'].forEach(function (name) {
    properties[name] = new PropertyInfoRecord(name, NUMERIC, false, // mustUseProperty
    name.toLowerCase(), // attributeName
    null, // attributeNamespace
    false);
  });
  var CAMELIZE = /[\-\:]([a-z])/g;

  var capitalize = function (token) {
    return token[1].toUpperCase();
  }; // This is a list of all SVG attributes that need special casing, namespacing,
  // or boolean value assignment. Regular attributes that just accept strings
  // and have the same names are omitted, just like in the HTML whitelist.
  // Some of these attributes can be hard to find. This list was created by
  // scraping the MDN documentation.


  ['accent-height', 'alignment-baseline', 'arabic-form', 'baseline-shift', 'cap-height', 'clip-path', 'clip-rule', 'color-interpolation', 'color-interpolation-filters', 'color-profile', 'color-rendering', 'dominant-baseline', 'enable-background', 'fill-opacity', 'fill-rule', 'flood-color', 'flood-opacity', 'font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant', 'font-weight', 'glyph-name', 'glyph-orientation-horizontal', 'glyph-orientation-vertical', 'horiz-adv-x', 'horiz-origin-x', 'image-rendering', 'letter-spacing', 'lighting-color', 'marker-end', 'marker-mid', 'marker-start', 'overline-position', 'overline-thickness', 'paint-order', 'panose-1', 'pointer-events', 'rendering-intent', 'shape-rendering', 'stop-color', 'stop-opacity', 'strikethrough-position', 'strikethrough-thickness', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke-width', 'text-anchor', 'text-decoration', 'text-rendering', 'underline-position', 'underline-thickness', 'unicode-bidi', 'unicode-range', 'units-per-em', 'v-alphabetic', 'v-hanging', 'v-ideographic', 'v-mathematical', 'vector-effect', 'vert-adv-y', 'vert-origin-x', 'vert-origin-y', 'word-spacing', 'writing-mode', 'xmlns:xlink', 'x-height' // NOTE: if you add a camelCased prop to this list,
  // you'll need to set attributeName to name.toLowerCase()
  // instead in the assignment below.
  ].forEach(function (attributeName) {
    var name = attributeName.replace(CAMELIZE, capitalize);
    properties[name] = new PropertyInfoRecord(name, STRING, false, // mustUseProperty
    attributeName, null, // attributeNamespace
    false);
  }); // String SVG attributes with the xlink namespace.

  ['xlink:actuate', 'xlink:arcrole', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type' // NOTE: if you add a camelCased prop to this list,
  // you'll need to set attributeName to name.toLowerCase()
  // instead in the assignment below.
  ].forEach(function (attributeName) {
    var name = attributeName.replace(CAMELIZE, capitalize);
    properties[name] = new PropertyInfoRecord(name, STRING, false, // mustUseProperty
    attributeName, 'http://www.w3.org/1999/xlink', false);
  }); // String SVG attributes with the xml namespace.

  ['xml:base', 'xml:lang', 'xml:space' // NOTE: if you add a camelCased prop to this list,
  // you'll need to set attributeName to name.toLowerCase()
  // instead in the assignment below.
  ].forEach(function (attributeName) {
    var name = attributeName.replace(CAMELIZE, capitalize);
    properties[name] = new PropertyInfoRecord(name, STRING, false, // mustUseProperty
    attributeName, 'http://www.w3.org/XML/1998/namespace', false);
  }); // These attribute exists both in HTML and SVG.
  // The attribute name is case-sensitive in SVG so we can't just use
  // the React name like we do for attributes that exist only in HTML.

  ['tabIndex', 'crossOrigin'].forEach(function (attributeName) {
    properties[attributeName] = new PropertyInfoRecord(attributeName, STRING, false, // mustUseProperty
    attributeName.toLowerCase(), // attributeName
    null, // attributeNamespace
    false);
  }); // These attributes accept URLs. These must not allow javascript: URLS.
  // These will also need to accept Trusted Types object in the future.

  var xlinkHref = 'xlinkHref';
  properties[xlinkHref] = new PropertyInfoRecord('xlinkHref', STRING, false, // mustUseProperty
  'xlink:href', 'http://www.w3.org/1999/xlink', true);
  ['src', 'href', 'action', 'formAction'].forEach(function (attributeName) {
    properties[attributeName] = new PropertyInfoRecord(attributeName, STRING, false, // mustUseProperty
    attributeName.toLowerCase(), // attributeName
    null, // attributeNamespace
    true);
  });

  var ReactDebugCurrentFrame = null;

  {
    ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;
  } // A javascript: URL can contain leading C0 control or \u0020 SPACE,
  // and any newline or tab are filtered out as if they're not part of the URL.
  // https://url.spec.whatwg.org/#url-parsing
  // Tab or newline are defined as \r\n\t:
  // https://infra.spec.whatwg.org/#ascii-tab-or-newline
  // A C0 control is a code point in the range \u0000 NULL to \u001F
  // INFORMATION SEPARATOR ONE, inclusive:
  // https://infra.spec.whatwg.org/#c0-control-or-space

  /* eslint-disable max-len */


  var isJavaScriptProtocol = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*\:/i;
  var didWarn = false;

  function sanitizeURL(url) {
    {
      if (!didWarn && isJavaScriptProtocol.test(url)) {
        didWarn = true;

        error('A future version of React will block javascript: URLs as a security precaution. ' + 'Use event handlers instead if you can. If you need to generate unsafe HTML try ' + 'using dangerouslySetInnerHTML instead. React was passed %s.', JSON.stringify(url));
      }
    }
  }

  /**
   * Get the value for a property on a node. Only used in DEV for SSR validation.
   * The "expected" argument is used as a hint of what the expected value is.
   * Some properties have multiple equivalent values.
   */
  function getValueForProperty(node, name, expected, propertyInfo) {
    {
      if (propertyInfo.mustUseProperty) {
        var propertyName = propertyInfo.propertyName;
        return node[propertyName];
      } else {
        if ( propertyInfo.sanitizeURL) {
          // If we haven't fully disabled javascript: URLs, and if
          // the hydration is successful of a javascript: URL, we
          // still want to warn on the client.
          sanitizeURL('' + expected);
        }

        var attributeName = propertyInfo.attributeName;
        var stringValue = null;

        if (propertyInfo.type === OVERLOADED_BOOLEAN) {
          if (node.hasAttribute(attributeName)) {
            var value = node.getAttribute(attributeName);

            if (value === '') {
              return true;
            }

            if (shouldRemoveAttribute(name, expected, propertyInfo, false)) {
              return value;
            }

            if (value === '' + expected) {
              return expected;
            }

            return value;
          }
        } else if (node.hasAttribute(attributeName)) {
          if (shouldRemoveAttribute(name, expected, propertyInfo, false)) {
            // We had an attribute but shouldn't have had one, so read it
            // for the error message.
            return node.getAttribute(attributeName);
          }

          if (propertyInfo.type === BOOLEAN) {
            // If this was a boolean, it doesn't matter what the value is
            // the fact that we have it is the same as the expected.
            return expected;
          } // Even if this property uses a namespace we use getAttribute
          // because we assume its namespaced name is the same as our config.
          // To use getAttributeNS we need the local name which we don't have
          // in our config atm.


          stringValue = node.getAttribute(attributeName);
        }

        if (shouldRemoveAttribute(name, expected, propertyInfo, false)) {
          return stringValue === null ? expected : stringValue;
        } else if (stringValue === '' + expected) {
          return expected;
        } else {
          return stringValue;
        }
      }
    }
  }
  /**
   * Get the value for a attribute on a node. Only used in DEV for SSR validation.
   * The third argument is used as a hint of what the expected value is. Some
   * attributes have multiple equivalent values.
   */

  function getValueForAttribute(node, name, expected) {
    {
      if (!isAttributeNameSafe(name)) {
        return;
      }

      if (!node.hasAttribute(name)) {
        return expected === undefined ? undefined : null;
      }

      var value = node.getAttribute(name);

      if (value === '' + expected) {
        return expected;
      }

      return value;
    }
  }
  /**
   * Sets the value for a property on a node.
   *
   * @param {DOMElement} node
   * @param {string} name
   * @param {*} value
   */

  function setValueForProperty(node, name, value, isCustomComponentTag) {
    var propertyInfo = getPropertyInfo(name);

    if (shouldIgnoreAttribute(name, propertyInfo, isCustomComponentTag)) {
      return;
    }

    if (shouldRemoveAttribute(name, value, propertyInfo, isCustomComponentTag)) {
      value = null;
    } // If the prop isn't in the special list, treat it as a simple attribute.


    if (isCustomComponentTag || propertyInfo === null) {
      if (isAttributeNameSafe(name)) {
        var _attributeName = name;

        if (value === null) {
          node.removeAttribute(_attributeName);
        } else {
          node.setAttribute(_attributeName,  '' + value);
        }
      }

      return;
    }

    var mustUseProperty = propertyInfo.mustUseProperty;

    if (mustUseProperty) {
      var propertyName = propertyInfo.propertyName;

      if (value === null) {
        var type = propertyInfo.type;
        node[propertyName] = type === BOOLEAN ? false : '';
      } else {
        // Contrary to `setAttribute`, object properties are properly
        // `toString`ed by IE8/9.
        node[propertyName] = value;
      }

      return;
    } // The rest are treated as attributes with special cases.


    var attributeName = propertyInfo.attributeName,
        attributeNamespace = propertyInfo.attributeNamespace;

    if (value === null) {
      node.removeAttribute(attributeName);
    } else {
      var _type = propertyInfo.type;
      var attributeValue;

      if (_type === BOOLEAN || _type === OVERLOADED_BOOLEAN && value === true) {
        // If attribute type is boolean, we know for sure it won't be an execution sink
        // and we won't require Trusted Type here.
        attributeValue = '';
      } else {
        // `setAttribute` with objects becomes only `[object]` in IE8/9,
        // ('' + value) makes it output the correct toString()-value.
        {
          attributeValue = '' + value;
        }

        if (propertyInfo.sanitizeURL) {
          sanitizeURL(attributeValue.toString());
        }
      }

      if (attributeNamespace) {
        node.setAttributeNS(attributeNamespace, attributeName, attributeValue);
      } else {
        node.setAttribute(attributeName, attributeValue);
      }
    }
  }

  var BEFORE_SLASH_RE = /^(.*)[\\\/]/;
  function describeComponentFrame (name, source, ownerName) {
    var sourceInfo = '';

    if (source) {
      var path = source.fileName;
      var fileName = path.replace(BEFORE_SLASH_RE, '');

      {
        // In DEV, include code for a common special case:
        // prefer "folder/index.js" instead of just "index.js".
        if (/^index\./.test(fileName)) {
          var match = path.match(BEFORE_SLASH_RE);

          if (match) {
            var pathBeforeSlash = match[1];

            if (pathBeforeSlash) {
              var folderName = pathBeforeSlash.replace(BEFORE_SLASH_RE, '');
              fileName = folderName + '/' + fileName;
            }
          }
        }
      }

      sourceInfo = ' (at ' + fileName + ':' + source.lineNumber + ')';
    } else if (ownerName) {
      sourceInfo = ' (created by ' + ownerName + ')';
    }

    return '\n    in ' + (name || 'Unknown') + sourceInfo;
  }

  // The Symbol used to tag the ReactElement-like types. If there is no native Symbol
  // nor polyfill, then a plain number is used for performance.
  var hasSymbol = typeof Symbol === 'function' && Symbol.for;
  var REACT_ELEMENT_TYPE = hasSymbol ? Symbol.for('react.element') : 0xeac7;
  var REACT_PORTAL_TYPE = hasSymbol ? Symbol.for('react.portal') : 0xeaca;
  var REACT_FRAGMENT_TYPE = hasSymbol ? Symbol.for('react.fragment') : 0xeacb;
  var REACT_STRICT_MODE_TYPE = hasSymbol ? Symbol.for('react.strict_mode') : 0xeacc;
  var REACT_PROFILER_TYPE = hasSymbol ? Symbol.for('react.profiler') : 0xead2;
  var REACT_PROVIDER_TYPE = hasSymbol ? Symbol.for('react.provider') : 0xeacd;
  var REACT_CONTEXT_TYPE = hasSymbol ? Symbol.for('react.context') : 0xeace; // TODO: We don't use AsyncMode or ConcurrentMode anymore. They were temporary
  var REACT_CONCURRENT_MODE_TYPE = hasSymbol ? Symbol.for('react.concurrent_mode') : 0xeacf;
  var REACT_FORWARD_REF_TYPE = hasSymbol ? Symbol.for('react.forward_ref') : 0xead0;
  var REACT_SUSPENSE_TYPE = hasSymbol ? Symbol.for('react.suspense') : 0xead1;
  var REACT_SUSPENSE_LIST_TYPE = hasSymbol ? Symbol.for('react.suspense_list') : 0xead8;
  var REACT_MEMO_TYPE = hasSymbol ? Symbol.for('react.memo') : 0xead3;
  var REACT_LAZY_TYPE = hasSymbol ? Symbol.for('react.lazy') : 0xead4;
  var REACT_BLOCK_TYPE = hasSymbol ? Symbol.for('react.block') : 0xead9;
  var MAYBE_ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
  var FAUX_ITERATOR_SYMBOL = '@@iterator';
  function getIteratorFn(maybeIterable) {
    if (maybeIterable === null || typeof maybeIterable !== 'object') {
      return null;
    }

    var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];

    if (typeof maybeIterator === 'function') {
      return maybeIterator;
    }

    return null;
  }

  var Uninitialized = -1;
  var Pending = 0;
  var Resolved = 1;
  var Rejected = 2;
  function refineResolvedLazyComponent(lazyComponent) {
    return lazyComponent._status === Resolved ? lazyComponent._result : null;
  }
  function initializeLazyComponentType(lazyComponent) {
    if (lazyComponent._status === Uninitialized) {
      lazyComponent._status = Pending;
      var ctor = lazyComponent._ctor;
      var thenable = ctor();
      lazyComponent._result = thenable;
      thenable.then(function (moduleObject) {
        if (lazyComponent._status === Pending) {
          var defaultExport = moduleObject.default;

          {
            if (defaultExport === undefined) {
              error('lazy: Expected the result of a dynamic import() call. ' + 'Instead received: %s\n\nYour code should look like: \n  ' + "const MyComponent = lazy(() => import('./MyComponent'))", moduleObject);
            }
          }

          lazyComponent._status = Resolved;
          lazyComponent._result = defaultExport;
        }
      }, function (error) {
        if (lazyComponent._status === Pending) {
          lazyComponent._status = Rejected;
          lazyComponent._result = error;
        }
      });
    }
  }

  function getWrappedName(outerType, innerType, wrapperName) {
    var functionName = innerType.displayName || innerType.name || '';
    return outerType.displayName || (functionName !== '' ? wrapperName + "(" + functionName + ")" : wrapperName);
  }

  function getComponentName(type) {
    if (type == null) {
      // Host root, text node or just invalid type.
      return null;
    }

    {
      if (typeof type.tag === 'number') {
        error('Received an unexpected object in getComponentName(). ' + 'This is likely a bug in React. Please file an issue.');
      }
    }

    if (typeof type === 'function') {
      return type.displayName || type.name || null;
    }

    if (typeof type === 'string') {
      return type;
    }

    switch (type) {
      case REACT_FRAGMENT_TYPE:
        return 'Fragment';

      case REACT_PORTAL_TYPE:
        return 'Portal';

      case REACT_PROFILER_TYPE:
        return "Profiler";

      case REACT_STRICT_MODE_TYPE:
        return 'StrictMode';

      case REACT_SUSPENSE_TYPE:
        return 'Suspense';

      case REACT_SUSPENSE_LIST_TYPE:
        return 'SuspenseList';
    }

    if (typeof type === 'object') {
      switch (type.$$typeof) {
        case REACT_CONTEXT_TYPE:
          return 'Context.Consumer';

        case REACT_PROVIDER_TYPE:
          return 'Context.Provider';

        case REACT_FORWARD_REF_TYPE:
          return getWrappedName(type, type.render, 'ForwardRef');

        case REACT_MEMO_TYPE:
          return getComponentName(type.type);

        case REACT_BLOCK_TYPE:
          return getComponentName(type.render);

        case REACT_LAZY_TYPE:
          {
            var thenable = type;
            var resolvedThenable = refineResolvedLazyComponent(thenable);

            if (resolvedThenable) {
              return getComponentName(resolvedThenable);
            }

            break;
          }
      }
    }

    return null;
  }

  var ReactDebugCurrentFrame$1 = ReactSharedInternals.ReactDebugCurrentFrame;

  function describeFiber(fiber) {
    switch (fiber.tag) {
      case HostRoot:
      case HostPortal:
      case HostText:
      case Fragment:
      case ContextProvider:
      case ContextConsumer:
        return '';

      default:
        var owner = fiber._debugOwner;
        var source = fiber._debugSource;
        var name = getComponentName(fiber.type);
        var ownerName = null;

        if (owner) {
          ownerName = getComponentName(owner.type);
        }

        return describeComponentFrame(name, source, ownerName);
    }
  }

  function getStackByFiberInDevAndProd(workInProgress) {
    var info = '';
    var node = workInProgress;

    do {
      info += describeFiber(node);
      node = node.return;
    } while (node);

    return info;
  }
  var current = null;
  var isRendering = false;
  function getCurrentFiberOwnerNameInDevOrNull() {
    {
      if (current === null) {
        return null;
      }

      var owner = current._debugOwner;

      if (owner !== null && typeof owner !== 'undefined') {
        return getComponentName(owner.type);
      }
    }

    return null;
  }
  function getCurrentFiberStackInDev() {
    {
      if (current === null) {
        return '';
      } // Safe because if current fiber exists, we are reconciling,
      // and it is guaranteed to be the work-in-progress version.


      return getStackByFiberInDevAndProd(current);
    }
  }
  function resetCurrentFiber() {
    {
      ReactDebugCurrentFrame$1.getCurrentStack = null;
      current = null;
      isRendering = false;
    }
  }
  function setCurrentFiber(fiber) {
    {
      ReactDebugCurrentFrame$1.getCurrentStack = getCurrentFiberStackInDev;
      current = fiber;
      isRendering = false;
    }
  }
  function setIsRendering(rendering) {
    {
      isRendering = rendering;
    }
  }

  // Flow does not allow string concatenation of most non-string types. To work
  // around this limitation, we use an opaque type that can only be obtained by
  // passing the value through getToStringValue first.
  function toString(value) {
    return '' + value;
  }
  function getToStringValue(value) {
    switch (typeof value) {
      case 'boolean':
      case 'number':
      case 'object':
      case 'string':
      case 'undefined':
        return value;

      default:
        // function, symbol are assigned as empty strings
        return '';
    }
  }

  /**
   * Copyright (c) 2013-present, Facebook, Inc.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */

  var ReactPropTypesSecret = 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED';

  var ReactPropTypesSecret_1 = ReactPropTypesSecret;

  var printWarning$1 = function() {};

  {
    var ReactPropTypesSecret$1 = ReactPropTypesSecret_1;
    var loggedTypeFailures = {};
    var has = Function.call.bind(Object.prototype.hasOwnProperty);

    printWarning$1 = function(text) {
      var message = 'Warning: ' + text;
      if (typeof console !== 'undefined') {
        console.error(message);
      }
      try {
        // --- Welcome to debugging React ---
        // This error was thrown as a convenience so that you can use this stack
        // to find the callsite that caused this warning to fire.
        throw new Error(message);
      } catch (x) {}
    };
  }

  /**
   * Assert that the values match with the type specs.
   * Error messages are memorized and will only be shown once.
   *
   * @param {object} typeSpecs Map of name to a ReactPropType
   * @param {object} values Runtime values that need to be type-checked
   * @param {string} location e.g. "prop", "context", "child context"
   * @param {string} componentName Name of the component for error messages.
   * @param {?Function} getStack Returns the component stack.
   * @private
   */
  function checkPropTypes(typeSpecs, values, location, componentName, getStack) {
    {
      for (var typeSpecName in typeSpecs) {
        if (has(typeSpecs, typeSpecName)) {
          var error;
          // Prop type validation may throw. In case they do, we don't want to
          // fail the render phase where it didn't fail before. So we log it.
          // After these have been cleaned up, we'll let them throw.
          try {
            // This is intentionally an invariant that gets caught. It's the same
            // behavior as without this statement except with a better message.
            if (typeof typeSpecs[typeSpecName] !== 'function') {
              var err = Error(
                (componentName || 'React class') + ': ' + location + ' type `' + typeSpecName + '` is invalid; ' +
                'it must be a function, usually from the `prop-types` package, but received `' + typeof typeSpecs[typeSpecName] + '`.'
              );
              err.name = 'Invariant Violation';
              throw err;
            }
            error = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, ReactPropTypesSecret$1);
          } catch (ex) {
            error = ex;
          }
          if (error && !(error instanceof Error)) {
            printWarning$1(
              (componentName || 'React class') + ': type specification of ' +
              location + ' `' + typeSpecName + '` is invalid; the type checker ' +
              'function must return `null` or an `Error` but returned a ' + typeof error + '. ' +
              'You may have forgotten to pass an argument to the type checker ' +
              'creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and ' +
              'shape all require an argument).'
            );
          }
          if (error instanceof Error && !(error.message in loggedTypeFailures)) {
            // Only monitor this failure once because there tends to be a lot of the
            // same error.
            loggedTypeFailures[error.message] = true;

            var stack = getStack ? getStack() : '';

            printWarning$1(
              'Failed ' + location + ' type: ' + error.message + (stack != null ? stack : '')
            );
          }
        }
      }
    }
  }

  /**
   * Resets warning cache when testing.
   *
   * @private
   */
  checkPropTypes.resetWarningCache = function() {
    {
      loggedTypeFailures = {};
    }
  };

  var checkPropTypes_1 = checkPropTypes;

  var ReactDebugCurrentFrame$2 = null;
  var ReactControlledValuePropTypes = {
    checkPropTypes: null
  };

  {
    ReactDebugCurrentFrame$2 = ReactSharedInternals.ReactDebugCurrentFrame;
    var hasReadOnlyValue = {
      button: true,
      checkbox: true,
      image: true,
      hidden: true,
      radio: true,
      reset: true,
      submit: true
    };
    var propTypes = {
      value: function (props, propName, componentName) {
        if (hasReadOnlyValue[props.type] || props.onChange || props.readOnly || props.disabled || props[propName] == null || enableDeprecatedFlareAPI ) {
          return null;
        }

        return new Error('You provided a `value` prop to a form field without an ' + '`onChange` handler. This will render a read-only field. If ' + 'the field should be mutable use `defaultValue`. Otherwise, ' + 'set either `onChange` or `readOnly`.');
      },
      checked: function (props, propName, componentName) {
        if (props.onChange || props.readOnly || props.disabled || props[propName] == null || enableDeprecatedFlareAPI ) {
          return null;
        }

        return new Error('You provided a `checked` prop to a form field without an ' + '`onChange` handler. This will render a read-only field. If ' + 'the field should be mutable use `defaultChecked`. Otherwise, ' + 'set either `onChange` or `readOnly`.');
      }
    };
    /**
     * Provide a linked `value` attribute for controlled forms. You should not use
     * this outside of the ReactDOM controlled form components.
     */

    ReactControlledValuePropTypes.checkPropTypes = function (tagName, props) {
      checkPropTypes_1(propTypes, props, 'prop', tagName, ReactDebugCurrentFrame$2.getStackAddendum);
    };
  }

  function isCheckable(elem) {
    var type = elem.type;
    var nodeName = elem.nodeName;
    return nodeName && nodeName.toLowerCase() === 'input' && (type === 'checkbox' || type === 'radio');
  }

  function getTracker(node) {
    return node._valueTracker;
  }

  function detachTracker(node) {
    node._valueTracker = null;
  }

  function getValueFromNode(node) {
    var value = '';

    if (!node) {
      return value;
    }

    if (isCheckable(node)) {
      value = node.checked ? 'true' : 'false';
    } else {
      value = node.value;
    }

    return value;
  }

  function trackValueOnNode(node) {
    var valueField = isCheckable(node) ? 'checked' : 'value';
    var descriptor = Object.getOwnPropertyDescriptor(node.constructor.prototype, valueField);
    var currentValue = '' + node[valueField]; // if someone has already defined a value or Safari, then bail
    // and don't track value will cause over reporting of changes,
    // but it's better then a hard failure
    // (needed for certain tests that spyOn input values and Safari)

    if (node.hasOwnProperty(valueField) || typeof descriptor === 'undefined' || typeof descriptor.get !== 'function' || typeof descriptor.set !== 'function') {
      return;
    }

    var get = descriptor.get,
        set = descriptor.set;
    Object.defineProperty(node, valueField, {
      configurable: true,
      get: function () {
        return get.call(this);
      },
      set: function (value) {
        currentValue = '' + value;
        set.call(this, value);
      }
    }); // We could've passed this the first time
    // but it triggers a bug in IE11 and Edge 14/15.
    // Calling defineProperty() again should be equivalent.
    // https://github.com/facebook/react/issues/11768

    Object.defineProperty(node, valueField, {
      enumerable: descriptor.enumerable
    });
    var tracker = {
      getValue: function () {
        return currentValue;
      },
      setValue: function (value) {
        currentValue = '' + value;
      },
      stopTracking: function () {
        detachTracker(node);
        delete node[valueField];
      }
    };
    return tracker;
  }

  function track(node) {
    if (getTracker(node)) {
      return;
    } // TODO: Once it's just Fiber we can move this to node._wrapperState


    node._valueTracker = trackValueOnNode(node);
  }
  function updateValueIfChanged(node) {
    if (!node) {
      return false;
    }

    var tracker = getTracker(node); // if there is no tracker at this point it's unlikely
    // that trying again will succeed

    if (!tracker) {
      return true;
    }

    var lastValue = tracker.getValue();
    var nextValue = getValueFromNode(node);

    if (nextValue !== lastValue) {
      tracker.setValue(nextValue);
      return true;
    }

    return false;
  }

  var didWarnValueDefaultValue = false;
  var didWarnCheckedDefaultChecked = false;
  var didWarnControlledToUncontrolled = false;
  var didWarnUncontrolledToControlled = false;

  function isControlled(props) {
    var usesChecked = props.type === 'checkbox' || props.type === 'radio';
    return usesChecked ? props.checked != null : props.value != null;
  }
  /**
   * Implements an <input> host component that allows setting these optional
   * props: `checked`, `value`, `defaultChecked`, and `defaultValue`.
   *
   * If `checked` or `value` are not supplied (or null/undefined), user actions
   * that affect the checked state or value will trigger updates to the element.
   *
   * If they are supplied (and not null/undefined), the rendered element will not
   * trigger updates to the element. Instead, the props must change in order for
   * the rendered element to be updated.
   *
   * The rendered element will be initialized as unchecked (or `defaultChecked`)
   * with an empty value (or `defaultValue`).
   *
   * See http://www.w3.org/TR/2012/WD-html5-20121025/the-input-element.html
   */


  function getHostProps(element, props) {
    var node = element;
    var checked = props.checked;

    var hostProps = _assign({}, props, {
      defaultChecked: undefined,
      defaultValue: undefined,
      value: undefined,
      checked: checked != null ? checked : node._wrapperState.initialChecked
    });

    return hostProps;
  }
  function initWrapperState(element, props) {
    {
      ReactControlledValuePropTypes.checkPropTypes('input', props);

      if (props.checked !== undefined && props.defaultChecked !== undefined && !didWarnCheckedDefaultChecked) {
        error('%s contains an input of type %s with both checked and defaultChecked props. ' + 'Input elements must be either controlled or uncontrolled ' + '(specify either the checked prop, or the defaultChecked prop, but not ' + 'both). Decide between using a controlled or uncontrolled input ' + 'element and remove one of these props. More info: ' + 'https://fb.me/react-controlled-components', getCurrentFiberOwnerNameInDevOrNull() || 'A component', props.type);

        didWarnCheckedDefaultChecked = true;
      }

      if (props.value !== undefined && props.defaultValue !== undefined && !didWarnValueDefaultValue) {
        error('%s contains an input of type %s with both value and defaultValue props. ' + 'Input elements must be either controlled or uncontrolled ' + '(specify either the value prop, or the defaultValue prop, but not ' + 'both). Decide between using a controlled or uncontrolled input ' + 'element and remove one of these props. More info: ' + 'https://fb.me/react-controlled-components', getCurrentFiberOwnerNameInDevOrNull() || 'A component', props.type);

        didWarnValueDefaultValue = true;
      }
    }

    var node = element;
    var defaultValue = props.defaultValue == null ? '' : props.defaultValue;
    node._wrapperState = {
      initialChecked: props.checked != null ? props.checked : props.defaultChecked,
      initialValue: getToStringValue(props.value != null ? props.value : defaultValue),
      controlled: isControlled(props)
    };
  }
  function updateChecked(element, props) {
    var node = element;
    var checked = props.checked;

    if (checked != null) {
      setValueForProperty(node, 'checked', checked, false);
    }
  }
  function updateWrapper(element, props) {
    var node = element;

    {
      var controlled = isControlled(props);

      if (!node._wrapperState.controlled && controlled && !didWarnUncontrolledToControlled) {
        error('A component is changing an uncontrolled input of type %s to be controlled. ' + 'Input elements should not switch from uncontrolled to controlled (or vice versa). ' + 'Decide between using a controlled or uncontrolled input ' + 'element for the lifetime of the component. More info: https://fb.me/react-controlled-components', props.type);

        didWarnUncontrolledToControlled = true;
      }

      if (node._wrapperState.controlled && !controlled && !didWarnControlledToUncontrolled) {
        error('A component is changing a controlled input of type %s to be uncontrolled. ' + 'Input elements should not switch from controlled to uncontrolled (or vice versa). ' + 'Decide between using a controlled or uncontrolled input ' + 'element for the lifetime of the component. More info: https://fb.me/react-controlled-components', props.type);

        didWarnControlledToUncontrolled = true;
      }
    }

    updateChecked(element, props);
    var value = getToStringValue(props.value);
    var type = props.type;

    if (value != null) {
      if (type === 'number') {
        if (value === 0 && node.value === '' || // We explicitly want to coerce to number here if possible.
        // eslint-disable-next-line
        node.value != value) {
          node.value = toString(value);
        }
      } else if (node.value !== toString(value)) {
        node.value = toString(value);
      }
    } else if (type === 'submit' || type === 'reset') {
      // Submit/reset inputs need the attribute removed completely to avoid
      // blank-text buttons.
      node.removeAttribute('value');
      return;
    }

    {
      // When syncing the value attribute, the value comes from a cascade of
      // properties:
      //  1. The value React property
      //  2. The defaultValue React property
      //  3. Otherwise there should be no change
      if (props.hasOwnProperty('value')) {
        setDefaultValue(node, props.type, value);
      } else if (props.hasOwnProperty('defaultValue')) {
        setDefaultValue(node, props.type, getToStringValue(props.defaultValue));
      }
    }

    {
      // When syncing the checked attribute, it only changes when it needs
      // to be removed, such as transitioning from a checkbox into a text input
      if (props.checked == null && props.defaultChecked != null) {
        node.defaultChecked = !!props.defaultChecked;
      }
    }
  }
  function postMountWrapper(element, props, isHydrating) {
    var node = element; // Do not assign value if it is already set. This prevents user text input
    // from being lost during SSR hydration.

    if (props.hasOwnProperty('value') || props.hasOwnProperty('defaultValue')) {
      var type = props.type;
      var isButton = type === 'submit' || type === 'reset'; // Avoid setting value attribute on submit/reset inputs as it overrides the
      // default value provided by the browser. See: #12872

      if (isButton && (props.value === undefined || props.value === null)) {
        return;
      }

      var initialValue = toString(node._wrapperState.initialValue); // Do not assign value if it is already set. This prevents user text input
      // from being lost during SSR hydration.

      if (!isHydrating) {
        {
          // When syncing the value attribute, the value property should use
          // the wrapperState._initialValue property. This uses:
          //
          //   1. The value React property when present
          //   2. The defaultValue React property when present
          //   3. An empty string
          if (initialValue !== node.value) {
            node.value = initialValue;
          }
        }
      }

      {
        // Otherwise, the value attribute is synchronized to the property,
        // so we assign defaultValue to the same thing as the value property
        // assignment step above.
        node.defaultValue = initialValue;
      }
    } // Normally, we'd just do `node.checked = node.checked` upon initial mount, less this bug
    // this is needed to work around a chrome bug where setting defaultChecked
    // will sometimes influence the value of checked (even after detachment).
    // Reference: https://bugs.chromium.org/p/chromium/issues/detail?id=608416
    // We need to temporarily unset name to avoid disrupting radio button groups.


    var name = node.name;

    if (name !== '') {
      node.name = '';
    }

    {
      // When syncing the checked attribute, both the checked property and
      // attribute are assigned at the same time using defaultChecked. This uses:
      //
      //   1. The checked React property when present
      //   2. The defaultChecked React property when present
      //   3. Otherwise, false
      node.defaultChecked = !node.defaultChecked;
      node.defaultChecked = !!node._wrapperState.initialChecked;
    }

    if (name !== '') {
      node.name = name;
    }
  }
  function restoreControlledState(element, props) {
    var node = element;
    updateWrapper(node, props);
    updateNamedCousins(node, props);
  }

  function updateNamedCousins(rootNode, props) {
    var name = props.name;

    if (props.type === 'radio' && name != null) {
      var queryRoot = rootNode;

      while (queryRoot.parentNode) {
        queryRoot = queryRoot.parentNode;
      } // If `rootNode.form` was non-null, then we could try `form.elements`,
      // but that sometimes behaves strangely in IE8. We could also try using
      // `form.getElementsByName`, but that will only return direct children
      // and won't include inputs that use the HTML5 `form=` attribute. Since
      // the input might not even be in a form. It might not even be in the
      // document. Let's just use the local `querySelectorAll` to ensure we don't
      // miss anything.


      var group = queryRoot.querySelectorAll('input[name=' + JSON.stringify('' + name) + '][type="radio"]');

      for (var i = 0; i < group.length; i++) {
        var otherNode = group[i];

        if (otherNode === rootNode || otherNode.form !== rootNode.form) {
          continue;
        } // This will throw if radio buttons rendered by different copies of React
        // and the same name are rendered into the same form (same as #1939).
        // That's probably okay; we don't support it just as we don't support
        // mixing React radio buttons with non-React ones.


        var otherProps = getFiberCurrentPropsFromNode$1(otherNode);

        if (!otherProps) {
          {
            throw Error( "ReactDOMInput: Mixing React and non-React radio inputs with the same `name` is not supported." );
          }
        } // We need update the tracked value on the named cousin since the value
        // was changed but the input saw no event or value set


        updateValueIfChanged(otherNode); // If this is a controlled radio button group, forcing the input that
        // was previously checked to update will cause it to be come re-checked
        // as appropriate.

        updateWrapper(otherNode, otherProps);
      }
    }
  } // In Chrome, assigning defaultValue to certain input types triggers input validation.
  // For number inputs, the display value loses trailing decimal points. For email inputs,
  // Chrome raises "The specified value <x> is not a valid email address".
  //
  // Here we check to see if the defaultValue has actually changed, avoiding these problems
  // when the user is inputting text
  //
  // https://github.com/facebook/react/issues/7253


  function setDefaultValue(node, type, value) {
    if ( // Focused number inputs synchronize on blur. See ChangeEventPlugin.js
    type !== 'number' || node.ownerDocument.activeElement !== node) {
      if (value == null) {
        node.defaultValue = toString(node._wrapperState.initialValue);
      } else if (node.defaultValue !== toString(value)) {
        node.defaultValue = toString(value);
      }
    }
  }

  var didWarnSelectedSetOnOption = false;
  var didWarnInvalidChild = false;

  function flattenChildren(children) {
    var content = ''; // Flatten children. We'll warn if they are invalid
    // during validateProps() which runs for hydration too.
    // Note that this would throw on non-element objects.
    // Elements are stringified (which is normally irrelevant
    // but matters for <fbt>).

    React.Children.forEach(children, function (child) {
      if (child == null) {
        return;
      }

      content += child; // Note: we don't warn about invalid children here.
      // Instead, this is done separately below so that
      // it happens during the hydration codepath too.
    });
    return content;
  }
  /**
   * Implements an <option> host component that warns when `selected` is set.
   */


  function validateProps(element, props) {
    {
      // This mirrors the codepath above, but runs for hydration too.
      // Warn about invalid children here so that client and hydration are consistent.
      // TODO: this seems like it could cause a DEV-only throw for hydration
      // if children contains a non-element object. We should try to avoid that.
      if (typeof props.children === 'object' && props.children !== null) {
        React.Children.forEach(props.children, function (child) {
          if (child == null) {
            return;
          }

          if (typeof child === 'string' || typeof child === 'number') {
            return;
          }

          if (typeof child.type !== 'string') {
            return;
          }

          if (!didWarnInvalidChild) {
            didWarnInvalidChild = true;

            error('Only strings and numbers are supported as <option> children.');
          }
        });
      } // TODO: Remove support for `selected` in <option>.


      if (props.selected != null && !didWarnSelectedSetOnOption) {
        error('Use the `defaultValue` or `value` props on <select> instead of ' + 'setting `selected` on <option>.');

        didWarnSelectedSetOnOption = true;
      }
    }
  }
  function postMountWrapper$1(element, props) {
    // value="" should make a value attribute (#6219)
    if (props.value != null) {
      element.setAttribute('value', toString(getToStringValue(props.value)));
    }
  }
  function getHostProps$1(element, props) {
    var hostProps = _assign({
      children: undefined
    }, props);

    var content = flattenChildren(props.children);

    if (content) {
      hostProps.children = content;
    }

    return hostProps;
  }

  var didWarnValueDefaultValue$1;

  {
    didWarnValueDefaultValue$1 = false;
  }

  function getDeclarationErrorAddendum() {
    var ownerName = getCurrentFiberOwnerNameInDevOrNull();

    if (ownerName) {
      return '\n\nCheck the render method of `' + ownerName + '`.';
    }

    return '';
  }

  var valuePropNames = ['value', 'defaultValue'];
  /**
   * Validation function for `value` and `defaultValue`.
   */

  function checkSelectPropTypes(props) {
    {
      ReactControlledValuePropTypes.checkPropTypes('select', props);

      for (var i = 0; i < valuePropNames.length; i++) {
        var propName = valuePropNames[i];

        if (props[propName] == null) {
          continue;
        }

        var isArray = Array.isArray(props[propName]);

        if (props.multiple && !isArray) {
          error('The `%s` prop supplied to <select> must be an array if ' + '`multiple` is true.%s', propName, getDeclarationErrorAddendum());
        } else if (!props.multiple && isArray) {
          error('The `%s` prop supplied to <select> must be a scalar ' + 'value if `multiple` is false.%s', propName, getDeclarationErrorAddendum());
        }
      }
    }
  }

  function updateOptions(node, multiple, propValue, setDefaultSelected) {
    var options = node.options;

    if (multiple) {
      var selectedValues = propValue;
      var selectedValue = {};

      for (var i = 0; i < selectedValues.length; i++) {
        // Prefix to avoid chaos with special keys.
        selectedValue['$' + selectedValues[i]] = true;
      }

      for (var _i = 0; _i < options.length; _i++) {
        var selected = selectedValue.hasOwnProperty('$' + options[_i].value);

        if (options[_i].selected !== selected) {
          options[_i].selected = selected;
        }

        if (selected && setDefaultSelected) {
          options[_i].defaultSelected = true;
        }
      }
    } else {
      // Do not set `select.value` as exact behavior isn't consistent across all
      // browsers for all cases.
      var _selectedValue = toString(getToStringValue(propValue));

      var defaultSelected = null;

      for (var _i2 = 0; _i2 < options.length; _i2++) {
        if (options[_i2].value === _selectedValue) {
          options[_i2].selected = true;

          if (setDefaultSelected) {
            options[_i2].defaultSelected = true;
          }

          return;
        }

        if (defaultSelected === null && !options[_i2].disabled) {
          defaultSelected = options[_i2];
        }
      }

      if (defaultSelected !== null) {
        defaultSelected.selected = true;
      }
    }
  }
  /**
   * Implements a <select> host component that allows optionally setting the
   * props `value` and `defaultValue`. If `multiple` is false, the prop must be a
   * stringable. If `multiple` is true, the prop must be an array of stringables.
   *
   * If `value` is not supplied (or null/undefined), user actions that change the
   * selected option will trigger updates to the rendered options.
   *
   * If it is supplied (and not null/undefined), the rendered options will not
   * update in response to user actions. Instead, the `value` prop must change in
   * order for the rendered options to update.
   *
   * If `defaultValue` is provided, any options with the supplied values will be
   * selected.
   */


  function getHostProps$2(element, props) {
    return _assign({}, props, {
      value: undefined
    });
  }
  function initWrapperState$1(element, props) {
    var node = element;

    {
      checkSelectPropTypes(props);
    }

    node._wrapperState = {
      wasMultiple: !!props.multiple
    };

    {
      if (props.value !== undefined && props.defaultValue !== undefined && !didWarnValueDefaultValue$1) {
        error('Select elements must be either controlled or uncontrolled ' + '(specify either the value prop, or the defaultValue prop, but not ' + 'both). Decide between using a controlled or uncontrolled select ' + 'element and remove one of these props. More info: ' + 'https://fb.me/react-controlled-components');

        didWarnValueDefaultValue$1 = true;
      }
    }
  }
  function postMountWrapper$2(element, props) {
    var node = element;
    node.multiple = !!props.multiple;
    var value = props.value;

    if (value != null) {
      updateOptions(node, !!props.multiple, value, false);
    } else if (props.defaultValue != null) {
      updateOptions(node, !!props.multiple, props.defaultValue, true);
    }
  }
  function postUpdateWrapper(element, props) {
    var node = element;
    var wasMultiple = node._wrapperState.wasMultiple;
    node._wrapperState.wasMultiple = !!props.multiple;
    var value = props.value;

    if (value != null) {
      updateOptions(node, !!props.multiple, value, false);
    } else if (wasMultiple !== !!props.multiple) {
      // For simplicity, reapply `defaultValue` if `multiple` is toggled.
      if (props.defaultValue != null) {
        updateOptions(node, !!props.multiple, props.defaultValue, true);
      } else {
        // Revert the select back to its default unselected state.
        updateOptions(node, !!props.multiple, props.multiple ? [] : '', false);
      }
    }
  }
  function restoreControlledState$1(element, props) {
    var node = element;
    var value = props.value;

    if (value != null) {
      updateOptions(node, !!props.multiple, value, false);
    }
  }

  var didWarnValDefaultVal = false;

  /**
   * Implements a <textarea> host component that allows setting `value`, and
   * `defaultValue`. This differs from the traditional DOM API because value is
   * usually set as PCDATA children.
   *
   * If `value` is not supplied (or null/undefined), user actions that affect the
   * value will trigger updates to the element.
   *
   * If `value` is supplied (and not null/undefined), the rendered element will
   * not trigger updates to the element. Instead, the `value` prop must change in
   * order for the rendered element to be updated.
   *
   * The rendered element will be initialized with an empty value, the prop
   * `defaultValue` if specified, or the children content (deprecated).
   */
  function getHostProps$3(element, props) {
    var node = element;

    if (!(props.dangerouslySetInnerHTML == null)) {
      {
        throw Error( "`dangerouslySetInnerHTML` does not make sense on <textarea>." );
      }
    } // Always set children to the same thing. In IE9, the selection range will
    // get reset if `textContent` is mutated.  We could add a check in setTextContent
    // to only set the value if/when the value differs from the node value (which would
    // completely solve this IE9 bug), but Sebastian+Sophie seemed to like this
    // solution. The value can be a boolean or object so that's why it's forced
    // to be a string.


    var hostProps = _assign({}, props, {
      value: undefined,
      defaultValue: undefined,
      children: toString(node._wrapperState.initialValue)
    });

    return hostProps;
  }
  function initWrapperState$2(element, props) {
    var node = element;

    {
      ReactControlledValuePropTypes.checkPropTypes('textarea', props);

      if (props.value !== undefined && props.defaultValue !== undefined && !didWarnValDefaultVal) {
        error('%s contains a textarea with both value and defaultValue props. ' + 'Textarea elements must be either controlled or uncontrolled ' + '(specify either the value prop, or the defaultValue prop, but not ' + 'both). Decide between using a controlled or uncontrolled textarea ' + 'and remove one of these props. More info: ' + 'https://fb.me/react-controlled-components', getCurrentFiberOwnerNameInDevOrNull() || 'A component');

        didWarnValDefaultVal = true;
      }
    }

    var initialValue = props.value; // Only bother fetching default value if we're going to use it

    if (initialValue == null) {
      var children = props.children,
          defaultValue = props.defaultValue;

      if (children != null) {
        {
          error('Use the `defaultValue` or `value` props instead of setting ' + 'children on <textarea>.');
        }

        {
          if (!(defaultValue == null)) {
            {
              throw Error( "If you supply `defaultValue` on a <textarea>, do not pass children." );
            }
          }

          if (Array.isArray(children)) {
            if (!(children.length <= 1)) {
              {
                throw Error( "<textarea> can only have at most one child." );
              }
            }

            children = children[0];
          }

          defaultValue = children;
        }
      }

      if (defaultValue == null) {
        defaultValue = '';
      }

      initialValue = defaultValue;
    }

    node._wrapperState = {
      initialValue: getToStringValue(initialValue)
    };
  }
  function updateWrapper$1(element, props) {
    var node = element;
    var value = getToStringValue(props.value);
    var defaultValue = getToStringValue(props.defaultValue);

    if (value != null) {
      // Cast `value` to a string to ensure the value is set correctly. While
      // browsers typically do this as necessary, jsdom doesn't.
      var newValue = toString(value); // To avoid side effects (such as losing text selection), only set value if changed

      if (newValue !== node.value) {
        node.value = newValue;
      }

      if (props.defaultValue == null && node.defaultValue !== newValue) {
        node.defaultValue = newValue;
      }
    }

    if (defaultValue != null) {
      node.defaultValue = toString(defaultValue);
    }
  }
  function postMountWrapper$3(element, props) {
    var node = element; // This is in postMount because we need access to the DOM node, which is not
    // available until after the component has mounted.

    var textContent = node.textContent; // Only set node.value if textContent is equal to the expected
    // initial value. In IE10/IE11 there is a bug where the placeholder attribute
    // will populate textContent as well.
    // https://developer.microsoft.com/microsoft-edge/platform/issues/101525/

    if (textContent === node._wrapperState.initialValue) {
      if (textContent !== '' && textContent !== null) {
        node.value = textContent;
      }
    }
  }
  function restoreControlledState$2(element, props) {
    // DOM component is still mounted; update
    updateWrapper$1(element, props);
  }

  var HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
  var MATH_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';
  var SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
  var Namespaces = {
    html: HTML_NAMESPACE,
    mathml: MATH_NAMESPACE,
    svg: SVG_NAMESPACE
  }; // Assumes there is no parent namespace.

  function getIntrinsicNamespace(type) {
    switch (type) {
      case 'svg':
        return SVG_NAMESPACE;

      case 'math':
        return MATH_NAMESPACE;

      default:
        return HTML_NAMESPACE;
    }
  }
  function getChildNamespace(parentNamespace, type) {
    if (parentNamespace == null || parentNamespace === HTML_NAMESPACE) {
      // No (or default) parent namespace: potential entry point.
      return getIntrinsicNamespace(type);
    }

    if (parentNamespace === SVG_NAMESPACE && type === 'foreignObject') {
      // We're leaving SVG.
      return HTML_NAMESPACE;
    } // By default, pass namespace below.


    return parentNamespace;
  }

  /* globals MSApp */

  /**
   * Create a function which has 'unsafe' privileges (required by windows8 apps)
   */
  var createMicrosoftUnsafeLocalFunction = function (func) {
    if (typeof MSApp !== 'undefined' && MSApp.execUnsafeLocalFunction) {
      return function (arg0, arg1, arg2, arg3) {
        MSApp.execUnsafeLocalFunction(function () {
          return func(arg0, arg1, arg2, arg3);
        });
      };
    } else {
      return func;
    }
  };

  var reusableSVGContainer;
  /**
   * Set the innerHTML property of a node
   *
   * @param {DOMElement} node
   * @param {string} html
   * @internal
   */

  var setInnerHTML = createMicrosoftUnsafeLocalFunction(function (node, html) {
    if (node.namespaceURI === Namespaces.svg) {

      if (!('innerHTML' in node)) {
        // IE does not have innerHTML for SVG nodes, so instead we inject the
        // new markup in a temp node and then move the child nodes across into
        // the target node
        reusableSVGContainer = reusableSVGContainer || document.createElement('div');
        reusableSVGContainer.innerHTML = '<svg>' + html.valueOf().toString() + '</svg>';
        var svgNode = reusableSVGContainer.firstChild;

        while (node.firstChild) {
          node.removeChild(node.firstChild);
        }

        while (svgNode.firstChild) {
          node.appendChild(svgNode.firstChild);
        }

        return;
      }
    }

    node.innerHTML = html;
  });

  /**
   * HTML nodeType values that represent the type of the node
   */
  var ELEMENT_NODE = 1;
  var TEXT_NODE = 3;
  var COMMENT_NODE = 8;
  var DOCUMENT_NODE = 9;
  var DOCUMENT_FRAGMENT_NODE = 11;

  /**
   * Set the textContent property of a node. For text updates, it's faster
   * to set the `nodeValue` of the Text node directly instead of using
   * `.textContent` which will remove the existing node and create a new one.
   *
   * @param {DOMElement} node
   * @param {string} text
   * @internal
   */

  var setTextContent = function (node, text) {
    if (text) {
      var firstChild = node.firstChild;

      if (firstChild && firstChild === node.lastChild && firstChild.nodeType === TEXT_NODE) {
        firstChild.nodeValue = text;
        return;
      }
    }

    node.textContent = text;
  };

  // Do not use the below two methods directly!
  // Instead use constants exported from DOMTopLevelEventTypes in ReactDOM.
  // (It is the only module that is allowed to access these methods.)
  function unsafeCastStringToDOMTopLevelType(topLevelType) {
    return topLevelType;
  }
  function unsafeCastDOMTopLevelTypeToString(topLevelType) {
    return topLevelType;
  }

  /**
   * Generate a mapping of standard vendor prefixes using the defined style property and event name.
   *
   * @param {string} styleProp
   * @param {string} eventName
   * @returns {object}
   */

  function makePrefixMap(styleProp, eventName) {
    var prefixes = {};
    prefixes[styleProp.toLowerCase()] = eventName.toLowerCase();
    prefixes['Webkit' + styleProp] = 'webkit' + eventName;
    prefixes['Moz' + styleProp] = 'moz' + eventName;
    return prefixes;
  }
  /**
   * A list of event names to a configurable list of vendor prefixes.
   */


  var vendorPrefixes = {
    animationend: makePrefixMap('Animation', 'AnimationEnd'),
    animationiteration: makePrefixMap('Animation', 'AnimationIteration'),
    animationstart: makePrefixMap('Animation', 'AnimationStart'),
    transitionend: makePrefixMap('Transition', 'TransitionEnd')
  };
  /**
   * Event names that have already been detected and prefixed (if applicable).
   */

  var prefixedEventNames = {};
  /**
   * Element to check for prefixes on.
   */

  var style = {};
  /**
   * Bootstrap if a DOM exists.
   */

  if (canUseDOM) {
    style = document.createElement('div').style; // On some platforms, in particular some releases of Android 4.x,
    // the un-prefixed "animation" and "transition" properties are defined on the
    // style object but the events that fire will still be prefixed, so we need
    // to check if the un-prefixed events are usable, and if not remove them from the map.

    if (!('AnimationEvent' in window)) {
      delete vendorPrefixes.animationend.animation;
      delete vendorPrefixes.animationiteration.animation;
      delete vendorPrefixes.animationstart.animation;
    } // Same as above


    if (!('TransitionEvent' in window)) {
      delete vendorPrefixes.transitionend.transition;
    }
  }
  /**
   * Attempts to determine the correct vendor prefixed event name.
   *
   * @param {string} eventName
   * @returns {string}
   */


  function getVendorPrefixedEventName(eventName) {
    if (prefixedEventNames[eventName]) {
      return prefixedEventNames[eventName];
    } else if (!vendorPrefixes[eventName]) {
      return eventName;
    }

    var prefixMap = vendorPrefixes[eventName];

    for (var styleProp in prefixMap) {
      if (prefixMap.hasOwnProperty(styleProp) && styleProp in style) {
        return prefixedEventNames[eventName] = prefixMap[styleProp];
      }
    }

    return eventName;
  }

  /**
   * To identify top level events in ReactDOM, we use constants defined by this
   * module. This is the only module that uses the unsafe* methods to express
   * that the constants actually correspond to the browser event names. This lets
   * us save some bundle size by avoiding a top level type -> event name map.
   * The rest of ReactDOM code should import top level types from this file.
   */

  var TOP_ABORT = unsafeCastStringToDOMTopLevelType('abort');
  var TOP_ANIMATION_END = unsafeCastStringToDOMTopLevelType(getVendorPrefixedEventName('animationend'));
  var TOP_ANIMATION_ITERATION = unsafeCastStringToDOMTopLevelType(getVendorPrefixedEventName('animationiteration'));
  var TOP_ANIMATION_START = unsafeCastStringToDOMTopLevelType(getVendorPrefixedEventName('animationstart'));
  var TOP_BLUR = unsafeCastStringToDOMTopLevelType('blur');
  var TOP_CAN_PLAY = unsafeCastStringToDOMTopLevelType('canplay');
  var TOP_CAN_PLAY_THROUGH = unsafeCastStringToDOMTopLevelType('canplaythrough');
  var TOP_CANCEL = unsafeCastStringToDOMTopLevelType('cancel');
  var TOP_CHANGE = unsafeCastStringToDOMTopLevelType('change');
  var TOP_CLICK = unsafeCastStringToDOMTopLevelType('click');
  var TOP_CLOSE = unsafeCastStringToDOMTopLevelType('close');
  var TOP_COMPOSITION_END = unsafeCastStringToDOMTopLevelType('compositionend');
  var TOP_COMPOSITION_START = unsafeCastStringToDOMTopLevelType('compositionstart');
  var TOP_COMPOSITION_UPDATE = unsafeCastStringToDOMTopLevelType('compositionupdate');
  var TOP_CONTEXT_MENU = unsafeCastStringToDOMTopLevelType('contextmenu');
  var TOP_COPY = unsafeCastStringToDOMTopLevelType('copy');
  var TOP_CUT = unsafeCastStringToDOMTopLevelType('cut');
  var TOP_DOUBLE_CLICK = unsafeCastStringToDOMTopLevelType('dblclick');
  var TOP_AUX_CLICK = unsafeCastStringToDOMTopLevelType('auxclick');
  var TOP_DRAG = unsafeCastStringToDOMTopLevelType('drag');
  var TOP_DRAG_END = unsafeCastStringToDOMTopLevelType('dragend');
  var TOP_DRAG_ENTER = unsafeCastStringToDOMTopLevelType('dragenter');
  var TOP_DRAG_EXIT = unsafeCastStringToDOMTopLevelType('dragexit');
  var TOP_DRAG_LEAVE = unsafeCastStringToDOMTopLevelType('dragleave');
  var TOP_DRAG_OVER = unsafeCastStringToDOMTopLevelType('dragover');
  var TOP_DRAG_START = unsafeCastStringToDOMTopLevelType('dragstart');
  var TOP_DROP = unsafeCastStringToDOMTopLevelType('drop');
  var TOP_DURATION_CHANGE = unsafeCastStringToDOMTopLevelType('durationchange');
  var TOP_EMPTIED = unsafeCastStringToDOMTopLevelType('emptied');
  var TOP_ENCRYPTED = unsafeCastStringToDOMTopLevelType('encrypted');
  var TOP_ENDED = unsafeCastStringToDOMTopLevelType('ended');
  var TOP_ERROR = unsafeCastStringToDOMTopLevelType('error');
  var TOP_FOCUS = unsafeCastStringToDOMTopLevelType('focus');
  var TOP_GOT_POINTER_CAPTURE = unsafeCastStringToDOMTopLevelType('gotpointercapture');
  var TOP_INPUT = unsafeCastStringToDOMTopLevelType('input');
  var TOP_INVALID = unsafeCastStringToDOMTopLevelType('invalid');
  var TOP_KEY_DOWN = unsafeCastStringToDOMTopLevelType('keydown');
  var TOP_KEY_PRESS = unsafeCastStringToDOMTopLevelType('keypress');
  var TOP_KEY_UP = unsafeCastStringToDOMTopLevelType('keyup');
  var TOP_LOAD = unsafeCastStringToDOMTopLevelType('load');
  var TOP_LOAD_START = unsafeCastStringToDOMTopLevelType('loadstart');
  var TOP_LOADED_DATA = unsafeCastStringToDOMTopLevelType('loadeddata');
  var TOP_LOADED_METADATA = unsafeCastStringToDOMTopLevelType('loadedmetadata');
  var TOP_LOST_POINTER_CAPTURE = unsafeCastStringToDOMTopLevelType('lostpointercapture');
  var TOP_MOUSE_DOWN = unsafeCastStringToDOMTopLevelType('mousedown');
  var TOP_MOUSE_MOVE = unsafeCastStringToDOMTopLevelType('mousemove');
  var TOP_MOUSE_OUT = unsafeCastStringToDOMTopLevelType('mouseout');
  var TOP_MOUSE_OVER = unsafeCastStringToDOMTopLevelType('mouseover');
  var TOP_MOUSE_UP = unsafeCastStringToDOMTopLevelType('mouseup');
  var TOP_PASTE = unsafeCastStringToDOMTopLevelType('paste');
  var TOP_PAUSE = unsafeCastStringToDOMTopLevelType('pause');
  var TOP_PLAY = unsafeCastStringToDOMTopLevelType('play');
  var TOP_PLAYING = unsafeCastStringToDOMTopLevelType('playing');
  var TOP_POINTER_CANCEL = unsafeCastStringToDOMTopLevelType('pointercancel');
  var TOP_POINTER_DOWN = unsafeCastStringToDOMTopLevelType('pointerdown');
  var TOP_POINTER_MOVE = unsafeCastStringToDOMTopLevelType('pointermove');
  var TOP_POINTER_OUT = unsafeCastStringToDOMTopLevelType('pointerout');
  var TOP_POINTER_OVER = unsafeCastStringToDOMTopLevelType('pointerover');
  var TOP_POINTER_UP = unsafeCastStringToDOMTopLevelType('pointerup');
  var TOP_PROGRESS = unsafeCastStringToDOMTopLevelType('progress');
  var TOP_RATE_CHANGE = unsafeCastStringToDOMTopLevelType('ratechange');
  var TOP_RESET = unsafeCastStringToDOMTopLevelType('reset');
  var TOP_SCROLL = unsafeCastStringToDOMTopLevelType('scroll');
  var TOP_SEEKED = unsafeCastStringToDOMTopLevelType('seeked');
  var TOP_SEEKING = unsafeCastStringToDOMTopLevelType('seeking');
  var TOP_SELECTION_CHANGE = unsafeCastStringToDOMTopLevelType('selectionchange');
  var TOP_STALLED = unsafeCastStringToDOMTopLevelType('stalled');
  var TOP_SUBMIT = unsafeCastStringToDOMTopLevelType('submit');
  var TOP_SUSPEND = unsafeCastStringToDOMTopLevelType('suspend');
  var TOP_TEXT_INPUT = unsafeCastStringToDOMTopLevelType('textInput');
  var TOP_TIME_UPDATE = unsafeCastStringToDOMTopLevelType('timeupdate');
  var TOP_TOGGLE = unsafeCastStringToDOMTopLevelType('toggle');
  var TOP_TOUCH_CANCEL = unsafeCastStringToDOMTopLevelType('touchcancel');
  var TOP_TOUCH_END = unsafeCastStringToDOMTopLevelType('touchend');
  var TOP_TOUCH_MOVE = unsafeCastStringToDOMTopLevelType('touchmove');
  var TOP_TOUCH_START = unsafeCastStringToDOMTopLevelType('touchstart');
  var TOP_TRANSITION_END = unsafeCastStringToDOMTopLevelType(getVendorPrefixedEventName('transitionend'));
  var TOP_VOLUME_CHANGE = unsafeCastStringToDOMTopLevelType('volumechange');
  var TOP_WAITING = unsafeCastStringToDOMTopLevelType('waiting');
  var TOP_WHEEL = unsafeCastStringToDOMTopLevelType('wheel'); // List of events that need to be individually attached to media elements.
  // Note that events in this list will *not* be listened to at the top level
  // unless they're explicitly whitelisted in `ReactBrowserEventEmitter.listenTo`.

  var mediaEventTypes = [TOP_ABORT, TOP_CAN_PLAY, TOP_CAN_PLAY_THROUGH, TOP_DURATION_CHANGE, TOP_EMPTIED, TOP_ENCRYPTED, TOP_ENDED, TOP_ERROR, TOP_LOADED_DATA, TOP_LOADED_METADATA, TOP_LOAD_START, TOP_PAUSE, TOP_PLAY, TOP_PLAYING, TOP_PROGRESS, TOP_RATE_CHANGE, TOP_SEEKED, TOP_SEEKING, TOP_STALLED, TOP_SUSPEND, TOP_TIME_UPDATE, TOP_VOLUME_CHANGE, TOP_WAITING];
  function getRawEventName(topLevelType) {
    return unsafeCastDOMTopLevelTypeToString(topLevelType);
  }

  var PossiblyWeakMap = typeof WeakMap === 'function' ? WeakMap : Map; // prettier-ignore

  var elementListenerMap = new PossiblyWeakMap();
  function getListenerMapForElement(element) {
    var listenerMap = elementListenerMap.get(element);

    if (listenerMap === undefined) {
      listenerMap = new Map();
      elementListenerMap.set(element, listenerMap);
    }

    return listenerMap;
  }

  /**
   * `ReactInstanceMap` maintains a mapping from a public facing stateful
   * instance (key) and the internal representation (value). This allows public
   * methods to accept the user facing instance as an argument and map them back
   * to internal methods.
   *
   * Note that this module is currently shared and assumed to be stateless.
   * If this becomes an actual Map, that will break.
   */
  function get(key) {
    return key._reactInternalFiber;
  }
  function has$1(key) {
    return key._reactInternalFiber !== undefined;
  }
  function set(key, value) {
    key._reactInternalFiber = value;
  }

  // Don't change these two values. They're used by React Dev Tools.
  var NoEffect =
  /*              */
  0;
  var PerformedWork =
  /*         */
  1; // You can change the rest (and add more).

  var Placement =
  /*             */
  2;
  var Update =
  /*                */
  4;
  var PlacementAndUpdate =
  /*    */
  6;
  var Deletion =
  /*              */
  8;
  var ContentReset =
  /*          */
  16;
  var Callback =
  /*              */
  32;
  var DidCapture =
  /*            */
  64;
  var Ref =
  /*                   */
  128;
  var Snapshot =
  /*              */
  256;
  var Passive =
  /*               */
  512;
  var Hydrating =
  /*             */
  1024;
  var HydratingAndUpdate =
  /*    */
  1028; // Passive & Update & Callback & Ref & Snapshot

  var LifecycleEffectMask =
  /*   */
  932; // Union of all host effects

  var HostEffectMask =
  /*        */
  2047;
  var Incomplete =
  /*            */
  2048;
  var ShouldCapture =
  /*         */
  4096;

  var ReactCurrentOwner = ReactSharedInternals.ReactCurrentOwner;
  function getNearestMountedFiber(fiber) {
    var node = fiber;
    var nearestMounted = fiber;

    if (!fiber.alternate) {
      // If there is no alternate, this might be a new tree that isn't inserted
      // yet. If it is, then it will have a pending insertion effect on it.
      var nextNode = node;

      do {
        node = nextNode;

        if ((node.effectTag & (Placement | Hydrating)) !== NoEffect) {
          // This is an insertion or in-progress hydration. The nearest possible
          // mounted fiber is the parent but we need to continue to figure out
          // if that one is still mounted.
          nearestMounted = node.return;
        }

        nextNode = node.return;
      } while (nextNode);
    } else {
      while (node.return) {
        node = node.return;
      }
    }

    if (node.tag === HostRoot) {
      // TODO: Check if this was a nested HostRoot when used with
      // renderContainerIntoSubtree.
      return nearestMounted;
    } // If we didn't hit the root, that means that we're in an disconnected tree
    // that has been unmounted.


    return null;
  }
  function getSuspenseInstanceFromFiber(fiber) {
    if (fiber.tag === SuspenseComponent) {
      var suspenseState = fiber.memoizedState;

      if (suspenseState === null) {
        var current = fiber.alternate;

        if (current !== null) {
          suspenseState = current.memoizedState;
        }
      }

      if (suspenseState !== null) {
        return suspenseState.dehydrated;
      }
    }

    return null;
  }
  function getContainerFromFiber(fiber) {
    return fiber.tag === HostRoot ? fiber.stateNode.containerInfo : null;
  }
  function isFiberMounted(fiber) {
    return getNearestMountedFiber(fiber) === fiber;
  }
  function isMounted(component) {
    {
      var owner = ReactCurrentOwner.current;

      if (owner !== null && owner.tag === ClassComponent) {
        var ownerFiber = owner;
        var instance = ownerFiber.stateNode;

        if (!instance._warnedAboutRefsInRender) {
          error('%s is accessing isMounted inside its render() function. ' + 'render() should be a pure function of props and state. It should ' + 'never access something that requires stale data from the previous ' + 'render, such as refs. Move this logic to componentDidMount and ' + 'componentDidUpdate instead.', getComponentName(ownerFiber.type) || 'A component');
        }

        instance._warnedAboutRefsInRender = true;
      }
    }

    var fiber = get(component);

    if (!fiber) {
      return false;
    }

    return getNearestMountedFiber(fiber) === fiber;
  }

  function assertIsMounted(fiber) {
    if (!(getNearestMountedFiber(fiber) === fiber)) {
      {
        throw Error( "Unable to find node on an unmounted component." );
      }
    }
  }

  function findCurrentFiberUsingSlowPath(fiber) {
    var alternate = fiber.alternate;

    if (!alternate) {
      // If there is no alternate, then we only need to check if it is mounted.
      var nearestMounted = getNearestMountedFiber(fiber);

      if (!(nearestMounted !== null)) {
        {
          throw Error( "Unable to find node on an unmounted component." );
        }
      }

      if (nearestMounted !== fiber) {
        return null;
      }

      return fiber;
    } // If we have two possible branches, we'll walk backwards up to the root
    // to see what path the root points to. On the way we may hit one of the
    // special cases and we'll deal with them.


    var a = fiber;
    var b = alternate;

    while (true) {
      var parentA = a.return;

      if (parentA === null) {
        // We're at the root.
        break;
      }

      var parentB = parentA.alternate;

      if (parentB === null) {
        // There is no alternate. This is an unusual case. Currently, it only
        // happens when a Suspense component is hidden. An extra fragment fiber
        // is inserted in between the Suspense fiber and its children. Skip
        // over this extra fragment fiber and proceed to the next parent.
        var nextParent = parentA.return;

        if (nextParent !== null) {
          a = b = nextParent;
          continue;
        } // If there's no parent, we're at the root.


        break;
      } // If both copies of the parent fiber point to the same child, we can
      // assume that the child is current. This happens when we bailout on low
      // priority: the bailed out fiber's child reuses the current child.


      if (parentA.child === parentB.child) {
        var child = parentA.child;

        while (child) {
          if (child === a) {
            // We've determined that A is the current branch.
            assertIsMounted(parentA);
            return fiber;
          }

          if (child === b) {
            // We've determined that B is the current branch.
            assertIsMounted(parentA);
            return alternate;
          }

          child = child.sibling;
        } // We should never have an alternate for any mounting node. So the only
        // way this could possibly happen is if this was unmounted, if at all.


        {
          {
            throw Error( "Unable to find node on an unmounted component." );
          }
        }
      }

      if (a.return !== b.return) {
        // The return pointer of A and the return pointer of B point to different
        // fibers. We assume that return pointers never criss-cross, so A must
        // belong to the child set of A.return, and B must belong to the child
        // set of B.return.
        a = parentA;
        b = parentB;
      } else {
        // The return pointers point to the same fiber. We'll have to use the
        // default, slow path: scan the child sets of each parent alternate to see
        // which child belongs to which set.
        //
        // Search parent A's child set
        var didFindChild = false;
        var _child = parentA.child;

        while (_child) {
          if (_child === a) {
            didFindChild = true;
            a = parentA;
            b = parentB;
            break;
          }

          if (_child === b) {
            didFindChild = true;
            b = parentA;
            a = parentB;
            break;
          }

          _child = _child.sibling;
        }

        if (!didFindChild) {
          // Search parent B's child set
          _child = parentB.child;

          while (_child) {
            if (_child === a) {
              didFindChild = true;
              a = parentB;
              b = parentA;
              break;
            }

            if (_child === b) {
              didFindChild = true;
              b = parentB;
              a = parentA;
              break;
            }

            _child = _child.sibling;
          }

          if (!didFindChild) {
            {
              throw Error( "Child was not found in either parent set. This indicates a bug in React related to the return pointer. Please file an issue." );
            }
          }
        }
      }

      if (!(a.alternate === b)) {
        {
          throw Error( "Return fibers should always be each others' alternates. This error is likely caused by a bug in React. Please file an issue." );
        }
      }
    } // If the root is not a host container, we're in a disconnected tree. I.e.
    // unmounted.


    if (!(a.tag === HostRoot)) {
      {
        throw Error( "Unable to find node on an unmounted component." );
      }
    }

    if (a.stateNode.current === a) {
      // We've determined that A is the current branch.
      return fiber;
    } // Otherwise B has to be current branch.


    return alternate;
  }
  function findCurrentHostFiber(parent) {
    var currentParent = findCurrentFiberUsingSlowPath(parent);

    if (!currentParent) {
      return null;
    } // Next we'll drill down this component to find the first HostComponent/Text.


    var node = currentParent;

    while (true) {
      if (node.tag === HostComponent || node.tag === HostText) {
        return node;
      } else if (node.child) {
        node.child.return = node;
        node = node.child;
        continue;
      }

      if (node === currentParent) {
        return null;
      }

      while (!node.sibling) {
        if (!node.return || node.return === currentParent) {
          return null;
        }

        node = node.return;
      }

      node.sibling.return = node.return;
      node = node.sibling;
    } // Flow needs the return null here, but ESLint complains about it.
    // eslint-disable-next-line no-unreachable


    return null;
  }
  function findCurrentHostFiberWithNoPortals(parent) {
    var currentParent = findCurrentFiberUsingSlowPath(parent);

    if (!currentParent) {
      return null;
    } // Next we'll drill down this component to find the first HostComponent/Text.


    var node = currentParent;

    while (true) {
      if (node.tag === HostComponent || node.tag === HostText || enableFundamentalAPI ) {
        return node;
      } else if (node.child && node.tag !== HostPortal) {
        node.child.return = node;
        node = node.child;
        continue;
      }

      if (node === currentParent) {
        return null;
      }

      while (!node.sibling) {
        if (!node.return || node.return === currentParent) {
          return null;
        }

        node = node.return;
      }

      node.sibling.return = node.return;
      node = node.sibling;
    } // Flow needs the return null here, but ESLint complains about it.
    // eslint-disable-next-line no-unreachable


    return null;
  }

  /**
   * Accumulates items that must not be null or undefined into the first one. This
   * is used to conserve memory by avoiding array allocations, and thus sacrifices
   * API cleanness. Since `current` can be null before being passed in and not
   * null after this function, make sure to assign it back to `current`:
   *
   * `a = accumulateInto(a, b);`
   *
   * This API should be sparingly used. Try `accumulate` for something cleaner.
   *
   * @return {*|array<*>} An accumulation of items.
   */

  function accumulateInto(current, next) {
    if (!(next != null)) {
      {
        throw Error( "accumulateInto(...): Accumulated items must not be null or undefined." );
      }
    }

    if (current == null) {
      return next;
    } // Both are not empty. Warning: Never call x.concat(y) when you are not
    // certain that x is an Array (x could be a string with concat method).


    if (Array.isArray(current)) {
      if (Array.isArray(next)) {
        current.push.apply(current, next);
        return current;
      }

      current.push(next);
      return current;
    }

    if (Array.isArray(next)) {
      // A bit too dangerous to mutate `next`.
      return [current].concat(next);
    }

    return [current, next];
  }

  /**
   * @param {array} arr an "accumulation" of items which is either an Array or
   * a single item. Useful when paired with the `accumulate` module. This is a
   * simple utility that allows us to reason about a collection of items, but
   * handling the case when there is exactly one item (and we do not need to
   * allocate an array).
   * @param {function} cb Callback invoked with each element or a collection.
   * @param {?} [scope] Scope used as `this` in a callback.
   */
  function forEachAccumulated(arr, cb, scope) {
    if (Array.isArray(arr)) {
      arr.forEach(cb, scope);
    } else if (arr) {
      cb.call(scope, arr);
    }
  }

  /**
   * Internal queue of events that have accumulated their dispatches and are
   * waiting to have their dispatches executed.
   */

  var eventQueue = null;
  /**
   * Dispatches an event and releases it back into the pool, unless persistent.
   *
   * @param {?object} event Synthetic event to be dispatched.
   * @private
   */

  var executeDispatchesAndRelease = function (event) {
    if (event) {
      executeDispatchesInOrder(event);

      if (!event.isPersistent()) {
        event.constructor.release(event);
      }
    }
  };

  var executeDispatchesAndReleaseTopLevel = function (e) {
    return executeDispatchesAndRelease(e);
  };

  function runEventsInBatch(events) {
    if (events !== null) {
      eventQueue = accumulateInto(eventQueue, events);
    } // Set `eventQueue` to null before processing it so that we can tell if more
    // events get enqueued while processing.


    var processingEventQueue = eventQueue;
    eventQueue = null;

    if (!processingEventQueue) {
      return;
    }

    forEachAccumulated(processingEventQueue, executeDispatchesAndReleaseTopLevel);

    if (!!eventQueue) {
      {
        throw Error( "processEventQueue(): Additional events were enqueued while processing an event queue. Support for this has not yet been implemented." );
      }
    } // This would be a good time to rethrow if any of the event handlers threw.


    rethrowCaughtError();
  }

  /**
   * Gets the target node from a native browser event by accounting for
   * inconsistencies in browser DOM APIs.
   *
   * @param {object} nativeEvent Native browser event.
   * @return {DOMEventTarget} Target node.
   */

  function getEventTarget(nativeEvent) {
    // Fallback to nativeEvent.srcElement for IE9
    // https://github.com/facebook/react/issues/12506
    var target = nativeEvent.target || nativeEvent.srcElement || window; // Normalize SVG <use> element events #4963

    if (target.correspondingUseElement) {
      target = target.correspondingUseElement;
    } // Safari may fire events on text nodes (Node.TEXT_NODE is 3).
    // @see http://www.quirksmode.org/js/events_properties.html


    return target.nodeType === TEXT_NODE ? target.parentNode : target;
  }

  /**
   * Checks if an event is supported in the current execution environment.
   *
   * NOTE: This will not work correctly for non-generic events such as `change`,
   * `reset`, `load`, `error`, and `select`.
   *
   * Borrows from Modernizr.
   *
   * @param {string} eventNameSuffix Event name, e.g. "click".
   * @return {boolean} True if the event is supported.
   * @internal
   * @license Modernizr 3.0.0pre (Custom Build) | MIT
   */

  function isEventSupported(eventNameSuffix) {
    if (!canUseDOM) {
      return false;
    }

    var eventName = 'on' + eventNameSuffix;
    var isSupported = eventName in document;

    if (!isSupported) {
      var element = document.createElement('div');
      element.setAttribute(eventName, 'return;');
      isSupported = typeof element[eventName] === 'function';
    }

    return isSupported;
  }

  /**
   * Summary of `DOMEventPluginSystem` event handling:
   *
   *  - Top-level delegation is used to trap most native browser events. This
   *    may only occur in the main thread and is the responsibility of
   *    ReactDOMEventListener, which is injected and can therefore support
   *    pluggable event sources. This is the only work that occurs in the main
   *    thread.
   *
   *  - We normalize and de-duplicate events to account for browser quirks. This
   *    may be done in the worker thread.
   *
   *  - Forward these native events (with the associated top-level type used to
   *    trap it) to `EventPluginRegistry`, which in turn will ask plugins if they want
   *    to extract any synthetic events.
   *
   *  - The `EventPluginRegistry` will then process each event by annotating them with
   *    "dispatches", a sequence of listeners and IDs that care about that event.
   *
   *  - The `EventPluginRegistry` then dispatches the events.
   *
   * Overview of React and the event system:
   *
   * +------------+    .
   * |    DOM     |    .
   * +------------+    .
   *       |           .
   *       v           .
   * +------------+    .
   * | ReactEvent |    .
   * |  Listener  |    .
   * +------------+    .                         +-----------+
   *       |           .               +--------+|SimpleEvent|
   *       |           .               |         |Plugin     |
   * +-----|------+    .               v         +-----------+
   * |     |      |    .    +--------------+                    +------------+
   * |     +-----------.--->|PluginRegistry|                    |    Event   |
   * |            |    .    |              |     +-----------+  | Propagators|
   * | ReactEvent |    .    |              |     |TapEvent   |  |------------|
   * |  Emitter   |    .    |              |<---+|Plugin     |  |other plugin|
   * |            |    .    |              |     +-----------+  |  utilities |
   * |     +-----------.--->|              |                    +------------+
   * |     |      |    .    +--------------+
   * +-----|------+    .                ^        +-----------+
   *       |           .                |        |Enter/Leave|
   *       +           .                +-------+|Plugin     |
   * +-------------+   .                         +-----------+
   * | application |   .
   * |-------------|   .
   * |             |   .
   * |             |   .
   * +-------------+   .
   *                   .
   *    React Core     .  General Purpose Event Plugin System
   */

  var CALLBACK_BOOKKEEPING_POOL_SIZE = 10;
  var callbackBookkeepingPool = [];

  function releaseTopLevelCallbackBookKeeping(instance) {
    instance.topLevelType = null;
    instance.nativeEvent = null;
    instance.targetInst = null;
    instance.ancestors.length = 0;

    if (callbackBookkeepingPool.length < CALLBACK_BOOKKEEPING_POOL_SIZE) {
      callbackBookkeepingPool.push(instance);
    }
  } // Used to store ancestor hierarchy in top level callback


  function getTopLevelCallbackBookKeeping(topLevelType, nativeEvent, targetInst, eventSystemFlags) {
    if (callbackBookkeepingPool.length) {
      var instance = callbackBookkeepingPool.pop();
      instance.topLevelType = topLevelType;
      instance.eventSystemFlags = eventSystemFlags;
      instance.nativeEvent = nativeEvent;
      instance.targetInst = targetInst;
      return instance;
    }

    return {
      topLevelType: topLevelType,
      eventSystemFlags: eventSystemFlags,
      nativeEvent: nativeEvent,
      targetInst: targetInst,
      ancestors: []
    };
  }
  /**
   * Find the deepest React component completely containing the root of the
   * passed-in instance (for use when entire React trees are nested within each
   * other). If React trees are not nested, returns null.
   */


  function findRootContainerNode(inst) {
    if (inst.tag === HostRoot) {
      return inst.stateNode.containerInfo;
    } // TODO: It may be a good idea to cache this to prevent unnecessary DOM
    // traversal, but caching is difficult to do correctly without using a
    // mutation observer to listen for all DOM changes.


    while (inst.return) {
      inst = inst.return;
    }

    if (inst.tag !== HostRoot) {
      // This can happen if we're in a detached tree.
      return null;
    }

    return inst.stateNode.containerInfo;
  }
  /**
   * Allows registered plugins an opportunity to extract events from top-level
   * native browser events.
   *
   * @return {*} An accumulation of synthetic events.
   * @internal
   */


  function extractPluginEvents(topLevelType, targetInst, nativeEvent, nativeEventTarget, eventSystemFlags) {
    var events = null;

    for (var i = 0; i < plugins.length; i++) {
      // Not every plugin in the ordering may be loaded at runtime.
      var possiblePlugin = plugins[i];

      if (possiblePlugin) {
        var extractedEvents = possiblePlugin.extractEvents(topLevelType, targetInst, nativeEvent, nativeEventTarget, eventSystemFlags);

        if (extractedEvents) {
          events = accumulateInto(events, extractedEvents);
        }
      }
    }

    return events;
  }

  function runExtractedPluginEventsInBatch(topLevelType, targetInst, nativeEvent, nativeEventTarget, eventSystemFlags) {
    var events = extractPluginEvents(topLevelType, targetInst, nativeEvent, nativeEventTarget, eventSystemFlags);
    runEventsInBatch(events);
  }

  function handleTopLevel(bookKeeping) {
    var targetInst = bookKeeping.targetInst; // Loop through the hierarchy, in case there's any nested components.
    // It's important that we build the array of ancestors before calling any
    // event handlers, because event handlers can modify the DOM, leading to
    // inconsistencies with ReactMount's node cache. See #1105.

    var ancestor = targetInst;

    do {
      if (!ancestor) {
        var ancestors = bookKeeping.ancestors;
        ancestors.push(ancestor);
        break;
      }

      var root = findRootContainerNode(ancestor);

      if (!root) {
        break;
      }

      var tag = ancestor.tag;

      if (tag === HostComponent || tag === HostText) {
        bookKeeping.ancestors.push(ancestor);
      }

      ancestor = getClosestInstanceFromNode(root);
    } while (ancestor);

    for (var i = 0; i < bookKeeping.ancestors.length; i++) {
      targetInst = bookKeeping.ancestors[i];
      var eventTarget = getEventTarget(bookKeeping.nativeEvent);
      var topLevelType = bookKeeping.topLevelType;
      var nativeEvent = bookKeeping.nativeEvent;
      var eventSystemFlags = bookKeeping.eventSystemFlags; // If this is the first ancestor, we mark it on the system flags

      if (i === 0) {
        eventSystemFlags |= IS_FIRST_ANCESTOR;
      }

      runExtractedPluginEventsInBatch(topLevelType, targetInst, nativeEvent, eventTarget, eventSystemFlags);
    }
  }

  function dispatchEventForLegacyPluginEventSystem(topLevelType, eventSystemFlags, nativeEvent, targetInst) {
    var bookKeeping = getTopLevelCallbackBookKeeping(topLevelType, nativeEvent, targetInst, eventSystemFlags);

    try {
      // Event queue being processed in the same cycle allows
      // `preventDefault`.
      batchedEventUpdates(handleTopLevel, bookKeeping);
    } finally {
      releaseTopLevelCallbackBookKeeping(bookKeeping);
    }
  }
  /**
   * We listen for bubbled touch events on the document object.
   *
   * Firefox v8.01 (and possibly others) exhibited strange behavior when
   * mounting `onmousemove` events at some node that was not the document
   * element. The symptoms were that if your mouse is not moving over something
   * contained within that mount point (for example on the background) the
   * top-level listeners for `onmousemove` won't be called. However, if you
   * register the `mousemove` on the document object, then it will of course
   * catch all `mousemove`s. This along with iOS quirks, justifies restricting
   * top-level listeners to the document object only, at least for these
   * movement types of events and possibly all events.
   *
   * @see http://www.quirksmode.org/blog/archives/2010/09/click_event_del.html
   *
   * Also, `keyup`/`keypress`/`keydown` do not bubble to the window on IE, but
   * they bubble to document.
   *
   * @param {string} registrationName Name of listener (e.g. `onClick`).
   * @param {object} mountAt Container where to mount the listener
   */

  function legacyListenToEvent(registrationName, mountAt) {
    var listenerMap = getListenerMapForElement(mountAt);
    var dependencies = registrationNameDependencies[registrationName];

    for (var i = 0; i < dependencies.length; i++) {
      var dependency = dependencies[i];
      legacyListenToTopLevelEvent(dependency, mountAt, listenerMap);
    }
  }
  function legacyListenToTopLevelEvent(topLevelType, mountAt, listenerMap) {
    if (!listenerMap.has(topLevelType)) {
      switch (topLevelType) {
        case TOP_SCROLL:
          trapCapturedEvent(TOP_SCROLL, mountAt);
          break;

        case TOP_FOCUS:
        case TOP_BLUR:
          trapCapturedEvent(TOP_FOCUS, mountAt);
          trapCapturedEvent(TOP_BLUR, mountAt); // We set the flag for a single dependency later in this function,
          // but this ensures we mark both as attached rather than just one.

          listenerMap.set(TOP_BLUR, null);
          listenerMap.set(TOP_FOCUS, null);
          break;

        case TOP_CANCEL:
        case TOP_CLOSE:
          if (isEventSupported(getRawEventName(topLevelType))) {
            trapCapturedEvent(topLevelType, mountAt);
          }

          break;

        case TOP_INVALID:
        case TOP_SUBMIT:
        case TOP_RESET:
          // We listen to them on the target DOM elements.
          // Some of them bubble so we don't want them to fire twice.
          break;

        default:
          // By default, listen on the top level to all non-media events.
          // Media events don't bubble so adding the listener wouldn't do anything.
          var isMediaEvent = mediaEventTypes.indexOf(topLevelType) !== -1;

          if (!isMediaEvent) {
            trapBubbledEvent(topLevelType, mountAt);
          }

          break;
      }

      listenerMap.set(topLevelType, null);
    }
  }
  function isListeningToAllDependencies(registrationName, mountAt) {
    var listenerMap = getListenerMapForElement(mountAt);
    var dependencies = registrationNameDependencies[registrationName];

    for (var i = 0; i < dependencies.length; i++) {
      var dependency = dependencies[i];

      if (!listenerMap.has(dependency)) {
        return false;
      }
    }

    return true;
  }

  var attemptUserBlockingHydration;
  function setAttemptUserBlockingHydration(fn) {
    attemptUserBlockingHydration = fn;
  }
  var attemptContinuousHydration;
  function setAttemptContinuousHydration(fn) {
    attemptContinuousHydration = fn;
  }
  var attemptHydrationAtCurrentPriority;
  function setAttemptHydrationAtCurrentPriority(fn) {
    attemptHydrationAtCurrentPriority = fn;
  } // TODO: Upgrade this definition once we're on a newer version of Flow that
  var hasScheduledReplayAttempt = false; // The queue of discrete events to be replayed.

  var queuedDiscreteEvents = []; // Indicates if any continuous event targets are non-null for early bailout.
  // if the last target was dehydrated.

  var queuedFocus = null;
  var queuedDrag = null;
  var queuedMouse = null; // For pointer events there can be one latest event per pointerId.

  var queuedPointers = new Map();
  var queuedPointerCaptures = new Map(); // We could consider replaying selectionchange and touchmoves too.

  var queuedExplicitHydrationTargets = [];
  function hasQueuedDiscreteEvents() {
    return queuedDiscreteEvents.length > 0;
  }
  var discreteReplayableEvents = [TOP_MOUSE_DOWN, TOP_MOUSE_UP, TOP_TOUCH_CANCEL, TOP_TOUCH_END, TOP_TOUCH_START, TOP_AUX_CLICK, TOP_DOUBLE_CLICK, TOP_POINTER_CANCEL, TOP_POINTER_DOWN, TOP_POINTER_UP, TOP_DRAG_END, TOP_DRAG_START, TOP_DROP, TOP_COMPOSITION_END, TOP_COMPOSITION_START, TOP_KEY_DOWN, TOP_KEY_PRESS, TOP_KEY_UP, TOP_INPUT, TOP_TEXT_INPUT, TOP_CLOSE, TOP_CANCEL, TOP_COPY, TOP_CUT, TOP_PASTE, TOP_CLICK, TOP_CHANGE, TOP_CONTEXT_MENU, TOP_RESET, TOP_SUBMIT];
  var continuousReplayableEvents = [TOP_FOCUS, TOP_BLUR, TOP_DRAG_ENTER, TOP_DRAG_LEAVE, TOP_MOUSE_OVER, TOP_MOUSE_OUT, TOP_POINTER_OVER, TOP_POINTER_OUT, TOP_GOT_POINTER_CAPTURE, TOP_LOST_POINTER_CAPTURE];
  function isReplayableDiscreteEvent(eventType) {
    return discreteReplayableEvents.indexOf(eventType) > -1;
  }

  function trapReplayableEventForDocument(topLevelType, document, listenerMap) {
    legacyListenToTopLevelEvent(topLevelType, document, listenerMap);
  }

  function eagerlyTrapReplayableEvents(container, document) {
    var listenerMapForDoc = getListenerMapForElement(document); // Discrete

    discreteReplayableEvents.forEach(function (topLevelType) {
      trapReplayableEventForDocument(topLevelType, document, listenerMapForDoc);
    }); // Continuous

    continuousReplayableEvents.forEach(function (topLevelType) {
      trapReplayableEventForDocument(topLevelType, document, listenerMapForDoc);
    });
  }

  function createQueuedReplayableEvent(blockedOn, topLevelType, eventSystemFlags, container, nativeEvent) {
    return {
      blockedOn: blockedOn,
      topLevelType: topLevelType,
      eventSystemFlags: eventSystemFlags | IS_REPLAYED,
      nativeEvent: nativeEvent,
      container: container
    };
  }

  function queueDiscreteEvent(blockedOn, topLevelType, eventSystemFlags, container, nativeEvent) {
    var queuedEvent = createQueuedReplayableEvent(blockedOn, topLevelType, eventSystemFlags, container, nativeEvent);
    queuedDiscreteEvents.push(queuedEvent);
  } // Resets the replaying for this type of continuous event to no event.

  function clearIfContinuousEvent(topLevelType, nativeEvent) {
    switch (topLevelType) {
      case TOP_FOCUS:
      case TOP_BLUR:
        queuedFocus = null;
        break;

      case TOP_DRAG_ENTER:
      case TOP_DRAG_LEAVE:
        queuedDrag = null;
        break;

      case TOP_MOUSE_OVER:
      case TOP_MOUSE_OUT:
        queuedMouse = null;
        break;

      case TOP_POINTER_OVER:
      case TOP_POINTER_OUT:
        {
          var pointerId = nativeEvent.pointerId;
          queuedPointers.delete(pointerId);
          break;
        }

      case TOP_GOT_POINTER_CAPTURE:
      case TOP_LOST_POINTER_CAPTURE:
        {
          var _pointerId = nativeEvent.pointerId;
          queuedPointerCaptures.delete(_pointerId);
          break;
        }
    }
  }

  function accumulateOrCreateContinuousQueuedReplayableEvent(existingQueuedEvent, blockedOn, topLevelType, eventSystemFlags, container, nativeEvent) {
    if (existingQueuedEvent === null || existingQueuedEvent.nativeEvent !== nativeEvent) {
      var queuedEvent = createQueuedReplayableEvent(blockedOn, topLevelType, eventSystemFlags, container, nativeEvent);

      if (blockedOn !== null) {
        var _fiber2 = getInstanceFromNode$1(blockedOn);

        if (_fiber2 !== null) {
          // Attempt to increase the priority of this target.
          attemptContinuousHydration(_fiber2);
        }
      }

      return queuedEvent;
    } // If we have already queued this exact event, then it's because
    // the different event systems have different DOM event listeners.
    // We can accumulate the flags and store a single event to be
    // replayed.


    existingQueuedEvent.eventSystemFlags |= eventSystemFlags;
    return existingQueuedEvent;
  }

  function queueIfContinuousEvent(blockedOn, topLevelType, eventSystemFlags, container, nativeEvent) {
    // These set relatedTarget to null because the replayed event will be treated as if we
    // moved from outside the window (no target) onto the target once it hydrates.
    // Instead of mutating we could clone the event.
    switch (topLevelType) {
      case TOP_FOCUS:
        {
          var focusEvent = nativeEvent;
          queuedFocus = accumulateOrCreateContinuousQueuedReplayableEvent(queuedFocus, blockedOn, topLevelType, eventSystemFlags, container, focusEvent);
          return true;
        }

      case TOP_DRAG_ENTER:
        {
          var dragEvent = nativeEvent;
          queuedDrag = accumulateOrCreateContinuousQueuedReplayableEvent(queuedDrag, blockedOn, topLevelType, eventSystemFlags, container, dragEvent);
          return true;
        }

      case TOP_MOUSE_OVER:
        {
          var mouseEvent = nativeEvent;
          queuedMouse = accumulateOrCreateContinuousQueuedReplayableEvent(queuedMouse, blockedOn, topLevelType, eventSystemFlags, container, mouseEvent);
          return true;
        }

      case TOP_POINTER_OVER:
        {
          var pointerEvent = nativeEvent;
          var pointerId = pointerEvent.pointerId;
          queuedPointers.set(pointerId, accumulateOrCreateContinuousQueuedReplayableEvent(queuedPointers.get(pointerId) || null, blockedOn, topLevelType, eventSystemFlags, container, pointerEvent));
          return true;
        }

      case TOP_GOT_POINTER_CAPTURE:
        {
          var _pointerEvent = nativeEvent;
          var _pointerId2 = _pointerEvent.pointerId;
          queuedPointerCaptures.set(_pointerId2, accumulateOrCreateContinuousQueuedReplayableEvent(queuedPointerCaptures.get(_pointerId2) || null, blockedOn, topLevelType, eventSystemFlags, container, _pointerEvent));
          return true;
        }
    }

    return false;
  } // Check if this target is unblocked. Returns true if it's unblocked.

  function attemptExplicitHydrationTarget(queuedTarget) {
    // TODO: This function shares a lot of logic with attemptToDispatchEvent.
    // Try to unify them. It's a bit tricky since it would require two return
    // values.
    var targetInst = getClosestInstanceFromNode(queuedTarget.target);

    if (targetInst !== null) {
      var nearestMounted = getNearestMountedFiber(targetInst);

      if (nearestMounted !== null) {
        var tag = nearestMounted.tag;

        if (tag === SuspenseComponent) {
          var instance = getSuspenseInstanceFromFiber(nearestMounted);

          if (instance !== null) {
            // We're blocked on hydrating this boundary.
            // Increase its priority.
            queuedTarget.blockedOn = instance;
            unstable_runWithPriority(queuedTarget.priority, function () {
              attemptHydrationAtCurrentPriority(nearestMounted);
            });
            return;
          }
        } else if (tag === HostRoot) {
          var root = nearestMounted.stateNode;

          if (root.hydrate) {
            queuedTarget.blockedOn = getContainerFromFiber(nearestMounted); // We don't currently have a way to increase the priority of
            // a root other than sync.

            return;
          }
        }
      }
    }

    queuedTarget.blockedOn = null;
  }

  function attemptReplayContinuousQueuedEvent(queuedEvent) {
    if (queuedEvent.blockedOn !== null) {
      return false;
    }

    var nextBlockedOn = attemptToDispatchEvent(queuedEvent.topLevelType, queuedEvent.eventSystemFlags, queuedEvent.container, queuedEvent.nativeEvent);

    if (nextBlockedOn !== null) {
      // We're still blocked. Try again later.
      var _fiber3 = getInstanceFromNode$1(nextBlockedOn);

      if (_fiber3 !== null) {
        attemptContinuousHydration(_fiber3);
      }

      queuedEvent.blockedOn = nextBlockedOn;
      return false;
    }

    return true;
  }

  function attemptReplayContinuousQueuedEventInMap(queuedEvent, key, map) {
    if (attemptReplayContinuousQueuedEvent(queuedEvent)) {
      map.delete(key);
    }
  }

  function replayUnblockedEvents() {
    hasScheduledReplayAttempt = false; // First replay discrete events.

    while (queuedDiscreteEvents.length > 0) {
      var nextDiscreteEvent = queuedDiscreteEvents[0];

      if (nextDiscreteEvent.blockedOn !== null) {
        // We're still blocked.
        // Increase the priority of this boundary to unblock
        // the next discrete event.
        var _fiber4 = getInstanceFromNode$1(nextDiscreteEvent.blockedOn);

        if (_fiber4 !== null) {
          attemptUserBlockingHydration(_fiber4);
        }

        break;
      }

      var nextBlockedOn = attemptToDispatchEvent(nextDiscreteEvent.topLevelType, nextDiscreteEvent.eventSystemFlags, nextDiscreteEvent.container, nextDiscreteEvent.nativeEvent);

      if (nextBlockedOn !== null) {
        // We're still blocked. Try again later.
        nextDiscreteEvent.blockedOn = nextBlockedOn;
      } else {
        // We've successfully replayed the first event. Let's try the next one.
        queuedDiscreteEvents.shift();
      }
    } // Next replay any continuous events.


    if (queuedFocus !== null && attemptReplayContinuousQueuedEvent(queuedFocus)) {
      queuedFocus = null;
    }

    if (queuedDrag !== null && attemptReplayContinuousQueuedEvent(queuedDrag)) {
      queuedDrag = null;
    }

    if (queuedMouse !== null && attemptReplayContinuousQueuedEvent(queuedMouse)) {
      queuedMouse = null;
    }

    queuedPointers.forEach(attemptReplayContinuousQueuedEventInMap);
    queuedPointerCaptures.forEach(attemptReplayContinuousQueuedEventInMap);
  }

  function scheduleCallbackIfUnblocked(queuedEvent, unblocked) {
    if (queuedEvent.blockedOn === unblocked) {
      queuedEvent.blockedOn = null;

      if (!hasScheduledReplayAttempt) {
        hasScheduledReplayAttempt = true; // Schedule a callback to attempt replaying as many events as are
        // now unblocked. This first might not actually be unblocked yet.
        // We could check it early to avoid scheduling an unnecessary callback.

        unstable_scheduleCallback(unstable_NormalPriority, replayUnblockedEvents);
      }
    }
  }

  function retryIfBlockedOn(unblocked) {
    // Mark anything that was blocked on this as no longer blocked
    // and eligible for a replay.
    if (queuedDiscreteEvents.length > 0) {
      scheduleCallbackIfUnblocked(queuedDiscreteEvents[0], unblocked); // This is a exponential search for each boundary that commits. I think it's
      // worth it because we expect very few discrete events to queue up and once
      // we are actually fully unblocked it will be fast to replay them.

      for (var i = 1; i < queuedDiscreteEvents.length; i++) {
        var queuedEvent = queuedDiscreteEvents[i];

        if (queuedEvent.blockedOn === unblocked) {
          queuedEvent.blockedOn = null;
        }
      }
    }

    if (queuedFocus !== null) {
      scheduleCallbackIfUnblocked(queuedFocus, unblocked);
    }

    if (queuedDrag !== null) {
      scheduleCallbackIfUnblocked(queuedDrag, unblocked);
    }

    if (queuedMouse !== null) {
      scheduleCallbackIfUnblocked(queuedMouse, unblocked);
    }

    var unblock = function (queuedEvent) {
      return scheduleCallbackIfUnblocked(queuedEvent, unblocked);
    };

    queuedPointers.forEach(unblock);
    queuedPointerCaptures.forEach(unblock);

    for (var _i = 0; _i < queuedExplicitHydrationTargets.length; _i++) {
      var queuedTarget = queuedExplicitHydrationTargets[_i];

      if (queuedTarget.blockedOn === unblocked) {
        queuedTarget.blockedOn = null;
      }
    }

    while (queuedExplicitHydrationTargets.length > 0) {
      var nextExplicitTarget = queuedExplicitHydrationTargets[0];

      if (nextExplicitTarget.blockedOn !== null) {
        // We're still blocked.
        break;
      } else {
        attemptExplicitHydrationTarget(nextExplicitTarget);

        if (nextExplicitTarget.blockedOn === null) {
          // We're unblocked.
          queuedExplicitHydrationTargets.shift();
        }
      }
    }
  }

  function addEventBubbleListener(element, eventType, listener) {
    element.addEventListener(eventType, listener, false);
  }
  function addEventCaptureListener(element, eventType, listener) {
    element.addEventListener(eventType, listener, true);
  }

  // do it in two places, which duplicates logic
  // and increases the bundle size, we do it all
  // here once. If we remove or refactor the
  // SimpleEventPlugin, we should also remove or
  // update the below line.

  var simpleEventPluginEventTypes = {};
  var topLevelEventsToDispatchConfig = new Map();
  var eventPriorities = new Map(); // We store most of the events in this module in pairs of two strings so we can re-use
  // the code required to apply the same logic for event prioritization and that of the
  // SimpleEventPlugin. This complicates things slightly, but the aim is to reduce code
  // duplication (for which there would be quite a bit). For the events that are not needed
  // for the SimpleEventPlugin (otherDiscreteEvents) we process them separately as an
  // array of top level events.
  // Lastly, we ignore prettier so we can keep the formatting sane.
  // prettier-ignore

  var discreteEventPairsForSimpleEventPlugin = [TOP_BLUR, 'blur', TOP_CANCEL, 'cancel', TOP_CLICK, 'click', TOP_CLOSE, 'close', TOP_CONTEXT_MENU, 'contextMenu', TOP_COPY, 'copy', TOP_CUT, 'cut', TOP_AUX_CLICK, 'auxClick', TOP_DOUBLE_CLICK, 'doubleClick', TOP_DRAG_END, 'dragEnd', TOP_DRAG_START, 'dragStart', TOP_DROP, 'drop', TOP_FOCUS, 'focus', TOP_INPUT, 'input', TOP_INVALID, 'invalid', TOP_KEY_DOWN, 'keyDown', TOP_KEY_PRESS, 'keyPress', TOP_KEY_UP, 'keyUp', TOP_MOUSE_DOWN, 'mouseDown', TOP_MOUSE_UP, 'mouseUp', TOP_PASTE, 'paste', TOP_PAUSE, 'pause', TOP_PLAY, 'play', TOP_POINTER_CANCEL, 'pointerCancel', TOP_POINTER_DOWN, 'pointerDown', TOP_POINTER_UP, 'pointerUp', TOP_RATE_CHANGE, 'rateChange', TOP_RESET, 'reset', TOP_SEEKED, 'seeked', TOP_SUBMIT, 'submit', TOP_TOUCH_CANCEL, 'touchCancel', TOP_TOUCH_END, 'touchEnd', TOP_TOUCH_START, 'touchStart', TOP_VOLUME_CHANGE, 'volumeChange'];
  var otherDiscreteEvents = [TOP_CHANGE, TOP_SELECTION_CHANGE, TOP_TEXT_INPUT, TOP_COMPOSITION_START, TOP_COMPOSITION_END, TOP_COMPOSITION_UPDATE]; // prettier-ignore

  var userBlockingPairsForSimpleEventPlugin = [TOP_DRAG, 'drag', TOP_DRAG_ENTER, 'dragEnter', TOP_DRAG_EXIT, 'dragExit', TOP_DRAG_LEAVE, 'dragLeave', TOP_DRAG_OVER, 'dragOver', TOP_MOUSE_MOVE, 'mouseMove', TOP_MOUSE_OUT, 'mouseOut', TOP_MOUSE_OVER, 'mouseOver', TOP_POINTER_MOVE, 'pointerMove', TOP_POINTER_OUT, 'pointerOut', TOP_POINTER_OVER, 'pointerOver', TOP_SCROLL, 'scroll', TOP_TOGGLE, 'toggle', TOP_TOUCH_MOVE, 'touchMove', TOP_WHEEL, 'wheel']; // prettier-ignore

  var continuousPairsForSimpleEventPlugin = [TOP_ABORT, 'abort', TOP_ANIMATION_END, 'animationEnd', TOP_ANIMATION_ITERATION, 'animationIteration', TOP_ANIMATION_START, 'animationStart', TOP_CAN_PLAY, 'canPlay', TOP_CAN_PLAY_THROUGH, 'canPlayThrough', TOP_DURATION_CHANGE, 'durationChange', TOP_EMPTIED, 'emptied', TOP_ENCRYPTED, 'encrypted', TOP_ENDED, 'ended', TOP_ERROR, 'error', TOP_GOT_POINTER_CAPTURE, 'gotPointerCapture', TOP_LOAD, 'load', TOP_LOADED_DATA, 'loadedData', TOP_LOADED_METADATA, 'loadedMetadata', TOP_LOAD_START, 'loadStart', TOP_LOST_POINTER_CAPTURE, 'lostPointerCapture', TOP_PLAYING, 'playing', TOP_PROGRESS, 'progress', TOP_SEEKING, 'seeking', TOP_STALLED, 'stalled', TOP_SUSPEND, 'suspend', TOP_TIME_UPDATE, 'timeUpdate', TOP_TRANSITION_END, 'transitionEnd', TOP_WAITING, 'waiting'];
  /**
   * Turns
   * ['abort', ...]
   * into
   * eventTypes = {
   *   'abort': {
   *     phasedRegistrationNames: {
   *       bubbled: 'onAbort',
   *       captured: 'onAbortCapture',
   *     },
   *     dependencies: [TOP_ABORT],
   *   },
   *   ...
   * };
   * topLevelEventsToDispatchConfig = new Map([
   *   [TOP_ABORT, { sameConfig }],
   * ]);
   */

  function processSimpleEventPluginPairsByPriority(eventTypes, priority) {
    // As the event types are in pairs of two, we need to iterate
    // through in twos. The events are in pairs of two to save code
    // and improve init perf of processing this array, as it will
    // result in far fewer object allocations and property accesses
    // if we only use three arrays to process all the categories of
    // instead of tuples.
    for (var i = 0; i < eventTypes.length; i += 2) {
      var topEvent = eventTypes[i];
      var event = eventTypes[i + 1];
      var capitalizedEvent = event[0].toUpperCase() + event.slice(1);
      var onEvent = 'on' + capitalizedEvent;
      var config = {
        phasedRegistrationNames: {
          bubbled: onEvent,
          captured: onEvent + 'Capture'
        },
        dependencies: [topEvent],
        eventPriority: priority
      };
      eventPriorities.set(topEvent, priority);
      topLevelEventsToDispatchConfig.set(topEvent, config);
      simpleEventPluginEventTypes[event] = config;
    }
  }

  function processTopEventPairsByPriority(eventTypes, priority) {
    for (var i = 0; i < eventTypes.length; i++) {
      eventPriorities.set(eventTypes[i], priority);
    }
  } // SimpleEventPlugin


  processSimpleEventPluginPairsByPriority(discreteEventPairsForSimpleEventPlugin, DiscreteEvent);
  processSimpleEventPluginPairsByPriority(userBlockingPairsForSimpleEventPlugin, UserBlockingEvent);
  processSimpleEventPluginPairsByPriority(continuousPairsForSimpleEventPlugin, ContinuousEvent); // Not used by SimpleEventPlugin

  processTopEventPairsByPriority(otherDiscreteEvents, DiscreteEvent);
  function getEventPriorityForPluginSystem(topLevelType) {
    var priority = eventPriorities.get(topLevelType); // Default to a ContinuousEvent. Note: we might
    // want to warn if we can't detect the priority
    // for the event.

    return priority === undefined ? ContinuousEvent : priority;
  }

  // Intentionally not named imports because Rollup would use dynamic dispatch for
  var UserBlockingPriority = unstable_UserBlockingPriority,
      runWithPriority = unstable_runWithPriority; // TODO: can we stop exporting these?

  var _enabled = true;
  function setEnabled(enabled) {
    _enabled = !!enabled;
  }
  function isEnabled() {
    return _enabled;
  }
  function trapBubbledEvent(topLevelType, element) {
    trapEventForPluginEventSystem(element, topLevelType, false);
  }
  function trapCapturedEvent(topLevelType, element) {
    trapEventForPluginEventSystem(element, topLevelType, true);
  }

  function trapEventForPluginEventSystem(container, topLevelType, capture) {
    var listener;

    switch (getEventPriorityForPluginSystem(topLevelType)) {
      case DiscreteEvent:
        listener = dispatchDiscreteEvent.bind(null, topLevelType, PLUGIN_EVENT_SYSTEM, container);
        break;

      case UserBlockingEvent:
        listener = dispatchUserBlockingUpdate.bind(null, topLevelType, PLUGIN_EVENT_SYSTEM, container);
        break;

      case ContinuousEvent:
      default:
        listener = dispatchEvent.bind(null, topLevelType, PLUGIN_EVENT_SYSTEM, container);
        break;
    }

    var rawEventName = getRawEventName(topLevelType);

    if (capture) {
      addEventCaptureListener(container, rawEventName, listener);
    } else {
      addEventBubbleListener(container, rawEventName, listener);
    }
  }

  function dispatchDiscreteEvent(topLevelType, eventSystemFlags, container, nativeEvent) {
    flushDiscreteUpdatesIfNeeded(nativeEvent.timeStamp);
    discreteUpdates(dispatchEvent, topLevelType, eventSystemFlags, container, nativeEvent);
  }

  function dispatchUserBlockingUpdate(topLevelType, eventSystemFlags, container, nativeEvent) {
    runWithPriority(UserBlockingPriority, dispatchEvent.bind(null, topLevelType, eventSystemFlags, container, nativeEvent));
  }

  function dispatchEvent(topLevelType, eventSystemFlags, container, nativeEvent) {
    if (!_enabled) {
      return;
    }

    if (hasQueuedDiscreteEvents() && isReplayableDiscreteEvent(topLevelType)) {
      // If we already have a queue of discrete events, and this is another discrete
      // event, then we can't dispatch it regardless of its target, since they
      // need to dispatch in order.
      queueDiscreteEvent(null, // Flags that we're not actually blocked on anything as far as we know.
      topLevelType, eventSystemFlags, container, nativeEvent);
      return;
    }

    var blockedOn = attemptToDispatchEvent(topLevelType, eventSystemFlags, container, nativeEvent);

    if (blockedOn === null) {
      // We successfully dispatched this event.
      clearIfContinuousEvent(topLevelType, nativeEvent);
      return;
    }

    if (isReplayableDiscreteEvent(topLevelType)) {
      // This this to be replayed later once the target is available.
      queueDiscreteEvent(blockedOn, topLevelType, eventSystemFlags, container, nativeEvent);
      return;
    }

    if (queueIfContinuousEvent(blockedOn, topLevelType, eventSystemFlags, container, nativeEvent)) {
      return;
    } // We need to clear only if we didn't queue because
    // queueing is accummulative.


    clearIfContinuousEvent(topLevelType, nativeEvent); // This is not replayable so we'll invoke it but without a target,
    // in case the event system needs to trace it.

    {
      dispatchEventForLegacyPluginEventSystem(topLevelType, eventSystemFlags, nativeEvent, null);
    }
  } // Attempt dispatching an event. Returns a SuspenseInstance or Container if it's blocked.

  function attemptToDispatchEvent(topLevelType, eventSystemFlags, container, nativeEvent) {
    // TODO: Warn if _enabled is false.
    var nativeEventTarget = getEventTarget(nativeEvent);
    var targetInst = getClosestInstanceFromNode(nativeEventTarget);

    if (targetInst !== null) {
      var nearestMounted = getNearestMountedFiber(targetInst);

      if (nearestMounted === null) {
        // This tree has been unmounted already. Dispatch without a target.
        targetInst = null;
      } else {
        var tag = nearestMounted.tag;

        if (tag === SuspenseComponent) {
          var instance = getSuspenseInstanceFromFiber(nearestMounted);

          if (instance !== null) {
            // Queue the event to be replayed later. Abort dispatching since we
            // don't want this event dispatched twice through the event system.
            // TODO: If this is the first discrete event in the queue. Schedule an increased
            // priority for this boundary.
            return instance;
          } // This shouldn't happen, something went wrong but to avoid blocking
          // the whole system, dispatch the event without a target.
          // TODO: Warn.


          targetInst = null;
        } else if (tag === HostRoot) {
          var root = nearestMounted.stateNode;

          if (root.hydrate) {
            // If this happens during a replay something went wrong and it might block
            // the whole system.
            return getContainerFromFiber(nearestMounted);
          }

          targetInst = null;
        } else if (nearestMounted !== targetInst) {
          // If we get an event (ex: img onload) before committing that
          // component's mount, ignore it for now (that is, treat it as if it was an
          // event on a non-React tree). We might also consider queueing events and
          // dispatching them after the mount.
          targetInst = null;
        }
      }
    }

    {
      dispatchEventForLegacyPluginEventSystem(topLevelType, eventSystemFlags, nativeEvent, targetInst);
    } // We're not blocked on anything.


    return null;
  }

  // List derived from Gecko source code:
  // https://github.com/mozilla/gecko-dev/blob/4e638efc71/layout/style/test/property_database.js
  var shorthandToLonghand = {
    animation: ['animationDelay', 'animationDirection', 'animationDuration', 'animationFillMode', 'animationIterationCount', 'animationName', 'animationPlayState', 'animationTimingFunction'],
    background: ['backgroundAttachment', 'backgroundClip', 'backgroundColor', 'backgroundImage', 'backgroundOrigin', 'backgroundPositionX', 'backgroundPositionY', 'backgroundRepeat', 'backgroundSize'],
    backgroundPosition: ['backgroundPositionX', 'backgroundPositionY'],
    border: ['borderBottomColor', 'borderBottomStyle', 'borderBottomWidth', 'borderImageOutset', 'borderImageRepeat', 'borderImageSlice', 'borderImageSource', 'borderImageWidth', 'borderLeftColor', 'borderLeftStyle', 'borderLeftWidth', 'borderRightColor', 'borderRightStyle', 'borderRightWidth', 'borderTopColor', 'borderTopStyle', 'borderTopWidth'],
    borderBlockEnd: ['borderBlockEndColor', 'borderBlockEndStyle', 'borderBlockEndWidth'],
    borderBlockStart: ['borderBlockStartColor', 'borderBlockStartStyle', 'borderBlockStartWidth'],
    borderBottom: ['borderBottomColor', 'borderBottomStyle', 'borderBottomWidth'],
    borderColor: ['borderBottomColor', 'borderLeftColor', 'borderRightColor', 'borderTopColor'],
    borderImage: ['borderImageOutset', 'borderImageRepeat', 'borderImageSlice', 'borderImageSource', 'borderImageWidth'],
    borderInlineEnd: ['borderInlineEndColor', 'borderInlineEndStyle', 'borderInlineEndWidth'],
    borderInlineStart: ['borderInlineStartColor', 'borderInlineStartStyle', 'borderInlineStartWidth'],
    borderLeft: ['borderLeftColor', 'borderLeftStyle', 'borderLeftWidth'],
    borderRadius: ['borderBottomLeftRadius', 'borderBottomRightRadius', 'borderTopLeftRadius', 'borderTopRightRadius'],
    borderRight: ['borderRightColor', 'borderRightStyle', 'borderRightWidth'],
    borderStyle: ['borderBottomStyle', 'borderLeftStyle', 'borderRightStyle', 'borderTopStyle'],
    borderTop: ['borderTopColor', 'borderTopStyle', 'borderTopWidth'],
    borderWidth: ['borderBottomWidth', 'borderLeftWidth', 'borderRightWidth', 'borderTopWidth'],
    columnRule: ['columnRuleColor', 'columnRuleStyle', 'columnRuleWidth'],
    columns: ['columnCount', 'columnWidth'],
    flex: ['flexBasis', 'flexGrow', 'flexShrink'],
    flexFlow: ['flexDirection', 'flexWrap'],
    font: ['fontFamily', 'fontFeatureSettings', 'fontKerning', 'fontLanguageOverride', 'fontSize', 'fontSizeAdjust', 'fontStretch', 'fontStyle', 'fontVariant', 'fontVariantAlternates', 'fontVariantCaps', 'fontVariantEastAsian', 'fontVariantLigatures', 'fontVariantNumeric', 'fontVariantPosition', 'fontWeight', 'lineHeight'],
    fontVariant: ['fontVariantAlternates', 'fontVariantCaps', 'fontVariantEastAsian', 'fontVariantLigatures', 'fontVariantNumeric', 'fontVariantPosition'],
    gap: ['columnGap', 'rowGap'],
    grid: ['gridAutoColumns', 'gridAutoFlow', 'gridAutoRows', 'gridTemplateAreas', 'gridTemplateColumns', 'gridTemplateRows'],
    gridArea: ['gridColumnEnd', 'gridColumnStart', 'gridRowEnd', 'gridRowStart'],
    gridColumn: ['gridColumnEnd', 'gridColumnStart'],
    gridColumnGap: ['columnGap'],
    gridGap: ['columnGap', 'rowGap'],
    gridRow: ['gridRowEnd', 'gridRowStart'],
    gridRowGap: ['rowGap'],
    gridTemplate: ['gridTemplateAreas', 'gridTemplateColumns', 'gridTemplateRows'],
    listStyle: ['listStyleImage', 'listStylePosition', 'listStyleType'],
    margin: ['marginBottom', 'marginLeft', 'marginRight', 'marginTop'],
    marker: ['markerEnd', 'markerMid', 'markerStart'],
    mask: ['maskClip', 'maskComposite', 'maskImage', 'maskMode', 'maskOrigin', 'maskPositionX', 'maskPositionY', 'maskRepeat', 'maskSize'],
    maskPosition: ['maskPositionX', 'maskPositionY'],
    outline: ['outlineColor', 'outlineStyle', 'outlineWidth'],
    overflow: ['overflowX', 'overflowY'],
    padding: ['paddingBottom', 'paddingLeft', 'paddingRight', 'paddingTop'],
    placeContent: ['alignContent', 'justifyContent'],
    placeItems: ['alignItems', 'justifyItems'],
    placeSelf: ['alignSelf', 'justifySelf'],
    textDecoration: ['textDecorationColor', 'textDecorationLine', 'textDecorationStyle'],
    textEmphasis: ['textEmphasisColor', 'textEmphasisStyle'],
    transition: ['transitionDelay', 'transitionDuration', 'transitionProperty', 'transitionTimingFunction'],
    wordWrap: ['overflowWrap']
  };

  /**
   * CSS properties which accept numbers but are not in units of "px".
   */
  var isUnitlessNumber = {
    animationIterationCount: true,
    borderImageOutset: true,
    borderImageSlice: true,
    borderImageWidth: true,
    boxFlex: true,
    boxFlexGroup: true,
    boxOrdinalGroup: true,
    columnCount: true,
    columns: true,
    flex: true,
    flexGrow: true,
    flexPositive: true,
    flexShrink: true,
    flexNegative: true,
    flexOrder: true,
    gridArea: true,
    gridRow: true,
    gridRowEnd: true,
    gridRowSpan: true,
    gridRowStart: true,
    gridColumn: true,
    gridColumnEnd: true,
    gridColumnSpan: true,
    gridColumnStart: true,
    fontWeight: true,
    lineClamp: true,
    lineHeight: true,
    opacity: true,
    order: true,
    orphans: true,
    tabSize: true,
    widows: true,
    zIndex: true,
    zoom: true,
    // SVG-related properties
    fillOpacity: true,
    floodOpacity: true,
    stopOpacity: true,
    strokeDasharray: true,
    strokeDashoffset: true,
    strokeMiterlimit: true,
    strokeOpacity: true,
    strokeWidth: true
  };
  /**
   * @param {string} prefix vendor-specific prefix, eg: Webkit
   * @param {string} key style name, eg: transitionDuration
   * @return {string} style name prefixed with `prefix`, properly camelCased, eg:
   * WebkitTransitionDuration
   */

  function prefixKey(prefix, key) {
    return prefix + key.charAt(0).toUpperCase() + key.substring(1);
  }
  /**
   * Support style names that may come passed in prefixed by adding permutations
   * of vendor prefixes.
   */


  var prefixes = ['Webkit', 'ms', 'Moz', 'O']; // Using Object.keys here, or else the vanilla for-in loop makes IE8 go into an
  // infinite loop, because it iterates over the newly added props too.

  Object.keys(isUnitlessNumber).forEach(function (prop) {
    prefixes.forEach(function (prefix) {
      isUnitlessNumber[prefixKey(prefix, prop)] = isUnitlessNumber[prop];
    });
  });

  /**
   * Convert a value into the proper css writable value. The style name `name`
   * should be logical (no hyphens), as specified
   * in `CSSProperty.isUnitlessNumber`.
   *
   * @param {string} name CSS property name such as `topMargin`.
   * @param {*} value CSS property value such as `10px`.
   * @return {string} Normalized style value with dimensions applied.
   */

  function dangerousStyleValue(name, value, isCustomProperty) {
    // Note that we've removed escapeTextForBrowser() calls here since the
    // whole string will be escaped when the attribute is injected into
    // the markup. If you provide unsafe user data here they can inject
    // arbitrary CSS which may be problematic (I couldn't repro this):
    // https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet
    // http://www.thespanner.co.uk/2007/11/26/ultimate-xss-css-injection/
    // This is not an XSS hole but instead a potential CSS injection issue
    // which has lead to a greater discussion about how we're going to
    // trust URLs moving forward. See #2115901
    var isEmpty = value == null || typeof value === 'boolean' || value === '';

    if (isEmpty) {
      return '';
    }

    if (!isCustomProperty && typeof value === 'number' && value !== 0 && !(isUnitlessNumber.hasOwnProperty(name) && isUnitlessNumber[name])) {
      return value + 'px'; // Presumes implicit 'px' suffix for unitless numbers
    }

    return ('' + value).trim();
  }

  var uppercasePattern = /([A-Z])/g;
  var msPattern = /^ms-/;
  /**
   * Hyphenates a camelcased CSS property name, for example:
   *
   *   > hyphenateStyleName('backgroundColor')
   *   < "background-color"
   *   > hyphenateStyleName('MozTransition')
   *   < "-moz-transition"
   *   > hyphenateStyleName('msTransition')
   *   < "-ms-transition"
   *
   * As Modernizr suggests (http://modernizr.com/docs/#prefixed), an `ms` prefix
   * is converted to `-ms-`.
   */

  function hyphenateStyleName(name) {
    return name.replace(uppercasePattern, '-$1').toLowerCase().replace(msPattern, '-ms-');
  }

  var warnValidStyle = function () {};

  {
    // 'msTransform' is correct, but the other prefixes should be capitalized
    var badVendoredStyleNamePattern = /^(?:webkit|moz|o)[A-Z]/;
    var msPattern$1 = /^-ms-/;
    var hyphenPattern = /-(.)/g; // style values shouldn't contain a semicolon

    var badStyleValueWithSemicolonPattern = /;\s*$/;
    var warnedStyleNames = {};
    var warnedStyleValues = {};
    var warnedForNaNValue = false;
    var warnedForInfinityValue = false;

    var camelize = function (string) {
      return string.replace(hyphenPattern, function (_, character) {
        return character.toUpperCase();
      });
    };

    var warnHyphenatedStyleName = function (name) {
      if (warnedStyleNames.hasOwnProperty(name) && warnedStyleNames[name]) {
        return;
      }

      warnedStyleNames[name] = true;

      error('Unsupported style property %s. Did you mean %s?', name, // As Andi Smith suggests
      // (http://www.andismith.com/blog/2012/02/modernizr-prefixed/), an `-ms` prefix
      // is converted to lowercase `ms`.
      camelize(name.replace(msPattern$1, 'ms-')));
    };

    var warnBadVendoredStyleName = function (name) {
      if (warnedStyleNames.hasOwnProperty(name) && warnedStyleNames[name]) {
        return;
      }

      warnedStyleNames[name] = true;

      error('Unsupported vendor-prefixed style property %s. Did you mean %s?', name, name.charAt(0).toUpperCase() + name.slice(1));
    };

    var warnStyleValueWithSemicolon = function (name, value) {
      if (warnedStyleValues.hasOwnProperty(value) && warnedStyleValues[value]) {
        return;
      }

      warnedStyleValues[value] = true;

      error("Style property values shouldn't contain a semicolon. " + 'Try "%s: %s" instead.', name, value.replace(badStyleValueWithSemicolonPattern, ''));
    };

    var warnStyleValueIsNaN = function (name, value) {
      if (warnedForNaNValue) {
        return;
      }

      warnedForNaNValue = true;

      error('`NaN` is an invalid value for the `%s` css style property.', name);
    };

    var warnStyleValueIsInfinity = function (name, value) {
      if (warnedForInfinityValue) {
        return;
      }

      warnedForInfinityValue = true;

      error('`Infinity` is an invalid value for the `%s` css style property.', name);
    };

    warnValidStyle = function (name, value) {
      if (name.indexOf('-') > -1) {
        warnHyphenatedStyleName(name);
      } else if (badVendoredStyleNamePattern.test(name)) {
        warnBadVendoredStyleName(name);
      } else if (badStyleValueWithSemicolonPattern.test(value)) {
        warnStyleValueWithSemicolon(name, value);
      }

      if (typeof value === 'number') {
        if (isNaN(value)) {
          warnStyleValueIsNaN(name, value);
        } else if (!isFinite(value)) {
          warnStyleValueIsInfinity(name, value);
        }
      }
    };
  }

  var warnValidStyle$1 = warnValidStyle;

  /**
   * Operations for dealing with CSS properties.
   */

  /**
   * This creates a string that is expected to be equivalent to the style
   * attribute generated by server-side rendering. It by-passes warnings and
   * security checks so it's not safe to use this value for anything other than
   * comparison. It is only used in DEV for SSR validation.
   */

  function createDangerousStringForStyles(styles) {
    {
      var serialized = '';
      var delimiter = '';

      for (var styleName in styles) {
        if (!styles.hasOwnProperty(styleName)) {
          continue;
        }

        var styleValue = styles[styleName];

        if (styleValue != null) {
          var isCustomProperty = styleName.indexOf('--') === 0;
          serialized += delimiter + (isCustomProperty ? styleName : hyphenateStyleName(styleName)) + ':';
          serialized += dangerousStyleValue(styleName, styleValue, isCustomProperty);
          delimiter = ';';
        }
      }

      return serialized || null;
    }
  }
  /**
   * Sets the value for multiple styles on a node.  If a value is specified as
   * '' (empty string), the corresponding style property will be unset.
   *
   * @param {DOMElement} node
   * @param {object} styles
   */

  function setValueForStyles(node, styles) {
    var style = node.style;

    for (var styleName in styles) {
      if (!styles.hasOwnProperty(styleName)) {
        continue;
      }

      var isCustomProperty = styleName.indexOf('--') === 0;

      {
        if (!isCustomProperty) {
          warnValidStyle$1(styleName, styles[styleName]);
        }
      }

      var styleValue = dangerousStyleValue(styleName, styles[styleName], isCustomProperty);

      if (styleName === 'float') {
        styleName = 'cssFloat';
      }

      if (isCustomProperty) {
        style.setProperty(styleName, styleValue);
      } else {
        style[styleName] = styleValue;
      }
    }
  }

  function isValueEmpty(value) {
    return value == null || typeof value === 'boolean' || value === '';
  }
  /**
   * Given {color: 'red', overflow: 'hidden'} returns {
   *   color: 'color',
   *   overflowX: 'overflow',
   *   overflowY: 'overflow',
   * }. This can be read as "the overflowY property was set by the overflow
   * shorthand". That is, the values are the property that each was derived from.
   */


  function expandShorthandMap(styles) {
    var expanded = {};

    for (var key in styles) {
      var longhands = shorthandToLonghand[key] || [key];

      for (var i = 0; i < longhands.length; i++) {
        expanded[longhands[i]] = key;
      }
    }

    return expanded;
  }
  /**
   * When mixing shorthand and longhand property names, we warn during updates if
   * we expect an incorrect result to occur. In particular, we warn for:
   *
   * Updating a shorthand property (longhand gets overwritten):
   *   {font: 'foo', fontVariant: 'bar'} -> {font: 'baz', fontVariant: 'bar'}
   *   becomes .style.font = 'baz'
   * Removing a shorthand property (longhand gets lost too):
   *   {font: 'foo', fontVariant: 'bar'} -> {fontVariant: 'bar'}
   *   becomes .style.font = ''
   * Removing a longhand property (should revert to shorthand; doesn't):
   *   {font: 'foo', fontVariant: 'bar'} -> {font: 'foo'}
   *   becomes .style.fontVariant = ''
   */


  function validateShorthandPropertyCollisionInDev(styleUpdates, nextStyles) {
    {

      if (!nextStyles) {
        return;
      }

      var expandedUpdates = expandShorthandMap(styleUpdates);
      var expandedStyles = expandShorthandMap(nextStyles);
      var warnedAbout = {};

      for (var key in expandedUpdates) {
        var originalKey = expandedUpdates[key];
        var correctOriginalKey = expandedStyles[key];

        if (correctOriginalKey && originalKey !== correctOriginalKey) {
          var warningKey = originalKey + ',' + correctOriginalKey;

          if (warnedAbout[warningKey]) {
            continue;
          }

          warnedAbout[warningKey] = true;

          error('%s a style property during rerender (%s) when a ' + 'conflicting property is set (%s) can lead to styling bugs. To ' + "avoid this, don't mix shorthand and non-shorthand properties " + 'for the same value; instead, replace the shorthand with ' + 'separate values.', isValueEmpty(styleUpdates[originalKey]) ? 'Removing' : 'Updating', originalKey, correctOriginalKey);
        }
      }
    }
  }

  // For HTML, certain tags should omit their close tag. We keep a whitelist for
  // those special-case tags.
  var omittedCloseTags = {
    area: true,
    base: true,
    br: true,
    col: true,
    embed: true,
    hr: true,
    img: true,
    input: true,
    keygen: true,
    link: true,
    meta: true,
    param: true,
    source: true,
    track: true,
    wbr: true // NOTE: menuitem's close tag should be omitted, but that causes problems.

  };

  // `omittedCloseTags` except that `menuitem` should still have its closing tag.

  var voidElementTags = _assign({
    menuitem: true
  }, omittedCloseTags);

  var HTML = '__html';
  var ReactDebugCurrentFrame$3 = null;

  {
    ReactDebugCurrentFrame$3 = ReactSharedInternals.ReactDebugCurrentFrame;
  }

  function assertValidProps(tag, props) {
    if (!props) {
      return;
    } // Note the use of `==` which checks for null or undefined.


    if (voidElementTags[tag]) {
      if (!(props.children == null && props.dangerouslySetInnerHTML == null)) {
        {
          throw Error( tag + " is a void element tag and must neither have `children` nor use `dangerouslySetInnerHTML`." + ( ReactDebugCurrentFrame$3.getStackAddendum() ) );
        }
      }
    }

    if (props.dangerouslySetInnerHTML != null) {
      if (!(props.children == null)) {
        {
          throw Error( "Can only set one of `children` or `props.dangerouslySetInnerHTML`." );
        }
      }

      if (!(typeof props.dangerouslySetInnerHTML === 'object' && HTML in props.dangerouslySetInnerHTML)) {
        {
          throw Error( "`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. Please visit https://fb.me/react-invariant-dangerously-set-inner-html for more information." );
        }
      }
    }

    {
      if (!props.suppressContentEditableWarning && props.contentEditable && props.children != null) {
        error('A component is `contentEditable` and contains `children` managed by ' + 'React. It is now your responsibility to guarantee that none of ' + 'those nodes are unexpectedly modified or duplicated. This is ' + 'probably not intentional.');
      }
    }

    if (!(props.style == null || typeof props.style === 'object')) {
      {
        throw Error( "The `style` prop expects a mapping from style properties to values, not a string. For example, style={{marginRight: spacing + 'em'}} when using JSX." + ( ReactDebugCurrentFrame$3.getStackAddendum() ) );
      }
    }
  }

  function isCustomComponent(tagName, props) {
    if (tagName.indexOf('-') === -1) {
      return typeof props.is === 'string';
    }

    switch (tagName) {
      // These are reserved SVG and MathML elements.
      // We don't mind this whitelist too much because we expect it to never grow.
      // The alternative is to track the namespace in a few places which is convoluted.
      // https://w3c.github.io/webcomponents/spec/custom/#custom-elements-core-concepts
      case 'annotation-xml':
      case 'color-profile':
      case 'font-face':
      case 'font-face-src':
      case 'font-face-uri':
      case 'font-face-format':
      case 'font-face-name':
      case 'missing-glyph':
        return false;

      default:
        return true;
    }
  }

  // When adding attributes to the HTML or SVG whitelist, be sure to
  // also add them to this module to ensure casing and incorrect name
  // warnings.
  var possibleStandardNames = {
    // HTML
    accept: 'accept',
    acceptcharset: 'acceptCharset',
    'accept-charset': 'acceptCharset',
    accesskey: 'accessKey',
    action: 'action',
    allowfullscreen: 'allowFullScreen',
    alt: 'alt',
    as: 'as',
    async: 'async',
    autocapitalize: 'autoCapitalize',
    autocomplete: 'autoComplete',
    autocorrect: 'autoCorrect',
    autofocus: 'autoFocus',
    autoplay: 'autoPlay',
    autosave: 'autoSave',
    capture: 'capture',
    cellpadding: 'cellPadding',
    cellspacing: 'cellSpacing',
    challenge: 'challenge',
    charset: 'charSet',
    checked: 'checked',
    children: 'children',
    cite: 'cite',
    class: 'className',
    classid: 'classID',
    classname: 'className',
    cols: 'cols',
    colspan: 'colSpan',
    content: 'content',
    contenteditable: 'contentEditable',
    contextmenu: 'contextMenu',
    controls: 'controls',
    controlslist: 'controlsList',
    coords: 'coords',
    crossorigin: 'crossOrigin',
    dangerouslysetinnerhtml: 'dangerouslySetInnerHTML',
    data: 'data',
    datetime: 'dateTime',
    default: 'default',
    defaultchecked: 'defaultChecked',
    defaultvalue: 'defaultValue',
    defer: 'defer',
    dir: 'dir',
    disabled: 'disabled',
    disablepictureinpicture: 'disablePictureInPicture',
    download: 'download',
    draggable: 'draggable',
    enctype: 'encType',
    for: 'htmlFor',
    form: 'form',
    formmethod: 'formMethod',
    formaction: 'formAction',
    formenctype: 'formEncType',
    formnovalidate: 'formNoValidate',
    formtarget: 'formTarget',
    frameborder: 'frameBorder',
    headers: 'headers',
    height: 'height',
    hidden: 'hidden',
    high: 'high',
    href: 'href',
    hreflang: 'hrefLang',
    htmlfor: 'htmlFor',
    httpequiv: 'httpEquiv',
    'http-equiv': 'httpEquiv',
    icon: 'icon',
    id: 'id',
    innerhtml: 'innerHTML',
    inputmode: 'inputMode',
    integrity: 'integrity',
    is: 'is',
    itemid: 'itemID',
    itemprop: 'itemProp',
    itemref: 'itemRef',
    itemscope: 'itemScope',
    itemtype: 'itemType',
    keyparams: 'keyParams',
    keytype: 'keyType',
    kind: 'kind',
    label: 'label',
    lang: 'lang',
    list: 'list',
    loop: 'loop',
    low: 'low',
    manifest: 'manifest',
    marginwidth: 'marginWidth',
    marginheight: 'marginHeight',
    max: 'max',
    maxlength: 'maxLength',
    media: 'media',
    mediagroup: 'mediaGroup',
    method: 'method',
    min: 'min',
    minlength: 'minLength',
    multiple: 'multiple',
    muted: 'muted',
    name: 'name',
    nomodule: 'noModule',
    nonce: 'nonce',
    novalidate: 'noValidate',
    open: 'open',
    optimum: 'optimum',
    pattern: 'pattern',
    placeholder: 'placeholder',
    playsinline: 'playsInline',
    poster: 'poster',
    preload: 'preload',
    profile: 'profile',
    radiogroup: 'radioGroup',
    readonly: 'readOnly',
    referrerpolicy: 'referrerPolicy',
    rel: 'rel',
    required: 'required',
    reversed: 'reversed',
    role: 'role',
    rows: 'rows',
    rowspan: 'rowSpan',
    sandbox: 'sandbox',
    scope: 'scope',
    scoped: 'scoped',
    scrolling: 'scrolling',
    seamless: 'seamless',
    selected: 'selected',
    shape: 'shape',
    size: 'size',
    sizes: 'sizes',
    span: 'span',
    spellcheck: 'spellCheck',
    src: 'src',
    srcdoc: 'srcDoc',
    srclang: 'srcLang',
    srcset: 'srcSet',
    start: 'start',
    step: 'step',
    style: 'style',
    summary: 'summary',
    tabindex: 'tabIndex',
    target: 'target',
    title: 'title',
    type: 'type',
    usemap: 'useMap',
    value: 'value',
    width: 'width',
    wmode: 'wmode',
    wrap: 'wrap',
    // SVG
    about: 'about',
    accentheight: 'accentHeight',
    'accent-height': 'accentHeight',
    accumulate: 'accumulate',
    additive: 'additive',
    alignmentbaseline: 'alignmentBaseline',
    'alignment-baseline': 'alignmentBaseline',
    allowreorder: 'allowReorder',
    alphabetic: 'alphabetic',
    amplitude: 'amplitude',
    arabicform: 'arabicForm',
    'arabic-form': 'arabicForm',
    ascent: 'ascent',
    attributename: 'attributeName',
    attributetype: 'attributeType',
    autoreverse: 'autoReverse',
    azimuth: 'azimuth',
    basefrequency: 'baseFrequency',
    baselineshift: 'baselineShift',
    'baseline-shift': 'baselineShift',
    baseprofile: 'baseProfile',
    bbox: 'bbox',
    begin: 'begin',
    bias: 'bias',
    by: 'by',
    calcmode: 'calcMode',
    capheight: 'capHeight',
    'cap-height': 'capHeight',
    clip: 'clip',
    clippath: 'clipPath',
    'clip-path': 'clipPath',
    clippathunits: 'clipPathUnits',
    cliprule: 'clipRule',
    'clip-rule': 'clipRule',
    color: 'color',
    colorinterpolation: 'colorInterpolation',
    'color-interpolation': 'colorInterpolation',
    colorinterpolationfilters: 'colorInterpolationFilters',
    'color-interpolation-filters': 'colorInterpolationFilters',
    colorprofile: 'colorProfile',
    'color-profile': 'colorProfile',
    colorrendering: 'colorRendering',
    'color-rendering': 'colorRendering',
    contentscripttype: 'contentScriptType',
    contentstyletype: 'contentStyleType',
    cursor: 'cursor',
    cx: 'cx',
    cy: 'cy',
    d: 'd',
    datatype: 'datatype',
    decelerate: 'decelerate',
    descent: 'descent',
    diffuseconstant: 'diffuseConstant',
    direction: 'direction',
    display: 'display',
    divisor: 'divisor',
    dominantbaseline: 'dominantBaseline',
    'dominant-baseline': 'dominantBaseline',
    dur: 'dur',
    dx: 'dx',
    dy: 'dy',
    edgemode: 'edgeMode',
    elevation: 'elevation',
    enablebackground: 'enableBackground',
    'enable-background': 'enableBackground',
    end: 'end',
    exponent: 'exponent',
    externalresourcesrequired: 'externalResourcesRequired',
    fill: 'fill',
    fillopacity: 'fillOpacity',
    'fill-opacity': 'fillOpacity',
    fillrule: 'fillRule',
    'fill-rule': 'fillRule',
    filter: 'filter',
    filterres: 'filterRes',
    filterunits: 'filterUnits',
    floodopacity: 'floodOpacity',
    'flood-opacity': 'floodOpacity',
    floodcolor: 'floodColor',
    'flood-color': 'floodColor',
    focusable: 'focusable',
    fontfamily: 'fontFamily',
    'font-family': 'fontFamily',
    fontsize: 'fontSize',
    'font-size': 'fontSize',
    fontsizeadjust: 'fontSizeAdjust',
    'font-size-adjust': 'fontSizeAdjust',
    fontstretch: 'fontStretch',
    'font-stretch': 'fontStretch',
    fontstyle: 'fontStyle',
    'font-style': 'fontStyle',
    fontvariant: 'fontVariant',
    'font-variant': 'fontVariant',
    fontweight: 'fontWeight',
    'font-weight': 'fontWeight',
    format: 'format',
    from: 'from',
    fx: 'fx',
    fy: 'fy',
    g1: 'g1',
    g2: 'g2',
    glyphname: 'glyphName',
    'glyph-name': 'glyphName',
    glyphorientationhorizontal: 'glyphOrientationHorizontal',
    'glyph-orientation-horizontal': 'glyphOrientationHorizontal',
    glyphorientationvertical: 'glyphOrientationVertical',
    'glyph-orientation-vertical': 'glyphOrientationVertical',
    glyphref: 'glyphRef',
    gradienttransform: 'gradientTransform',
    gradientunits: 'gradientUnits',
    hanging: 'hanging',
    horizadvx: 'horizAdvX',
    'horiz-adv-x': 'horizAdvX',
    horizoriginx: 'horizOriginX',
    'horiz-origin-x': 'horizOriginX',
    ideographic: 'ideographic',
    imagerendering: 'imageRendering',
    'image-rendering': 'imageRendering',
    in2: 'in2',
    in: 'in',
    inlist: 'inlist',
    intercept: 'intercept',
    k1: 'k1',
    k2: 'k2',
    k3: 'k3',
    k4: 'k4',
    k: 'k',
    kernelmatrix: 'kernelMatrix',
    kernelunitlength: 'kernelUnitLength',
    kerning: 'kerning',
    keypoints: 'keyPoints',
    keysplines: 'keySplines',
    keytimes: 'keyTimes',
    lengthadjust: 'lengthAdjust',
    letterspacing: 'letterSpacing',
    'letter-spacing': 'letterSpacing',
    lightingcolor: 'lightingColor',
    'lighting-color': 'lightingColor',
    limitingconeangle: 'limitingConeAngle',
    local: 'local',
    markerend: 'markerEnd',
    'marker-end': 'markerEnd',
    markerheight: 'markerHeight',
    markermid: 'markerMid',
    'marker-mid': 'markerMid',
    markerstart: 'markerStart',
    'marker-start': 'markerStart',
    markerunits: 'markerUnits',
    markerwidth: 'markerWidth',
    mask: 'mask',
    maskcontentunits: 'maskContentUnits',
    maskunits: 'maskUnits',
    mathematical: 'mathematical',
    mode: 'mode',
    numoctaves: 'numOctaves',
    offset: 'offset',
    opacity: 'opacity',
    operator: 'operator',
    order: 'order',
    orient: 'orient',
    orientation: 'orientation',
    origin: 'origin',
    overflow: 'overflow',
    overlineposition: 'overlinePosition',
    'overline-position': 'overlinePosition',
    overlinethickness: 'overlineThickness',
    'overline-thickness': 'overlineThickness',
    paintorder: 'paintOrder',
    'paint-order': 'paintOrder',
    panose1: 'panose1',
    'panose-1': 'panose1',
    pathlength: 'pathLength',
    patterncontentunits: 'patternContentUnits',
    patterntransform: 'patternTransform',
    patternunits: 'patternUnits',
    pointerevents: 'pointerEvents',
    'pointer-events': 'pointerEvents',
    points: 'points',
    pointsatx: 'pointsAtX',
    pointsaty: 'pointsAtY',
    pointsatz: 'pointsAtZ',
    prefix: 'prefix',
    preservealpha: 'preserveAlpha',
    preserveaspectratio: 'preserveAspectRatio',
    primitiveunits: 'primitiveUnits',
    property: 'property',
    r: 'r',
    radius: 'radius',
    refx: 'refX',
    refy: 'refY',
    renderingintent: 'renderingIntent',
    'rendering-intent': 'renderingIntent',
    repeatcount: 'repeatCount',
    repeatdur: 'repeatDur',
    requiredextensions: 'requiredExtensions',
    requiredfeatures: 'requiredFeatures',
    resource: 'resource',
    restart: 'restart',
    result: 'result',
    results: 'results',
    rotate: 'rotate',
    rx: 'rx',
    ry: 'ry',
    scale: 'scale',
    security: 'security',
    seed: 'seed',
    shaperendering: 'shapeRendering',
    'shape-rendering': 'shapeRendering',
    slope: 'slope',
    spacing: 'spacing',
    specularconstant: 'specularConstant',
    specularexponent: 'specularExponent',
    speed: 'speed',
    spreadmethod: 'spreadMethod',
    startoffset: 'startOffset',
    stddeviation: 'stdDeviation',
    stemh: 'stemh',
    stemv: 'stemv',
    stitchtiles: 'stitchTiles',
    stopcolor: 'stopColor',
    'stop-color': 'stopColor',
    stopopacity: 'stopOpacity',
    'stop-opacity': 'stopOpacity',
    strikethroughposition: 'strikethroughPosition',
    'strikethrough-position': 'strikethroughPosition',
    strikethroughthickness: 'strikethroughThickness',
    'strikethrough-thickness': 'strikethroughThickness',
    string: 'string',
    stroke: 'stroke',
    strokedasharray: 'strokeDasharray',
    'stroke-dasharray': 'strokeDasharray',
    strokedashoffset: 'strokeDashoffset',
    'stroke-dashoffset': 'strokeDashoffset',
    strokelinecap: 'strokeLinecap',
    'stroke-linecap': 'strokeLinecap',
    strokelinejoin: 'strokeLinejoin',
    'stroke-linejoin': 'strokeLinejoin',
    strokemiterlimit: 'strokeMiterlimit',
    'stroke-miterlimit': 'strokeMiterlimit',
    strokewidth: 'strokeWidth',
    'stroke-width': 'strokeWidth',
    strokeopacity: 'strokeOpacity',
    'stroke-opacity': 'strokeOpacity',
    suppresscontenteditablewarning: 'suppressContentEditableWarning',
    suppresshydrationwarning: 'suppressHydrationWarning',
    surfacescale: 'surfaceScale',
    systemlanguage: 'systemLanguage',
    tablevalues: 'tableValues',
    targetx: 'targetX',
    targety: 'targetY',
    textanchor: 'textAnchor',
    'text-anchor': 'textAnchor',
    textdecoration: 'textDecoration',
    'text-decoration': 'textDecoration',
    textlength: 'textLength',
    textrendering: 'textRendering',
    'text-rendering': 'textRendering',
    to: 'to',
    transform: 'transform',
    typeof: 'typeof',
    u1: 'u1',
    u2: 'u2',
    underlineposition: 'underlinePosition',
    'underline-position': 'underlinePosition',
    underlinethickness: 'underlineThickness',
    'underline-thickness': 'underlineThickness',
    unicode: 'unicode',
    unicodebidi: 'unicodeBidi',
    'unicode-bidi': 'unicodeBidi',
    unicoderange: 'unicodeRange',
    'unicode-range': 'unicodeRange',
    unitsperem: 'unitsPerEm',
    'units-per-em': 'unitsPerEm',
    unselectable: 'unselectable',
    valphabetic: 'vAlphabetic',
    'v-alphabetic': 'vAlphabetic',
    values: 'values',
    vectoreffect: 'vectorEffect',
    'vector-effect': 'vectorEffect',
    version: 'version',
    vertadvy: 'vertAdvY',
    'vert-adv-y': 'vertAdvY',
    vertoriginx: 'vertOriginX',
    'vert-origin-x': 'vertOriginX',
    vertoriginy: 'vertOriginY',
    'vert-origin-y': 'vertOriginY',
    vhanging: 'vHanging',
    'v-hanging': 'vHanging',
    videographic: 'vIdeographic',
    'v-ideographic': 'vIdeographic',
    viewbox: 'viewBox',
    viewtarget: 'viewTarget',
    visibility: 'visibility',
    vmathematical: 'vMathematical',
    'v-mathematical': 'vMathematical',
    vocab: 'vocab',
    widths: 'widths',
    wordspacing: 'wordSpacing',
    'word-spacing': 'wordSpacing',
    writingmode: 'writingMode',
    'writing-mode': 'writingMode',
    x1: 'x1',
    x2: 'x2',
    x: 'x',
    xchannelselector: 'xChannelSelector',
    xheight: 'xHeight',
    'x-height': 'xHeight',
    xlinkactuate: 'xlinkActuate',
    'xlink:actuate': 'xlinkActuate',
    xlinkarcrole: 'xlinkArcrole',
    'xlink:arcrole': 'xlinkArcrole',
    xlinkhref: 'xlinkHref',
    'xlink:href': 'xlinkHref',
    xlinkrole: 'xlinkRole',
    'xlink:role': 'xlinkRole',
    xlinkshow: 'xlinkShow',
    'xlink:show': 'xlinkShow',
    xlinktitle: 'xlinkTitle',
    'xlink:title': 'xlinkTitle',
    xlinktype: 'xlinkType',
    'xlink:type': 'xlinkType',
    xmlbase: 'xmlBase',
    'xml:base': 'xmlBase',
    xmllang: 'xmlLang',
    'xml:lang': 'xmlLang',
    xmlns: 'xmlns',
    'xml:space': 'xmlSpace',
    xmlnsxlink: 'xmlnsXlink',
    'xmlns:xlink': 'xmlnsXlink',
    xmlspace: 'xmlSpace',
    y1: 'y1',
    y2: 'y2',
    y: 'y',
    ychannelselector: 'yChannelSelector',
    z: 'z',
    zoomandpan: 'zoomAndPan'
  };

  var ariaProperties = {
    'aria-current': 0,
    // state
    'aria-details': 0,
    'aria-disabled': 0,
    // state
    'aria-hidden': 0,
    // state
    'aria-invalid': 0,
    // state
    'aria-keyshortcuts': 0,
    'aria-label': 0,
    'aria-roledescription': 0,
    // Widget Attributes
    'aria-autocomplete': 0,
    'aria-checked': 0,
    'aria-expanded': 0,
    'aria-haspopup': 0,
    'aria-level': 0,
    'aria-modal': 0,
    'aria-multiline': 0,
    'aria-multiselectable': 0,
    'aria-orientation': 0,
    'aria-placeholder': 0,
    'aria-pressed': 0,
    'aria-readonly': 0,
    'aria-required': 0,
    'aria-selected': 0,
    'aria-sort': 0,
    'aria-valuemax': 0,
    'aria-valuemin': 0,
    'aria-valuenow': 0,
    'aria-valuetext': 0,
    // Live Region Attributes
    'aria-atomic': 0,
    'aria-busy': 0,
    'aria-live': 0,
    'aria-relevant': 0,
    // Drag-and-Drop Attributes
    'aria-dropeffect': 0,
    'aria-grabbed': 0,
    // Relationship Attributes
    'aria-activedescendant': 0,
    'aria-colcount': 0,
    'aria-colindex': 0,
    'aria-colspan': 0,
    'aria-controls': 0,
    'aria-describedby': 0,
    'aria-errormessage': 0,
    'aria-flowto': 0,
    'aria-labelledby': 0,
    'aria-owns': 0,
    'aria-posinset': 0,
    'aria-rowcount': 0,
    'aria-rowindex': 0,
    'aria-rowspan': 0,
    'aria-setsize': 0
  };

  var warnedProperties = {};
  var rARIA = new RegExp('^(aria)-[' + ATTRIBUTE_NAME_CHAR + ']*$');
  var rARIACamel = new RegExp('^(aria)[A-Z][' + ATTRIBUTE_NAME_CHAR + ']*$');
  var hasOwnProperty$1 = Object.prototype.hasOwnProperty;

  function validateProperty(tagName, name) {
    {
      if (hasOwnProperty$1.call(warnedProperties, name) && warnedProperties[name]) {
        return true;
      }

      if (rARIACamel.test(name)) {
        var ariaName = 'aria-' + name.slice(4).toLowerCase();
        var correctName = ariaProperties.hasOwnProperty(ariaName) ? ariaName : null; // If this is an aria-* attribute, but is not listed in the known DOM
        // DOM properties, then it is an invalid aria-* attribute.

        if (correctName == null) {
          error('Invalid ARIA attribute `%s`. ARIA attributes follow the pattern aria-* and must be lowercase.', name);

          warnedProperties[name] = true;
          return true;
        } // aria-* attributes should be lowercase; suggest the lowercase version.


        if (name !== correctName) {
          error('Invalid ARIA attribute `%s`. Did you mean `%s`?', name, correctName);

          warnedProperties[name] = true;
          return true;
        }
      }

      if (rARIA.test(name)) {
        var lowerCasedName = name.toLowerCase();
        var standardName = ariaProperties.hasOwnProperty(lowerCasedName) ? lowerCasedName : null; // If this is an aria-* attribute, but is not listed in the known DOM
        // DOM properties, then it is an invalid aria-* attribute.

        if (standardName == null) {
          warnedProperties[name] = true;
          return false;
        } // aria-* attributes should be lowercase; suggest the lowercase version.


        if (name !== standardName) {
          error('Unknown ARIA attribute `%s`. Did you mean `%s`?', name, standardName);

          warnedProperties[name] = true;
          return true;
        }
      }
    }

    return true;
  }

  function warnInvalidARIAProps(type, props) {
    {
      var invalidProps = [];

      for (var key in props) {
        var isValid = validateProperty(type, key);

        if (!isValid) {
          invalidProps.push(key);
        }
      }

      var unknownPropString = invalidProps.map(function (prop) {
        return '`' + prop + '`';
      }).join(', ');

      if (invalidProps.length === 1) {
        error('Invalid aria prop %s on <%s> tag. ' + 'For details, see https://fb.me/invalid-aria-prop', unknownPropString, type);
      } else if (invalidProps.length > 1) {
        error('Invalid aria props %s on <%s> tag. ' + 'For details, see https://fb.me/invalid-aria-prop', unknownPropString, type);
      }
    }
  }

  function validateProperties(type, props) {
    if (isCustomComponent(type, props)) {
      return;
    }

    warnInvalidARIAProps(type, props);
  }

  var didWarnValueNull = false;
  function validateProperties$1(type, props) {
    {
      if (type !== 'input' && type !== 'textarea' && type !== 'select') {
        return;
      }

      if (props != null && props.value === null && !didWarnValueNull) {
        didWarnValueNull = true;

        if (type === 'select' && props.multiple) {
          error('`value` prop on `%s` should not be null. ' + 'Consider using an empty array when `multiple` is set to `true` ' + 'to clear the component or `undefined` for uncontrolled components.', type);
        } else {
          error('`value` prop on `%s` should not be null. ' + 'Consider using an empty string to clear the component or `undefined` ' + 'for uncontrolled components.', type);
        }
      }
    }
  }

  var validateProperty$1 = function () {};

  {
    var warnedProperties$1 = {};
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    var EVENT_NAME_REGEX = /^on./;
    var INVALID_EVENT_NAME_REGEX = /^on[^A-Z]/;
    var rARIA$1 = new RegExp('^(aria)-[' + ATTRIBUTE_NAME_CHAR + ']*$');
    var rARIACamel$1 = new RegExp('^(aria)[A-Z][' + ATTRIBUTE_NAME_CHAR + ']*$');

    validateProperty$1 = function (tagName, name, value, canUseEventSystem) {
      if (_hasOwnProperty.call(warnedProperties$1, name) && warnedProperties$1[name]) {
        return true;
      }

      var lowerCasedName = name.toLowerCase();

      if (lowerCasedName === 'onfocusin' || lowerCasedName === 'onfocusout') {
        error('React uses onFocus and onBlur instead of onFocusIn and onFocusOut. ' + 'All React events are normalized to bubble, so onFocusIn and onFocusOut ' + 'are not needed/supported by React.');

        warnedProperties$1[name] = true;
        return true;
      } // We can't rely on the event system being injected on the server.


      if (canUseEventSystem) {
        if (registrationNameModules.hasOwnProperty(name)) {
          return true;
        }

        var registrationName = possibleRegistrationNames.hasOwnProperty(lowerCasedName) ? possibleRegistrationNames[lowerCasedName] : null;

        if (registrationName != null) {
          error('Invalid event handler property `%s`. Did you mean `%s`?', name, registrationName);

          warnedProperties$1[name] = true;
          return true;
        }

        if (EVENT_NAME_REGEX.test(name)) {
          error('Unknown event handler property `%s`. It will be ignored.', name);

          warnedProperties$1[name] = true;
          return true;
        }
      } else if (EVENT_NAME_REGEX.test(name)) {
        // If no event plugins have been injected, we are in a server environment.
        // So we can't tell if the event name is correct for sure, but we can filter
        // out known bad ones like `onclick`. We can't suggest a specific replacement though.
        if (INVALID_EVENT_NAME_REGEX.test(name)) {
          error('Invalid event handler property `%s`. ' + 'React events use the camelCase naming convention, for example `onClick`.', name);
        }

        warnedProperties$1[name] = true;
        return true;
      } // Let the ARIA attribute hook validate ARIA attributes


      if (rARIA$1.test(name) || rARIACamel$1.test(name)) {
        return true;
      }

      if (lowerCasedName === 'innerhtml') {
        error('Directly setting property `innerHTML` is not permitted. ' + 'For more information, lookup documentation on `dangerouslySetInnerHTML`.');

        warnedProperties$1[name] = true;
        return true;
      }

      if (lowerCasedName === 'aria') {
        error('The `aria` attribute is reserved for future use in React. ' + 'Pass individual `aria-` attributes instead.');

        warnedProperties$1[name] = true;
        return true;
      }

      if (lowerCasedName === 'is' && value !== null && value !== undefined && typeof value !== 'string') {
        error('Received a `%s` for a string attribute `is`. If this is expected, cast ' + 'the value to a string.', typeof value);

        warnedProperties$1[name] = true;
        return true;
      }

      if (typeof value === 'number' && isNaN(value)) {
        error('Received NaN for the `%s` attribute. If this is expected, cast ' + 'the value to a string.', name);

        warnedProperties$1[name] = true;
        return true;
      }

      var propertyInfo = getPropertyInfo(name);
      var isReserved = propertyInfo !== null && propertyInfo.type === RESERVED; // Known attributes should match the casing specified in the property config.

      if (possibleStandardNames.hasOwnProperty(lowerCasedName)) {
        var standardName = possibleStandardNames[lowerCasedName];

        if (standardName !== name) {
          error('Invalid DOM property `%s`. Did you mean `%s`?', name, standardName);

          warnedProperties$1[name] = true;
          return true;
        }
      } else if (!isReserved && name !== lowerCasedName) {
        // Unknown attributes should have lowercase casing since that's how they
        // will be cased anyway with server rendering.
        error('React does not recognize the `%s` prop on a DOM element. If you ' + 'intentionally want it to appear in the DOM as a custom ' + 'attribute, spell it as lowercase `%s` instead. ' + 'If you accidentally passed it from a parent component, remove ' + 'it from the DOM element.', name, lowerCasedName);

        warnedProperties$1[name] = true;
        return true;
      }

      if (typeof value === 'boolean' && shouldRemoveAttributeWithWarning(name, value, propertyInfo, false)) {
        if (value) {
          error('Received `%s` for a non-boolean attribute `%s`.\n\n' + 'If you want to write it to the DOM, pass a string instead: ' + '%s="%s" or %s={value.toString()}.', value, name, name, value, name);
        } else {
          error('Received `%s` for a non-boolean attribute `%s`.\n\n' + 'If you want to write it to the DOM, pass a string instead: ' + '%s="%s" or %s={value.toString()}.\n\n' + 'If you used to conditionally omit it with %s={condition && value}, ' + 'pass %s={condition ? value : undefined} instead.', value, name, name, value, name, name, name);
        }

        warnedProperties$1[name] = true;
        return true;
      } // Now that we've validated casing, do not validate
      // data types for reserved props


      if (isReserved) {
        return true;
      } // Warn when a known attribute is a bad type


      if (shouldRemoveAttributeWithWarning(name, value, propertyInfo, false)) {
        warnedProperties$1[name] = true;
        return false;
      } // Warn when passing the strings 'false' or 'true' into a boolean prop


      if ((value === 'false' || value === 'true') && propertyInfo !== null && propertyInfo.type === BOOLEAN) {
        error('Received the string `%s` for the boolean attribute `%s`. ' + '%s ' + 'Did you mean %s={%s}?', value, name, value === 'false' ? 'The browser will interpret it as a truthy value.' : 'Although this works, it will not work as expected if you pass the string "false".', name, value);

        warnedProperties$1[name] = true;
        return true;
      }

      return true;
    };
  }

  var warnUnknownProperties = function (type, props, canUseEventSystem) {
    {
      var unknownProps = [];

      for (var key in props) {
        var isValid = validateProperty$1(type, key, props[key], canUseEventSystem);

        if (!isValid) {
          unknownProps.push(key);
        }
      }

      var unknownPropString = unknownProps.map(function (prop) {
        return '`' + prop + '`';
      }).join(', ');

      if (unknownProps.length === 1) {
        error('Invalid value for prop %s on <%s> tag. Either remove it from the element, ' + 'or pass a string or number value to keep it in the DOM. ' + 'For details, see https://fb.me/react-attribute-behavior', unknownPropString, type);
      } else if (unknownProps.length > 1) {
        error('Invalid values for props %s on <%s> tag. Either remove them from the element, ' + 'or pass a string or number value to keep them in the DOM. ' + 'For details, see https://fb.me/react-attribute-behavior', unknownPropString, type);
      }
    }
  };

  function validateProperties$2(type, props, canUseEventSystem) {
    if (isCustomComponent(type, props)) {
      return;
    }

    warnUnknownProperties(type, props, canUseEventSystem);
  }

  var didWarnInvalidHydration = false;
  var DANGEROUSLY_SET_INNER_HTML = 'dangerouslySetInnerHTML';
  var SUPPRESS_CONTENT_EDITABLE_WARNING = 'suppressContentEditableWarning';
  var SUPPRESS_HYDRATION_WARNING = 'suppressHydrationWarning';
  var AUTOFOCUS = 'autoFocus';
  var CHILDREN = 'children';
  var STYLE = 'style';
  var HTML$1 = '__html';
  var HTML_NAMESPACE$1 = Namespaces.html;
  var warnedUnknownTags;
  var suppressHydrationWarning;
  var validatePropertiesInDevelopment;
  var warnForTextDifference;
  var warnForPropDifference;
  var warnForExtraAttributes;
  var warnForInvalidEventListener;
  var canDiffStyleForHydrationWarning;
  var normalizeMarkupForTextOrAttribute;
  var normalizeHTML;

  {
    warnedUnknownTags = {
      // Chrome is the only major browser not shipping <time>. But as of July
      // 2017 it intends to ship it due to widespread usage. We intentionally
      // *don't* warn for <time> even if it's unrecognized by Chrome because
      // it soon will be, and many apps have been using it anyway.
      time: true,
      // There are working polyfills for <dialog>. Let people use it.
      dialog: true,
      // Electron ships a custom <webview> tag to display external web content in
      // an isolated frame and process.
      // This tag is not present in non Electron environments such as JSDom which
      // is often used for testing purposes.
      // @see https://electronjs.org/docs/api/webview-tag
      webview: true
    };

    validatePropertiesInDevelopment = function (type, props) {
      validateProperties(type, props);
      validateProperties$1(type, props);
      validateProperties$2(type, props,
      /* canUseEventSystem */
      true);
    }; // IE 11 parses & normalizes the style attribute as opposed to other
    // browsers. It adds spaces and sorts the properties in some
    // non-alphabetical order. Handling that would require sorting CSS
    // properties in the client & server versions or applying
    // `expectedStyle` to a temporary DOM node to read its `style` attribute
    // normalized. Since it only affects IE, we're skipping style warnings
    // in that browser completely in favor of doing all that work.
    // See https://github.com/facebook/react/issues/11807


    canDiffStyleForHydrationWarning = canUseDOM && !document.documentMode; // HTML parsing normalizes CR and CRLF to LF.
    // It also can turn \u0000 into \uFFFD inside attributes.
    // https://www.w3.org/TR/html5/single-page.html#preprocessing-the-input-stream
    // If we have a mismatch, it might be caused by that.
    // We will still patch up in this case but not fire the warning.

    var NORMALIZE_NEWLINES_REGEX = /\r\n?/g;
    var NORMALIZE_NULL_AND_REPLACEMENT_REGEX = /\u0000|\uFFFD/g;

    normalizeMarkupForTextOrAttribute = function (markup) {
      var markupString = typeof markup === 'string' ? markup : '' + markup;
      return markupString.replace(NORMALIZE_NEWLINES_REGEX, '\n').replace(NORMALIZE_NULL_AND_REPLACEMENT_REGEX, '');
    };

    warnForTextDifference = function (serverText, clientText) {
      if (didWarnInvalidHydration) {
        return;
      }

      var normalizedClientText = normalizeMarkupForTextOrAttribute(clientText);
      var normalizedServerText = normalizeMarkupForTextOrAttribute(serverText);

      if (normalizedServerText === normalizedClientText) {
        return;
      }

      didWarnInvalidHydration = true;

      error('Text content did not match. Server: "%s" Client: "%s"', normalizedServerText, normalizedClientText);
    };

    warnForPropDifference = function (propName, serverValue, clientValue) {
      if (didWarnInvalidHydration) {
        return;
      }

      var normalizedClientValue = normalizeMarkupForTextOrAttribute(clientValue);
      var normalizedServerValue = normalizeMarkupForTextOrAttribute(serverValue);

      if (normalizedServerValue === normalizedClientValue) {
        return;
      }

      didWarnInvalidHydration = true;

      error('Prop `%s` did not match. Server: %s Client: %s', propName, JSON.stringify(normalizedServerValue), JSON.stringify(normalizedClientValue));
    };

    warnForExtraAttributes = function (attributeNames) {
      if (didWarnInvalidHydration) {
        return;
      }

      didWarnInvalidHydration = true;
      var names = [];
      attributeNames.forEach(function (name) {
        names.push(name);
      });

      error('Extra attributes from the server: %s', names);
    };

    warnForInvalidEventListener = function (registrationName, listener) {
      if (listener === false) {
        error('Expected `%s` listener to be a function, instead got `false`.\n\n' + 'If you used to conditionally omit it with %s={condition && value}, ' + 'pass %s={condition ? value : undefined} instead.', registrationName, registrationName, registrationName);
      } else {
        error('Expected `%s` listener to be a function, instead got a value of `%s` type.', registrationName, typeof listener);
      }
    }; // Parse the HTML and read it back to normalize the HTML string so that it
    // can be used for comparison.


    normalizeHTML = function (parent, html) {
      // We could have created a separate document here to avoid
      // re-initializing custom elements if they exist. But this breaks
      // how <noscript> is being handled. So we use the same document.
      // See the discussion in https://github.com/facebook/react/pull/11157.
      var testElement = parent.namespaceURI === HTML_NAMESPACE$1 ? parent.ownerDocument.createElement(parent.tagName) : parent.ownerDocument.createElementNS(parent.namespaceURI, parent.tagName);
      testElement.innerHTML = html;
      return testElement.innerHTML;
    };
  }

  function ensureListeningTo(rootContainerElement, registrationName) {
    var isDocumentOrFragment = rootContainerElement.nodeType === DOCUMENT_NODE || rootContainerElement.nodeType === DOCUMENT_FRAGMENT_NODE;
    var doc = isDocumentOrFragment ? rootContainerElement : rootContainerElement.ownerDocument;
    legacyListenToEvent(registrationName, doc);
  }

  function getOwnerDocumentFromRootContainer(rootContainerElement) {
    return rootContainerElement.nodeType === DOCUMENT_NODE ? rootContainerElement : rootContainerElement.ownerDocument;
  }

  function noop() {}

  function trapClickOnNonInteractiveElement(node) {
    // Mobile Safari does not fire properly bubble click events on
    // non-interactive elements, which means delegated click listeners do not
    // fire. The workaround for this bug involves attaching an empty click
    // listener on the target node.
    // http://www.quirksmode.org/blog/archives/2010/09/click_event_del.html
    // Just set it using the onclick property so that we don't have to manage any
    // bookkeeping for it. Not sure if we need to clear it when the listener is
    // removed.
    // TODO: Only do this for the relevant Safaris maybe?
    node.onclick = noop;
  }

  function setInitialDOMProperties(tag, domElement, rootContainerElement, nextProps, isCustomComponentTag) {
    for (var propKey in nextProps) {
      if (!nextProps.hasOwnProperty(propKey)) {
        continue;
      }

      var nextProp = nextProps[propKey];

      if (propKey === STYLE) {
        {
          if (nextProp) {
            // Freeze the next style object so that we can assume it won't be
            // mutated. We have already warned for this in the past.
            Object.freeze(nextProp);
          }
        } // Relies on `updateStylesByID` not mutating `styleUpdates`.


        setValueForStyles(domElement, nextProp);
      } else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
        var nextHtml = nextProp ? nextProp[HTML$1] : undefined;

        if (nextHtml != null) {
          setInnerHTML(domElement, nextHtml);
        }
      } else if (propKey === CHILDREN) {
        if (typeof nextProp === 'string') {
          // Avoid setting initial textContent when the text is empty. In IE11 setting
          // textContent on a <textarea> will cause the placeholder to not
          // show within the <textarea> until it has been focused and blurred again.
          // https://github.com/facebook/react/issues/6731#issuecomment-254874553
          var canSetTextContent = tag !== 'textarea' || nextProp !== '';

          if (canSetTextContent) {
            setTextContent(domElement, nextProp);
          }
        } else if (typeof nextProp === 'number') {
          setTextContent(domElement, '' + nextProp);
        }
      } else if ( propKey === SUPPRESS_CONTENT_EDITABLE_WARNING || propKey === SUPPRESS_HYDRATION_WARNING) ; else if (propKey === AUTOFOCUS) ; else if (registrationNameModules.hasOwnProperty(propKey)) {
        if (nextProp != null) {
          if ( typeof nextProp !== 'function') {
            warnForInvalidEventListener(propKey, nextProp);
          }

          ensureListeningTo(rootContainerElement, propKey);
        }
      } else if (nextProp != null) {
        setValueForProperty(domElement, propKey, nextProp, isCustomComponentTag);
      }
    }
  }

  function updateDOMProperties(domElement, updatePayload, wasCustomComponentTag, isCustomComponentTag) {
    // TODO: Handle wasCustomComponentTag
    for (var i = 0; i < updatePayload.length; i += 2) {
      var propKey = updatePayload[i];
      var propValue = updatePayload[i + 1];

      if (propKey === STYLE) {
        setValueForStyles(domElement, propValue);
      } else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
        setInnerHTML(domElement, propValue);
      } else if (propKey === CHILDREN) {
        setTextContent(domElement, propValue);
      } else {
        setValueForProperty(domElement, propKey, propValue, isCustomComponentTag);
      }
    }
  }

  function createElement(type, props, rootContainerElement, parentNamespace) {
    var isCustomComponentTag; // We create tags in the namespace of their parent container, except HTML
    // tags get no namespace.

    var ownerDocument = getOwnerDocumentFromRootContainer(rootContainerElement);
    var domElement;
    var namespaceURI = parentNamespace;

    if (namespaceURI === HTML_NAMESPACE$1) {
      namespaceURI = getIntrinsicNamespace(type);
    }

    if (namespaceURI === HTML_NAMESPACE$1) {
      {
        isCustomComponentTag = isCustomComponent(type, props); // Should this check be gated by parent namespace? Not sure we want to
        // allow <SVG> or <mATH>.

        if (!isCustomComponentTag && type !== type.toLowerCase()) {
          error('<%s /> is using incorrect casing. ' + 'Use PascalCase for React components, ' + 'or lowercase for HTML elements.', type);
        }
      }

      if (type === 'script') {
        // Create the script via .innerHTML so its "parser-inserted" flag is
        // set to true and it does not execute
        var div = ownerDocument.createElement('div');

        div.innerHTML = '<script><' + '/script>'; // eslint-disable-line
        // This is guaranteed to yield a script element.

        var firstChild = div.firstChild;
        domElement = div.removeChild(firstChild);
      } else if (typeof props.is === 'string') {
        // $FlowIssue `createElement` should be updated for Web Components
        domElement = ownerDocument.createElement(type, {
          is: props.is
        });
      } else {
        // Separate else branch instead of using `props.is || undefined` above because of a Firefox bug.
        // See discussion in https://github.com/facebook/react/pull/6896
        // and discussion in https://bugzilla.mozilla.org/show_bug.cgi?id=1276240
        domElement = ownerDocument.createElement(type); // Normally attributes are assigned in `setInitialDOMProperties`, however the `multiple` and `size`
        // attributes on `select`s needs to be added before `option`s are inserted.
        // This prevents:
        // - a bug where the `select` does not scroll to the correct option because singular
        //  `select` elements automatically pick the first item #13222
        // - a bug where the `select` set the first item as selected despite the `size` attribute #14239
        // See https://github.com/facebook/react/issues/13222
        // and https://github.com/facebook/react/issues/14239

        if (type === 'select') {
          var node = domElement;

          if (props.multiple) {
            node.multiple = true;
          } else if (props.size) {
            // Setting a size greater than 1 causes a select to behave like `multiple=true`, where
            // it is possible that no option is selected.
            //
            // This is only necessary when a select in "single selection mode".
            node.size = props.size;
          }
        }
      }
    } else {
      domElement = ownerDocument.createElementNS(namespaceURI, type);
    }

    {
      if (namespaceURI === HTML_NAMESPACE$1) {
        if (!isCustomComponentTag && Object.prototype.toString.call(domElement) === '[object HTMLUnknownElement]' && !Object.prototype.hasOwnProperty.call(warnedUnknownTags, type)) {
          warnedUnknownTags[type] = true;

          error('The tag <%s> is unrecognized in this browser. ' + 'If you meant to render a React component, start its name with ' + 'an uppercase letter.', type);
        }
      }
    }

    return domElement;
  }
  function createTextNode(text, rootContainerElement) {
    return getOwnerDocumentFromRootContainer(rootContainerElement).createTextNode(text);
  }
  function setInitialProperties(domElement, tag, rawProps, rootContainerElement) {
    var isCustomComponentTag = isCustomComponent(tag, rawProps);

    {
      validatePropertiesInDevelopment(tag, rawProps);
    } // TODO: Make sure that we check isMounted before firing any of these events.


    var props;

    switch (tag) {
      case 'iframe':
      case 'object':
      case 'embed':
        trapBubbledEvent(TOP_LOAD, domElement);
        props = rawProps;
        break;

      case 'video':
      case 'audio':
        // Create listener for each media event
        for (var i = 0; i < mediaEventTypes.length; i++) {
          trapBubbledEvent(mediaEventTypes[i], domElement);
        }

        props = rawProps;
        break;

      case 'source':
        trapBubbledEvent(TOP_ERROR, domElement);
        props = rawProps;
        break;

      case 'img':
      case 'image':
      case 'link':
        trapBubbledEvent(TOP_ERROR, domElement);
        trapBubbledEvent(TOP_LOAD, domElement);
        props = rawProps;
        break;

      case 'form':
        trapBubbledEvent(TOP_RESET, domElement);
        trapBubbledEvent(TOP_SUBMIT, domElement);
        props = rawProps;
        break;

      case 'details':
        trapBubbledEvent(TOP_TOGGLE, domElement);
        props = rawProps;
        break;

      case 'input':
        initWrapperState(domElement, rawProps);
        props = getHostProps(domElement, rawProps);
        trapBubbledEvent(TOP_INVALID, domElement); // For controlled components we always need to ensure we're listening
        // to onChange. Even if there is no listener.

        ensureListeningTo(rootContainerElement, 'onChange');
        break;

      case 'option':
        validateProps(domElement, rawProps);
        props = getHostProps$1(domElement, rawProps);
        break;

      case 'select':
        initWrapperState$1(domElement, rawProps);
        props = getHostProps$2(domElement, rawProps);
        trapBubbledEvent(TOP_INVALID, domElement); // For controlled components we always need to ensure we're listening
        // to onChange. Even if there is no listener.

        ensureListeningTo(rootContainerElement, 'onChange');
        break;

      case 'textarea':
        initWrapperState$2(domElement, rawProps);
        props = getHostProps$3(domElement, rawProps);
        trapBubbledEvent(TOP_INVALID, domElement); // For controlled components we always need to ensure we're listening
        // to onChange. Even if there is no listener.

        ensureListeningTo(rootContainerElement, 'onChange');
        break;

      default:
        props = rawProps;
    }

    assertValidProps(tag, props);
    setInitialDOMProperties(tag, domElement, rootContainerElement, props, isCustomComponentTag);

    switch (tag) {
      case 'input':
        // TODO: Make sure we check if this is still unmounted or do any clean
        // up necessary since we never stop tracking anymore.
        track(domElement);
        postMountWrapper(domElement, rawProps, false);
        break;

      case 'textarea':
        // TODO: Make sure we check if this is still unmounted or do any clean
        // up necessary since we never stop tracking anymore.
        track(domElement);
        postMountWrapper$3(domElement);
        break;

      case 'option':
        postMountWrapper$1(domElement, rawProps);
        break;

      case 'select':
        postMountWrapper$2(domElement, rawProps);
        break;

      default:
        if (typeof props.onClick === 'function') {
          // TODO: This cast may not be sound for SVG, MathML or custom elements.
          trapClickOnNonInteractiveElement(domElement);
        }

        break;
    }
  } // Calculate the diff between the two objects.

  function diffProperties(domElement, tag, lastRawProps, nextRawProps, rootContainerElement) {
    {
      validatePropertiesInDevelopment(tag, nextRawProps);
    }

    var updatePayload = null;
    var lastProps;
    var nextProps;

    switch (tag) {
      case 'input':
        lastProps = getHostProps(domElement, lastRawProps);
        nextProps = getHostProps(domElement, nextRawProps);
        updatePayload = [];
        break;

      case 'option':
        lastProps = getHostProps$1(domElement, lastRawProps);
        nextProps = getHostProps$1(domElement, nextRawProps);
        updatePayload = [];
        break;

      case 'select':
        lastProps = getHostProps$2(domElement, lastRawProps);
        nextProps = getHostProps$2(domElement, nextRawProps);
        updatePayload = [];
        break;

      case 'textarea':
        lastProps = getHostProps$3(domElement, lastRawProps);
        nextProps = getHostProps$3(domElement, nextRawProps);
        updatePayload = [];
        break;

      default:
        lastProps = lastRawProps;
        nextProps = nextRawProps;

        if (typeof lastProps.onClick !== 'function' && typeof nextProps.onClick === 'function') {
          // TODO: This cast may not be sound for SVG, MathML or custom elements.
          trapClickOnNonInteractiveElement(domElement);
        }

        break;
    }

    assertValidProps(tag, nextProps);
    var propKey;
    var styleName;
    var styleUpdates = null;

    for (propKey in lastProps) {
      if (nextProps.hasOwnProperty(propKey) || !lastProps.hasOwnProperty(propKey) || lastProps[propKey] == null) {
        continue;
      }

      if (propKey === STYLE) {
        var lastStyle = lastProps[propKey];

        for (styleName in lastStyle) {
          if (lastStyle.hasOwnProperty(styleName)) {
            if (!styleUpdates) {
              styleUpdates = {};
            }

            styleUpdates[styleName] = '';
          }
        }
      } else if (propKey === DANGEROUSLY_SET_INNER_HTML || propKey === CHILDREN) ; else if ( propKey === SUPPRESS_CONTENT_EDITABLE_WARNING || propKey === SUPPRESS_HYDRATION_WARNING) ; else if (propKey === AUTOFOCUS) ; else if (registrationNameModules.hasOwnProperty(propKey)) {
        // This is a special case. If any listener updates we need to ensure
        // that the "current" fiber pointer gets updated so we need a commit
        // to update this element.
        if (!updatePayload) {
          updatePayload = [];
        }
      } else {
        // For all other deleted properties we add it to the queue. We use
        // the whitelist in the commit phase instead.
        (updatePayload = updatePayload || []).push(propKey, null);
      }
    }

    for (propKey in nextProps) {
      var nextProp = nextProps[propKey];
      var lastProp = lastProps != null ? lastProps[propKey] : undefined;

      if (!nextProps.hasOwnProperty(propKey) || nextProp === lastProp || nextProp == null && lastProp == null) {
        continue;
      }

      if (propKey === STYLE) {
        {
          if (nextProp) {
            // Freeze the next style object so that we can assume it won't be
            // mutated. We have already warned for this in the past.
            Object.freeze(nextProp);
          }
        }

        if (lastProp) {
          // Unset styles on `lastProp` but not on `nextProp`.
          for (styleName in lastProp) {
            if (lastProp.hasOwnProperty(styleName) && (!nextProp || !nextProp.hasOwnProperty(styleName))) {
              if (!styleUpdates) {
                styleUpdates = {};
              }

              styleUpdates[styleName] = '';
            }
          } // Update styles that changed since `lastProp`.


          for (styleName in nextProp) {
            if (nextProp.hasOwnProperty(styleName) && lastProp[styleName] !== nextProp[styleName]) {
              if (!styleUpdates) {
                styleUpdates = {};
              }

              styleUpdates[styleName] = nextProp[styleName];
            }
          }
        } else {
          // Relies on `updateStylesByID` not mutating `styleUpdates`.
          if (!styleUpdates) {
            if (!updatePayload) {
              updatePayload = [];
            }

            updatePayload.push(propKey, styleUpdates);
          }

          styleUpdates = nextProp;
        }
      } else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
        var nextHtml = nextProp ? nextProp[HTML$1] : undefined;
        var lastHtml = lastProp ? lastProp[HTML$1] : undefined;

        if (nextHtml != null) {
          if (lastHtml !== nextHtml) {
            (updatePayload = updatePayload || []).push(propKey, nextHtml);
          }
        }
      } else if (propKey === CHILDREN) {
        if (lastProp !== nextProp && (typeof nextProp === 'string' || typeof nextProp === 'number')) {
          (updatePayload = updatePayload || []).push(propKey, '' + nextProp);
        }
      } else if ( propKey === SUPPRESS_CONTENT_EDITABLE_WARNING || propKey === SUPPRESS_HYDRATION_WARNING) ; else if (registrationNameModules.hasOwnProperty(propKey)) {
        if (nextProp != null) {
          // We eagerly listen to this even though we haven't committed yet.
          if ( typeof nextProp !== 'function') {
            warnForInvalidEventListener(propKey, nextProp);
          }

          ensureListeningTo(rootContainerElement, propKey);
        }

        if (!updatePayload && lastProp !== nextProp) {
          // This is a special case. If any listener updates we need to ensure
          // that the "current" props pointer gets updated so we need a commit
          // to update this element.
          updatePayload = [];
        }
      } else {
        // For any other property we always add it to the queue and then we
        // filter it out using the whitelist during the commit.
        (updatePayload = updatePayload || []).push(propKey, nextProp);
      }
    }

    if (styleUpdates) {
      {
        validateShorthandPropertyCollisionInDev(styleUpdates, nextProps[STYLE]);
      }

      (updatePayload = updatePayload || []).push(STYLE, styleUpdates);
    }

    return updatePayload;
  } // Apply the diff.

  function updateProperties(domElement, updatePayload, tag, lastRawProps, nextRawProps) {
    // Update checked *before* name.
    // In the middle of an update, it is possible to have multiple checked.
    // When a checked radio tries to change name, browser makes another radio's checked false.
    if (tag === 'input' && nextRawProps.type === 'radio' && nextRawProps.name != null) {
      updateChecked(domElement, nextRawProps);
    }

    var wasCustomComponentTag = isCustomComponent(tag, lastRawProps);
    var isCustomComponentTag = isCustomComponent(tag, nextRawProps); // Apply the diff.

    updateDOMProperties(domElement, updatePayload, wasCustomComponentTag, isCustomComponentTag); // TODO: Ensure that an update gets scheduled if any of the special props
    // changed.

    switch (tag) {
      case 'input':
        // Update the wrapper around inputs *after* updating props. This has to
        // happen after `updateDOMProperties`. Otherwise HTML5 input validations
        // raise warnings and prevent the new value from being assigned.
        updateWrapper(domElement, nextRawProps);
        break;

      case 'textarea':
        updateWrapper$1(domElement, nextRawProps);
        break;

      case 'select':
        // <select> value update needs to occur after <option> children
        // reconciliation
        postUpdateWrapper(domElement, nextRawProps);
        break;
    }
  }

  function getPossibleStandardName(propName) {
    {
      var lowerCasedName = propName.toLowerCase();

      if (!possibleStandardNames.hasOwnProperty(lowerCasedName)) {
        return null;
      }

      return possibleStandardNames[lowerCasedName] || null;
    }
  }

  function diffHydratedProperties(domElement, tag, rawProps, parentNamespace, rootContainerElement) {
    var isCustomComponentTag;
    var extraAttributeNames;

    {
      suppressHydrationWarning = rawProps[SUPPRESS_HYDRATION_WARNING] === true;
      isCustomComponentTag = isCustomComponent(tag, rawProps);
      validatePropertiesInDevelopment(tag, rawProps);
    } // TODO: Make sure that we check isMounted before firing any of these events.


    switch (tag) {
      case 'iframe':
      case 'object':
      case 'embed':
        trapBubbledEvent(TOP_LOAD, domElement);
        break;

      case 'video':
      case 'audio':
        // Create listener for each media event
        for (var i = 0; i < mediaEventTypes.length; i++) {
          trapBubbledEvent(mediaEventTypes[i], domElement);
        }

        break;

      case 'source':
        trapBubbledEvent(TOP_ERROR, domElement);
        break;

      case 'img':
      case 'image':
      case 'link':
        trapBubbledEvent(TOP_ERROR, domElement);
        trapBubbledEvent(TOP_LOAD, domElement);
        break;

      case 'form':
        trapBubbledEvent(TOP_RESET, domElement);
        trapBubbledEvent(TOP_SUBMIT, domElement);
        break;

      case 'details':
        trapBubbledEvent(TOP_TOGGLE, domElement);
        break;

      case 'input':
        initWrapperState(domElement, rawProps);
        trapBubbledEvent(TOP_INVALID, domElement); // For controlled components we always need to ensure we're listening
        // to onChange. Even if there is no listener.

        ensureListeningTo(rootContainerElement, 'onChange');
        break;

      case 'option':
        validateProps(domElement, rawProps);
        break;

      case 'select':
        initWrapperState$1(domElement, rawProps);
        trapBubbledEvent(TOP_INVALID, domElement); // For controlled components we always need to ensure we're listening
        // to onChange. Even if there is no listener.

        ensureListeningTo(rootContainerElement, 'onChange');
        break;

      case 'textarea':
        initWrapperState$2(domElement, rawProps);
        trapBubbledEvent(TOP_INVALID, domElement); // For controlled components we always need to ensure we're listening
        // to onChange. Even if there is no listener.

        ensureListeningTo(rootContainerElement, 'onChange');
        break;
    }

    assertValidProps(tag, rawProps);

    {
      extraAttributeNames = new Set();
      var attributes = domElement.attributes;

      for (var _i = 0; _i < attributes.length; _i++) {
        var name = attributes[_i].name.toLowerCase();

        switch (name) {
          // Built-in SSR attribute is whitelisted
          case 'data-reactroot':
            break;
          // Controlled attributes are not validated
          // TODO: Only ignore them on controlled tags.

          case 'value':
            break;

          case 'checked':
            break;

          case 'selected':
            break;

          default:
            // Intentionally use the original name.
            // See discussion in https://github.com/facebook/react/pull/10676.
            extraAttributeNames.add(attributes[_i].name);
        }
      }
    }

    var updatePayload = null;

    for (var propKey in rawProps) {
      if (!rawProps.hasOwnProperty(propKey)) {
        continue;
      }

      var nextProp = rawProps[propKey];

      if (propKey === CHILDREN) {
        // For text content children we compare against textContent. This
        // might match additional HTML that is hidden when we read it using
        // textContent. E.g. "foo" will match "f<span>oo</span>" but that still
        // satisfies our requirement. Our requirement is not to produce perfect
        // HTML and attributes. Ideally we should preserve structure but it's
        // ok not to if the visible content is still enough to indicate what
        // even listeners these nodes might be wired up to.
        // TODO: Warn if there is more than a single textNode as a child.
        // TODO: Should we use domElement.firstChild.nodeValue to compare?
        if (typeof nextProp === 'string') {
          if (domElement.textContent !== nextProp) {
            if ( !suppressHydrationWarning) {
              warnForTextDifference(domElement.textContent, nextProp);
            }

            updatePayload = [CHILDREN, nextProp];
          }
        } else if (typeof nextProp === 'number') {
          if (domElement.textContent !== '' + nextProp) {
            if ( !suppressHydrationWarning) {
              warnForTextDifference(domElement.textContent, nextProp);
            }

            updatePayload = [CHILDREN, '' + nextProp];
          }
        }
      } else if (registrationNameModules.hasOwnProperty(propKey)) {
        if (nextProp != null) {
          if ( typeof nextProp !== 'function') {
            warnForInvalidEventListener(propKey, nextProp);
          }

          ensureListeningTo(rootContainerElement, propKey);
        }
      } else if ( // Convince Flow we've calculated it (it's DEV-only in this method.)
      typeof isCustomComponentTag === 'boolean') {
        // Validate that the properties correspond to their expected values.
        var serverValue = void 0;
        var propertyInfo = getPropertyInfo(propKey);

        if (suppressHydrationWarning) ; else if ( propKey === SUPPRESS_CONTENT_EDITABLE_WARNING || propKey === SUPPRESS_HYDRATION_WARNING || // Controlled attributes are not validated
        // TODO: Only ignore them on controlled tags.
        propKey === 'value' || propKey === 'checked' || propKey === 'selected') ; else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
          var serverHTML = domElement.innerHTML;
          var nextHtml = nextProp ? nextProp[HTML$1] : undefined;
          var expectedHTML = normalizeHTML(domElement, nextHtml != null ? nextHtml : '');

          if (expectedHTML !== serverHTML) {
            warnForPropDifference(propKey, serverHTML, expectedHTML);
          }
        } else if (propKey === STYLE) {
          // $FlowFixMe - Should be inferred as not undefined.
          extraAttributeNames.delete(propKey);

          if (canDiffStyleForHydrationWarning) {
            var expectedStyle = createDangerousStringForStyles(nextProp);
            serverValue = domElement.getAttribute('style');

            if (expectedStyle !== serverValue) {
              warnForPropDifference(propKey, serverValue, expectedStyle);
            }
          }
        } else if (isCustomComponentTag) {
          // $FlowFixMe - Should be inferred as not undefined.
          extraAttributeNames.delete(propKey.toLowerCase());
          serverValue = getValueForAttribute(domElement, propKey, nextProp);

          if (nextProp !== serverValue) {
            warnForPropDifference(propKey, serverValue, nextProp);
          }
        } else if (!shouldIgnoreAttribute(propKey, propertyInfo, isCustomComponentTag) && !shouldRemoveAttribute(propKey, nextProp, propertyInfo, isCustomComponentTag)) {
          var isMismatchDueToBadCasing = false;

          if (propertyInfo !== null) {
            // $FlowFixMe - Should be inferred as not undefined.
            extraAttributeNames.delete(propertyInfo.attributeName);
            serverValue = getValueForProperty(domElement, propKey, nextProp, propertyInfo);
          } else {
            var ownNamespace = parentNamespace;

            if (ownNamespace === HTML_NAMESPACE$1) {
              ownNamespace = getIntrinsicNamespace(tag);
            }

            if (ownNamespace === HTML_NAMESPACE$1) {
              // $FlowFixMe - Should be inferred as not undefined.
              extraAttributeNames.delete(propKey.toLowerCase());
            } else {
              var standardName = getPossibleStandardName(propKey);

              if (standardName !== null && standardName !== propKey) {
                // If an SVG prop is supplied with bad casing, it will
                // be successfully parsed from HTML, but will produce a mismatch
                // (and would be incorrectly rendered on the client).
                // However, we already warn about bad casing elsewhere.
                // So we'll skip the misleading extra mismatch warning in this case.
                isMismatchDueToBadCasing = true; // $FlowFixMe - Should be inferred as not undefined.

                extraAttributeNames.delete(standardName);
              } // $FlowFixMe - Should be inferred as not undefined.


              extraAttributeNames.delete(propKey);
            }

            serverValue = getValueForAttribute(domElement, propKey, nextProp);
          }

          if (nextProp !== serverValue && !isMismatchDueToBadCasing) {
            warnForPropDifference(propKey, serverValue, nextProp);
          }
        }
      }
    }

    {
      // $FlowFixMe - Should be inferred as not undefined.
      if (extraAttributeNames.size > 0 && !suppressHydrationWarning) {
        // $FlowFixMe - Should be inferred as not undefined.
        warnForExtraAttributes(extraAttributeNames);
      }
    }

    switch (tag) {
      case 'input':
        // TODO: Make sure we check if this is still unmounted or do any clean
        // up necessary since we never stop tracking anymore.
        track(domElement);
        postMountWrapper(domElement, rawProps, true);
        break;

      case 'textarea':
        // TODO: Make sure we check if this is still unmounted or do any clean
        // up necessary since we never stop tracking anymore.
        track(domElement);
        postMountWrapper$3(domElement);
        break;

      case 'select':
      case 'option':
        // For input and textarea we current always set the value property at
        // post mount to force it to diverge from attributes. However, for
        // option and select we don't quite do the same thing and select
        // is not resilient to the DOM state changing so we don't do that here.
        // TODO: Consider not doing this for input and textarea.
        break;

      default:
        if (typeof rawProps.onClick === 'function') {
          // TODO: This cast may not be sound for SVG, MathML or custom elements.
          trapClickOnNonInteractiveElement(domElement);
        }

        break;
    }

    return updatePayload;
  }
  function diffHydratedText(textNode, text) {
    var isDifferent = textNode.nodeValue !== text;
    return isDifferent;
  }
  function warnForUnmatchedText(textNode, text) {
    {
      warnForTextDifference(textNode.nodeValue, text);
    }
  }
  function warnForDeletedHydratableElement(parentNode, child) {
    {
      if (didWarnInvalidHydration) {
        return;
      }

      didWarnInvalidHydration = true;

      error('Did not expect server HTML to contain a <%s> in <%s>.', child.nodeName.toLowerCase(), parentNode.nodeName.toLowerCase());
    }
  }
  function warnForDeletedHydratableText(parentNode, child) {
    {
      if (didWarnInvalidHydration) {
        return;
      }

      didWarnInvalidHydration = true;

      error('Did not expect server HTML to contain the text node "%s" in <%s>.', child.nodeValue, parentNode.nodeName.toLowerCase());
    }
  }
  function warnForInsertedHydratedElement(parentNode, tag, props) {
    {
      if (didWarnInvalidHydration) {
        return;
      }

      didWarnInvalidHydration = true;

      error('Expected server HTML to contain a matching <%s> in <%s>.', tag, parentNode.nodeName.toLowerCase());
    }
  }
  function warnForInsertedHydratedText(parentNode, text) {
    {
      if (text === '') {
        // We expect to insert empty text nodes since they're not represented in
        // the HTML.
        // TODO: Remove this special case if we can just avoid inserting empty
        // text nodes.
        return;
      }

      if (didWarnInvalidHydration) {
        return;
      }

      didWarnInvalidHydration = true;

      error('Expected server HTML to contain a matching text node for "%s" in <%s>.', text, parentNode.nodeName.toLowerCase());
    }
  }
  function restoreControlledState$3(domElement, tag, props) {
    switch (tag) {
      case 'input':
        restoreControlledState(domElement, props);
        return;

      case 'textarea':
        restoreControlledState$2(domElement, props);
        return;

      case 'select':
        restoreControlledState$1(domElement, props);
        return;
    }
  }

  function getActiveElement(doc) {
    doc = doc || (typeof document !== 'undefined' ? document : undefined);

    if (typeof doc === 'undefined') {
      return null;
    }

    try {
      return doc.activeElement || doc.body;
    } catch (e) {
      return doc.body;
    }
  }

  /**
   * Given any node return the first leaf node without children.
   *
   * @param {DOMElement|DOMTextNode} node
   * @return {DOMElement|DOMTextNode}
   */

  function getLeafNode(node) {
    while (node && node.firstChild) {
      node = node.firstChild;
    }

    return node;
  }
  /**
   * Get the next sibling within a container. This will walk up the
   * DOM if a node's siblings have been exhausted.
   *
   * @param {DOMElement|DOMTextNode} node
   * @return {?DOMElement|DOMTextNode}
   */


  function getSiblingNode(node) {
    while (node) {
      if (node.nextSibling) {
        return node.nextSibling;
      }

      node = node.parentNode;
    }
  }
  /**
   * Get object describing the nodes which contain characters at offset.
   *
   * @param {DOMElement|DOMTextNode} root
   * @param {number} offset
   * @return {?object}
   */


  function getNodeForCharacterOffset(root, offset) {
    var node = getLeafNode(root);
    var nodeStart = 0;
    var nodeEnd = 0;

    while (node) {
      if (node.nodeType === TEXT_NODE) {
        nodeEnd = nodeStart + node.textContent.length;

        if (nodeStart <= offset && nodeEnd >= offset) {
          return {
            node: node,
            offset: offset - nodeStart
          };
        }

        nodeStart = nodeEnd;
      }

      node = getLeafNode(getSiblingNode(node));
    }
  }

  /**
   * @param {DOMElement} outerNode
   * @return {?object}
   */

  function getOffsets(outerNode) {
    var ownerDocument = outerNode.ownerDocument;
    var win = ownerDocument && ownerDocument.defaultView || window;
    var selection = win.getSelection && win.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    var anchorNode = selection.anchorNode,
        anchorOffset = selection.anchorOffset,
        focusNode = selection.focusNode,
        focusOffset = selection.focusOffset; // In Firefox, anchorNode and focusNode can be "anonymous divs", e.g. the
    // up/down buttons on an <input type="number">. Anonymous divs do not seem to
    // expose properties, triggering a "Permission denied error" if any of its
    // properties are accessed. The only seemingly possible way to avoid erroring
    // is to access a property that typically works for non-anonymous divs and
    // catch any error that may otherwise arise. See
    // https://bugzilla.mozilla.org/show_bug.cgi?id=208427

    try {
      /* eslint-disable no-unused-expressions */
      anchorNode.nodeType;
      focusNode.nodeType;
      /* eslint-enable no-unused-expressions */
    } catch (e) {
      return null;
    }

    return getModernOffsetsFromPoints(outerNode, anchorNode, anchorOffset, focusNode, focusOffset);
  }
  /**
   * Returns {start, end} where `start` is the character/codepoint index of
   * (anchorNode, anchorOffset) within the textContent of `outerNode`, and
   * `end` is the index of (focusNode, focusOffset).
   *
   * Returns null if you pass in garbage input but we should probably just crash.
   *
   * Exported only for testing.
   */

  function getModernOffsetsFromPoints(outerNode, anchorNode, anchorOffset, focusNode, focusOffset) {
    var length = 0;
    var start = -1;
    var end = -1;
    var indexWithinAnchor = 0;
    var indexWithinFocus = 0;
    var node = outerNode;
    var parentNode = null;

    outer: while (true) {
      var next = null;

      while (true) {
        if (node === anchorNode && (anchorOffset === 0 || node.nodeType === TEXT_NODE)) {
          start = length + anchorOffset;
        }

        if (node === focusNode && (focusOffset === 0 || node.nodeType === TEXT_NODE)) {
          end = length + focusOffset;
        }

        if (node.nodeType === TEXT_NODE) {
          length += node.nodeValue.length;
        }

        if ((next = node.firstChild) === null) {
          break;
        } // Moving from `node` to its first child `next`.


        parentNode = node;
        node = next;
      }

      while (true) {
        if (node === outerNode) {
          // If `outerNode` has children, this is always the second time visiting
          // it. If it has no children, this is still the first loop, and the only
          // valid selection is anchorNode and focusNode both equal to this node
          // and both offsets 0, in which case we will have handled above.
          break outer;
        }

        if (parentNode === anchorNode && ++indexWithinAnchor === anchorOffset) {
          start = length;
        }

        if (parentNode === focusNode && ++indexWithinFocus === focusOffset) {
          end = length;
        }

        if ((next = node.nextSibling) !== null) {
          break;
        }

        node = parentNode;
        parentNode = node.parentNode;
      } // Moving from `node` to its next sibling `next`.


      node = next;
    }

    if (start === -1 || end === -1) {
      // This should never happen. (Would happen if the anchor/focus nodes aren't
      // actually inside the passed-in node.)
      return null;
    }

    return {
      start: start,
      end: end
    };
  }
  /**
   * In modern non-IE browsers, we can support both forward and backward
   * selections.
   *
   * Note: IE10+ supports the Selection object, but it does not support
   * the `extend` method, which means that even in modern IE, it's not possible
   * to programmatically create a backward selection. Thus, for all IE
   * versions, we use the old IE API to create our selections.
   *
   * @param {DOMElement|DOMTextNode} node
   * @param {object} offsets
   */

  function setOffsets(node, offsets) {
    var doc = node.ownerDocument || document;
    var win = doc && doc.defaultView || window; // Edge fails with "Object expected" in some scenarios.
    // (For instance: TinyMCE editor used in a list component that supports pasting to add more,
    // fails when pasting 100+ items)

    if (!win.getSelection) {
      return;
    }

    var selection = win.getSelection();
    var length = node.textContent.length;
    var start = Math.min(offsets.start, length);
    var end = offsets.end === undefined ? start : Math.min(offsets.end, length); // IE 11 uses modern selection, but doesn't support the extend method.
    // Flip backward selections, so we can set with a single range.

    if (!selection.extend && start > end) {
      var temp = end;
      end = start;
      start = temp;
    }

    var startMarker = getNodeForCharacterOffset(node, start);
    var endMarker = getNodeForCharacterOffset(node, end);

    if (startMarker && endMarker) {
      if (selection.rangeCount === 1 && selection.anchorNode === startMarker.node && selection.anchorOffset === startMarker.offset && selection.focusNode === endMarker.node && selection.focusOffset === endMarker.offset) {
        return;
      }

      var range = doc.createRange();
      range.setStart(startMarker.node, startMarker.offset);
      selection.removeAllRanges();

      if (start > end) {
        selection.addRange(range);
        selection.extend(endMarker.node, endMarker.offset);
      } else {
        range.setEnd(endMarker.node, endMarker.offset);
        selection.addRange(range);
      }
    }
  }

  function isTextNode(node) {
    return node && node.nodeType === TEXT_NODE;
  }

  function containsNode(outerNode, innerNode) {
    if (!outerNode || !innerNode) {
      return false;
    } else if (outerNode === innerNode) {
      return true;
    } else if (isTextNode(outerNode)) {
      return false;
    } else if (isTextNode(innerNode)) {
      return containsNode(outerNode, innerNode.parentNode);
    } else if ('contains' in outerNode) {
      return outerNode.contains(innerNode);
    } else if (outerNode.compareDocumentPosition) {
      return !!(outerNode.compareDocumentPosition(innerNode) & 16);
    } else {
      return false;
    }
  }

  function isInDocument(node) {
    return node && node.ownerDocument && containsNode(node.ownerDocument.documentElement, node);
  }

  function isSameOriginFrame(iframe) {
    try {
      // Accessing the contentDocument of a HTMLIframeElement can cause the browser
      // to throw, e.g. if it has a cross-origin src attribute.
      // Safari will show an error in the console when the access results in "Blocked a frame with origin". e.g:
      // iframe.contentDocument.defaultView;
      // A safety way is to access one of the cross origin properties: Window or Location
      // Which might result in "SecurityError" DOM Exception and it is compatible to Safari.
      // https://html.spec.whatwg.org/multipage/browsers.html#integration-with-idl
      return typeof iframe.contentWindow.location.href === 'string';
    } catch (err) {
      return false;
    }
  }

  function getActiveElementDeep() {
    var win = window;
    var element = getActiveElement();

    while (element instanceof win.HTMLIFrameElement) {
      if (isSameOriginFrame(element)) {
        win = element.contentWindow;
      } else {
        return element;
      }

      element = getActiveElement(win.document);
    }

    return element;
  }
  /**
   * @ReactInputSelection: React input selection module. Based on Selection.js,
   * but modified to be suitable for react and has a couple of bug fixes (doesn't
   * assume buttons have range selections allowed).
   * Input selection module for React.
   */

  /**
   * @hasSelectionCapabilities: we get the element types that support selection
   * from https://html.spec.whatwg.org/#do-not-apply, looking at `selectionStart`
   * and `selectionEnd` rows.
   */


  function hasSelectionCapabilities(elem) {
    var nodeName = elem && elem.nodeName && elem.nodeName.toLowerCase();
    return nodeName && (nodeName === 'input' && (elem.type === 'text' || elem.type === 'search' || elem.type === 'tel' || elem.type === 'url' || elem.type === 'password') || nodeName === 'textarea' || elem.contentEditable === 'true');
  }
  function getSelectionInformation() {
    var focusedElem = getActiveElementDeep();
    return {
      // Used by Flare
      activeElementDetached: null,
      focusedElem: focusedElem,
      selectionRange: hasSelectionCapabilities(focusedElem) ? getSelection(focusedElem) : null
    };
  }
  /**
   * @restoreSelection: If any selection information was potentially lost,
   * restore it. This is useful when performing operations that could remove dom
   * nodes and place them back in, resulting in focus being lost.
   */

  function restoreSelection(priorSelectionInformation) {
    var curFocusedElem = getActiveElementDeep();
    var priorFocusedElem = priorSelectionInformation.focusedElem;
    var priorSelectionRange = priorSelectionInformation.selectionRange;

    if (curFocusedElem !== priorFocusedElem && isInDocument(priorFocusedElem)) {
      if (priorSelectionRange !== null && hasSelectionCapabilities(priorFocusedElem)) {
        setSelection(priorFocusedElem, priorSelectionRange);
      } // Focusing a node can change the scroll position, which is undesirable


      var ancestors = [];
      var ancestor = priorFocusedElem;

      while (ancestor = ancestor.parentNode) {
        if (ancestor.nodeType === ELEMENT_NODE) {
          ancestors.push({
            element: ancestor,
            left: ancestor.scrollLeft,
            top: ancestor.scrollTop
          });
        }
      }

      if (typeof priorFocusedElem.focus === 'function') {
        priorFocusedElem.focus();
      }

      for (var i = 0; i < ancestors.length; i++) {
        var info = ancestors[i];
        info.element.scrollLeft = info.left;
        info.element.scrollTop = info.top;
      }
    }
  }
  /**
   * @getSelection: Gets the selection bounds of a focused textarea, input or
   * contentEditable node.
   * -@input: Look up selection bounds of this input
   * -@return {start: selectionStart, end: selectionEnd}
   */

  function getSelection(input) {
    var selection;

    if ('selectionStart' in input) {
      // Modern browser with input or textarea.
      selection = {
        start: input.selectionStart,
        end: input.selectionEnd
      };
    } else {
      // Content editable or old IE textarea.
      selection = getOffsets(input);
    }

    return selection || {
      start: 0,
      end: 0
    };
  }
  /**
   * @setSelection: Sets the selection bounds of a textarea or input and focuses
   * the input.
   * -@input     Set selection bounds of this input or textarea
   * -@offsets   Object of same form that is returned from get*
   */

  function setSelection(input, offsets) {
    var start = offsets.start,
        end = offsets.end;

    if (end === undefined) {
      end = start;
    }

    if ('selectionStart' in input) {
      input.selectionStart = start;
      input.selectionEnd = Math.min(end, input.value.length);
    } else {
      setOffsets(input, offsets);
    }
  }

  var validateDOMNesting = function () {};

  var updatedAncestorInfo = function () {};

  {
    // This validation code was written based on the HTML5 parsing spec:
    // https://html.spec.whatwg.org/multipage/syntax.html#has-an-element-in-scope
    //
    // Note: this does not catch all invalid nesting, nor does it try to (as it's
    // not clear what practical benefit doing so provides); instead, we warn only
    // for cases where the parser will give a parse tree differing from what React
    // intended. For example, <b><div></div></b> is invalid but we don't warn
    // because it still parses correctly; we do warn for other cases like nested
    // <p> tags where the beginning of the second element implicitly closes the
    // first, causing a confusing mess.
    // https://html.spec.whatwg.org/multipage/syntax.html#special
    var specialTags = ['address', 'applet', 'area', 'article', 'aside', 'base', 'basefont', 'bgsound', 'blockquote', 'body', 'br', 'button', 'caption', 'center', 'col', 'colgroup', 'dd', 'details', 'dir', 'div', 'dl', 'dt', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'frame', 'frameset', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'iframe', 'img', 'input', 'isindex', 'li', 'link', 'listing', 'main', 'marquee', 'menu', 'menuitem', 'meta', 'nav', 'noembed', 'noframes', 'noscript', 'object', 'ol', 'p', 'param', 'plaintext', 'pre', 'script', 'section', 'select', 'source', 'style', 'summary', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'title', 'tr', 'track', 'ul', 'wbr', 'xmp']; // https://html.spec.whatwg.org/multipage/syntax.html#has-an-element-in-scope

    var inScopeTags = ['applet', 'caption', 'html', 'table', 'td', 'th', 'marquee', 'object', 'template', // https://html.spec.whatwg.org/multipage/syntax.html#html-integration-point
    // TODO: Distinguish by namespace here -- for <title>, including it here
    // errs on the side of fewer warnings
    'foreignObject', 'desc', 'title']; // https://html.spec.whatwg.org/multipage/syntax.html#has-an-element-in-button-scope

    var buttonScopeTags = inScopeTags.concat(['button']); // https://html.spec.whatwg.org/multipage/syntax.html#generate-implied-end-tags

    var impliedEndTags = ['dd', 'dt', 'li', 'option', 'optgroup', 'p', 'rp', 'rt'];
    var emptyAncestorInfo = {
      current: null,
      formTag: null,
      aTagInScope: null,
      buttonTagInScope: null,
      nobrTagInScope: null,
      pTagInButtonScope: null,
      listItemTagAutoclosing: null,
      dlItemTagAutoclosing: null
    };

    updatedAncestorInfo = function (oldInfo, tag) {
      var ancestorInfo = _assign({}, oldInfo || emptyAncestorInfo);

      var info = {
        tag: tag
      };

      if (inScopeTags.indexOf(tag) !== -1) {
        ancestorInfo.aTagInScope = null;
        ancestorInfo.buttonTagInScope = null;
        ancestorInfo.nobrTagInScope = null;
      }

      if (buttonScopeTags.indexOf(tag) !== -1) {
        ancestorInfo.pTagInButtonScope = null;
      } // See rules for 'li', 'dd', 'dt' start tags in
      // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inbody


      if (specialTags.indexOf(tag) !== -1 && tag !== 'address' && tag !== 'div' && tag !== 'p') {
        ancestorInfo.listItemTagAutoclosing = null;
        ancestorInfo.dlItemTagAutoclosing = null;
      }

      ancestorInfo.current = info;

      if (tag === 'form') {
        ancestorInfo.formTag = info;
      }

      if (tag === 'a') {
        ancestorInfo.aTagInScope = info;
      }

      if (tag === 'button') {
        ancestorInfo.buttonTagInScope = info;
      }

      if (tag === 'nobr') {
        ancestorInfo.nobrTagInScope = info;
      }

      if (tag === 'p') {
        ancestorInfo.pTagInButtonScope = info;
      }

      if (tag === 'li') {
        ancestorInfo.listItemTagAutoclosing = info;
      }

      if (tag === 'dd' || tag === 'dt') {
        ancestorInfo.dlItemTagAutoclosing = info;
      }

      return ancestorInfo;
    };
    /**
     * Returns whether
     */


    var isTagValidWithParent = function (tag, parentTag) {
      // First, let's check if we're in an unusual parsing mode...
      switch (parentTag) {
        // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inselect
        case 'select':
          return tag === 'option' || tag === 'optgroup' || tag === '#text';

        case 'optgroup':
          return tag === 'option' || tag === '#text';
        // Strictly speaking, seeing an <option> doesn't mean we're in a <select>
        // but

        case 'option':
          return tag === '#text';
        // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intd
        // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-incaption
        // No special behavior since these rules fall back to "in body" mode for
        // all except special table nodes which cause bad parsing behavior anyway.
        // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intr

        case 'tr':
          return tag === 'th' || tag === 'td' || tag === 'style' || tag === 'script' || tag === 'template';
        // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intbody

        case 'tbody':
        case 'thead':
        case 'tfoot':
          return tag === 'tr' || tag === 'style' || tag === 'script' || tag === 'template';
        // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-incolgroup

        case 'colgroup':
          return tag === 'col' || tag === 'template';
        // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intable

        case 'table':
          return tag === 'caption' || tag === 'colgroup' || tag === 'tbody' || tag === 'tfoot' || tag === 'thead' || tag === 'style' || tag === 'script' || tag === 'template';
        // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inhead

        case 'head':
          return tag === 'base' || tag === 'basefont' || tag === 'bgsound' || tag === 'link' || tag === 'meta' || tag === 'title' || tag === 'noscript' || tag === 'noframes' || tag === 'style' || tag === 'script' || tag === 'template';
        // https://html.spec.whatwg.org/multipage/semantics.html#the-html-element

        case 'html':
          return tag === 'head' || tag === 'body' || tag === 'frameset';

        case 'frameset':
          return tag === 'frame';

        case '#document':
          return tag === 'html';
      } // Probably in the "in body" parsing mode, so we outlaw only tag combos
      // where the parsing rules cause implicit opens or closes to be added.
      // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inbody


      switch (tag) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          return parentTag !== 'h1' && parentTag !== 'h2' && parentTag !== 'h3' && parentTag !== 'h4' && parentTag !== 'h5' && parentTag !== 'h6';

        case 'rp':
        case 'rt':
          return impliedEndTags.indexOf(parentTag) === -1;

        case 'body':
        case 'caption':
        case 'col':
        case 'colgroup':
        case 'frameset':
        case 'frame':
        case 'head':
        case 'html':
        case 'tbody':
        case 'td':
        case 'tfoot':
        case 'th':
        case 'thead':
        case 'tr':
          // These tags are only valid with a few parents that have special child
          // parsing rules -- if we're down here, then none of those matched and
          // so we allow it only if we don't know what the parent is, as all other
          // cases are invalid.
          return parentTag == null;
      }

      return true;
    };
    /**
     * Returns whether
     */


    var findInvalidAncestorForTag = function (tag, ancestorInfo) {
      switch (tag) {
        case 'address':
        case 'article':
        case 'aside':
        case 'blockquote':
        case 'center':
        case 'details':
        case 'dialog':
        case 'dir':
        case 'div':
        case 'dl':
        case 'fieldset':
        case 'figcaption':
        case 'figure':
        case 'footer':
        case 'header':
        case 'hgroup':
        case 'main':
        case 'menu':
        case 'nav':
        case 'ol':
        case 'p':
        case 'section':
        case 'summary':
        case 'ul':
        case 'pre':
        case 'listing':
        case 'table':
        case 'hr':
        case 'xmp':
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          return ancestorInfo.pTagInButtonScope;

        case 'form':
          return ancestorInfo.formTag || ancestorInfo.pTagInButtonScope;

        case 'li':
          return ancestorInfo.listItemTagAutoclosing;

        case 'dd':
        case 'dt':
          return ancestorInfo.dlItemTagAutoclosing;

        case 'button':
          return ancestorInfo.buttonTagInScope;

        case 'a':
          // Spec says something about storing a list of markers, but it sounds
          // equivalent to this check.
          return ancestorInfo.aTagInScope;

        case 'nobr':
          return ancestorInfo.nobrTagInScope;
      }

      return null;
    };

    var didWarn$1 = {};

    validateDOMNesting = function (childTag, childText, ancestorInfo) {
      ancestorInfo = ancestorInfo || emptyAncestorInfo;
      var parentInfo = ancestorInfo.current;
      var parentTag = parentInfo && parentInfo.tag;

      if (childText != null) {
        if (childTag != null) {
          error('validateDOMNesting: when childText is passed, childTag should be null');
        }

        childTag = '#text';
      }

      var invalidParent = isTagValidWithParent(childTag, parentTag) ? null : parentInfo;
      var invalidAncestor = invalidParent ? null : findInvalidAncestorForTag(childTag, ancestorInfo);
      var invalidParentOrAncestor = invalidParent || invalidAncestor;

      if (!invalidParentOrAncestor) {
        return;
      }

      var ancestorTag = invalidParentOrAncestor.tag;
      var addendum = getCurrentFiberStackInDev();
      var warnKey = !!invalidParent + '|' + childTag + '|' + ancestorTag + '|' + addendum;

      if (didWarn$1[warnKey]) {
        return;
      }

      didWarn$1[warnKey] = true;
      var tagDisplayName = childTag;
      var whitespaceInfo = '';

      if (childTag === '#text') {
        if (/\S/.test(childText)) {
          tagDisplayName = 'Text nodes';
        } else {
          tagDisplayName = 'Whitespace text nodes';
          whitespaceInfo = " Make sure you don't have any extra whitespace between tags on " + 'each line of your source code.';
        }
      } else {
        tagDisplayName = '<' + childTag + '>';
      }

      if (invalidParent) {
        var info = '';

        if (ancestorTag === 'table' && childTag === 'tr') {
          info += ' Add a <tbody>, <thead> or <tfoot> to your code to match the DOM tree generated by ' + 'the browser.';
        }

        error('validateDOMNesting(...): %s cannot appear as a child of <%s>.%s%s', tagDisplayName, ancestorTag, whitespaceInfo, info);
      } else {
        error('validateDOMNesting(...): %s cannot appear as a descendant of ' + '<%s>.', tagDisplayName, ancestorTag);
      }
    };
  }

  var SUPPRESS_HYDRATION_WARNING$1;

  {
    SUPPRESS_HYDRATION_WARNING$1 = 'suppressHydrationWarning';
  }

  var SUSPENSE_START_DATA = '$';
  var SUSPENSE_END_DATA = '/$';
  var SUSPENSE_PENDING_START_DATA = '$?';
  var SUSPENSE_FALLBACK_START_DATA = '$!';
  var STYLE$1 = 'style';
  var eventsEnabled = null;
  var selectionInformation = null;

  function shouldAutoFocusHostComponent(type, props) {
    switch (type) {
      case 'button':
      case 'input':
      case 'select':
      case 'textarea':
        return !!props.autoFocus;
    }

    return false;
  }
  function getRootHostContext(rootContainerInstance) {
    var type;
    var namespace;
    var nodeType = rootContainerInstance.nodeType;

    switch (nodeType) {
      case DOCUMENT_NODE:
      case DOCUMENT_FRAGMENT_NODE:
        {
          type = nodeType === DOCUMENT_NODE ? '#document' : '#fragment';
          var root = rootContainerInstance.documentElement;
          namespace = root ? root.namespaceURI : getChildNamespace(null, '');
          break;
        }

      default:
        {
          var container = nodeType === COMMENT_NODE ? rootContainerInstance.parentNode : rootContainerInstance;
          var ownNamespace = container.namespaceURI || null;
          type = container.tagName;
          namespace = getChildNamespace(ownNamespace, type);
          break;
        }
    }

    {
      var validatedTag = type.toLowerCase();
      var ancestorInfo = updatedAncestorInfo(null, validatedTag);
      return {
        namespace: namespace,
        ancestorInfo: ancestorInfo
      };
    }
  }
  function getChildHostContext(parentHostContext, type, rootContainerInstance) {
    {
      var parentHostContextDev = parentHostContext;
      var namespace = getChildNamespace(parentHostContextDev.namespace, type);
      var ancestorInfo = updatedAncestorInfo(parentHostContextDev.ancestorInfo, type);
      return {
        namespace: namespace,
        ancestorInfo: ancestorInfo
      };
    }
  }
  function getPublicInstance(instance) {
    return instance;
  }
  function prepareForCommit(containerInfo) {
    eventsEnabled = isEnabled();
    selectionInformation = getSelectionInformation();
    setEnabled(false);
  }
  function resetAfterCommit(containerInfo) {
    restoreSelection(selectionInformation);
    setEnabled(eventsEnabled);
    eventsEnabled = null;

    selectionInformation = null;
  }
  function createInstance(type, props, rootContainerInstance, hostContext, internalInstanceHandle) {
    var parentNamespace;

    {
      // TODO: take namespace into account when validating.
      var hostContextDev = hostContext;
      validateDOMNesting(type, null, hostContextDev.ancestorInfo);

      if (typeof props.children === 'string' || typeof props.children === 'number') {
        var string = '' + props.children;
        var ownAncestorInfo = updatedAncestorInfo(hostContextDev.ancestorInfo, type);
        validateDOMNesting(null, string, ownAncestorInfo);
      }

      parentNamespace = hostContextDev.namespace;
    }

    var domElement = createElement(type, props, rootContainerInstance, parentNamespace);
    precacheFiberNode(internalInstanceHandle, domElement);
    updateFiberProps(domElement, props);
    return domElement;
  }
  function appendInitialChild(parentInstance, child) {
    parentInstance.appendChild(child);
  }
  function finalizeInitialChildren(domElement, type, props, rootContainerInstance, hostContext) {
    setInitialProperties(domElement, type, props, rootContainerInstance);
    return shouldAutoFocusHostComponent(type, props);
  }
  function prepareUpdate(domElement, type, oldProps, newProps, rootContainerInstance, hostContext) {
    {
      var hostContextDev = hostContext;

      if (typeof newProps.children !== typeof oldProps.children && (typeof newProps.children === 'string' || typeof newProps.children === 'number')) {
        var string = '' + newProps.children;
        var ownAncestorInfo = updatedAncestorInfo(hostContextDev.ancestorInfo, type);
        validateDOMNesting(null, string, ownAncestorInfo);
      }
    }

    return diffProperties(domElement, type, oldProps, newProps, rootContainerInstance);
  }
  function shouldSetTextContent(type, props) {
    return type === 'textarea' || type === 'option' || type === 'noscript' || typeof props.children === 'string' || typeof props.children === 'number' || typeof props.dangerouslySetInnerHTML === 'object' && props.dangerouslySetInnerHTML !== null && props.dangerouslySetInnerHTML.__html != null;
  }
  function shouldDeprioritizeSubtree(type, props) {
    return !!props.hidden;
  }
  function createTextInstance(text, rootContainerInstance, hostContext, internalInstanceHandle) {
    {
      var hostContextDev = hostContext;
      validateDOMNesting(null, text, hostContextDev.ancestorInfo);
    }

    var textNode = createTextNode(text, rootContainerInstance);
    precacheFiberNode(internalInstanceHandle, textNode);
    return textNode;
  }
  // if a component just imports ReactDOM (e.g. for findDOMNode).
  // Some environments might not have setTimeout or clearTimeout.

  var scheduleTimeout = typeof setTimeout === 'function' ? setTimeout : undefined;
  var cancelTimeout = typeof clearTimeout === 'function' ? clearTimeout : undefined;
  var noTimeout = -1; // -------------------
  function commitMount(domElement, type, newProps, internalInstanceHandle) {
    // Despite the naming that might imply otherwise, this method only
    // fires if there is an `Update` effect scheduled during mounting.
    // This happens if `finalizeInitialChildren` returns `true` (which it
    // does to implement the `autoFocus` attribute on the client). But
    // there are also other cases when this might happen (such as patching
    // up text content during hydration mismatch). So we'll check this again.
    if (shouldAutoFocusHostComponent(type, newProps)) {
      domElement.focus();
    }
  }
  function commitUpdate(domElement, updatePayload, type, oldProps, newProps, internalInstanceHandle) {
    // Update the props handle so that we know which props are the ones with
    // with current event handlers.
    updateFiberProps(domElement, newProps); // Apply the diff to the DOM node.

    updateProperties(domElement, updatePayload, type, oldProps, newProps);
  }
  function resetTextContent(domElement) {
    setTextContent(domElement, '');
  }
  function commitTextUpdate(textInstance, oldText, newText) {
    textInstance.nodeValue = newText;
  }
  function appendChild(parentInstance, child) {
    parentInstance.appendChild(child);
  }
  function appendChildToContainer(container, child) {
    var parentNode;

    if (container.nodeType === COMMENT_NODE) {
      parentNode = container.parentNode;
      parentNode.insertBefore(child, container);
    } else {
      parentNode = container;
      parentNode.appendChild(child);
    } // This container might be used for a portal.
    // If something inside a portal is clicked, that click should bubble
    // through the React tree. However, on Mobile Safari the click would
    // never bubble through the *DOM* tree unless an ancestor with onclick
    // event exists. So we wouldn't see it and dispatch it.
    // This is why we ensure that non React root containers have inline onclick
    // defined.
    // https://github.com/facebook/react/issues/11918


    var reactRootContainer = container._reactRootContainer;

    if ((reactRootContainer === null || reactRootContainer === undefined) && parentNode.onclick === null) {
      // TODO: This cast may not be sound for SVG, MathML or custom elements.
      trapClickOnNonInteractiveElement(parentNode);
    }
  }
  function insertBefore(parentInstance, child, beforeChild) {
    parentInstance.insertBefore(child, beforeChild);
  }
  function insertInContainerBefore(container, child, beforeChild) {
    if (container.nodeType === COMMENT_NODE) {
      container.parentNode.insertBefore(child, beforeChild);
    } else {
      container.insertBefore(child, beforeChild);
    }
  }
  function removeChild(parentInstance, child) {
    parentInstance.removeChild(child);
  }
  function removeChildFromContainer(container, child) {
    if (container.nodeType === COMMENT_NODE) {
      container.parentNode.removeChild(child);
    } else {
      container.removeChild(child);
    }
  }

  function hideInstance(instance) {
    // pass host context to this method?


    instance = instance;
    var style = instance.style;

    if (typeof style.setProperty === 'function') {
      style.setProperty('display', 'none', 'important');
    } else {
      style.display = 'none';
    }
  }
  function hideTextInstance(textInstance) {
    textInstance.nodeValue = '';
  }
  function unhideInstance(instance, props) {
    instance = instance;
    var styleProp = props[STYLE$1];
    var display = styleProp !== undefined && styleProp !== null && styleProp.hasOwnProperty('display') ? styleProp.display : null;
    instance.style.display = dangerousStyleValue('display', display);
  }
  function unhideTextInstance(textInstance, text) {
    textInstance.nodeValue = text;
  } // -------------------
  function canHydrateInstance(instance, type, props) {
    if (instance.nodeType !== ELEMENT_NODE || type.toLowerCase() !== instance.nodeName.toLowerCase()) {
      return null;
    } // This has now been refined to an element node.


    return instance;
  }
  function canHydrateTextInstance(instance, text) {
    if (text === '' || instance.nodeType !== TEXT_NODE) {
      // Empty strings are not parsed by HTML so there won't be a correct match here.
      return null;
    } // This has now been refined to a text node.


    return instance;
  }
  function isSuspenseInstancePending(instance) {
    return instance.data === SUSPENSE_PENDING_START_DATA;
  }
  function isSuspenseInstanceFallback(instance) {
    return instance.data === SUSPENSE_FALLBACK_START_DATA;
  }

  function getNextHydratable(node) {
    // Skip non-hydratable nodes.
    for (; node != null; node = node.nextSibling) {
      var nodeType = node.nodeType;

      if (nodeType === ELEMENT_NODE || nodeType === TEXT_NODE) {
        break;
      }
    }

    return node;
  }

  function getNextHydratableSibling(instance) {
    return getNextHydratable(instance.nextSibling);
  }
  function getFirstHydratableChild(parentInstance) {
    return getNextHydratable(parentInstance.firstChild);
  }
  function hydrateInstance(instance, type, props, rootContainerInstance, hostContext, internalInstanceHandle) {
    precacheFiberNode(internalInstanceHandle, instance); // TODO: Possibly defer this until the commit phase where all the events
    // get attached.

    updateFiberProps(instance, props);
    var parentNamespace;

    {
      var hostContextDev = hostContext;
      parentNamespace = hostContextDev.namespace;
    }

    return diffHydratedProperties(instance, type, props, parentNamespace, rootContainerInstance);
  }
  function hydrateTextInstance(textInstance, text, internalInstanceHandle) {
    precacheFiberNode(internalInstanceHandle, textInstance);
    return diffHydratedText(textInstance, text);
  }
  function getNextHydratableInstanceAfterSuspenseInstance(suspenseInstance) {
    var node = suspenseInstance.nextSibling; // Skip past all nodes within this suspense boundary.
    // There might be nested nodes so we need to keep track of how
    // deep we are and only break out when we're back on top.

    var depth = 0;

    while (node) {
      if (node.nodeType === COMMENT_NODE) {
        var data = node.data;

        if (data === SUSPENSE_END_DATA) {
          if (depth === 0) {
            return getNextHydratableSibling(node);
          } else {
            depth--;
          }
        } else if (data === SUSPENSE_START_DATA || data === SUSPENSE_FALLBACK_START_DATA || data === SUSPENSE_PENDING_START_DATA) {
          depth++;
        }
      }

      node = node.nextSibling;
    } // TODO: Warn, we didn't find the end comment boundary.


    return null;
  } // Returns the SuspenseInstance if this node is a direct child of a
  // SuspenseInstance. I.e. if its previous sibling is a Comment with
  // SUSPENSE_x_START_DATA. Otherwise, null.

  function getParentSuspenseInstance(targetInstance) {
    var node = targetInstance.previousSibling; // Skip past all nodes within this suspense boundary.
    // There might be nested nodes so we need to keep track of how
    // deep we are and only break out when we're back on top.

    var depth = 0;

    while (node) {
      if (node.nodeType === COMMENT_NODE) {
        var data = node.data;

        if (data === SUSPENSE_START_DATA || data === SUSPENSE_FALLBACK_START_DATA || data === SUSPENSE_PENDING_START_DATA) {
          if (depth === 0) {
            return node;
          } else {
            depth--;
          }
        } else if (data === SUSPENSE_END_DATA) {
          depth++;
        }
      }

      node = node.previousSibling;
    }

    return null;
  }
  function commitHydratedContainer(container) {
    // Retry if any event replaying was blocked on this.
    retryIfBlockedOn(container);
  }
  function commitHydratedSuspenseInstance(suspenseInstance) {
    // Retry if any event replaying was blocked on this.
    retryIfBlockedOn(suspenseInstance);
  }
  function didNotMatchHydratedContainerTextInstance(parentContainer, textInstance, text) {
    {
      warnForUnmatchedText(textInstance, text);
    }
  }
  function didNotMatchHydratedTextInstance(parentType, parentProps, parentInstance, textInstance, text) {
    if ( parentProps[SUPPRESS_HYDRATION_WARNING$1] !== true) {
      warnForUnmatchedText(textInstance, text);
    }
  }
  function didNotHydrateContainerInstance(parentContainer, instance) {
    {
      if (instance.nodeType === ELEMENT_NODE) {
        warnForDeletedHydratableElement(parentContainer, instance);
      } else if (instance.nodeType === COMMENT_NODE) ; else {
        warnForDeletedHydratableText(parentContainer, instance);
      }
    }
  }
  function didNotHydrateInstance(parentType, parentProps, parentInstance, instance) {
    if ( parentProps[SUPPRESS_HYDRATION_WARNING$1] !== true) {
      if (instance.nodeType === ELEMENT_NODE) {
        warnForDeletedHydratableElement(parentInstance, instance);
      } else if (instance.nodeType === COMMENT_NODE) ; else {
        warnForDeletedHydratableText(parentInstance, instance);
      }
    }
  }
  function didNotFindHydratableContainerInstance(parentContainer, type, props) {
    {
      warnForInsertedHydratedElement(parentContainer, type);
    }
  }
  function didNotFindHydratableContainerTextInstance(parentContainer, text) {
    {
      warnForInsertedHydratedText(parentContainer, text);
    }
  }
  function didNotFindHydratableInstance(parentType, parentProps, parentInstance, type, props) {
    if ( parentProps[SUPPRESS_HYDRATION_WARNING$1] !== true) {
      warnForInsertedHydratedElement(parentInstance, type);
    }
  }
  function didNotFindHydratableTextInstance(parentType, parentProps, parentInstance, text) {
    if ( parentProps[SUPPRESS_HYDRATION_WARNING$1] !== true) {
      warnForInsertedHydratedText(parentInstance, text);
    }
  }
  function didNotFindHydratableSuspenseInstance(parentType, parentProps, parentInstance) {
    if ( parentProps[SUPPRESS_HYDRATION_WARNING$1] !== true) ;
  }

  var randomKey = Math.random().toString(36).slice(2);
  var internalInstanceKey = '__reactInternalInstance$' + randomKey;
  var internalEventHandlersKey = '__reactEventHandlers$' + randomKey;
  var internalContainerInstanceKey = '__reactContainere$' + randomKey;
  function precacheFiberNode(hostInst, node) {
    node[internalInstanceKey] = hostInst;
  }
  function markContainerAsRoot(hostRoot, node) {
    node[internalContainerInstanceKey] = hostRoot;
  }
  function unmarkContainerAsRoot(node) {
    node[internalContainerInstanceKey] = null;
  }
  function isContainerMarkedAsRoot(node) {
    return !!node[internalContainerInstanceKey];
  } // Given a DOM node, return the closest HostComponent or HostText fiber ancestor.
  // If the target node is part of a hydrated or not yet rendered subtree, then
  // this may also return a SuspenseComponent or HostRoot to indicate that.
  // Conceptually the HostRoot fiber is a child of the Container node. So if you
  // pass the Container node as the targetNode, you will not actually get the
  // HostRoot back. To get to the HostRoot, you need to pass a child of it.
  // The same thing applies to Suspense boundaries.

  function getClosestInstanceFromNode(targetNode) {
    var targetInst = targetNode[internalInstanceKey];

    if (targetInst) {
      // Don't return HostRoot or SuspenseComponent here.
      return targetInst;
    } // If the direct event target isn't a React owned DOM node, we need to look
    // to see if one of its parents is a React owned DOM node.


    var parentNode = targetNode.parentNode;

    while (parentNode) {
      // We'll check if this is a container root that could include
      // React nodes in the future. We need to check this first because
      // if we're a child of a dehydrated container, we need to first
      // find that inner container before moving on to finding the parent
      // instance. Note that we don't check this field on  the targetNode
      // itself because the fibers are conceptually between the container
      // node and the first child. It isn't surrounding the container node.
      // If it's not a container, we check if it's an instance.
      targetInst = parentNode[internalContainerInstanceKey] || parentNode[internalInstanceKey];

      if (targetInst) {
        // Since this wasn't the direct target of the event, we might have
        // stepped past dehydrated DOM nodes to get here. However they could
        // also have been non-React nodes. We need to answer which one.
        // If we the instance doesn't have any children, then there can't be
        // a nested suspense boundary within it. So we can use this as a fast
        // bailout. Most of the time, when people add non-React children to
        // the tree, it is using a ref to a child-less DOM node.
        // Normally we'd only need to check one of the fibers because if it
        // has ever gone from having children to deleting them or vice versa
        // it would have deleted the dehydrated boundary nested inside already.
        // However, since the HostRoot starts out with an alternate it might
        // have one on the alternate so we need to check in case this was a
        // root.
        var alternate = targetInst.alternate;

        if (targetInst.child !== null || alternate !== null && alternate.child !== null) {
          // Next we need to figure out if the node that skipped past is
          // nested within a dehydrated boundary and if so, which one.
          var suspenseInstance = getParentSuspenseInstance(targetNode);

          while (suspenseInstance !== null) {
            // We found a suspense instance. That means that we haven't
            // hydrated it yet. Even though we leave the comments in the
            // DOM after hydrating, and there are boundaries in the DOM
            // that could already be hydrated, we wouldn't have found them
            // through this pass since if the target is hydrated it would
            // have had an internalInstanceKey on it.
            // Let's get the fiber associated with the SuspenseComponent
            // as the deepest instance.
            var targetSuspenseInst = suspenseInstance[internalInstanceKey];

            if (targetSuspenseInst) {
              return targetSuspenseInst;
            } // If we don't find a Fiber on the comment, it might be because
            // we haven't gotten to hydrate it yet. There might still be a
            // parent boundary that hasn't above this one so we need to find
            // the outer most that is known.


            suspenseInstance = getParentSuspenseInstance(suspenseInstance); // If we don't find one, then that should mean that the parent
            // host component also hasn't hydrated yet. We can return it
            // below since it will bail out on the isMounted check later.
          }
        }

        return targetInst;
      }

      targetNode = parentNode;
      parentNode = targetNode.parentNode;
    }

    return null;
  }
  /**
   * Given a DOM node, return the ReactDOMComponent or ReactDOMTextComponent
   * instance, or null if the node was not rendered by this React.
   */

  function getInstanceFromNode$1(node) {
    var inst = node[internalInstanceKey] || node[internalContainerInstanceKey];

    if (inst) {
      if (inst.tag === HostComponent || inst.tag === HostText || inst.tag === SuspenseComponent || inst.tag === HostRoot) {
        return inst;
      } else {
        return null;
      }
    }

    return null;
  }
  /**
   * Given a ReactDOMComponent or ReactDOMTextComponent, return the corresponding
   * DOM node.
   */

  function getNodeFromInstance$1(inst) {
    if (inst.tag === HostComponent || inst.tag === HostText) {
      // In Fiber this, is just the state node right now. We assume it will be
      // a host component or host text.
      return inst.stateNode;
    } // Without this first invariant, passing a non-DOM-component triggers the next
    // invariant for a missing parent, which is super confusing.


    {
      {
        throw Error( "getNodeFromInstance: Invalid argument." );
      }
    }
  }
  function getFiberCurrentPropsFromNode$1(node) {
    return node[internalEventHandlersKey] || null;
  }
  function updateFiberProps(node, props) {
    node[internalEventHandlersKey] = props;
  }

  function getParent(inst) {
    do {
      inst = inst.return; // TODO: If this is a HostRoot we might want to bail out.
      // That is depending on if we want nested subtrees (layers) to bubble
      // events to their parent. We could also go through parentNode on the
      // host node but that wouldn't work for React Native and doesn't let us
      // do the portal feature.
    } while (inst && inst.tag !== HostComponent);

    if (inst) {
      return inst;
    }

    return null;
  }
  /**
   * Return the lowest common ancestor of A and B, or null if they are in
   * different trees.
   */


  function getLowestCommonAncestor(instA, instB) {
    var depthA = 0;

    for (var tempA = instA; tempA; tempA = getParent(tempA)) {
      depthA++;
    }

    var depthB = 0;

    for (var tempB = instB; tempB; tempB = getParent(tempB)) {
      depthB++;
    } // If A is deeper, crawl up.


    while (depthA - depthB > 0) {
      instA = getParent(instA);
      depthA--;
    } // If B is deeper, crawl up.


    while (depthB - depthA > 0) {
      instB = getParent(instB);
      depthB--;
    } // Walk in lockstep until we find a match.


    var depth = depthA;

    while (depth--) {
      if (instA === instB || instA === instB.alternate) {
        return instA;
      }

      instA = getParent(instA);
      instB = getParent(instB);
    }

    return null;
  }
  /**
   * Simulates the traversal of a two-phase, capture/bubble event dispatch.
   */

  function traverseTwoPhase(inst, fn, arg) {
    var path = [];

    while (inst) {
      path.push(inst);
      inst = getParent(inst);
    }

    var i;

    for (i = path.length; i-- > 0;) {
      fn(path[i], 'captured', arg);
    }

    for (i = 0; i < path.length; i++) {
      fn(path[i], 'bubbled', arg);
    }
  }
  /**
   * Traverses the ID hierarchy and invokes the supplied `cb` on any IDs that
   * should would receive a `mouseEnter` or `mouseLeave` event.
   *
   * Does not invoke the callback on the nearest common ancestor because nothing
   * "entered" or "left" that element.
   */

  function traverseEnterLeave(from, to, fn, argFrom, argTo) {
    var common = from && to ? getLowestCommonAncestor(from, to) : null;
    var pathFrom = [];

    while (true) {
      if (!from) {
        break;
      }

      if (from === common) {
        break;
      }

      var alternate = from.alternate;

      if (alternate !== null && alternate === common) {
        break;
      }

      pathFrom.push(from);
      from = getParent(from);
    }

    var pathTo = [];

    while (true) {
      if (!to) {
        break;
      }

      if (to === common) {
        break;
      }

      var _alternate = to.alternate;

      if (_alternate !== null && _alternate === common) {
        break;
      }

      pathTo.push(to);
      to = getParent(to);
    }

    for (var i = 0; i < pathFrom.length; i++) {
      fn(pathFrom[i], 'bubbled', argFrom);
    }

    for (var _i = pathTo.length; _i-- > 0;) {
      fn(pathTo[_i], 'captured', argTo);
    }
  }

  function isInteractive(tag) {
    return tag === 'button' || tag === 'input' || tag === 'select' || tag === 'textarea';
  }

  function shouldPreventMouseEvent(name, type, props) {
    switch (name) {
      case 'onClick':
      case 'onClickCapture':
      case 'onDoubleClick':
      case 'onDoubleClickCapture':
      case 'onMouseDown':
      case 'onMouseDownCapture':
      case 'onMouseMove':
      case 'onMouseMoveCapture':
      case 'onMouseUp':
      case 'onMouseUpCapture':
      case 'onMouseEnter':
        return !!(props.disabled && isInteractive(type));

      default:
        return false;
    }
  }
  /**
   * @param {object} inst The instance, which is the source of events.
   * @param {string} registrationName Name of listener (e.g. `onClick`).
   * @return {?function} The stored callback.
   */


  function getListener(inst, registrationName) {
    var listener; // TODO: shouldPreventMouseEvent is DOM-specific and definitely should not
    // live here; needs to be moved to a better place soon

    var stateNode = inst.stateNode;

    if (!stateNode) {
      // Work in progress (ex: onload events in incremental mode).
      return null;
    }

    var props = getFiberCurrentPropsFromNode(stateNode);

    if (!props) {
      // Work in progress.
      return null;
    }

    listener = props[registrationName];

    if (shouldPreventMouseEvent(registrationName, inst.type, props)) {
      return null;
    }

    if (!(!listener || typeof listener === 'function')) {
      {
        throw Error( "Expected `" + registrationName + "` listener to be a function, instead got a value of `" + typeof listener + "` type." );
      }
    }

    return listener;
  }

  /**
   * Some event types have a notion of different registration names for different
   * "phases" of propagation. This finds listeners by a given phase.
   */
  function listenerAtPhase(inst, event, propagationPhase) {
    var registrationName = event.dispatchConfig.phasedRegistrationNames[propagationPhase];
    return getListener(inst, registrationName);
  }
  /**
   * A small set of propagation patterns, each of which will accept a small amount
   * of information, and generate a set of "dispatch ready event objects" - which
   * are sets of events that have already been annotated with a set of dispatched
   * listener functions/ids. The API is designed this way to discourage these
   * propagation strategies from actually executing the dispatches, since we
   * always want to collect the entire set of dispatches before executing even a
   * single one.
   */

  /**
   * Tags a `SyntheticEvent` with dispatched listeners. Creating this function
   * here, allows us to not have to bind or create functions for each event.
   * Mutating the event's members allows us to not have to create a wrapping
   * "dispatch" object that pairs the event with the listener.
   */


  function accumulateDirectionalDispatches(inst, phase, event) {
    {
      if (!inst) {
        error('Dispatching inst must not be null');
      }
    }

    var listener = listenerAtPhase(inst, event, phase);

    if (listener) {
      event._dispatchListeners = accumulateInto(event._dispatchListeners, listener);
      event._dispatchInstances = accumulateInto(event._dispatchInstances, inst);
    }
  }
  /**
   * Collect dispatches (must be entirely collected before dispatching - see unit
   * tests). Lazily allocate the array to conserve memory.  We must loop through
   * each event and perform the traversal for each one. We cannot perform a
   * single traversal for the entire collection of events because each event may
   * have a different target.
   */


  function accumulateTwoPhaseDispatchesSingle(event) {
    if (event && event.dispatchConfig.phasedRegistrationNames) {
      traverseTwoPhase(event._targetInst, accumulateDirectionalDispatches, event);
    }
  }
  /**
   * Accumulates without regard to direction, does not look for phased
   * registration names. Same as `accumulateDirectDispatchesSingle` but without
   * requiring that the `dispatchMarker` be the same as the dispatched ID.
   */


  function accumulateDispatches(inst, ignoredDirection, event) {
    if (inst && event && event.dispatchConfig.registrationName) {
      var registrationName = event.dispatchConfig.registrationName;
      var listener = getListener(inst, registrationName);

      if (listener) {
        event._dispatchListeners = accumulateInto(event._dispatchListeners, listener);
        event._dispatchInstances = accumulateInto(event._dispatchInstances, inst);
      }
    }
  }
  /**
   * Accumulates dispatches on an `SyntheticEvent`, but only for the
   * `dispatchMarker`.
   * @param {SyntheticEvent} event
   */


  function accumulateDirectDispatchesSingle(event) {
    if (event && event.dispatchConfig.registrationName) {
      accumulateDispatches(event._targetInst, null, event);
    }
  }

  function accumulateTwoPhaseDispatches(events) {
    forEachAccumulated(events, accumulateTwoPhaseDispatchesSingle);
  }
  function accumulateEnterLeaveDispatches(leave, enter, from, to) {
    traverseEnterLeave(from, to, accumulateDispatches, leave, enter);
  }
  function accumulateDirectDispatches(events) {
    forEachAccumulated(events, accumulateDirectDispatchesSingle);
  }

  /**
   * These variables store information about text content of a target node,
   * allowing comparison of content before and after a given event.
   *
   * Identify the node where selection currently begins, then observe
   * both its text content and its current position in the DOM. Since the
   * browser may natively replace the target node during composition, we can
   * use its position to find its replacement.
   *
   *
   */
  var root = null;
  var startText = null;
  var fallbackText = null;
  function initialize(nativeEventTarget) {
    root = nativeEventTarget;
    startText = getText();
    return true;
  }
  function reset() {
    root = null;
    startText = null;
    fallbackText = null;
  }
  function getData() {
    if (fallbackText) {
      return fallbackText;
    }

    var start;
    var startValue = startText;
    var startLength = startValue.length;
    var end;
    var endValue = getText();
    var endLength = endValue.length;

    for (start = 0; start < startLength; start++) {
      if (startValue[start] !== endValue[start]) {
        break;
      }
    }

    var minEnd = startLength - start;

    for (end = 1; end <= minEnd; end++) {
      if (startValue[startLength - end] !== endValue[endLength - end]) {
        break;
      }
    }

    var sliceTail = end > 1 ? 1 - end : undefined;
    fallbackText = endValue.slice(start, sliceTail);
    return fallbackText;
  }
  function getText() {
    if ('value' in root) {
      return root.value;
    }

    return root.textContent;
  }

  var EVENT_POOL_SIZE = 10;
  /**
   * @interface Event
   * @see http://www.w3.org/TR/DOM-Level-3-Events/
   */

  var EventInterface = {
    type: null,
    target: null,
    // currentTarget is set when dispatching; no use in copying it here
    currentTarget: function () {
      return null;
    },
    eventPhase: null,
    bubbles: null,
    cancelable: null,
    timeStamp: function (event) {
      return event.timeStamp || Date.now();
    },
    defaultPrevented: null,
    isTrusted: null
  };

  function functionThatReturnsTrue() {
    return true;
  }

  function functionThatReturnsFalse() {
    return false;
  }
  /**
   * Synthetic events are dispatched by event plugins, typically in response to a
   * top-level event delegation handler.
   *
   * These systems should generally use pooling to reduce the frequency of garbage
   * collection. The system should check `isPersistent` to determine whether the
   * event should be released into the pool after being dispatched. Users that
   * need a persisted event should invoke `persist`.
   *
   * Synthetic events (and subclasses) implement the DOM Level 3 Events API by
   * normalizing browser quirks. Subclasses do not necessarily have to implement a
   * DOM interface; custom application-specific events can also subclass this.
   *
   * @param {object} dispatchConfig Configuration used to dispatch this event.
   * @param {*} targetInst Marker identifying the event target.
   * @param {object} nativeEvent Native browser event.
   * @param {DOMEventTarget} nativeEventTarget Target node.
   */


  function SyntheticEvent(dispatchConfig, targetInst, nativeEvent, nativeEventTarget) {
    {
      // these have a getter/setter for warnings
      delete this.nativeEvent;
      delete this.preventDefault;
      delete this.stopPropagation;
      delete this.isDefaultPrevented;
      delete this.isPropagationStopped;
    }

    this.dispatchConfig = dispatchConfig;
    this._targetInst = targetInst;
    this.nativeEvent = nativeEvent;
    var Interface = this.constructor.Interface;

    for (var propName in Interface) {
      if (!Interface.hasOwnProperty(propName)) {
        continue;
      }

      {
        delete this[propName]; // this has a getter/setter for warnings
      }

      var normalize = Interface[propName];

      if (normalize) {
        this[propName] = normalize(nativeEvent);
      } else {
        if (propName === 'target') {
          this.target = nativeEventTarget;
        } else {
          this[propName] = nativeEvent[propName];
        }
      }
    }

    var defaultPrevented = nativeEvent.defaultPrevented != null ? nativeEvent.defaultPrevented : nativeEvent.returnValue === false;

    if (defaultPrevented) {
      this.isDefaultPrevented = functionThatReturnsTrue;
    } else {
      this.isDefaultPrevented = functionThatReturnsFalse;
    }

    this.isPropagationStopped = functionThatReturnsFalse;
    return this;
  }

  _assign(SyntheticEvent.prototype, {
    preventDefault: function () {
      this.defaultPrevented = true;
      var event = this.nativeEvent;

      if (!event) {
        return;
      }

      if (event.preventDefault) {
        event.preventDefault();
      } else if (typeof event.returnValue !== 'unknown') {
        event.returnValue = false;
      }

      this.isDefaultPrevented = functionThatReturnsTrue;
    },
    stopPropagation: function () {
      var event = this.nativeEvent;

      if (!event) {
        return;
      }

      if (event.stopPropagation) {
        event.stopPropagation();
      } else if (typeof event.cancelBubble !== 'unknown') {
        // The ChangeEventPlugin registers a "propertychange" event for
        // IE. This event does not support bubbling or cancelling, and
        // any references to cancelBubble throw "Member not found".  A
        // typeof check of "unknown" circumvents this issue (and is also
        // IE specific).
        event.cancelBubble = true;
      }

      this.isPropagationStopped = functionThatReturnsTrue;
    },

    /**
     * We release all dispatched `SyntheticEvent`s after each event loop, adding
     * them back into the pool. This allows a way to hold onto a reference that
     * won't be added back into the pool.
     */
    persist: function () {
      this.isPersistent = functionThatReturnsTrue;
    },

    /**
     * Checks if this event should be released back into the pool.
     *
     * @return {boolean} True if this should not be released, false otherwise.
     */
    isPersistent: functionThatReturnsFalse,

    /**
     * `PooledClass` looks for `destructor` on each instance it releases.
     */
    destructor: function () {
      var Interface = this.constructor.Interface;

      for (var propName in Interface) {
        {
          Object.defineProperty(this, propName, getPooledWarningPropertyDefinition(propName, Interface[propName]));
        }
      }

      this.dispatchConfig = null;
      this._targetInst = null;
      this.nativeEvent = null;
      this.isDefaultPrevented = functionThatReturnsFalse;
      this.isPropagationStopped = functionThatReturnsFalse;
      this._dispatchListeners = null;
      this._dispatchInstances = null;

      {
        Object.defineProperty(this, 'nativeEvent', getPooledWarningPropertyDefinition('nativeEvent', null));
        Object.defineProperty(this, 'isDefaultPrevented', getPooledWarningPropertyDefinition('isDefaultPrevented', functionThatReturnsFalse));
        Object.defineProperty(this, 'isPropagationStopped', getPooledWarningPropertyDefinition('isPropagationStopped', functionThatReturnsFalse));
        Object.defineProperty(this, 'preventDefault', getPooledWarningPropertyDefinition('preventDefault', function () {}));
        Object.defineProperty(this, 'stopPropagation', getPooledWarningPropertyDefinition('stopPropagation', function () {}));
      }
    }
  });

  SyntheticEvent.Interface = EventInterface;
  /**
   * Helper to reduce boilerplate when creating subclasses.
   */

  SyntheticEvent.extend = function (Interface) {
    var Super = this;

    var E = function () {};

    E.prototype = Super.prototype;
    var prototype = new E();

    function Class() {
      return Super.apply(this, arguments);
    }

    _assign(prototype, Class.prototype);

    Class.prototype = prototype;
    Class.prototype.constructor = Class;
    Class.Interface = _assign({}, Super.Interface, Interface);
    Class.extend = Super.extend;
    addEventPoolingTo(Class);
    return Class;
  };

  addEventPoolingTo(SyntheticEvent);
  /**
   * Helper to nullify syntheticEvent instance properties when destructing
   *
   * @param {String} propName
   * @param {?object} getVal
   * @return {object} defineProperty object
   */

  function getPooledWarningPropertyDefinition(propName, getVal) {
    var isFunction = typeof getVal === 'function';
    return {
      configurable: true,
      set: set,
      get: get
    };

    function set(val) {
      var action = isFunction ? 'setting the method' : 'setting the property';
      warn(action, 'This is effectively a no-op');
      return val;
    }

    function get() {
      var action = isFunction ? 'accessing the method' : 'accessing the property';
      var result = isFunction ? 'This is a no-op function' : 'This is set to null';
      warn(action, result);
      return getVal;
    }

    function warn(action, result) {
      {
        error("This synthetic event is reused for performance reasons. If you're seeing this, " + "you're %s `%s` on a released/nullified synthetic event. %s. " + 'If you must keep the original synthetic event around, use event.persist(). ' + 'See https://fb.me/react-event-pooling for more information.', action, propName, result);
      }
    }
  }

  function getPooledEvent(dispatchConfig, targetInst, nativeEvent, nativeInst) {
    var EventConstructor = this;

    if (EventConstructor.eventPool.length) {
      var instance = EventConstructor.eventPool.pop();
      EventConstructor.call(instance, dispatchConfig, targetInst, nativeEvent, nativeInst);
      return instance;
    }

    return new EventConstructor(dispatchConfig, targetInst, nativeEvent, nativeInst);
  }

  function releasePooledEvent(event) {
    var EventConstructor = this;

    if (!(event instanceof EventConstructor)) {
      {
        throw Error( "Trying to release an event instance into a pool of a different type." );
      }
    }

    event.destructor();

    if (EventConstructor.eventPool.length < EVENT_POOL_SIZE) {
      EventConstructor.eventPool.push(event);
    }
  }

  function addEventPoolingTo(EventConstructor) {
    EventConstructor.eventPool = [];
    EventConstructor.getPooled = getPooledEvent;
    EventConstructor.release = releasePooledEvent;
  }

  /**
   * @interface Event
   * @see http://www.w3.org/TR/DOM-Level-3-Events/#events-compositionevents
   */

  var SyntheticCompositionEvent = SyntheticEvent.extend({
    data: null
  });

  /**
   * @interface Event
   * @see http://www.w3.org/TR/2013/WD-DOM-Level-3-Events-20131105
   *      /#events-inputevents
   */

  var SyntheticInputEvent = SyntheticEvent.extend({
    data: null
  });

  var END_KEYCODES = [9, 13, 27, 32]; // Tab, Return, Esc, Space

  var START_KEYCODE = 229;
  var canUseCompositionEvent = canUseDOM && 'CompositionEvent' in window;
  var documentMode = null;

  if (canUseDOM && 'documentMode' in document) {
    documentMode = document.documentMode;
  } // Webkit offers a very useful `textInput` event that can be used to
  // directly represent `beforeInput`. The IE `textinput` event is not as
  // useful, so we don't use it.


  var canUseTextInputEvent = canUseDOM && 'TextEvent' in window && !documentMode; // In IE9+, we have access to composition events, but the data supplied
  // by the native compositionend event may be incorrect. Japanese ideographic
  // spaces, for instance (\u3000) are not recorded correctly.

  var useFallbackCompositionData = canUseDOM && (!canUseCompositionEvent || documentMode && documentMode > 8 && documentMode <= 11);
  var SPACEBAR_CODE = 32;
  var SPACEBAR_CHAR = String.fromCharCode(SPACEBAR_CODE); // Events and their corresponding property names.

  var eventTypes = {
    beforeInput: {
      phasedRegistrationNames: {
        bubbled: 'onBeforeInput',
        captured: 'onBeforeInputCapture'
      },
      dependencies: [TOP_COMPOSITION_END, TOP_KEY_PRESS, TOP_TEXT_INPUT, TOP_PASTE]
    },
    compositionEnd: {
      phasedRegistrationNames: {
        bubbled: 'onCompositionEnd',
        captured: 'onCompositionEndCapture'
      },
      dependencies: [TOP_BLUR, TOP_COMPOSITION_END, TOP_KEY_DOWN, TOP_KEY_PRESS, TOP_KEY_UP, TOP_MOUSE_DOWN]
    },
    compositionStart: {
      phasedRegistrationNames: {
        bubbled: 'onCompositionStart',
        captured: 'onCompositionStartCapture'
      },
      dependencies: [TOP_BLUR, TOP_COMPOSITION_START, TOP_KEY_DOWN, TOP_KEY_PRESS, TOP_KEY_UP, TOP_MOUSE_DOWN]
    },
    compositionUpdate: {
      phasedRegistrationNames: {
        bubbled: 'onCompositionUpdate',
        captured: 'onCompositionUpdateCapture'
      },
      dependencies: [TOP_BLUR, TOP_COMPOSITION_UPDATE, TOP_KEY_DOWN, TOP_KEY_PRESS, TOP_KEY_UP, TOP_MOUSE_DOWN]
    }
  }; // Track whether we've ever handled a keypress on the space key.

  var hasSpaceKeypress = false;
  /**
   * Return whether a native keypress event is assumed to be a command.
   * This is required because Firefox fires `keypress` events for key commands
   * (cut, copy, select-all, etc.) even though no character is inserted.
   */

  function isKeypressCommand(nativeEvent) {
    return (nativeEvent.ctrlKey || nativeEvent.altKey || nativeEvent.metaKey) && // ctrlKey && altKey is equivalent to AltGr, and is not a command.
    !(nativeEvent.ctrlKey && nativeEvent.altKey);
  }
  /**
   * Translate native top level events into event types.
   *
   * @param {string} topLevelType
   * @return {object}
   */


  function getCompositionEventType(topLevelType) {
    switch (topLevelType) {
      case TOP_COMPOSITION_START:
        return eventTypes.compositionStart;

      case TOP_COMPOSITION_END:
        return eventTypes.compositionEnd;

      case TOP_COMPOSITION_UPDATE:
        return eventTypes.compositionUpdate;
    }
  }
  /**
   * Does our fallback best-guess model think this event signifies that
   * composition has begun?
   *
   * @param {string} topLevelType
   * @param {object} nativeEvent
   * @return {boolean}
   */


  function isFallbackCompositionStart(topLevelType, nativeEvent) {
    return topLevelType === TOP_KEY_DOWN && nativeEvent.keyCode === START_KEYCODE;
  }
  /**
   * Does our fallback mode think that this event is the end of composition?
   *
   * @param {string} topLevelType
   * @param {object} nativeEvent
   * @return {boolean}
   */


  function isFallbackCompositionEnd(topLevelType, nativeEvent) {
    switch (topLevelType) {
      case TOP_KEY_UP:
        // Command keys insert or clear IME input.
        return END_KEYCODES.indexOf(nativeEvent.keyCode) !== -1;

      case TOP_KEY_DOWN:
        // Expect IME keyCode on each keydown. If we get any other
        // code we must have exited earlier.
        return nativeEvent.keyCode !== START_KEYCODE;

      case TOP_KEY_PRESS:
      case TOP_MOUSE_DOWN:
      case TOP_BLUR:
        // Events are not possible without cancelling IME.
        return true;

      default:
        return false;
    }
  }
  /**
   * Google Input Tools provides composition data via a CustomEvent,
   * with the `data` property populated in the `detail` object. If this
   * is available on the event object, use it. If not, this is a plain
   * composition event and we have nothing special to extract.
   *
   * @param {object} nativeEvent
   * @return {?string}
   */


  function getDataFromCustomEvent(nativeEvent) {
    var detail = nativeEvent.detail;

    if (typeof detail === 'object' && 'data' in detail) {
      return detail.data;
    }

    return null;
  }
  /**
   * Check if a composition event was triggered by Korean IME.
   * Our fallback mode does not work well with IE's Korean IME,
   * so just use native composition events when Korean IME is used.
   * Although CompositionEvent.locale property is deprecated,
   * it is available in IE, where our fallback mode is enabled.
   *
   * @param {object} nativeEvent
   * @return {boolean}
   */


  function isUsingKoreanIME(nativeEvent) {
    return nativeEvent.locale === 'ko';
  } // Track the current IME composition status, if any.


  var isComposing = false;
  /**
   * @return {?object} A SyntheticCompositionEvent.
   */

  function extractCompositionEvent(topLevelType, targetInst, nativeEvent, nativeEventTarget) {
    var eventType;
    var fallbackData;

    if (canUseCompositionEvent) {
      eventType = getCompositionEventType(topLevelType);
    } else if (!isComposing) {
      if (isFallbackCompositionStart(topLevelType, nativeEvent)) {
        eventType = eventTypes.compositionStart;
      }
    } else if (isFallbackCompositionEnd(topLevelType, nativeEvent)) {
      eventType = eventTypes.compositionEnd;
    }

    if (!eventType) {
      return null;
    }

    if (useFallbackCompositionData && !isUsingKoreanIME(nativeEvent)) {
      // The current composition is stored statically and must not be
      // overwritten while composition continues.
      if (!isComposing && eventType === eventTypes.compositionStart) {
        isComposing = initialize(nativeEventTarget);
      } else if (eventType === eventTypes.compositionEnd) {
        if (isComposing) {
          fallbackData = getData();
        }
      }
    }

    var event = SyntheticCompositionEvent.getPooled(eventType, targetInst, nativeEvent, nativeEventTarget);

    if (fallbackData) {
      // Inject data generated from fallback path into the synthetic event.
      // This matches the property of native CompositionEventInterface.
      event.data = fallbackData;
    } else {
      var customData = getDataFromCustomEvent(nativeEvent);

      if (customData !== null) {
        event.data = customData;
      }
    }

    accumulateTwoPhaseDispatches(event);
    return event;
  }
  /**
   * @param {TopLevelType} topLevelType Number from `TopLevelType`.
   * @param {object} nativeEvent Native browser event.
   * @return {?string} The string corresponding to this `beforeInput` event.
   */


  function getNativeBeforeInputChars(topLevelType, nativeEvent) {
    switch (topLevelType) {
      case TOP_COMPOSITION_END:
        return getDataFromCustomEvent(nativeEvent);

      case TOP_KEY_PRESS:
        /**
         * If native `textInput` events are available, our goal is to make
         * use of them. However, there is a special case: the spacebar key.
         * In Webkit, preventing default on a spacebar `textInput` event
         * cancels character insertion, but it *also* causes the browser
         * to fall back to its default spacebar behavior of scrolling the
         * page.
         *
         * Tracking at:
         * https://code.google.com/p/chromium/issues/detail?id=355103
         *
         * To avoid this issue, use the keypress event as if no `textInput`
         * event is available.
         */
        var which = nativeEvent.which;

        if (which !== SPACEBAR_CODE) {
          return null;
        }

        hasSpaceKeypress = true;
        return SPACEBAR_CHAR;

      case TOP_TEXT_INPUT:
        // Record the characters to be added to the DOM.
        var chars = nativeEvent.data; // If it's a spacebar character, assume that we have already handled
        // it at the keypress level and bail immediately. Android Chrome
        // doesn't give us keycodes, so we need to ignore it.

        if (chars === SPACEBAR_CHAR && hasSpaceKeypress) {
          return null;
        }

        return chars;

      default:
        // For other native event types, do nothing.
        return null;
    }
  }
  /**
   * For browsers that do not provide the `textInput` event, extract the
   * appropriate string to use for SyntheticInputEvent.
   *
   * @param {number} topLevelType Number from `TopLevelEventTypes`.
   * @param {object} nativeEvent Native browser event.
   * @return {?string} The fallback string for this `beforeInput` event.
   */


  function getFallbackBeforeInputChars(topLevelType, nativeEvent) {
    // If we are currently composing (IME) and using a fallback to do so,
    // try to extract the composed characters from the fallback object.
    // If composition event is available, we extract a string only at
    // compositionevent, otherwise extract it at fallback events.
    if (isComposing) {
      if (topLevelType === TOP_COMPOSITION_END || !canUseCompositionEvent && isFallbackCompositionEnd(topLevelType, nativeEvent)) {
        var chars = getData();
        reset();
        isComposing = false;
        return chars;
      }

      return null;
    }

    switch (topLevelType) {
      case TOP_PASTE:
        // If a paste event occurs after a keypress, throw out the input
        // chars. Paste events should not lead to BeforeInput events.
        return null;

      case TOP_KEY_PRESS:
        /**
         * As of v27, Firefox may fire keypress events even when no character
         * will be inserted. A few possibilities:
         *
         * - `which` is `0`. Arrow keys, Esc key, etc.
         *
         * - `which` is the pressed key code, but no char is available.
         *   Ex: 'AltGr + d` in Polish. There is no modified character for
         *   this key combination and no character is inserted into the
         *   document, but FF fires the keypress for char code `100` anyway.
         *   No `input` event will occur.
         *
         * - `which` is the pressed key code, but a command combination is
         *   being used. Ex: `Cmd+C`. No character is inserted, and no
         *   `input` event will occur.
         */
        if (!isKeypressCommand(nativeEvent)) {
          // IE fires the `keypress` event when a user types an emoji via
          // Touch keyboard of Windows.  In such a case, the `char` property
          // holds an emoji character like `\uD83D\uDE0A`.  Because its length
          // is 2, the property `which` does not represent an emoji correctly.
          // In such a case, we directly return the `char` property instead of
          // using `which`.
          if (nativeEvent.char && nativeEvent.char.length > 1) {
            return nativeEvent.char;
          } else if (nativeEvent.which) {
            return String.fromCharCode(nativeEvent.which);
          }
        }

        return null;

      case TOP_COMPOSITION_END:
        return useFallbackCompositionData && !isUsingKoreanIME(nativeEvent) ? null : nativeEvent.data;

      default:
        return null;
    }
  }
  /**
   * Extract a SyntheticInputEvent for `beforeInput`, based on either native
   * `textInput` or fallback behavior.
   *
   * @return {?object} A SyntheticInputEvent.
   */


  function extractBeforeInputEvent(topLevelType, targetInst, nativeEvent, nativeEventTarget) {
    var chars;

    if (canUseTextInputEvent) {
      chars = getNativeBeforeInputChars(topLevelType, nativeEvent);
    } else {
      chars = getFallbackBeforeInputChars(topLevelType, nativeEvent);
    } // If no characters are being inserted, no BeforeInput event should
    // be fired.


    if (!chars) {
      return null;
    }

    var event = SyntheticInputEvent.getPooled(eventTypes.beforeInput, targetInst, nativeEvent, nativeEventTarget);
    event.data = chars;
    accumulateTwoPhaseDispatches(event);
    return event;
  }
  /**
   * Create an `onBeforeInput` event to match
   * http://www.w3.org/TR/2013/WD-DOM-Level-3-Events-20131105/#events-inputevents.
   *
   * This event plugin is based on the native `textInput` event
   * available in Chrome, Safari, Opera, and IE. This event fires after
   * `onKeyPress` and `onCompositionEnd`, but before `onInput`.
   *
   * `beforeInput` is spec'd but not implemented in any browsers, and
   * the `input` event does not provide any useful information about what has
   * actually been added, contrary to the spec. Thus, `textInput` is the best
   * available event to identify the characters that have actually been inserted
   * into the target node.
   *
   * This plugin is also responsible for emitting `composition` events, thus
   * allowing us to share composition fallback code for both `beforeInput` and
   * `composition` event types.
   */


  var BeforeInputEventPlugin = {
    eventTypes: eventTypes,
    extractEvents: function (topLevelType, targetInst, nativeEvent, nativeEventTarget, eventSystemFlags) {
      var composition = extractCompositionEvent(topLevelType, targetInst, nativeEvent, nativeEventTarget);
      var beforeInput = extractBeforeInputEvent(topLevelType, targetInst, nativeEvent, nativeEventTarget);

      if (composition === null) {
        return beforeInput;
      }

      if (beforeInput === null) {
        return composition;
      }

      return [composition, beforeInput];
    }
  };

  /**
   * @see http://www.whatwg.org/specs/web-apps/current-work/multipage/the-input-element.html#input-type-attr-summary
   */
  var supportedInputTypes = {
    color: true,
    date: true,
    datetime: true,
    'datetime-local': true,
    email: true,
    month: true,
    number: true,
    password: true,
    range: true,
    search: true,
    tel: true,
    text: true,
    time: true,
    url: true,
    week: true
  };

  function isTextInputElement(elem) {
    var nodeName = elem && elem.nodeName && elem.nodeName.toLowerCase();

    if (nodeName === 'input') {
      return !!supportedInputTypes[elem.type];
    }

    if (nodeName === 'textarea') {
      return true;
    }

    return false;
  }

  var eventTypes$1 = {
    change: {
      phasedRegistrationNames: {
        bubbled: 'onChange',
        captured: 'onChangeCapture'
      },
      dependencies: [TOP_BLUR, TOP_CHANGE, TOP_CLICK, TOP_FOCUS, TOP_INPUT, TOP_KEY_DOWN, TOP_KEY_UP, TOP_SELECTION_CHANGE]
    }
  };

  function createAndAccumulateChangeEvent(inst, nativeEvent, target) {
    var event = SyntheticEvent.getPooled(eventTypes$1.change, inst, nativeEvent, target);
    event.type = 'change'; // Flag this event loop as needing state restore.

    enqueueStateRestore(target);
    accumulateTwoPhaseDispatches(event);
    return event;
  }
  /**
   * For IE shims
   */


  var activeElement = null;
  var activeElementInst = null;
  /**
   * SECTION: handle `change` event
   */

  function shouldUseChangeEvent(elem) {
    var nodeName = elem.nodeName && elem.nodeName.toLowerCase();
    return nodeName === 'select' || nodeName === 'input' && elem.type === 'file';
  }

  function manualDispatchChangeEvent(nativeEvent) {
    var event = createAndAccumulateChangeEvent(activeElementInst, nativeEvent, getEventTarget(nativeEvent)); // If change and propertychange bubbled, we'd just bind to it like all the
    // other events and have it go through ReactBrowserEventEmitter. Since it
    // doesn't, we manually listen for the events and so we have to enqueue and
    // process the abstract event manually.
    //
    // Batching is necessary here in order to ensure that all event handlers run
    // before the next rerender (including event handlers attached to ancestor
    // elements instead of directly on the input). Without this, controlled
    // components don't work properly in conjunction with event bubbling because
    // the component is rerendered and the value reverted before all the event
    // handlers can run. See https://github.com/facebook/react/issues/708.

    batchedUpdates(runEventInBatch, event);
  }

  function runEventInBatch(event) {
    runEventsInBatch(event);
  }

  function getInstIfValueChanged(targetInst) {
    var targetNode = getNodeFromInstance$1(targetInst);

    if (updateValueIfChanged(targetNode)) {
      return targetInst;
    }
  }

  function getTargetInstForChangeEvent(topLevelType, targetInst) {
    if (topLevelType === TOP_CHANGE) {
      return targetInst;
    }
  }
  /**
   * SECTION: handle `input` event
   */


  var isInputEventSupported = false;

  if (canUseDOM) {
    // IE9 claims to support the input event but fails to trigger it when
    // deleting text, so we ignore its input events.
    isInputEventSupported = isEventSupported('input') && (!document.documentMode || document.documentMode > 9);
  }
  /**
   * (For IE <=9) Starts tracking propertychange events on the passed-in element
   * and override the value property so that we can distinguish user events from
   * value changes in JS.
   */


  function startWatchingForValueChange(target, targetInst) {
    activeElement = target;
    activeElementInst = targetInst;
    activeElement.attachEvent('onpropertychange', handlePropertyChange);
  }
  /**
   * (For IE <=9) Removes the event listeners from the currently-tracked element,
   * if any exists.
   */


  function stopWatchingForValueChange() {
    if (!activeElement) {
      return;
    }

    activeElement.detachEvent('onpropertychange', handlePropertyChange);
    activeElement = null;
    activeElementInst = null;
  }
  /**
   * (For IE <=9) Handles a propertychange event, sending a `change` event if
   * the value of the active element has changed.
   */


  function handlePropertyChange(nativeEvent) {
    if (nativeEvent.propertyName !== 'value') {
      return;
    }

    if (getInstIfValueChanged(activeElementInst)) {
      manualDispatchChangeEvent(nativeEvent);
    }
  }

  function handleEventsForInputEventPolyfill(topLevelType, target, targetInst) {
    if (topLevelType === TOP_FOCUS) {
      // In IE9, propertychange fires for most input events but is buggy and
      // doesn't fire when text is deleted, but conveniently, selectionchange
      // appears to fire in all of the remaining cases so we catch those and
      // forward the event if the value has changed
      // In either case, we don't want to call the event handler if the value
      // is changed from JS so we redefine a setter for `.value` that updates
      // our activeElementValue variable, allowing us to ignore those changes
      //
      // stopWatching() should be a noop here but we call it just in case we
      // missed a blur event somehow.
      stopWatchingForValueChange();
      startWatchingForValueChange(target, targetInst);
    } else if (topLevelType === TOP_BLUR) {
      stopWatchingForValueChange();
    }
  } // For IE8 and IE9.


  function getTargetInstForInputEventPolyfill(topLevelType, targetInst) {
    if (topLevelType === TOP_SELECTION_CHANGE || topLevelType === TOP_KEY_UP || topLevelType === TOP_KEY_DOWN) {
      // On the selectionchange event, the target is just document which isn't
      // helpful for us so just check activeElement instead.
      //
      // 99% of the time, keydown and keyup aren't necessary. IE8 fails to fire
      // propertychange on the first input event after setting `value` from a
      // script and fires only keydown, keypress, keyup. Catching keyup usually
      // gets it and catching keydown lets us fire an event for the first
      // keystroke if user does a key repeat (it'll be a little delayed: right
      // before the second keystroke). Other input methods (e.g., paste) seem to
      // fire selectionchange normally.
      return getInstIfValueChanged(activeElementInst);
    }
  }
  /**
   * SECTION: handle `click` event
   */


  function shouldUseClickEvent(elem) {
    // Use the `click` event to detect changes to checkbox and radio inputs.
    // This approach works across all browsers, whereas `change` does not fire
    // until `blur` in IE8.
    var nodeName = elem.nodeName;
    return nodeName && nodeName.toLowerCase() === 'input' && (elem.type === 'checkbox' || elem.type === 'radio');
  }

  function getTargetInstForClickEvent(topLevelType, targetInst) {
    if (topLevelType === TOP_CLICK) {
      return getInstIfValueChanged(targetInst);
    }
  }

  function getTargetInstForInputOrChangeEvent(topLevelType, targetInst) {
    if (topLevelType === TOP_INPUT || topLevelType === TOP_CHANGE) {
      return getInstIfValueChanged(targetInst);
    }
  }

  function handleControlledInputBlur(node) {
    var state = node._wrapperState;

    if (!state || !state.controlled || node.type !== 'number') {
      return;
    }

    {
      // If controlled, assign the value attribute to the current value on blur
      setDefaultValue(node, 'number', node.value);
    }
  }
  /**
   * This plugin creates an `onChange` event that normalizes change events
   * across form elements. This event fires at a time when it's possible to
   * change the element's value without seeing a flicker.
   *
   * Supported elements are:
   * - input (see `isTextInputElement`)
   * - textarea
   * - select
   */


  var ChangeEventPlugin = {
    eventTypes: eventTypes$1,
    _isInputEventSupported: isInputEventSupported,
    extractEvents: function (topLevelType, targetInst, nativeEvent, nativeEventTarget, eventSystemFlags) {
      var targetNode = targetInst ? getNodeFromInstance$1(targetInst) : window;
      var getTargetInstFunc, handleEventFunc;

      if (shouldUseChangeEvent(targetNode)) {
        getTargetInstFunc = getTargetInstForChangeEvent;
      } else if (isTextInputElement(targetNode)) {
        if (isInputEventSupported) {
          getTargetInstFunc = getTargetInstForInputOrChangeEvent;
        } else {
          getTargetInstFunc = getTargetInstForInputEventPolyfill;
          handleEventFunc = handleEventsForInputEventPolyfill;
        }
      } else if (shouldUseClickEvent(targetNode)) {
        getTargetInstFunc = getTargetInstForClickEvent;
      }

      if (getTargetInstFunc) {
        var inst = getTargetInstFunc(topLevelType, targetInst);

        if (inst) {
          var event = createAndAccumulateChangeEvent(inst, nativeEvent, nativeEventTarget);
          return event;
        }
      }

      if (handleEventFunc) {
        handleEventFunc(topLevelType, targetNode, targetInst);
      } // When blurring, set the value attribute for number inputs


      if (topLevelType === TOP_BLUR) {
        handleControlledInputBlur(targetNode);
      }
    }
  };

  var SyntheticUIEvent = SyntheticEvent.extend({
    view: null,
    detail: null
  });

  /**
   * Translation from modifier key to the associated property in the event.
   * @see http://www.w3.org/TR/DOM-Level-3-Events/#keys-Modifiers
   */
  var modifierKeyToProp = {
    Alt: 'altKey',
    Control: 'ctrlKey',
    Meta: 'metaKey',
    Shift: 'shiftKey'
  }; // Older browsers (Safari <= 10, iOS Safari <= 10.2) do not support
  // getModifierState. If getModifierState is not supported, we map it to a set of
  // modifier keys exposed by the event. In this case, Lock-keys are not supported.

  function modifierStateGetter(keyArg) {
    var syntheticEvent = this;
    var nativeEvent = syntheticEvent.nativeEvent;

    if (nativeEvent.getModifierState) {
      return nativeEvent.getModifierState(keyArg);
    }

    var keyProp = modifierKeyToProp[keyArg];
    return keyProp ? !!nativeEvent[keyProp] : false;
  }

  function getEventModifierState(nativeEvent) {
    return modifierStateGetter;
  }

  var previousScreenX = 0;
  var previousScreenY = 0; // Use flags to signal movementX/Y has already been set

  var isMovementXSet = false;
  var isMovementYSet = false;
  /**
   * @interface MouseEvent
   * @see http://www.w3.org/TR/DOM-Level-3-Events/
   */

  var SyntheticMouseEvent = SyntheticUIEvent.extend({
    screenX: null,
    screenY: null,
    clientX: null,
    clientY: null,
    pageX: null,
    pageY: null,
    ctrlKey: null,
    shiftKey: null,
    altKey: null,
    metaKey: null,
    getModifierState: getEventModifierState,
    button: null,
    buttons: null,
    relatedTarget: function (event) {
      return event.relatedTarget || (event.fromElement === event.srcElement ? event.toElement : event.fromElement);
    },
    movementX: function (event) {
      if ('movementX' in event) {
        return event.movementX;
      }

      var screenX = previousScreenX;
      previousScreenX = event.screenX;

      if (!isMovementXSet) {
        isMovementXSet = true;
        return 0;
      }

      return event.type === 'mousemove' ? event.screenX - screenX : 0;
    },
    movementY: function (event) {
      if ('movementY' in event) {
        return event.movementY;
      }

      var screenY = previousScreenY;
      previousScreenY = event.screenY;

      if (!isMovementYSet) {
        isMovementYSet = true;
        return 0;
      }

      return event.type === 'mousemove' ? event.screenY - screenY : 0;
    }
  });

  /**
   * @interface PointerEvent
   * @see http://www.w3.org/TR/pointerevents/
   */

  var SyntheticPointerEvent = SyntheticMouseEvent.extend({
    pointerId: null,
    width: null,
    height: null,
    pressure: null,
    tangentialPressure: null,
    tiltX: null,
    tiltY: null,
    twist: null,
    pointerType: null,
    isPrimary: null
  });

  var eventTypes$2 = {
    mouseEnter: {
      registrationName: 'onMouseEnter',
      dependencies: [TOP_MOUSE_OUT, TOP_MOUSE_OVER]
    },
    mouseLeave: {
      registrationName: 'onMouseLeave',
      dependencies: [TOP_MOUSE_OUT, TOP_MOUSE_OVER]
    },
    pointerEnter: {
      registrationName: 'onPointerEnter',
      dependencies: [TOP_POINTER_OUT, TOP_POINTER_OVER]
    },
    pointerLeave: {
      registrationName: 'onPointerLeave',
      dependencies: [TOP_POINTER_OUT, TOP_POINTER_OVER]
    }
  };
  var EnterLeaveEventPlugin = {
    eventTypes: eventTypes$2,

    /**
     * For almost every interaction we care about, there will be both a top-level
     * `mouseover` and `mouseout` event that occurs. Only use `mouseout` so that
     * we do not extract duplicate events. However, moving the mouse into the
     * browser from outside will not fire a `mouseout` event. In this case, we use
     * the `mouseover` top-level event.
     */
    extractEvents: function (topLevelType, targetInst, nativeEvent, nativeEventTarget, eventSystemFlags) {
      var isOverEvent = topLevelType === TOP_MOUSE_OVER || topLevelType === TOP_POINTER_OVER;
      var isOutEvent = topLevelType === TOP_MOUSE_OUT || topLevelType === TOP_POINTER_OUT;

      if (isOverEvent && (eventSystemFlags & IS_REPLAYED) === 0 && (nativeEvent.relatedTarget || nativeEvent.fromElement)) {
        // If this is an over event with a target, then we've already dispatched
        // the event in the out event of the other target. If this is replayed,
        // then it's because we couldn't dispatch against this target previously
        // so we have to do it now instead.
        return null;
      }

      if (!isOutEvent && !isOverEvent) {
        // Must not be a mouse or pointer in or out - ignoring.
        return null;
      }

      var win;

      if (nativeEventTarget.window === nativeEventTarget) {
        // `nativeEventTarget` is probably a window object.
        win = nativeEventTarget;
      } else {
        // TODO: Figure out why `ownerDocument` is sometimes undefined in IE8.
        var doc = nativeEventTarget.ownerDocument;

        if (doc) {
          win = doc.defaultView || doc.parentWindow;
        } else {
          win = window;
        }
      }

      var from;
      var to;

      if (isOutEvent) {
        from = targetInst;
        var related = nativeEvent.relatedTarget || nativeEvent.toElement;
        to = related ? getClosestInstanceFromNode(related) : null;

        if (to !== null) {
          var nearestMounted = getNearestMountedFiber(to);

          if (to !== nearestMounted || to.tag !== HostComponent && to.tag !== HostText) {
            to = null;
          }
        }
      } else {
        // Moving to a node from outside the window.
        from = null;
        to = targetInst;
      }

      if (from === to) {
        // Nothing pertains to our managed components.
        return null;
      }

      var eventInterface, leaveEventType, enterEventType, eventTypePrefix;

      if (topLevelType === TOP_MOUSE_OUT || topLevelType === TOP_MOUSE_OVER) {
        eventInterface = SyntheticMouseEvent;
        leaveEventType = eventTypes$2.mouseLeave;
        enterEventType = eventTypes$2.mouseEnter;
        eventTypePrefix = 'mouse';
      } else if (topLevelType === TOP_POINTER_OUT || topLevelType === TOP_POINTER_OVER) {
        eventInterface = SyntheticPointerEvent;
        leaveEventType = eventTypes$2.pointerLeave;
        enterEventType = eventTypes$2.pointerEnter;
        eventTypePrefix = 'pointer';
      }

      var fromNode = from == null ? win : getNodeFromInstance$1(from);
      var toNode = to == null ? win : getNodeFromInstance$1(to);
      var leave = eventInterface.getPooled(leaveEventType, from, nativeEvent, nativeEventTarget);
      leave.type = eventTypePrefix + 'leave';
      leave.target = fromNode;
      leave.relatedTarget = toNode;
      var enter = eventInterface.getPooled(enterEventType, to, nativeEvent, nativeEventTarget);
      enter.type = eventTypePrefix + 'enter';
      enter.target = toNode;
      enter.relatedTarget = fromNode;
      accumulateEnterLeaveDispatches(leave, enter, from, to); // If we are not processing the first ancestor, then we
      // should not process the same nativeEvent again, as we
      // will have already processed it in the first ancestor.

      if ((eventSystemFlags & IS_FIRST_ANCESTOR) === 0) {
        return [leave];
      }

      return [leave, enter];
    }
  };

  /**
   * inlined Object.is polyfill to avoid requiring consumers ship their own
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
   */
  function is(x, y) {
    return x === y && (x !== 0 || 1 / x === 1 / y) || x !== x && y !== y // eslint-disable-line no-self-compare
    ;
  }

  var objectIs = typeof Object.is === 'function' ? Object.is : is;

  var hasOwnProperty$2 = Object.prototype.hasOwnProperty;
  /**
   * Performs equality by iterating through keys on an object and returning false
   * when any key has values which are not strictly equal between the arguments.
   * Returns true when the values of all keys are strictly equal.
   */

  function shallowEqual(objA, objB) {
    if (objectIs(objA, objB)) {
      return true;
    }

    if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
      return false;
    }

    var keysA = Object.keys(objA);
    var keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) {
      return false;
    } // Test for A's keys different from B.


    for (var i = 0; i < keysA.length; i++) {
      if (!hasOwnProperty$2.call(objB, keysA[i]) || !objectIs(objA[keysA[i]], objB[keysA[i]])) {
        return false;
      }
    }

    return true;
  }

  var skipSelectionChangeEvent = canUseDOM && 'documentMode' in document && document.documentMode <= 11;
  var eventTypes$3 = {
    select: {
      phasedRegistrationNames: {
        bubbled: 'onSelect',
        captured: 'onSelectCapture'
      },
      dependencies: [TOP_BLUR, TOP_CONTEXT_MENU, TOP_DRAG_END, TOP_FOCUS, TOP_KEY_DOWN, TOP_KEY_UP, TOP_MOUSE_DOWN, TOP_MOUSE_UP, TOP_SELECTION_CHANGE]
    }
  };
  var activeElement$1 = null;
  var activeElementInst$1 = null;
  var lastSelection = null;
  var mouseDown = false;
  /**
   * Get an object which is a unique representation of the current selection.
   *
   * The return value will not be consistent across nodes or browsers, but
   * two identical selections on the same node will return identical objects.
   *
   * @param {DOMElement} node
   * @return {object}
   */

  function getSelection$1(node) {
    if ('selectionStart' in node && hasSelectionCapabilities(node)) {
      return {
        start: node.selectionStart,
        end: node.selectionEnd
      };
    } else {
      var win = node.ownerDocument && node.ownerDocument.defaultView || window;
      var selection = win.getSelection();
      return {
        anchorNode: selection.anchorNode,
        anchorOffset: selection.anchorOffset,
        focusNode: selection.focusNode,
        focusOffset: selection.focusOffset
      };
    }
  }
  /**
   * Get document associated with the event target.
   *
   * @param {object} nativeEventTarget
   * @return {Document}
   */


  function getEventTargetDocument(eventTarget) {
    return eventTarget.window === eventTarget ? eventTarget.document : eventTarget.nodeType === DOCUMENT_NODE ? eventTarget : eventTarget.ownerDocument;
  }
  /**
   * Poll selection to see whether it's changed.
   *
   * @param {object} nativeEvent
   * @param {object} nativeEventTarget
   * @return {?SyntheticEvent}
   */


  function constructSelectEvent(nativeEvent, nativeEventTarget) {
    // Ensure we have the right element, and that the user is not dragging a
    // selection (this matches native `select` event behavior). In HTML5, select
    // fires only on input and textarea thus if there's no focused element we
    // won't dispatch.
    var doc = getEventTargetDocument(nativeEventTarget);

    if (mouseDown || activeElement$1 == null || activeElement$1 !== getActiveElement(doc)) {
      return null;
    } // Only fire when selection has actually changed.


    var currentSelection = getSelection$1(activeElement$1);

    if (!lastSelection || !shallowEqual(lastSelection, currentSelection)) {
      lastSelection = currentSelection;
      var syntheticEvent = SyntheticEvent.getPooled(eventTypes$3.select, activeElementInst$1, nativeEvent, nativeEventTarget);
      syntheticEvent.type = 'select';
      syntheticEvent.target = activeElement$1;
      accumulateTwoPhaseDispatches(syntheticEvent);
      return syntheticEvent;
    }

    return null;
  }
  /**
   * This plugin creates an `onSelect` event that normalizes select events
   * across form elements.
   *
   * Supported elements are:
   * - input (see `isTextInputElement`)
   * - textarea
   * - contentEditable
   *
   * This differs from native browser implementations in the following ways:
   * - Fires on contentEditable fields as well as inputs.
   * - Fires for collapsed selection.
   * - Fires after user input.
   */


  var SelectEventPlugin = {
    eventTypes: eventTypes$3,
    extractEvents: function (topLevelType, targetInst, nativeEvent, nativeEventTarget, eventSystemFlags, container) {
      var containerOrDoc = container || getEventTargetDocument(nativeEventTarget); // Track whether all listeners exists for this plugin. If none exist, we do
      // not extract events. See #3639.

      if (!containerOrDoc || !isListeningToAllDependencies('onSelect', containerOrDoc)) {
        return null;
      }

      var targetNode = targetInst ? getNodeFromInstance$1(targetInst) : window;

      switch (topLevelType) {
        // Track the input node that has focus.
        case TOP_FOCUS:
          if (isTextInputElement(targetNode) || targetNode.contentEditable === 'true') {
            activeElement$1 = targetNode;
            activeElementInst$1 = targetInst;
            lastSelectio