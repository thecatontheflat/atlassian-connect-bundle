;
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var ATTR_IGNORE = exports.ATTR_IGNORE = "data-skate-ignore";
},{}],2:[function(require,module,exports){
"use strict";

exports.default = {
  /**
   * Adds data to the element.
   *
   * @param {Element} element The element to get data from.
   * @param {String} name The name of the data to return.
   *
   * @returns {Mixed}
   */
  get: function (element, name) {
    if (element.__SKATE_DATA) {
      return element.__SKATE_DATA[name];
    }
  },

  /**
   * Adds data to the element.
   *
   * @param {Element} element The element to apply data to.
   * @param {String} name The name of the data.
   * @param {Mixed} value The data value.
   *
   * @returns {undefined}
   */
  set: function (element, name, value) {
    if (!element.__SKATE_DATA) {
      element.__SKATE_DATA = {};
    }

    element.__SKATE_DATA[name] = value;

    return element;
  }
};
},{}],3:[function(require,module,exports){
"use strict";

var globals = require('./globals').default;
var initElements = require('./lifecycle').initElements;
var removeElements = require('./lifecycle').removeElements;
var MutationObserver = require('./mutation-observer').default;
var getClosestIgnoredElement = require('./utils').getClosestIgnoredElement;

/**
 * The document observer handler.
 *
 * @param {Array} mutations The mutations to handle.
 *
 * @returns {undefined}
 */
function documentObserverHandler(mutations) {
  var mutationsLen = mutations.length;

  for (var a = 0; a < mutationsLen; a++) {
    var mutation = mutations[a];
    var addedNodes = mutation.addedNodes;
    var removedNodes = mutation.removedNodes;

    // Since siblings are batched together, we check the first node's parent
    // node to see if it is ignored. If it is then we don't process any added
    // nodes. This prevents having to check every node.
    if (addedNodes && addedNodes.length && !getClosestIgnoredElement(addedNodes[0].parentNode)) {
      initElements(addedNodes);
    }

    // We can't check batched nodes here because they won't have a parent node.
    if (removedNodes && removedNodes.length) {
      removeElements(removedNodes);
    }
  }
}

/**
 * Creates a new mutation observer for listening to Skate definitions for the
 * document.
 *
 * @param {Element} root The element to observe.
 *
 * @returns {MutationObserver}
 */
function createDocumentObserver() {
  var observer = new MutationObserver(documentObserverHandler);

  // Observe after the DOM content has loaded.
  observer.observe(document, {
    childList: true,
    subtree: true
  });

  return observer;
}

exports.default = {
  register: function (fixIe) {
    // IE has issues with reporting removedNodes correctly. See the polyfill for
    // details. If we fix IE, we must also re-define the document observer.
    if (fixIe) {
      MutationObserver.fixIe();
      this.unregister();
    }

    if (!globals.observer) {
      globals.observer = createDocumentObserver();
    }

    return this;
  },

  unregister: function () {
    if (globals.observer) {
      globals.observer.disconnect();
      globals.observer = undefined;
    }

    return this;
  }
};
},{"./globals":4,"./lifecycle":5,"./mutation-observer":6,"./utils":9}],4:[function(require,module,exports){
"use strict";

if (!window.__skate) {
  window.__skate = {
    observer: undefined,
    registry: {}
  };
}

exports.default = window.__skate;
},{}],5:[function(require,module,exports){
"use strict";

var ATTR_IGNORE = require('./constants').ATTR_IGNORE;
var data = require('./data').default;
var MutationObserver = require('./mutation-observer').default;
var registry = require('./registry').default;
var inherit = require('./utils').inherit;
var objEach = require('./utils').objEach;

var elProto = window.HTMLElement.prototype;
var matchesSelector = (elProto.matches || elProto.msMatchesSelector || elProto.webkitMatchesSelector || elProto.mozMatchesSelector || elProto.oMatchesSelector);

function getLifecycleFlag(target, component, name) {
  return data.get(target, component.id + ":lifecycle:" + name);
}

function setLifecycleFlag(target, component, name, value) {
  data.set(target, component.id + ":lifecycle:" + name, !!value);
}

function ensureLifecycleFlag(target, component, name) {
  if (getLifecycleFlag(target, component, name)) {
    return true;
  }
  setLifecycleFlag(target, component, name, true);
  return false;
}

/**
 * Parses an event definition and returns information about it.
 *
 * @param {String} e The event to parse.
 *
 * @returns {Object]}
 */
function parseEvent(e) {
  var parts = e.split(" ");
  return {
    name: parts.shift(),
    delegate: parts.join(" ")
  };
}

/**
 * Binds attribute listeners for the specified attribute handlers.
 *
 * @param {Element} target The component element.
 * @param {Object} component The component data.
 *
 * @returns {undefined}
 */
function addAttributeListeners(target, component) {
  function triggerCallback(type, name, newValue, oldValue) {
    var callback;

    if (component.attributes && component.attributes[name] && typeof component.attributes[name][type] === "function") {
      callback = component.attributes[name][type];
    } else if (component.attributes && typeof component.attributes[name] === "function") {
      callback = component.attributes[name];
    } else if (typeof component.attributes === "function") {
      callback = component.attributes;
    }

    // There may still not be a callback.
    if (callback) {
      callback(target, {
        type: type,
        name: name,
        newValue: newValue,
        oldValue: oldValue
      });
    }
  }

  var a;
  var attrs = target.attributes;
  var attrsCopy = [];
  var attrsLen = attrs.length;
  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      var type;
      var name = mutation.attributeName;
      var attr = attrs[name];

      if (attr && mutation.oldValue === null) {
        type = "created";
      } else if (attr && mutation.oldValue !== null) {
        type = "updated";
      } else if (!attr) {
        type = "removed";
      }

      triggerCallback(type, name, attr ? (attr.value || attr.nodeValue) : undefined, mutation.oldValue);
    });
  });

  observer.observe(target, {
    attributes: true,
    attributeOldValue: true
  });

  // This is actually faster than [].slice.call(attrs).
  for (a = 0; a < attrsLen; a++) {
    attrsCopy.push(attrs[a]);
  }

  // In default web components, attribute changes aren't triggered for
  // attributes that already exist on an element when it is bound. This sucks
  // when you want to reuse and separate code for attributes away from your
  // lifecycle callbacks. Skate will initialise each attribute by calling the
  // created callback for the attributes that already exist on the element.
  for (a = 0; a < attrsLen; a++) {
    var attr = attrsCopy[a];
    triggerCallback("created", attr.nodeName, (attr.value || attr.nodeValue));
  }
}

/**
 * Binds event listeners for the specified event handlers.
 *
 * @param {Element} target The component element.
 * @param {Object} component The component data.
 *
 * @returns {undefined}
 */
function addEventListeners(target, component) {
  if (typeof component.events !== "object") {
    return;
  }

  function makeHandler(handler, delegate) {
    return function (e) {
      // If we're not delegating, trigger directly on the component element.
      if (!delegate) {
        return handler(target, e, target);
      }

      // If we're delegating, but the target doesn't match, then we've have
      // to go up the tree until we find a matching ancestor or stop at the
      // component element, or document. If a matching ancestor is found, the
      // handler is triggered on it.
      var current = e.target;

      while (current && current !== document && current !== target.parentNode) {
        if (matchesSelector.call(current, delegate)) {
          return handler(target, e, current);
        }

        current = current.parentNode;
      }
    };
  }

  objEach(component.events, function (handler, name) {
    var evt = parseEvent(name);
    var useCapture = !!evt.delegate && (evt.name === "blur" || evt.name === "focus");
    target.addEventListener(evt.name, makeHandler(handler, evt.delegate), useCapture);
  });
}

/**
 * Triggers the created lifecycle callback.
 *
 * @param {Element} target The component element.
 * @param {Object} component The component data.
 *
 * @returns {undefined}
 */
function triggerCreated(target, component) {
  if (ensureLifecycleFlag(target, component, "created")) {
    return;
  }

  inherit(target, component.prototype, true);

  if (component.template) {
    component.template(target);
  }

  addEventListeners(target, component);
  addAttributeListeners(target, component);

  if (component.created) {
    component.created(target);
  }
}

/**
 * Triggers the attached lifecycle callback.
 *
 * @param {Element} target The component element.
 * @param {Object} component The component data.
 *
 * @returns {undefined}
 */
function triggerAttached(target, component) {
  if (ensureLifecycleFlag(target, component, "attached")) {
    return;
  }

  target.removeAttribute(component.unresolvedAttribute);
  target.setAttribute(component.resolvedAttribute, "");

  if (component.attached) {
    component.attached(target);
  }
}

/**
 * Triggers the detached lifecycle callback.
 *
 * @param {Element} target The component element.
 * @param {Object} component The component data.
 *
 * @returns {undefined}
 */
function triggerDetached(target, component) {
  if (component.detached) {
    component.detached(target);
  }

  setLifecycleFlag(target, component, "attached", false);
}

/**
 * Triggers the entire element lifecycle if it's not being ignored.
 *
 * @param {Element} target The component element.
 * @param {Object} component The component data.
 *
 * @returns {undefined}
 */
function triggerLifecycle(target, component) {
  triggerCreated(target, component);
  triggerAttached(target, component);
}

/**
 * Initialises a set of elements.
 *
 * @param {DOMNodeList | Array} elements A traversable set of elements.
 *
 * @returns {undefined}
 */
function initElements(elements) {
  var elementsLen = elements.length;

  for (var a = 0; a < elementsLen; a++) {
    var element = elements[a];

    if (element.nodeType !== 1 || element.attributes[ATTR_IGNORE]) {
      continue;
    }

    var currentNodeDefinitions = registry.getForElement(element);
    var currentNodeDefinitionsLength = currentNodeDefinitions.length;

    for (var b = 0; b < currentNodeDefinitionsLength; b++) {
      triggerLifecycle(element, currentNodeDefinitions[b]);
    }

    var elementChildNodes = element.childNodes;
    var elementChildNodesLen = elementChildNodes.length;

    if (elementChildNodesLen) {
      initElements(elementChildNodes);
    }
  }
}

/**
 * Triggers the remove lifecycle callback on all of the elements.
 *
 * @param {DOMNodeList} elements The elements to trigger the remove lifecycle
 * callback on.
 *
 * @returns {undefined}
 */
function removeElements(elements) {
  var len = elements.length;

  for (var a = 0; a < len; a++) {
    var element = elements[a];

    if (element.nodeType !== 1) {
      continue;
    }

    removeElements(element.childNodes);

    var definitions = registry.getForElement(element);
    var definitionsLen = definitions.length;

    for (var b = 0; b < definitionsLen; b++) {
      triggerDetached(element, definitions[b]);
    }
  }
}

exports.triggerCreated = triggerCreated;
exports.initElements = initElements;
exports.removeElements = removeElements;
},{"./constants":1,"./data":2,"./mutation-observer":6,"./registry":7,"./utils":9}],6:[function(require,module,exports){
"use strict";

var debounce = require('./utils').debounce;
var objEach = require('./utils').objEach;

var elProto = window.HTMLElement.prototype;
var elProtoContains = window.HTMLElement.prototype.contains;
var NativeMutationObserver = window.MutationObserver || window.WebkitMutationObserver || window.MozMutationObserver;
var isFixingIe = false;
var isIe = window.navigator.userAgent.indexOf("Trident") > -1;

/**
 * Returns whether or not the source element contains the target element.
 * This is for browsers that don't support Element.prototype.contains on an
 * HTMLUnknownElement.
 *
 * @param {HTMLElement} source The source element.
 * @param {HTMLElement} target The target element.
 *
 * @returns {Boolean}
 */
function elementContains(source, target) {
  if (source.nodeType !== 1) {
    return false;
  }

  return source.contains ? source.contains(target) : elProtoContains.call(source, target);
}

/**
 * Creates a new mutation record.
 *
 * @param {Element} target The HTML element that was affected.
 * @param {String} type The type of mutation.
 *
 * @returns {Object}
 */
function newMutationRecord(target, type) {
  return {
    addedNodes: null,
    attributeName: null,
    attributeNamespace: null,
    nextSibling: null,
    oldValue: null,
    previousSibling: null,
    removedNodes: null,
    target: target,
    type: type || "childList"
  };
}

/**
 * Takes an element and recursively saves it's tree structure on each element so
 * that they can be restored later after IE screws things up.
 *
 * @param {Node} node The node to save the tree for.
 *
 * @returns {undefined}
 */
function walkTree(node, cb) {
  var childNodes = node.childNodes;

  if (!childNodes) {
    return;
  }

  var childNodesLen = childNodes.length;

  for (var a = 0; a < childNodesLen; a++) {
    var childNode = childNodes[a];
    cb(childNode);
    walkTree(childNode, cb);
  }
}

// Mutation Observer "Polyfill"
// ----------------------------

/**
 * This "polyfill" only polyfills what we need for Skate to function. It
 * batches updates and does the bare minimum during synchronous operation
 * which make mutation event performance bearable. The rest is batched on the
 * next tick. Like mutation observers, each mutation is divided into sibling
 * groups for each parent that had mutations. All attribute mutations are
 * batched into separate records regardless of the element they occured on.
 *
 * @param {Function} callback The callback to execute with the mutation info.
 *
 * @returns {undefined}
 */
function MutationObserver(callback) {
  if (NativeMutationObserver && !isFixingIe) {
    return new NativeMutationObserver(callback);
  }

  this.callback = callback;
  this.elements = [];
}

/**
 * IE 11 has a bug that prevents descendant nodes from being reported as removed
 * to a mutation observer in IE 11 if an ancestor node's innerHTML is reset.
 * This same bug also happens when using Mutation Events in IE 9 / 10. Because of
 * this, we must ensure that observers and events get triggered properly on
 * those descendant nodes. In order to do this we have to override `innerHTML`
 * and then manually trigger an event.
 *
 * See: https://connect.microsoft.com/IE/feedback/details/817132/ie-11-childnodes-are-missing-from-mutationobserver-mutations-removednodes-after-setting-innerhtml
 *
 * @returns {undefined}
 */
MutationObserver.fixIe = function () {
  // Fix once only if we need to.
  if (!isIe || isFixingIe) {
    return;
  }

  // We have to call the old innerHTML getter and setter.
  var oldInnerHtml = Object.getOwnPropertyDescriptor(elProto, "innerHTML");

  // This redefines the innerHTML property so that we can ensure that events
  // are properly triggered.
  Object.defineProperty(elProto, "innerHTML", {
    get: function () {
      return oldInnerHtml.get.call(this);
    },
    set: function (html) {
      walkTree(this, function (node) {
        var mutationEvent = document.createEvent("MutationEvent");
        mutationEvent.initMutationEvent("DOMNodeRemoved", true, false, null, null, null, null, null);
        node.dispatchEvent(mutationEvent);
      });

      oldInnerHtml.set.call(this, html);
    }
  });

  // Flag so the polyfill is used for all subsequent Mutation Observer objects.
  isFixingIe = true;
};

Object.defineProperty(MutationObserver, "isFixingIe", {
  get: function () {
    return isFixingIe;
  }
});

MutationObserver.prototype = {
  observe: function (target, options) {
    function addEventToBatch(e) {
      batchedEvents.push(e);
      batchEvents();
    }

    function batchEvent(e) {
      var eTarget = e.target;

      // In some test environments, e.target has been nulled after the tests
      // are done and a batch is still processing.
      if (!eTarget) {
        return;
      }

      var eType = e.type;
      var eTargetParent = eTarget.parentNode;

      if (!canTriggerInsertOrRemove(eTargetParent)) {
        return;
      }

      // The same bug that affects IE 11 also affects IE 9 / 10 with Mutation
      // Events.
      //
      // IE 11 bug: https://connect.microsoft.com/IE/feedback/details/817132/ie-11-childnodes-are-missing-from-mutationobserver-mutations-removednodes-after-setting-innerhtml
      var shouldWorkAroundIeRemoveBug = isFixingIe && eType === "DOMNodeRemoved";
      var isDescendant = lastBatchedElement && elementContains(lastBatchedElement, eTarget);

      // This checks to see if the element is contained in the last batched
      // element. If it is, then we don't batch it because elements are
      // batched into first-children of a given parent. However, IE is (of
      // course) an exception to this and destroys the DOM tree heirarchy
      // before the callback gets fired if the element was removed. Because of
      // this, we have to let through all descendants that had the event
      // triggered on it.
      if (!shouldWorkAroundIeRemoveBug && isDescendant) {
        return;
      }

      if (!lastBatchedRecord || lastBatchedRecord.target !== eTargetParent) {
        batchedRecords.push(lastBatchedRecord = newMutationRecord(eTargetParent));
      }

      if (eType === "DOMNodeInserted") {
        if (!lastBatchedRecord.addedNodes) {
          lastBatchedRecord.addedNodes = [];
        }

        lastBatchedRecord.addedNodes.push(eTarget);
      } else {
        if (!lastBatchedRecord.removedNodes) {
          lastBatchedRecord.removedNodes = [];
        }

        lastBatchedRecord.removedNodes.push(eTarget);
      }

      lastBatchedElement = eTarget;
    }

    function canTriggerAttributeModification(eTarget) {
      return options.attributes && (options.subtree || eTarget === target);
    }

    function canTriggerInsertOrRemove(eTargetParent) {
      return options.childList && (options.subtree || eTargetParent === target);
    }

    var that = this;

    // Batching insert and remove.
    var lastBatchedElement;
    var lastBatchedRecord;
    var batchedEvents = [];
    var batchedRecords = [];
    var batchEvents = debounce(function () {
      var batchedEventsLen = batchedEvents.length;

      for (var a = 0; a < batchedEventsLen; a++) {
        batchEvent(batchedEvents[a]);
      }

      that.callback(batchedRecords);
      batchedEvents = [];
      batchedRecords = [];
      lastBatchedElement = undefined;
      lastBatchedRecord = undefined;
    });

    // Batching attributes.
    var attributeOldValueCache = {};
    var attributeMutations = [];
    var batchAttributeMods = debounce(function () {
      // We keep track of the old length just in case attributes are
      // modified within a handler.
      var len = attributeMutations.length;

      // Call the handler with the current modifications.
      that.callback(attributeMutations);

      // We remove only up to the current point just in case more
      // modifications were queued.
      attributeMutations.splice(0, len);
    });

    var observed = {
      target: target,
      options: options,
      insertHandler: addEventToBatch,
      removeHandler: addEventToBatch,
      attributeHandler: function (e) {
        var eTarget = e.target;

        if (!canTriggerAttributeModification(eTarget)) {
          return;
        }

        var eAttrName = e.attrName;
        var ePrevValue = e.prevValue;
        var eNewValue = e.newValue;
        var record = newMutationRecord(eTarget, "attributes");
        record.attributeName = eAttrName;

        if (options.attributeOldValue) {
          record.oldValue = attributeOldValueCache[eAttrName] || ePrevValue || null;
        }

        attributeMutations.push(record);

        // We keep track of old values so that when IE incorrectly reports
        // the old value we can ensure it is actually correct.
        if (options.attributeOldValue) {
          attributeOldValueCache[eAttrName] = eNewValue;
        }

        batchAttributeMods();
      }
    };

    this.elements.push(observed);

    if (options.childList) {
      target.addEventListener("DOMNodeInserted", observed.insertHandler);
      target.addEventListener("DOMNodeRemoved", observed.removeHandler);
    }

    if (options.attributes) {
      target.addEventListener("DOMAttrModified", observed.attributeHandler);
    }

    return this;
  },

  disconnect: function () {
    objEach(this.elements, function (observed) {
      observed.target.removeEventListener("DOMNodeInserted", observed.insertHandler);
      observed.target.removeEventListener("DOMNodeRemoved", observed.removeHandler);
      observed.target.removeEventListener("DOMAttrModified", observed.attributeHandler);
    });

    this.elements = [];

    return this;
  }
};

exports.default = MutationObserver;
},{"./utils":9}],7:[function(require,module,exports){
"use strict";

var globals = require('./globals').default;
var hasOwn = require('./utils').hasOwn;

/**
 * Returns the class list for the specified element.
 *
 * @param {Element} element The element to get the class list for.
 *
 * @returns {ClassList | Array}
 */
function getClassList(element) {
  var classList = element.classList;

  if (classList) {
    return classList;
  }

  var attrs = element.attributes;

  return (attrs["class"] && attrs["class"].nodeValue.split(/\s+/)) || [];
}

/**
 * Returns whether or not the specified definition can be bound using the
 * specified type.
 *
 * @param {String} id The definition ID.
 * @param {String} type The definition type.
 *
 * @returns {Boolean}
 */
function isDefinitionOfType(id, type) {
  return hasOwn(globals.registry, id) && globals.registry[id].type.indexOf(type) > -1;
}

exports.default = {
  clear: function () {
    globals.registry = {};
    return this;
  },

  getForElement: function (element) {
    var attrs = element.attributes;
    var attrsLen = attrs.length;
    var definitions = [];
    var isAttr = attrs.is;
    var isAttrValue = isAttr && (isAttr.value || isAttr.nodeValue);
    var tag = element.tagName.toLowerCase();
    var isAttrOrTag = isAttrValue || tag;
    var definition;
    var tagToExtend;

    if (isDefinitionOfType(isAttrOrTag, skate.types.TAG)) {
      definition = globals.registry[isAttrOrTag];
      tagToExtend = definition.extends;

      if (isAttrValue) {
        if (tag === tagToExtend) {
          definitions.push(definition);
        }
      } else if (!tagToExtend) {
        definitions.push(definition);
      }
    }

    for (var a = 0; a < attrsLen; a++) {
      var attr = attrs[a].nodeName;

      if (isDefinitionOfType(attr, skate.types.ATTR)) {
        definition = globals.registry[attr];
        tagToExtend = definition.extends;

        if (!tagToExtend || tag === tagToExtend) {
          definitions.push(definition);
        }
      }
    }

    var classList = getClassList(element);
    var classListLen = classList.length;

    for (var b = 0; b < classListLen; b++) {
      var className = classList[b];

      if (isDefinitionOfType(className, skate.types.CLASS)) {
        definition = globals.registry[className];
        tagToExtend = definition.extends;

        if (!tagToExtend || tag === tagToExtend) {
          definitions.push(definition);
        }
      }
    }

    return definitions;
  },

  has: function (id) {
    return hasOwn(globals.registry, id);
  },

  set: function (id, definition) {
    if (this.has(id)) {
      throw new Error("A definition of type \"" + definition.type + "\" with the ID of \"" + id + "\" already exists.");
    }

    globals.registry[id] = definition;

    return this;
  },

  remove: function (id) {
    if (this.has(id)) {
      delete globals.registry[id];
    }

    return this;
  }
};
},{"./globals":4,"./utils":9}],8:[function(require,module,exports){
"use strict";

var documentObserver = require('./document-observer').default;
var triggerCreated = require('./lifecycle').triggerCreated;
var initElements = require('./lifecycle').initElements;
var registry = require('./registry').default;
var debounce = require('./utils').debounce;
var inherit = require('./utils').inherit;
var version = require('./version').default;

/**
 * Initialises all valid elements in the document. Ensures that it does not
 * happen more than once in the same execution.
 *
 * @returns {undefined}
 */
var initDocument = debounce(function () {
  initElements(document.getElementsByTagName("html"));
});

/**
 * Creates a constructor for the specified definition.
 *
 * @param {Object} definition The definition information to use for generating the constructor.
 *
 * @returns {Function} The element constructor.
 */
function makeElementConstructor(definition) {
  function CustomElement() {
    var element;
    var tagToExtend = definition.extends;
    var definitionId = definition.id;

    if (tagToExtend) {
      element = document.createElement(tagToExtend);
      element.setAttribute("is", definitionId);
    } else {
      element = document.createElement(definitionId);
    }

    // Ensure the definition prototype is up to date with the element's
    // prototype. This ensures that overwriting the element prototype still
    // works.
    definition.prototype = CustomElement.prototype;

    // If they use the constructor we don't have to wait until it's attached.
    triggerCreated(element, definition);

    return element;
  }

  // This allows modifications to the element prototype propagate to the
  // definition prototype.
  CustomElement.prototype = definition.prototype;

  return CustomElement;
}

// Public API
// ----------

/**
 * Creates a listener for the specified definition.
 *
 * @param {String} id The ID of the definition.
 * @param {Object | Function} definition The definition definition.
 *
 * @returns {Function} Constructor that returns a custom element.
 */
function skate(id, definition) {
  // Set any defaults that weren't passed.
  definition = inherit(definition || {}, skate.defaults);

  // Set the definition ID for reference later.
  definition.id = id;

  // Definitions of a particular type must be unique.
  if (registry.has(definition.id)) {
    throw new Error("A definition of type \"" + definition.type + "\" with the ID of \"" + id + "\" already exists.");
  }

  // Register the definition.
  registry.set(definition.id, definition);

  // Initialise existing elements.
  initDocument();

  // Lazily initialise the document observer so we don't incur any overhead if
  // there's no definition listeners.
  documentObserver.register(definition.remove);

  // Only make and return an element constructor if it can be used as a custom
  // element.
  if (definition.type.indexOf(skate.types.TAG) > -1) {
    return makeElementConstructor(definition);
  }
}

/**
 * Synchronously initialises the specified element or elements and
 * descendants.
 *
 * @param {Mixed} nodes The node, or nodes to initialise. Can be anything:
 *                      jQuery, DOMNodeList, DOMNode, selector etc.
 *
 * @returns {skate}
 */
skate.init = function (nodes) {
  if (!nodes) {
    return;
  }

  if (typeof nodes === "string") {
    nodes = document.querySelectorAll(nodes);
  }

  initElements(typeof nodes.length === "undefined" ? [nodes] : nodes);

  return nodes;
};

// Restriction type constants.
skate.types = {
  ANY: "act",
  ATTR: "a",
  CLASS: "c",
  NOATTR: "ct",
  NOCLASS: "at",
  NOTAG: "ac",
  TAG: "t"
};

// Makes checking the version easy when debugging.
skate.version = version;

/**
 * The default options for a definition.
 *
 * @var {Object}
 */
skate.defaults = {
  // Attribute lifecycle callback or callbacks.
  attributes: undefined,

  // The events to manage the binding and unbinding of during the definition's
  // lifecycle.
  events: undefined,

  // Restricts a particular definition to binding explicitly to an element with
  // a tag name that matches the specified value.
  extends: "",

  // The ID of the definition. This is automatically set in the `skate()`
  // function.
  id: "",

  // Properties and methods to add to each element.
  prototype: {},

  // The attribute name to add after calling the created() callback.
  resolvedAttribute: "resolved",

  // The template to replace the content of the element with.
  template: undefined,

  // The type of bindings to allow.
  type: skate.types.ANY,

  // The attribute name to remove after calling the created() callback.
  unresolvedAttribute: "unresolved"
};

// Exporting
// ---------

// Always export the global. We don't know how consumers are using it and what
// their environments are like. Doing this affords them the flexibility of
// using it in an environment where module and non-module code may co-exist.
window.skate = skate;

// AMD
if (typeof define === "function") {
  define('aui/internal/skate',[],function () {
    return skate;
  });
}

// CommonJS
if (typeof exports === "object") {
  exports.default = skate;
}

exports.default = skate;
},{"./document-observer":3,"./lifecycle":5,"./registry":7,"./utils":9,"./version":10}],9:[function(require,module,exports){
"use strict";

exports.hasOwn = hasOwn;
exports.debounce = debounce;
exports.getClosestIgnoredElement = getClosestIgnoredElement;
exports.inherit = inherit;
exports.objEach = objEach;
"use strict";

var ATTR_IGNORE = require('./constants').ATTR_IGNORE;
function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function debounce(fn) {
  var called = false;

  return function () {
    if (!called) {
      called = true;
      setTimeout(function () {
        called = false;
        fn();
      }, 1);
    }
  };
}

function getClosestIgnoredElement(element) {
  var parent = element;

  while (parent && parent !== document) {
    if (parent.hasAttribute(ATTR_IGNORE)) {
      return parent;
    }

    parent = parent.parentNode;
  }
}

function inherit(child, parent, overwrite) {
  var names = Object.getOwnPropertyNames(parent);
  var namesLen = names.length;

  for (var a = 0; a < namesLen; a++) {
    var name = names[a];

    if (overwrite || child[name] === undefined) {
      var desc = Object.getOwnPropertyDescriptor(parent, name);
      var shouldDefineProps = desc.get || desc.set || !desc.writable || !desc.enumerable || !desc.configurable;

      if (shouldDefineProps) {
        Object.defineProperty(child, name, desc);
      } else {
        child[name] = parent[name];
      }
    }
  }

  return child;
}

function objEach(obj, fn) {
  for (var a in obj) {
    if (hasOwn(obj, a)) {
      fn(obj[a], a);
    }
  }
}
},{"./constants":1}],10:[function(require,module,exports){
"use strict";

exports.default = "0.11.1";
},{}]},{},[8]);

(function () {
  'use strict';



  var DocumentFragment = window.DocumentFragment;
  var elProto = window.HTMLElement.prototype;
  var matchesSelector = (
      elProto.matches ||
      elProto.msMatchesSelector ||
      elProto.webkitMatchesSelector ||
      elProto.mozMatchesSelector ||
      elProto.oMatchesSelector
    );



  /**
   * Adds data to the element.
   *
   * @param {Element} element The element to get data from.
   * @param {String} name The name of the data to return.
   *
   * @returns {Mixed}
   */
  function getData (element, name) {
    if (element.__SKATE_TEMPLATE_HTML_DATA) {
      return element.__SKATE_TEMPLATE_HTML_DATA[name];
    }
  }

  /**
   * Adds data to the element.
   *
   * @param {Element} element The element to apply data to.
   * @param {String} name The name of the data.
   * @param {Mixed} value The data value.
   *
   * @returns {undefined}
   */
  function setData (element, name, value) {
    if (!element.__SKATE_TEMPLATE_HTML_DATA) {
      element.__SKATE_TEMPLATE_HTML_DATA = {};
    }

    element.__SKATE_TEMPLATE_HTML_DATA[name] = value;

    return element;
  }

  /**
   * Creates a document fragment from the specified DOM string. It ensures that
   * if special nodes are passed in that they are added to a valid parent node
   * before importing to the document fragment.
   *
   * @param {String} domString The HTMl to create a fragment from.
   *
   * @returns {DocumentFragment}
   */
  function createFragmentFromString (domString) {
    var specialMap = {
        caption: 'table',
        dd: 'dl',
        dt: 'dl',
        li: 'ul',
        tbody: 'table',
        td: 'tr',
        thead: 'table',
        tr: 'tbody'
      };

    var frag = document.createDocumentFragment();
    var tag = domString.match(/\s*<([^\s>]+)/);
    var div = document.createElement(tag && specialMap[tag[1]] || 'div');

    div.innerHTML = domString;

    return createFragmentFromNodeList(div.childNodes);
  }

  /**
   * Creates a document fragment from an element's childNodes.
   *
   * @param {NodeList} nodeList
   */
  function createFragmentFromNodeList (nodeList) {
    var frag = document.createDocumentFragment();

    while (nodeList && nodeList.length) {
      frag.appendChild(nodeList[0]);
    }

    return frag;
  }

  /**
   * Returns the nodes between the start node and the end node.
   *
   * @param {Node} startNode The start node.
   * @param {Node} endNode The end node.
   *
   * @returns {Array}
   */
  function getNodesBetween (startNode, endNode) {
    var nodes = [];
    var nextNode = startNode.nextSibling;

    while (nextNode !== endNode) {
      nodes.push(nextNode);
      nextNode = nextNode.nextSibling;
    }

    return nodes;
  }

  /**
   * Finds direct children in the `sourceNode` that match the given selector.
   *
   * @param {Element} sourceNode The node to find the elements in.
   * @param {String} selector The selector to use. If not specified, all
   *                          `childNodes` are returned.
   *
   * @returns {NodeList}
   */
  function findChildrenMatchingSelector (sourceNode, selector) {
    if (selector) {
      var found = sourceNode.querySelectorAll(selector);
      var foundLength = found.length;
      var filtered = [];

      for (var a = 0; a < foundLength; a++) {
        var node = found[a];

        if (node.parentNode === sourceNode) {
          filtered.push(node);
        }
      }

      return filtered;
    }

    return [].slice.call(sourceNode.childNodes) || [];
  }

  /**
   * Returns an object with methods and properties that can be used to wrap an
   * element so that it behaves similar to a shadow root.
   *
   * @param {HTMLElement} element The original element to wrap.
   *
   * @returns {Object}
   */
  function htmlTemplateParentWrapper (element) {
    var contentNodes = getData(element, 'content');
    var contentNodesLen = contentNodes.length;

    return {
      childNodes: {
        get: function () {
          var nodes = [];

          for (var a = 0; a < contentNodesLen; a++) {
            var contentNode = contentNodes[a];

            if (contentNode.isDefault) {
              continue;
            }

            nodes = nodes.concat(getNodesBetween(contentNode.startNode, contentNode.endNode));
          }

          return nodes;
        }
      },

      firstChild: {
        get: function () {
          var childNodes = this.childNodes;
          return childNodes.length && childNodes[0] || null;
        }
      },

      innerHTML: {
        get: function () {
          var html = '';
          var childNodes = this.childNodes;
          var childNodesLen = childNodes.length;

          for (var a = 0; a < childNodesLen; a++) {
            var childNode = childNodes[a];
            html += childNode.outerHTML || childNode.textContent;
          }

          return html;
        },
        set: function (html) {
          var targetFragment = createFragmentFromString(html);

          for (var a = 0; a < contentNodesLen; a++) {
            var contentNode = contentNodes[a];
            var childNodes = getNodesBetween(contentNode.startNode, contentNode.endNode);

            // Remove all nodes (including default content).
            for (var b = 0; b < childNodes.length; b++) {
              var childNode = childNodes[b];
              childNode.parentNode.removeChild(childNode);
            }

            var foundNodes = findChildrenMatchingSelector(targetFragment, contentNode.selector);

            // Add any matched nodes from the given HTML.
            for (var c = 0; c < foundNodes.length; c++) {
              contentNode.container.insertBefore(foundNodes[c], contentNode.endNode);
            }

            // If no nodes were found, set the default content.
            if (foundNodes.length) {
              removeDefaultContent(contentNode);
            } else {
              addDefaultContent(contentNode);
            }
          }
        }
      },

      lastChild: {
        get: function () {
          for (var a = contentNodesLen - 1; a > -1; a--) {
            var contentNode = contentNodes[a];

            if (contentNode.isDefault) {
              continue;
            }

            var childNodes = this.childNodes;
            var childNodesLen = childNodes.length;

            return childNodes[childNodesLen - 1];
          }

          return null;
        }
      },

      outerHTML: {
        get: function () {
          var name = this.tagName.toLowerCase();
          var html = '<' + name;
          var attrs = this.attributes;

          if (attrs) {
            var attrsLength = attrs.length;

            for (var a = 0; a < attrsLength; a++) {
              var attr = attrs[a];
              html += ' ' + attr.nodeName + '="' + attr.nodeValue + '"';
            }
          }

          html += '>';
          html += this.innerHTML;
          html += '</' + name + '>';

          return html;
        }
      },

      textContent: {
        get: function () {
          var textContent = '';
          var childNodes = this.childNodes;
          var childNodesLength = this.childNodes.length;

          for (var a = 0; a < childNodesLength; a++) {
            textContent += childNodes[a].textContent;
          }

          return textContent;
        },
        set: function (textContent) {
          var acceptsTextContent;

          // Removes all nodes (including default content).
          this.innerHTML = '';

          // Find the first content node without a selector.
          for (var a = 0; a < contentNodesLen; a++) {
            var contentNode = contentNodes[a];

            if (!contentNode.selector) {
              acceptsTextContent = contentNode;
              break;
            }
          }

          // There may be no content nodes that accept text content.
          if (acceptsTextContent) {
            if (textContent) {
              removeDefaultContent(acceptsTextContent);
              acceptsTextContent.container.insertBefore(document.createTextNode(textContent), acceptsTextContent.endNode);
            } else {
              addDefaultContent(acceptsTextContent);
            }
          }
        }
      },

      appendChild: {
        value: function (node) {
          if (node instanceof DocumentFragment) {
            var fragChildNodes = node.childNodes;

            [].slice.call(fragChildNodes).forEach(function (node) {
              this.appendChild(node);
            }.bind(this));

            return this;
          }

          for (var b = 0; b < contentNodesLen; b++) {
            var contentNode = contentNodes[b];
            var contentSelector = contentNode.selector;

            if (!contentSelector || node instanceof window.HTMLElement && matchesSelector.call(node, contentSelector)) {
              removeDefaultContent(contentNode);
              contentNode.endNode.parentNode.insertBefore(node, contentNode.endNode);
              break;
            }
          }

          return this;
        }
      },

      insertAdjacentHTML: {
        value: function (where, html) {
          if (where === 'afterbegin') {
            this.insertBefore(createFragmentFromString(html), this.childNodes[0]);
          } else if (where === 'beforeend') {
            this.appendChild(createFragmentFromString(html));
          } else {
            element.insertAdjacentHTML(where, html);
          }

          return this;
        }
      },

      insertBefore: {
        value: function (node, referenceNode) {
          // If no reference node is supplied, we append. This also means that we
          // don't need to add / remove any default content because either there
          // aren't any nodes or appendChild will handle it.
          if (!referenceNode) {
            return this.appendChild(node);
          }

          // Handle document fragments.
          if (node instanceof DocumentFragment) {
            var fragChildNodes = node.childNodes;

            if (fragChildNodes) {
              var fragChildNodesLength = fragChildNodes.length;

              for (var a = 0; a < fragChildNodesLength; a++) {
                this.insertBefore(fragChildNodes[a], referenceNode);
              }
            }

            return this;
          }

          var hasFoundReferenceNode = false;

          // There's no reason to handle default content add / remove because:
          // 1. If no reference node is supplied, appendChild handles it.
          // 2. If a reference node is supplied, there already is content.
          // 3. If a reference node is invalid, an exception is thrown, but also
          //    it's state would not change even if it wasn't.
          mainLoop:
          for (var b = 0; b < contentNodesLen; b++) {
            var contentNode = contentNodes[b];
            var betweenNodes = getNodesBetween(contentNode.startNode, contentNode.endNode);
            var betweenNodesLen = betweenNodes.length;

            for (var c = 0; c < betweenNodesLen; c++) {
              var betweenNode = betweenNodes[c];

              if (betweenNode === referenceNode) {
                hasFoundReferenceNode = true;
              }

              if (hasFoundReferenceNode) {
                var selector = contentNode.selector;

                if (!selector || matchesSelector.call(node, selector)) {
                  betweenNode.parentNode.insertBefore(node, betweenNode);
                  break mainLoop;
                }
              }
            }
          }

          // If no reference node was found as a child node of the element we must
          // throw an error. This works for both no child nodes, or if the
          // reference wasn't found to be a child node.
          if (!hasFoundReferenceNode) {
            throw new Error('DOMException 8: The node before which the new node is to be inserted is not a child of this node.');
          }

          return node;
        }
      },

      removeChild: {
        value: function (childNode) {
          var removed = false;

          for (var a = 0; a < contentNodesLen; a++) {
            var contentNode = contentNodes[a];

            if (contentNode.container === childNode.parentNode) {
              contentNode.container.removeChild(childNode);
              removed = true;
              break;
            }

            if (contentNode.startNode.nextSibling === contentNode.endNode) {
              addDefaultContent(contentNode);
            }
          }

          if (!removed) {
            throw new Error('DOMException 8: The node in which you are trying to remove is not a child of this node.');
          }

          return childNode;
        }
      },

      replaceChild: {
        value: function (newChild, oldChild) {
          for (var a = 0; a < contentNodesLen; a++) {
            var contentNode = contentNodes[a];

            if (contentNode.container === oldChild.parentNode) {
              contentNode.container.replaceChild(newChild, oldChild);
              break;
            }
          }

          return this;
        }
      }
    };
  }

  /**
   * Adds the default content if no content exists.
   *
   * @param {Object} content The content data.
   *
   * @returns {undefined}
   */
  function addDefaultContent (content) {
    var nodes = content.defaultNodes;
    var nodesLen = nodes.length;

    for (var a = 0; a < nodesLen; a++) {
      content.container.insertBefore(nodes[a], content.endNode);
    }

    content.isDefault = true;
  }

  /**
   * Removes the default content if it exists.
   *
   * @param {Object} content The content data.
   *
   * @returns {undefined}
   */
  function removeDefaultContent (content) {
    var nodes = content.defaultNodes;
    var nodesLen = nodes.length;

    for (var a = 0; a < nodesLen; a++) {
      var node = nodes[a];
      node.parentNode.removeChild(node);
    }

    content.isDefault = false;
  }

  /**
   * Returns a property definition that just proxies to the original element
   * property.
   *
   * @param {Node} node The node to proxy to.
   * @param {String} name The name of the property.
   */
  function createProxyProperty (node, name) {
    return {
      get: function () {
        var value = node[name];

        if (typeof value === 'function') {
          return value.bind(node);
        }

        return value;
      },

      set: function (value) {
        node[name] = value;
      }
    };
  }

  /**
   * Wraps the specified element with the given wrapper.
   *
   * @param {Object} wrapper The methods and properties to wrap.
   *
   * @returns {Node}
   */
  function wrapNodeWith (node, wrapper) {
    var wrapped = {};

    for (var name in node) {
      var inWrapper = name in wrapper;

      if (inWrapper) {
        Object.defineProperty(wrapped, name, wrapper[name]);
      } else {
        Object.defineProperty(wrapped, name, createProxyProperty(node, name));
      }
    }

    return wrapped;
  }

  /**
   * Caches information about the content nodes.
   *
   * @param {Node} node The node to cache content information about.
   *
   * @returns {undefined}
   */
  function cacheContentData (node) {
    var contentNodes = node.getElementsByTagName('content');
    var contentNodesLen = contentNodes && contentNodes.length;

    if (contentNodesLen) {
      var contentData = [];

      while (contentNodes.length) {
        var contentNode = contentNodes[0];
        var parentNode = contentNode.parentNode;
        var startNode = document.createComment('');
        var endNode = document.createComment('');

        contentData.push({
          container: parentNode,
          contentNode: contentNode,
          defaultNodes: [].slice.call(contentNode.childNodes),
          endNode: endNode,
          isDefault: true,
          selector: contentNode.getAttribute('select'),
          startNode: startNode
        });

        parentNode.replaceChild(endNode, contentNode);
        parentNode.insertBefore(startNode, endNode);
      }

      setData(node, 'content', contentData);
    }
  }



  // Public API
  // ----------

  /**
   * Default template renderer. Similar to ShadowDOM style templating where
   * content is projected from the light DOM.
   *
   * Differences:
   *
   * - Uses a `data-skate-content` attribute instead of a `select` attribute.
   * - Attribute is applied to existing elements rather than the <content>
   *   element to prevent styling issues.
   * - Does not dynamically project modifications to the root custom element.
   *   You must affect each projection node.
   *
   * Usage:
   *
   *     var tmp = skateTemplateHtml('<my-html-template data-skate-content=".select-some-children"></my-html-template>');
   *     tmp(elementToTemplate);
   *
   * @returns {Function} The function for rendering the template.
   */
  function skateTemplateHtml () {
    var template = [].slice.call(arguments).join('');

    return function (target) {
      var frag = createFragmentFromNodeList(target.childNodes);

      target.innerHTML = template;
      cacheContentData(target);

      if (frag.childNodes.length) {
        skateTemplateHtml.wrap(target).appendChild(frag);
      }
    };
  }

  /**
   * Wraps the element in an object that has methods which can be used to
   * manipulate the content similar to if it were delcared as the shadow root.
   *
   * @param {Node} node The node to wrap.
   *
   * @returns {Object}
   */
  skateTemplateHtml.wrap = function (node) {
    return getData(node, 'content') ?
      wrapNodeWith(node, htmlTemplateParentWrapper(node)) :
      node;
  };



  // Exporting
  // ---------

  // Global.
  window.skateTemplateHtml = skateTemplateHtml;

  // AMD.
  if (typeof define === 'function') {
    define('aui/internal/skate-template-html',[],function () {
      return skateTemplateHtml;
    });
  }

  // CommonJS.
  if (typeof module === 'object') {
    module.exports = skateTemplateHtml;
  }
})();

/*! tether 0.6.5 */
(function(root) {
	(function() {
  var Evented, addClass, defer, deferred, extend, flush, getBounds, getOffsetParent, getOrigin, getScrollBarSize, getScrollParent, hasClass, node, removeClass, uniqueId, updateClasses, zeroPosCache,
    __hasProp = {}.hasOwnProperty,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __slice = [].slice;

  if (this.Tether == null) {
    this.Tether = {
      modules: []
    };
  }

  getScrollParent = function(el) {
    var parent, position, scrollParent, style, _ref;
    position = getComputedStyle(el).position;
    if (position === 'fixed') {
      return el;
    }
    scrollParent = void 0;
    parent = el;
    while (parent = parent.parentNode) {
      try {
        style = getComputedStyle(parent);
      } catch (_error) {}
      if (style == null) {
        return parent;
      }
      if (/(auto|scroll)/.test(style['overflow'] + style['overflow-y'] + style['overflow-x'])) {
        if (position !== 'absolute' || ((_ref = style['position']) === 'relative' || _ref === 'absolute' || _ref === 'fixed')) {
          return parent;
        }
      }
    }
    return document.body;
  };

  uniqueId = (function() {
    var id;
    id = 0;
    return function() {
      return id++;
    };
  })();

  zeroPosCache = {};

  getOrigin = function(doc) {
    var id, k, node, v, _ref;
    node = doc._tetherZeroElement;
    if (node == null) {
      node = doc.createElement('div');
      node.setAttribute('data-tether-id', uniqueId());
      extend(node.style, {
        top: 0,
        left: 0,
        position: 'absolute'
      });
      doc.body.appendChild(node);
      doc._tetherZeroElement = node;
    }
    id = node.getAttribute('data-tether-id');
    if (zeroPosCache[id] == null) {
      zeroPosCache[id] = {};
      _ref = node.getBoundingClientRect();
      for (k in _ref) {
        v = _ref[k];
        zeroPosCache[id][k] = v;
      }
      defer(function() {
        return zeroPosCache[id] = void 0;
      });
    }
    return zeroPosCache[id];
  };

  node = null;

  getBounds = function(el) {
    var box, doc, docEl, k, origin, v, _ref;
    if (el === document) {
      doc = document;
      el = document.documentElement;
    } else {
      doc = el.ownerDocument;
    }
    docEl = doc.documentElement;
    box = {};
    _ref = el.getBoundingClientRect();
    for (k in _ref) {
      v = _ref[k];
      box[k] = v;
    }
    origin = getOrigin(doc);
    box.top -= origin.top;
    box.left -= origin.left;
    if (box.width == null) {
      box.width = document.body.scrollWidth - box.left - box.right;
    }
    if (box.height == null) {
      box.height = document.body.scrollHeight - box.top - box.bottom;
    }
    box.top = box.top - docEl.clientTop;
    box.left = box.left - docEl.clientLeft;
    box.right = doc.body.clientWidth - box.width - box.left;
    box.bottom = doc.body.clientHeight - box.height - box.top;
    return box;
  };

  getOffsetParent = function(el) {
    return el.offsetParent || document.documentElement;
  };

  getScrollBarSize = function() {
    var inner, outer, width, widthContained, widthScroll;
    inner = document.createElement('div');
    inner.style.width = '100%';
    inner.style.height = '200px';
    outer = document.createElement('div');
    extend(outer.style, {
      position: 'absolute',
      top: 0,
      left: 0,
      pointerEvents: 'none',
      visibility: 'hidden',
      width: '200px',
      height: '150px',
      overflow: 'hidden'
    });
    outer.appendChild(inner);
    document.body.appendChild(outer);
    widthContained = inner.offsetWidth;
    outer.style.overflow = 'scroll';
    widthScroll = inner.offsetWidth;
    if (widthContained === widthScroll) {
      widthScroll = outer.clientWidth;
    }
    document.body.removeChild(outer);
    width = widthContained - widthScroll;
    return {
      width: width,
      height: width
    };
  };

  extend = function(out) {
    var args, key, obj, val, _i, _len, _ref;
    if (out == null) {
      out = {};
    }
    args = [];
    Array.prototype.push.apply(args, arguments);
    _ref = args.slice(1);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      obj = _ref[_i];
      if (obj) {
        for (key in obj) {
          if (!__hasProp.call(obj, key)) continue;
          val = obj[key];
          out[key] = val;
        }
      }
    }
    return out;
  };

  removeClass = function(el, name) {
    var cls, _i, _len, _ref, _results;
    if (el.classList != null) {
      _ref = name.split(' ');
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        cls = _ref[_i];
        if (cls.trim()) {
          _results.push(el.classList.remove(cls));
        }
      }
      return _results;
    } else {
      return el.className = el.className.replace(new RegExp("(^| )" + (name.split(' ').join('|')) + "( |$)", 'gi'), ' ');
    }
  };

  addClass = function(el, name) {
    var cls, _i, _len, _ref, _results;
    if (el.classList != null) {
      _ref = name.split(' ');
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        cls = _ref[_i];
        if (cls.trim()) {
          _results.push(el.classList.add(cls));
        }
      }
      return _results;
    } else {
      removeClass(el, name);
      return el.className += " " + name;
    }
  };

  hasClass = function(el, name) {
    if (el.classList != null) {
      return el.classList.contains(name);
    } else {
      return new RegExp("(^| )" + name + "( |$)", 'gi').test(el.className);
    }
  };

  updateClasses = function(el, add, all) {
    var cls, _i, _j, _len, _len1, _results;
    for (_i = 0, _len = all.length; _i < _len; _i++) {
      cls = all[_i];
      if (__indexOf.call(add, cls) < 0) {
        if (hasClass(el, cls)) {
          removeClass(el, cls);
        }
      }
    }
    _results = [];
    for (_j = 0, _len1 = add.length; _j < _len1; _j++) {
      cls = add[_j];
      if (!hasClass(el, cls)) {
        _results.push(addClass(el, cls));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  deferred = [];

  defer = function(fn) {
    return deferred.push(fn);
  };

  flush = function() {
    var fn, _results;
    _results = [];
    while (fn = deferred.pop()) {
      _results.push(fn());
    }
    return _results;
  };

  Evented = (function() {
    function Evented() {}

    Evented.prototype.on = function(event, handler, ctx, once) {
      var _base;
      if (once == null) {
        once = false;
      }
      if (this.bindings == null) {
        this.bindings = {};
      }
      if ((_base = this.bindings)[event] == null) {
        _base[event] = [];
      }
      return this.bindings[event].push({
        handler: handler,
        ctx: ctx,
        once: once
      });
    };

    Evented.prototype.once = function(event, handler, ctx) {
      return this.on(event, handler, ctx, true);
    };

    Evented.prototype.off = function(event, handler) {
      var i, _ref, _results;
      if (((_ref = this.bindings) != null ? _ref[event] : void 0) == null) {
        return;
      }
      if (handler == null) {
        return delete this.bindings[event];
      } else {
        i = 0;
        _results = [];
        while (i < this.bindings[event].length) {
          if (this.bindings[event][i].handler === handler) {
            _results.push(this.bindings[event].splice(i, 1));
          } else {
            _results.push(i++);
          }
        }
        return _results;
      }
    };

    Evented.prototype.trigger = function() {
      var args, ctx, event, handler, i, once, _ref, _ref1, _results;
      event = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if ((_ref = this.bindings) != null ? _ref[event] : void 0) {
        i = 0;
        _results = [];
        while (i < this.bindings[event].length) {
          _ref1 = this.bindings[event][i], handler = _ref1.handler, ctx = _ref1.ctx, once = _ref1.once;
          handler.apply(ctx != null ? ctx : this, args);
          if (once) {
            _results.push(this.bindings[event].splice(i, 1));
          } else {
            _results.push(i++);
          }
        }
        return _results;
      }
    };

    return Evented;

  })();

  this.Tether.Utils = {
    getScrollParent: getScrollParent,
    getBounds: getBounds,
    getOffsetParent: getOffsetParent,
    extend: extend,
    addClass: addClass,
    removeClass: removeClass,
    hasClass: hasClass,
    updateClasses: updateClasses,
    defer: defer,
    flush: flush,
    uniqueId: uniqueId,
    Evented: Evented,
    getScrollBarSize: getScrollBarSize
  };

}).call(this);

(function() {
  var MIRROR_LR, MIRROR_TB, OFFSET_MAP, Tether, addClass, addOffset, attachmentToOffset, autoToFixedAttachment, defer, extend, flush, getBounds, getOffsetParent, getOuterSize, getScrollBarSize, getScrollParent, getSize, now, offsetToPx, parseAttachment, parseOffset, position, removeClass, tethers, transformKey, updateClasses, within, _Tether, _ref,
    __slice = [].slice,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  if (this.Tether == null) {
    throw new Error("You must include the utils.js file before tether.js");
  }

  Tether = this.Tether;

  _ref = Tether.Utils, getScrollParent = _ref.getScrollParent, getSize = _ref.getSize, getOuterSize = _ref.getOuterSize, getBounds = _ref.getBounds, getOffsetParent = _ref.getOffsetParent, extend = _ref.extend, addClass = _ref.addClass, removeClass = _ref.removeClass, updateClasses = _ref.updateClasses, defer = _ref.defer, flush = _ref.flush, getScrollBarSize = _ref.getScrollBarSize;

  within = function(a, b, diff) {
    if (diff == null) {
      diff = 1;
    }
    return (a + diff >= b && b >= a - diff);
  };

  transformKey = (function() {
    var el, key, _i, _len, _ref1;
    el = document.createElement('div');
    _ref1 = ['transform', 'webkitTransform', 'OTransform', 'MozTransform', 'msTransform'];
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      key = _ref1[_i];
      if (el.style[key] !== void 0) {
        return key;
      }
    }
  })();

  tethers = [];

  position = function() {
    var tether, _i, _len;
    for (_i = 0, _len = tethers.length; _i < _len; _i++) {
      tether = tethers[_i];
      tether.position(false);
    }
    return flush();
  };

  now = function() {
    var _ref1;
    return (_ref1 = typeof performance !== "undefined" && performance !== null ? typeof performance.now === "function" ? performance.now() : void 0 : void 0) != null ? _ref1 : +(new Date);
  };

  (function() {
    var event, lastCall, lastDuration, pendingTimeout, tick, _i, _len, _ref1, _results;
    lastCall = null;
    lastDuration = null;
    pendingTimeout = null;
    tick = function() {
      if ((lastDuration != null) && lastDuration > 16) {
        lastDuration = Math.min(lastDuration - 16, 250);
        pendingTimeout = setTimeout(tick, 250);
        return;
      }
      if ((lastCall != null) && (now() - lastCall) < 10) {
        return;
      }
      if (pendingTimeout != null) {
        clearTimeout(pendingTimeout);
        pendingTimeout = null;
      }
      lastCall = now();
      position();
      return lastDuration = now() - lastCall;
    };
    _ref1 = ['resize', 'scroll', 'touchmove'];
    _results = [];
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      event = _ref1[_i];
      _results.push(window.addEventListener(event, tick));
    }
    return _results;
  })();

  MIRROR_LR = {
    center: 'center',
    left: 'right',
    right: 'left'
  };

  MIRROR_TB = {
    middle: 'middle',
    top: 'bottom',
    bottom: 'top'
  };

  OFFSET_MAP = {
    top: 0,
    left: 0,
    middle: '50%',
    center: '50%',
    bottom: '100%',
    right: '100%'
  };

  autoToFixedAttachment = function(attachment, relativeToAttachment) {
    var left, top;
    left = attachment.left, top = attachment.top;
    if (left === 'auto') {
      left = MIRROR_LR[relativeToAttachment.left];
    }
    if (top === 'auto') {
      top = MIRROR_TB[relativeToAttachment.top];
    }
    return {
      left: left,
      top: top
    };
  };

  attachmentToOffset = function(attachment) {
    var _ref1, _ref2;
    return {
      left: (_ref1 = OFFSET_MAP[attachment.left]) != null ? _ref1 : attachment.left,
      top: (_ref2 = OFFSET_MAP[attachment.top]) != null ? _ref2 : attachment.top
    };
  };

  addOffset = function() {
    var left, offsets, out, top, _i, _len, _ref1;
    offsets = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    out = {
      top: 0,
      left: 0
    };
    for (_i = 0, _len = offsets.length; _i < _len; _i++) {
      _ref1 = offsets[_i], top = _ref1.top, left = _ref1.left;
      if (typeof top === 'string') {
        top = parseFloat(top, 10);
      }
      if (typeof left === 'string') {
        left = parseFloat(left, 10);
      }
      out.top += top;
      out.left += left;
    }
    return out;
  };

  offsetToPx = function(offset, size) {
    if (typeof offset.left === 'string' && offset.left.indexOf('%') !== -1) {
      offset.left = parseFloat(offset.left, 10) / 100 * size.width;
    }
    if (typeof offset.top === 'string' && offset.top.indexOf('%') !== -1) {
      offset.top = parseFloat(offset.top, 10) / 100 * size.height;
    }
    return offset;
  };

  parseAttachment = parseOffset = function(value) {
    var left, top, _ref1;
    _ref1 = value.split(' '), top = _ref1[0], left = _ref1[1];
    return {
      top: top,
      left: left
    };
  };

  _Tether = (function() {
    _Tether.modules = [];

    function _Tether(options) {
      this.position = __bind(this.position, this);
      var module, _i, _len, _ref1, _ref2;
      tethers.push(this);
      this.history = [];
      this.setOptions(options, false);
      _ref1 = Tether.modules;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        module = _ref1[_i];
        if ((_ref2 = module.initialize) != null) {
          _ref2.call(this);
        }
      }
      this.position();
    }

    _Tether.prototype.getClass = function(key) {
      var _ref1, _ref2;
      if ((_ref1 = this.options.classes) != null ? _ref1[key] : void 0) {
        return this.options.classes[key];
      } else if (((_ref2 = this.options.classes) != null ? _ref2[key] : void 0) !== false) {
        if (this.options.classPrefix) {
          return "" + this.options.classPrefix + "-" + key;
        } else {
          return key;
        }
      } else {
        return '';
      }
    };

    _Tether.prototype.setOptions = function(options, position) {
      var defaults, key, _i, _len, _ref1, _ref2;
      this.options = options;
      if (position == null) {
        position = true;
      }
      defaults = {
        offset: '0 0',
        targetOffset: '0 0',
        targetAttachment: 'auto auto',
        classPrefix: 'tether'
      };
      this.options = extend(defaults, this.options);
      _ref1 = this.options, this.element = _ref1.element, this.target = _ref1.target, this.targetModifier = _ref1.targetModifier;
      if (this.target === 'viewport') {
        this.target = document.body;
        this.targetModifier = 'visible';
      } else if (this.target === 'scroll-handle') {
        this.target = document.body;
        this.targetModifier = 'scroll-handle';
      }
      _ref2 = ['element', 'target'];
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        key = _ref2[_i];
        if (this[key] == null) {
          throw new Error("Tether Error: Both element and target must be defined");
        }
        if (this[key].jquery != null) {
          this[key] = this[key][0];
        } else if (typeof this[key] === 'string') {
          this[key] = document.querySelector(this[key]);
        }
      }
      addClass(this.element, this.getClass('element'));
      addClass(this.target, this.getClass('target'));
      if (!this.options.attachment) {
        throw new Error("Tether Error: You must provide an attachment");
      }
      this.targetAttachment = parseAttachment(this.options.targetAttachment);
      this.attachment = parseAttachment(this.options.attachment);
      this.offset = parseOffset(this.options.offset);
      this.targetOffset = parseOffset(this.options.targetOffset);
      if (this.scrollParent != null) {
        this.disable();
      }
      if (this.targetModifier === 'scroll-handle') {
        this.scrollParent = this.target;
      } else {
        this.scrollParent = getScrollParent(this.target);
      }
      if (this.options.enabled !== false) {
        return this.enable(position);
      }
    };

    _Tether.prototype.getTargetBounds = function() {
      var bounds, fitAdj, hasBottomScroll, height, out, scrollBottom, scrollPercentage, style, target;
      if (this.targetModifier != null) {
        switch (this.targetModifier) {
          case 'visible':
            if (this.target === document.body) {
              return {
                top: pageYOffset,
                left: pageXOffset,
                height: innerHeight,
                width: innerWidth
              };
            } else {
              bounds = getBounds(this.target);
              out = {
                height: bounds.height,
                width: bounds.width,
                top: bounds.top,
                left: bounds.left
              };
              out.height = Math.min(out.height, bounds.height - (pageYOffset - bounds.top));
              out.height = Math.min(out.height, bounds.height - ((bounds.top + bounds.height) - (pageYOffset + innerHeight)));
              out.height = Math.min(innerHeight, out.height);
              out.height -= 2;
              out.width = Math.min(out.width, bounds.width - (pageXOffset - bounds.left));
              out.width = Math.min(out.width, bounds.width - ((bounds.left + bounds.width) - (pageXOffset + innerWidth)));
              out.width = Math.min(innerWidth, out.width);
              out.width -= 2;
              if (out.top < pageYOffset) {
                out.top = pageYOffset;
              }
              if (out.left < pageXOffset) {
                out.left = pageXOffset;
              }
              return out;
            }
            break;
          case 'scroll-handle':
            target = this.target;
            if (target === document.body) {
              target = document.documentElement;
              bounds = {
                left: pageXOffset,
                top: pageYOffset,
                height: innerHeight,
                width: innerWidth
              };
            } else {
              bounds = getBounds(target);
            }
            style = getComputedStyle(target);
            hasBottomScroll = target.scrollWidth > target.clientWidth || 'scroll' === [style.overflow, style.overflowX] || this.target !== document.body;
            scrollBottom = 0;
            if (hasBottomScroll) {
              scrollBottom = 15;
            }
            height = bounds.height - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth) - scrollBottom;
            out = {
              width: 15,
              height: height * 0.975 * (height / target.scrollHeight),
              left: bounds.left + bounds.width - parseFloat(style.borderLeftWidth) - 15
            };
            fitAdj = 0;
            if (height < 408 && this.target === document.body) {
              fitAdj = -0.00011 * Math.pow(height, 2) - 0.00727 * height + 22.58;
            }
            if (this.target !== document.body) {
              out.height = Math.max(out.height, 24);
            }
            scrollPercentage = this.target.scrollTop / (target.scrollHeight - height);
            out.top = scrollPercentage * (height - out.height - fitAdj) + bounds.top + parseFloat(style.borderTopWidth);
            if (this.target === document.body) {
              out.height = Math.max(out.height, 24);
            }
            return out;
        }
      } else {
        return getBounds(this.target);
      }
    };

    _Tether.prototype.clearCache = function() {
      return this._cache = {};
    };

    _Tether.prototype.cache = function(k, getter) {
      if (this._cache == null) {
        this._cache = {};
      }
      if (this._cache[k] == null) {
        this._cache[k] = getter.call(this);
      }
      return this._cache[k];
    };

    _Tether.prototype.enable = function(position) {
      if (position == null) {
        position = true;
      }
      addClass(this.target, this.getClass('enabled'));
      addClass(this.element, this.getClass('enabled'));
      this.enabled = true;
      if (this.scrollParent !== document) {
        this.scrollParent.addEventListener('scroll', this.position);
      }
      if (position) {
        return this.position();
      }
    };

    _Tether.prototype.disable = function() {
      removeClass(this.target, this.getClass('enabled'));
      removeClass(this.element, this.getClass('enabled'));
      this.enabled = false;
      if (this.scrollParent != null) {
        return this.scrollParent.removeEventListener('scroll', this.position);
      }
    };

    _Tether.prototype.destroy = function() {
      var i, tether, _i, _len, _results;
      this.disable();
      _results = [];
      for (i = _i = 0, _len = tethers.length; _i < _len; i = ++_i) {
        tether = tethers[i];
        if (tether === this) {
          tethers.splice(i, 1);
          break;
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    _Tether.prototype.updateAttachClasses = function(elementAttach, targetAttach) {
      var add, all, side, sides, _i, _j, _len, _len1, _ref1,
        _this = this;
      if (elementAttach == null) {
        elementAttach = this.attachment;
      }
      if (targetAttach == null) {
        targetAttach = this.targetAttachment;
      }
      sides = ['left', 'top', 'bottom', 'right', 'middle', 'center'];
      if ((_ref1 = this._addAttachClasses) != null ? _ref1.length : void 0) {
        this._addAttachClasses.splice(0, this._addAttachClasses.length);
      }
      add = this._addAttachClasses != null ? this._addAttachClasses : this._addAttachClasses = [];
      if (elementAttach.top) {
        add.push("" + (this.getClass('element-attached')) + "-" + elementAttach.top);
      }
      if (elementAttach.left) {
        add.push("" + (this.getClass('element-attached')) + "-" + elementAttach.left);
      }
      if (targetAttach.top) {
        add.push("" + (this.getClass('target-attached')) + "-" + targetAttach.top);
      }
      if (targetAttach.left) {
        add.push("" + (this.getClass('target-attached')) + "-" + targetAttach.left);
      }
      all = [];
      for (_i = 0, _len = sides.length; _i < _len; _i++) {
        side = sides[_i];
        all.push("" + (this.getClass('element-attached')) + "-" + side);
      }
      for (_j = 0, _len1 = sides.length; _j < _len1; _j++) {
        side = sides[_j];
        all.push("" + (this.getClass('target-attached')) + "-" + side);
      }
      return defer(function() {
        if (_this._addAttachClasses == null) {
          return;
        }
        updateClasses(_this.element, _this._addAttachClasses, all);
        updateClasses(_this.target, _this._addAttachClasses, all);
        return _this._addAttachClasses = void 0;
      });
    };

    _Tether.prototype.position = function(flushChanges) {
      var elementPos, elementStyle, height, left, manualOffset, manualTargetOffset, module, next, offset, offsetBorder, offsetParent, offsetParentSize, offsetParentStyle, offsetPosition, ret, scrollLeft, scrollTop, scrollbarSize, side, targetAttachment, targetOffset, targetPos, targetSize, top, width, _i, _j, _len, _len1, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6,
        _this = this;
      if (flushChanges == null) {
        flushChanges = true;
      }
      if (!this.enabled) {
        return;
      }
      this.clearCache();
      targetAttachment = autoToFixedAttachment(this.targetAttachment, this.attachment);
      this.updateAttachClasses(this.attachment, targetAttachment);
      elementPos = this.cache('element-bounds', function() {
        return getBounds(_this.element);
      });
      width = elementPos.width, height = elementPos.height;
      if (width === 0 && height === 0 && (this.lastSize != null)) {
        _ref1 = this.lastSize, width = _ref1.width, height = _ref1.height;
      } else {
        this.lastSize = {
          width: width,
          height: height
        };
      }
      targetSize = targetPos = this.cache('target-bounds', function() {
        return _this.getTargetBounds();
      });
      offset = offsetToPx(attachmentToOffset(this.attachment), {
        width: width,
        height: height
      });
      targetOffset = offsetToPx(attachmentToOffset(targetAttachment), targetSize);
      manualOffset = offsetToPx(this.offset, {
        width: width,
        height: height
      });
      manualTargetOffset = offsetToPx(this.targetOffset, targetSize);
      offset = addOffset(offset, manualOffset);
      targetOffset = addOffset(targetOffset, manualTargetOffset);
      left = targetPos.left + targetOffset.left - offset.left;
      top = targetPos.top + targetOffset.top - offset.top;
      _ref2 = Tether.modules;
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        module = _ref2[_i];
        ret = module.position.call(this, {
          left: left,
          top: top,
          targetAttachment: targetAttachment,
          targetPos: targetPos,
          attachment: this.attachment,
          elementPos: elementPos,
          offset: offset,
          targetOffset: targetOffset,
          manualOffset: manualOffset,
          manualTargetOffset: manualTargetOffset,
          scrollbarSize: scrollbarSize
        });
        if ((ret == null) || typeof ret !== 'object') {
          continue;
        } else if (ret === false) {
          return false;
        } else {
          top = ret.top, left = ret.left;
        }
      }
      next = {
        page: {
          top: top,
          left: left
        },
        viewport: {
          top: top - pageYOffset,
          bottom: pageYOffset - top - height + innerHeight,
          left: left - pageXOffset,
          right: pageXOffset - left - width + innerWidth
        }
      };
      if (document.body.scrollWidth > window.innerWidth) {
        scrollbarSize = this.cache('scrollbar-size', getScrollBarSize);
        next.viewport.bottom -= scrollbarSize.height;
      }
      if (document.body.scrollHeight > window.innerHeight) {
        scrollbarSize = this.cache('scrollbar-size', getScrollBarSize);
        next.viewport.right -= scrollbarSize.width;
      }
      if (((_ref3 = document.body.style.position) !== '' && _ref3 !== 'static') || ((_ref4 = document.body.parentElement.style.position) !== '' && _ref4 !== 'static')) {
        next.page.bottom = document.body.scrollHeight - top - height;
        next.page.right = document.body.scrollWidth - left - width;
      }
      if (((_ref5 = this.options.optimizations) != null ? _ref5.moveElement : void 0) !== false && (this.targetModifier == null)) {
        offsetParent = this.cache('target-offsetparent', function() {
          return getOffsetParent(_this.target);
        });
        offsetPosition = this.cache('target-offsetparent-bounds', function() {
          return getBounds(offsetParent);
        });
        offsetParentStyle = getComputedStyle(offsetParent);
        elementStyle = getComputedStyle(this.element);
        offsetParentSize = offsetPosition;
        offsetBorder = {};
        _ref6 = ['Top', 'Left', 'Bottom', 'Right'];
        for (_j = 0, _len1 = _ref6.length; _j < _len1; _j++) {
          side = _ref6[_j];
          offsetBorder[side.toLowerCase()] = parseFloat(offsetParentStyle["border" + side + "Width"]);
        }
        offsetPosition.right = document.body.scrollWidth - offsetPosition.left - offsetParentSize.width + offsetBorder.right;
        offsetPosition.bottom = document.body.scrollHeight - offsetPosition.top - offsetParentSize.height + offsetBorder.bottom;
        if (next.page.top >= (offsetPosition.top + offsetBorder.top) && next.page.bottom >= offsetPosition.bottom) {
          if (next.page.left >= (offsetPosition.left + offsetBorder.left) && next.page.right >= offsetPosition.right) {
            scrollTop = offsetParent.scrollTop;
            scrollLeft = offsetParent.scrollLeft;
            next.offset = {
              top: next.page.top - offsetPosition.top + scrollTop - offsetBorder.top,
              left: next.page.left - offsetPosition.left + scrollLeft - offsetBorder.left
            };
          }
        }
      }
      this.move(next);
      this.history.unshift(next);
      if (this.history.length > 3) {
        this.history.pop();
      }
      if (flushChanges) {
        flush();
      }
      return true;
    };

    _Tether.prototype.move = function(position) {
      var css, elVal, found, key, moved, offsetParent, point, same, transcribe, type, val, write, writeCSS, _i, _len, _ref1, _ref2,
        _this = this;
      if (this.element.parentNode == null) {
        return;
      }
      same = {};
      for (type in position) {
        same[type] = {};
        for (key in position[type]) {
          found = false;
          _ref1 = this.history;
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            point = _ref1[_i];
            if (!within((_ref2 = point[type]) != null ? _ref2[key] : void 0, position[type][key])) {
              found = true;
              break;
            }
          }
          if (!found) {
            same[type][key] = true;
          }
        }
      }
      css = {
        top: '',
        left: '',
        right: '',
        bottom: ''
      };
      transcribe = function(same, pos) {
        var xPos, yPos, _ref3;
        if (((_ref3 = _this.options.optimizations) != null ? _ref3.gpu : void 0) !== false) {
          if (same.top) {
            css.top = 0;
            yPos = pos.top;
          } else {
            css.bottom = 0;
            yPos = -pos.bottom;
          }
          if (same.left) {
            css.left = 0;
            xPos = pos.left;
          } else {
            css.right = 0;
            xPos = -pos.right;
          }
          css[transformKey] = "translateX(" + (Math.round(xPos)) + "px) translateY(" + (Math.round(yPos)) + "px)";
          if (transformKey !== 'msTransform') {
            return css[transformKey] += " translateZ(0)";
          }
        } else {
          if (same.top) {
            css.top = "" + pos.top + "px";
          } else {
            css.bottom = "" + pos.bottom + "px";
          }
          if (same.left) {
            return css.left = "" + pos.left + "px";
          } else {
            return css.right = "" + pos.right + "px";
          }
        }
      };
      moved = false;
      if ((same.page.top || same.page.bottom) && (same.page.left || same.page.right)) {
        css.position = 'absolute';
        transcribe(same.page, position.page);
      } else if ((same.viewport.top || same.viewport.bottom) && (same.viewport.left || same.viewport.right)) {
        css.position = 'fixed';
        transcribe(same.viewport, position.viewport);
      } else if ((same.offset != null) && same.offset.top && same.offset.left) {
        css.position = 'absolute';
        offsetParent = this.cache('target-offsetparent', function() {
          return getOffsetParent(_this.target);
        });
        if (getOffsetParent(this.element) !== offsetParent) {
          defer(function() {
            _this.element.parentNode.removeChild(_this.element);
            return offsetParent.appendChild(_this.element);
          });
        }
        transcribe(same.offset, position.offset);
        moved = true;
      } else {
        css.position = 'absolute';
        transcribe({
          top: true,
          left: true
        }, position.page);
      }
      if (!moved && this.element.parentNode.tagName !== 'BODY') {
        this.element.parentNode.removeChild(this.element);
        document.body.appendChild(this.element);
      }
      writeCSS = {};
      write = false;
      for (key in css) {
        val = css[key];
        elVal = this.element.style[key];
        if (elVal !== '' && val !== '' && (key === 'top' || key === 'left' || key === 'bottom' || key === 'right')) {
          elVal = parseFloat(elVal);
          val = parseFloat(val);
        }
        if (elVal !== val) {
          write = true;
          writeCSS[key] = css[key];
        }
      }
      if (write) {
        return defer(function() {
          return extend(_this.element.style, writeCSS);
        });
      }
    };

    return _Tether;

  })();

  Tether.position = position;

  this.Tether = extend(_Tether, Tether);

}).call(this);

(function() {
  var BOUNDS_FORMAT, MIRROR_ATTACH, defer, extend, getBoundingRect, getBounds, getOuterSize, getSize, updateClasses, _ref,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  _ref = this.Tether.Utils, getOuterSize = _ref.getOuterSize, getBounds = _ref.getBounds, getSize = _ref.getSize, extend = _ref.extend, updateClasses = _ref.updateClasses, defer = _ref.defer;

  MIRROR_ATTACH = {
    left: 'right',
    right: 'left',
    top: 'bottom',
    bottom: 'top',
    middle: 'middle'
  };

  BOUNDS_FORMAT = ['left', 'top', 'right', 'bottom'];

  getBoundingRect = function(tether, to) {
    var i, pos, side, size, style, _i, _len;
    if (to === 'scrollParent') {
      to = tether.scrollParent;
    } else if (to === 'window') {
      to = [pageXOffset, pageYOffset, innerWidth + pageXOffset, innerHeight + pageYOffset];
    }
    if (to === document) {
      to = to.documentElement;
    }
    if (to.nodeType != null) {
      pos = size = getBounds(to);
      style = getComputedStyle(to);
      to = [pos.left, pos.top, size.width + pos.left, size.height + pos.top];
      for (i = _i = 0, _len = BOUNDS_FORMAT.length; _i < _len; i = ++_i) {
        side = BOUNDS_FORMAT[i];
        side = side[0].toUpperCase() + side.substr(1);
        if (side === 'Top' || side === 'Left') {
          to[i] += parseFloat(style["border" + side + "Width"]);
        } else {
          to[i] -= parseFloat(style["border" + side + "Width"]);
        }
      }
    }
    return to;
  };

  this.Tether.modules.push({
    position: function(_arg) {
      var addClasses, allClasses, attachment, bounds, changeAttachX, changeAttachY, cls, constraint, eAttachment, height, left, oob, oobClass, p, pin, pinned, pinnedClass, removeClass, side, tAttachment, targetAttachment, targetHeight, targetSize, targetWidth, to, top, width, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _len5, _m, _n, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8,
        _this = this;
      top = _arg.top, left = _arg.left, targetAttachment = _arg.targetAttachment;
      if (!this.options.constraints) {
        return true;
      }
      removeClass = function(prefix) {
        var side, _i, _len, _results;
        _this.removeClass(prefix);
        _results = [];
        for (_i = 0, _len = BOUNDS_FORMAT.length; _i < _len; _i++) {
          side = BOUNDS_FORMAT[_i];
          _results.push(_this.removeClass("" + prefix + "-" + side));
        }
        return _results;
      };
      _ref1 = this.cache('element-bounds', function() {
        return getBounds(_this.element);
      }), height = _ref1.height, width = _ref1.width;
      if (width === 0 && height === 0 && (this.lastSize != null)) {
        _ref2 = this.lastSize, width = _ref2.width, height = _ref2.height;
      }
      targetSize = this.cache('target-bounds', function() {
        return _this.getTargetBounds();
      });
      targetHeight = targetSize.height;
      targetWidth = targetSize.width;
      tAttachment = {};
      eAttachment = {};
      allClasses = [this.getClass('pinned'), this.getClass('out-of-bounds')];
      _ref3 = this.options.constraints;
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        constraint = _ref3[_i];
        if (constraint.outOfBoundsClass) {
          allClasses.push(constraint.outOfBoundsClass);
        }
        if (constraint.pinnedClass) {
          allClasses.push(constraint.pinnedClass);
        }
      }
      for (_j = 0, _len1 = allClasses.length; _j < _len1; _j++) {
        cls = allClasses[_j];
        _ref4 = ['left', 'top', 'right', 'bottom'];
        for (_k = 0, _len2 = _ref4.length; _k < _len2; _k++) {
          side = _ref4[_k];
          allClasses.push("" + cls + "-" + side);
        }
      }
      addClasses = [];
      tAttachment = extend({}, targetAttachment);
      eAttachment = extend({}, this.attachment);
      _ref5 = this.options.constraints;
      for (_l = 0, _len3 = _ref5.length; _l < _len3; _l++) {
        constraint = _ref5[_l];
        to = constraint.to, attachment = constraint.attachment, pin = constraint.pin;
        if (attachment == null) {
          attachment = '';
        }
        if (__indexOf.call(attachment, ' ') >= 0) {
          _ref6 = attachment.split(' '), changeAttachY = _ref6[0], changeAttachX = _ref6[1];
        } else {
          changeAttachX = changeAttachY = attachment;
        }
        bounds = getBoundingRect(this, to);
        if (changeAttachY === 'target' || changeAttachY === 'both') {
          if (top < bounds[1] && tAttachment.top === 'top') {
            top += targetHeight;
            tAttachment.top = 'bottom';
          }
          if (top + height > bounds[3] && tAttachment.top === 'bottom') {
            top -= targetHeight;
            tAttachment.top = 'top';
          }
        }
        if (changeAttachY === 'together') {
          if (top < bounds[1] && tAttachment.top === 'top') {
            if (eAttachment.top === 'bottom') {
              top += targetHeight;
              tAttachment.top = 'bottom';
              top += height;
              eAttachment.top = 'top';
            } else if (eAttachment.top === 'top') {
              top += targetHeight;
              tAttachment.top = 'bottom';
              top -= height;
              eAttachment.top = 'bottom';
            }
          }
          if (top + height > bounds[3] && tAttachment.top === 'bottom') {
            if (eAttachment.top === 'top') {
              top -= targetHeight;
              tAttachment.top = 'top';
              top -= height;
              eAttachment.top = 'bottom';
            } else if (eAttachment.top === 'bottom') {
              top -= targetHeight;
              tAttachment.top = 'top';
              top += height;
              eAttachment.top = 'top';
            }
          }
          if (tAttachment.top === 'middle') {
            if (top + height > bounds[3] && eAttachment.top === 'top') {
              top -= height;
              eAttachment.top = 'bottom';
            } else if (top < bounds[1] && eAttachment.top === 'bottom') {
              top += height;
              eAttachment.top = 'top';
            }
          }
        }
        if (changeAttachX === 'target' || changeAttachX === 'both') {
          if (left < bounds[0] && tAttachment.left === 'left') {
            left += targetWidth;
            tAttachment.left = 'right';
          }
          if (left + width > bounds[2] && tAttachment.left === 'right') {
            left -= targetWidth;
            tAttachment.left = 'left';
          }
        }
        if (changeAttachX === 'together') {
          if (left < bounds[0] && tAttachment.left === 'left') {
            if (eAttachment.left === 'right') {
              left += targetWidth;
              tAttachment.left = 'right';
              left += width;
              eAttachment.left = 'left';
            } else if (eAttachment.left === 'left') {
              left += targetWidth;
              tAttachment.left = 'right';
              left -= width;
              eAttachment.left = 'right';
            }
          } else if (left + width > bounds[2] && tAttachment.left === 'right') {
            if (eAttachment.left === 'left') {
              left -= targetWidth;
              tAttachment.left = 'left';
              left -= width;
              eAttachment.left = 'right';
            } else if (eAttachment.left === 'right') {
              left -= targetWidth;
              tAttachment.left = 'left';
              left += width;
              eAttachment.left = 'left';
            }
          } else if (tAttachment.left === 'center') {
            if (left + width > bounds[2] && eAttachment.left === 'left') {
              left -= width;
              eAttachment.left = 'right';
            } else if (left < bounds[0] && eAttachment.left === 'right') {
              left += width;
              eAttachment.left = 'left';
            }
          }
        }
        if (changeAttachY === 'element' || changeAttachY === 'both') {
          if (top < bounds[1] && eAttachment.top === 'bottom') {
            top += height;
            eAttachment.top = 'top';
          }
          if (top + height > bounds[3] && eAttachment.top === 'top') {
            top -= height;
            eAttachment.top = 'bottom';
          }
        }
        if (changeAttachX === 'element' || changeAttachX === 'both') {
          if (left < bounds[0] && eAttachment.left === 'right') {
            left += width;
            eAttachment.left = 'left';
          }
          if (left + width > bounds[2] && eAttachment.left === 'left') {
            left -= width;
            eAttachment.left = 'right';
          }
        }
        if (typeof pin === 'string') {
          pin = (function() {
            var _len4, _m, _ref7, _results;
            _ref7 = pin.split(',');
            _results = [];
            for (_m = 0, _len4 = _ref7.length; _m < _len4; _m++) {
              p = _ref7[_m];
              _results.push(p.trim());
            }
            return _results;
          })();
        } else if (pin === true) {
          pin = ['top', 'left', 'right', 'bottom'];
        }
        pin || (pin = []);
        pinned = [];
        oob = [];
        if (top < bounds[1]) {
          if (__indexOf.call(pin, 'top') >= 0) {
            top = bounds[1];
            pinned.push('top');
          } else {
            oob.push('top');
          }
        }
        if (top + height > bounds[3]) {
          if (__indexOf.call(pin, 'bottom') >= 0) {
            top = bounds[3] - height;
            pinned.push('bottom');
          } else {
            oob.push('bottom');
          }
        }
        if (left < bounds[0]) {
          if (__indexOf.call(pin, 'left') >= 0) {
            left = bounds[0];
            pinned.push('left');
          } else {
            oob.push('left');
          }
        }
        if (left + width > bounds[2]) {
          if (__indexOf.call(pin, 'right') >= 0) {
            left = bounds[2] - width;
            pinned.push('right');
          } else {
            oob.push('right');
          }
        }
        if (pinned.length) {
          pinnedClass = (_ref7 = this.options.pinnedClass) != null ? _ref7 : this.getClass('pinned');
          addClasses.push(pinnedClass);
          for (_m = 0, _len4 = pinned.length; _m < _len4; _m++) {
            side = pinned[_m];
            addClasses.push("" + pinnedClass + "-" + side);
          }
        }
        if (oob.length) {
          oobClass = (_ref8 = this.options.outOfBoundsClass) != null ? _ref8 : this.getClass('out-of-bounds');
          addClasses.push(oobClass);
          for (_n = 0, _len5 = oob.length; _n < _len5; _n++) {
            side = oob[_n];
            addClasses.push("" + oobClass + "-" + side);
          }
        }
        if (__indexOf.call(pinned, 'left') >= 0 || __indexOf.call(pinned, 'right') >= 0) {
          eAttachment.left = tAttachment.left = false;
        }
        if (__indexOf.call(pinned, 'top') >= 0 || __indexOf.call(pinned, 'bottom') >= 0) {
          eAttachment.top = tAttachment.top = false;
        }
        if (tAttachment.top !== targetAttachment.top || tAttachment.left !== targetAttachment.left || eAttachment.top !== this.attachment.top || eAttachment.left !== this.attachment.left) {
          this.updateAttachClasses(eAttachment, tAttachment);
        }
      }
      defer(function() {
        updateClasses(_this.target, addClasses, allClasses);
        return updateClasses(_this.element, addClasses, allClasses);
      });
      return {
        top: top,
        left: left
      };
    }
  });

}).call(this);

(function() {
  var defer, getBounds, updateClasses, _ref;

  _ref = this.Tether.Utils, getBounds = _ref.getBounds, updateClasses = _ref.updateClasses, defer = _ref.defer;

  this.Tether.modules.push({
    position: function(_arg) {
      var abutted, addClasses, allClasses, bottom, height, left, right, side, sides, targetPos, top, width, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref1, _ref2, _ref3, _ref4, _ref5,
        _this = this;
      top = _arg.top, left = _arg.left;
      _ref1 = this.cache('element-bounds', function() {
        return getBounds(_this.element);
      }), height = _ref1.height, width = _ref1.width;
      targetPos = this.getTargetBounds();
      bottom = top + height;
      right = left + width;
      abutted = [];
      if (top <= targetPos.bottom && bottom >= targetPos.top) {
        _ref2 = ['left', 'right'];
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          side = _ref2[_i];
          if ((_ref3 = targetPos[side]) === left || _ref3 === right) {
            abutted.push(side);
          }
        }
      }
      if (left <= targetPos.right && right >= targetPos.left) {
        _ref4 = ['top', 'bottom'];
        for (_j = 0, _len1 = _ref4.length; _j < _len1; _j++) {
          side = _ref4[_j];
          if ((_ref5 = targetPos[side]) === top || _ref5 === bottom) {
            abutted.push(side);
          }
        }
      }
      allClasses = [];
      addClasses = [];
      sides = ['left', 'top', 'right', 'bottom'];
      allClasses.push(this.getClass('abutted'));
      for (_k = 0, _len2 = sides.length; _k < _len2; _k++) {
        side = sides[_k];
        allClasses.push("" + (this.getClass('abutted')) + "-" + side);
      }
      if (abutted.length) {
        addClasses.push(this.getClass('abutted'));
      }
      for (_l = 0, _len3 = abutted.length; _l < _len3; _l++) {
        side = abutted[_l];
        addClasses.push("" + (this.getClass('abutted')) + "-" + side);
      }
      defer(function() {
        updateClasses(_this.target, addClasses, allClasses);
        return updateClasses(_this.element, addClasses, allClasses);
      });
      return true;
    }
  });

}).call(this);

(function() {
  this.Tether.modules.push({
    position: function(_arg) {
      var left, result, shift, shiftLeft, shiftTop, top, _ref;
      top = _arg.top, left = _arg.left;
      if (!this.options.shift) {
        return;
      }
      result = function(val) {
        if (typeof val === 'function') {
          return val.call(this, {
            top: top,
            left: left
          });
        } else {
          return val;
        }
      };
      shift = result(this.options.shift);
      if (typeof shift === 'string') {
        shift = shift.split(' ');
        shift[1] || (shift[1] = shift[0]);
        shiftTop = shift[0], shiftLeft = shift[1];
        shiftTop = parseFloat(shiftTop, 10);
        shiftLeft = parseFloat(shiftLeft, 10);
      } else {
        _ref = [shift.top, shift.left], shiftTop = _ref[0], shiftLeft = _ref[1];
      }
      top += shiftTop;
      left += shiftLeft;
      return {
        top: top,
        left: left
      };
    }
  });

}).call(this);


	root.Tether = this.Tether;

	if (typeof define === 'function') {
		define('aui/internal/tether',[],function() {
			return root.Tether;
		});
	} else if (typeof exports === 'object') {
		module.exports = root.Tether;
	}
}(this));

jQuery.os = {};
var jQueryOSplatform = navigator.platform.toLowerCase();
jQuery.os.windows = (jQueryOSplatform.indexOf("win") != -1);
jQuery.os.mac = (jQueryOSplatform.indexOf("mac") != -1);
jQuery.os.linux = (jQueryOSplatform.indexOf("linux") != -1);
/**
 *
 * @module Controls
 * @requires AJS, jQuery
 */

/**
 * If not visible, moves the scroll position of the screen to the element
 *
 * <pre>
 * <strong>Usage:</strong>
 * jQuery("li.item").moveTo();
 * </pre>
 *
 * This plugin also supports options as an argument.  The options
 * that can be defined are:
 * <ul>
 * <li>transition - if set to true will cause a smooth scrolling transition (false by default)</li>
 * <li>scrollOffset - defines an offset to scroll past the element to view in pixels such that
 * all of it can be viewed (35 pixels by default)</li>
 * </ul>
 *
 * @class moveTo
 * @constuctor moveTo
 * @namespace jQuery.fn
 * @param {Object} options
 */
jQuery.fn.moveTo = function (options) {
    var defaults = {
        transition: false,
        scrollOffset: 35
    };

    var opts = jQuery.extend(defaults, options),
        instance = this,
        topOffset = instance.offset().top,
        scrollTarget;

    if ((jQuery(window).scrollTop() + jQuery(window).height() - this.outerHeight() < topOffset ||
            jQuery(window).scrollTop() + opts.scrollOffset > topOffset) &&
            jQuery(window).height() > opts.scrollOffset) {

        if(jQuery(window).scrollTop() + opts.scrollOffset > topOffset) {
            //move up
            scrollTarget = topOffset - (jQuery(window).height() - this.outerHeight()) + opts.scrollOffset;
        } else {
            //move down
            scrollTarget = topOffset - opts.scrollOffset;
        }

        if (!jQuery.fn.moveTo.animating && opts.transition) {
            jQuery(document).trigger("moveToStarted", this);
            jQuery.fn.moveTo.animating = true;
            jQuery("html,body").animate({
                scrollTop: scrollTarget
            }, 1000, function () {
                jQuery(document).trigger("moveToFinished", instance);
                delete jQuery.fn.moveTo.animating;
            });
            return this;
        } else {
            var jQueryCache =  jQuery('html, body');
            if (jQueryCache.is(":animated")) {
                jQueryCache.stop();
                delete jQuery.fn.moveTo.animating;
            }

            jQuery(document).trigger("moveToStarted");
            jQuery(window).scrollTop(scrollTarget);
            //need to put a slight timeout for the moveToFinished event such that recipients of this event
            //have time to act on it.
            setTimeout(function() {
                jQuery(document).trigger("moveToFinished", instance);
            }, 100);
            return this;
        }
    }
    jQuery(document).trigger("moveToFinished", this);
    return this;
};
(function() {
    'use strict';

    if (window.CustomEvent) {
        // Some browsers don't support constructable custom events yet.
        try {
            new CustomEvent();
        } catch (e) {
            return;
        }
    }

    /**
     * @type CustomEvent
     * @param {String} event - the name of the event.
     * @param {Object} [params] - optional configuration of the custom event.
     * @param {Boolean} [params.cancelable=false] - A boolean indicating whether the event is cancelable (i.e., can call preventDefault and set the defaultPrevented property).
     * @param {Boolean} [params.bubbles=false] - A boolean indicating whether the event bubbles up through the DOM or not.
     * @param {Boolean} [params.detail] - The data passed when initializing the event.
     * @extends Event
     * @returns {Event}
     * @constructor
     */
    function CustomEvent (event, params) {
        params = params || { bubbles: false, cancelable: false, detail: undefined };

        var evt = document.createEvent('CustomEvent');

        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);

        return evt;
    }

    CustomEvent.prototype = window.Event.prototype;

    window.CustomEvent = CustomEvent;

}());

window.AJS = window.AJS || {};

(function() {
    'use strict';

    /**
     * AUI-2773
     * The following shim for console is deprecated and to be removed in AUI 6.
     * We shouldn't be creating console.log if it doesn't exist; instead, we should avoid using it directly.
     * @start deprecated
     */
    if (typeof window.console === 'undefined') {
        window.console = {
            messages: [],

            log: function (text) {
                this.messages.push(text);
            },

            show: function () {
                alert(this.messages.join('\n'));
                this.messages = [];
            }
        };
    } else {
        // Firebug console - show not required to do anything.
        window.console.show = function () {};
    }
    /** @end deprecated */


    function polyfillConsole (prop) {
        return function () {
            if (typeof console !== 'undefined' && console[prop]) {
                Function.prototype.apply.call(console[prop], console, arguments);
            }
        };
    }

    /**
     * Logs the given object to the console.
     */
    AJS.log = polyfillConsole('log');

    /**
     * Logs the given object to the console as a warning.
     */
    AJS.warn = polyfillConsole('warn');

    /**
     * Logs the given object to the console as an error.
     */
    AJS.error = polyfillConsole('error');

})();

(function(init) {
    'use strict';

    window.AJS = window.AJS || {};
    window.AJS.deprecate = init(jQuery || Zepto);

    if (typeof define === 'function') {
        define('aui/internal/deprecation',[],function() {
            return window.AJS.deprecate;
        });
    }
})(function ($) {
    'use strict';

    var exports = {};

    var has = Object.prototype.hasOwnProperty;

    function toSentenceCase (str) {
        str += '';
        if (!str) {
            return '';
        }
        return str.charAt(0).toUpperCase() + str.substring(1);
    }

    var deprecationCalls = [];

    /**
     * Return a function that logs a deprecation warning to the console the first time it is called from a certain location.
     * It will also print the stack frame of the calling function.
     *
     * @param {string} displayName the name of the thing being deprecated
     * @param {object} options
     * @param {string} options.removeInVersion the version this will be removed in
     * @param {string} options.alternativeName the name of an alternative to use
     * @param {string} options.sinceVersion the version this has been deprecated since
     * @param {string} options.extraInfo extra information to be printed at the end of the deprecation log
     * @param {string} options.extraObject an extra object that will be printed at the end
     * @param {string} options.deprecationType type of the deprecation to append to the start of the deprecation message. e.g. JS or CSS
     * @return {Function} that logs the warning and stack frame of the calling function. Takes in an optional parameter for the offset of
     * the stack frame to print, the default is 0. For example, 0 will log it for the line of the calling function,
     * -1 will print the location the logger was called from
     */
    function getShowDeprecationMessage(displayName, options) {
        // This can be used internally to pas in a showmessage fn
        if (typeof displayName === 'function') {
            return displayName;
        }
        var called = false;
        options = options || {};

        return function(printFrameOffset) {
            var deprecatedLocation = exports.__getDeprecatedLocation(printFrameOffset ? printFrameOffset : 1) || '';
            // Only log once if the stack frame doesn't exist to avoid spamming the console/test output
            if (!called || deprecationCalls.indexOf(deprecatedLocation) === -1) {
                deprecationCalls.push(deprecatedLocation);

                called = true;

                var deprecationType = (options.deprecationType + ' ') || '';

                var message = 'DEPRECATED ' + deprecationType + '- ' + toSentenceCase(displayName) +
                    ' has been deprecated' + (options.sinceVersion ? ' since ' + options.sinceVersion : '') +
                    ' and will be removed in ' + (options.removeInVersion || 'a future release') + '.';

                if (options.alternativeName) {
                    message += ' Use ' + options.alternativeName + ' instead. ';
                }

                if (options.extraInfo) {
                    message += ' ' + options.extraInfo;
                }

                if (deprecatedLocation === '') {
                    deprecatedLocation = ' \n ' + 'No stack trace of the deprecated usage is available in your current browser.';
                } else {
                    deprecatedLocation = ' \n ' + deprecatedLocation;
                }

                if (options.extraObject) {
                    message += '\n';
                    exports.__logger(message, options.extraObject, deprecatedLocation);
                } else {
                    exports.__logger(message, deprecatedLocation);
                }
            }
        };
    }

    //TODO AUI-2700
    exports.__logger = function() {
        return AJS.warn.apply(undefined, arguments);
    };

    exports.__getDeprecatedLocation = function (printFrameOffset) {
        var err = new Error();
        var stack = err.stack || err.stacktrace;
        var stackMessage = (stack && stack.replace(/^Error\n/, '')) || '';

        if (stackMessage) {
            stackMessage = stackMessage.split('\n');
            return stackMessage[printFrameOffset + 2];
        }
        return stackMessage;
    };

    /**
     * Returns a wrapped version of the function that logs a deprecation warning when the function is used.
     * @param {Function} fn the fn to wrap
     * @param {string} displayName the name of the fn to be displayed in the message
     * @param {string} options.removeInVersion the version this will be removed in
     * @param {string} options.alternativeName the name of an alternative to use
     * @param {string} options.sinceVersion the version this has been deprecated since
     * @param {string} options.extraInfo extra information to be printed at the end of the deprecation log
     * @return {Function} wrapping the original function
     */
    function deprecateFunctionExpression(fn, displayName, options) {
        options = options || {};
        options.deprecationType = options.deprecationType || 'JS';

        var showDeprecationMessage = getShowDeprecationMessage(displayName || fn.name || 'this function', options);
        return function() {
            showDeprecationMessage();
            return fn.apply(this, arguments);
        };
    }

    /**
     * Returns a wrapped version of the constructor that logs a deprecation warning when the constructor is instantiated.
     * @param {Function} constructorFn the constructor function to wrap
     * @param {string} displayName the name of the fn to be displayed in the message
     * @param {string} options.removeInVersion the version this will be removed in
     * @param {string} options.alternativeName the name of an alternative to use
     * @param {string} options.sinceVersion the version this has been deprecated since
     * @param {string} options.extraInfo extra information to be printed at the end of the deprecation log
     * @return {Function} wrapping the original function
     */
    function deprecateConstructor(constructorFn, displayName, options) {
        options = options || {};
        options.deprecationType = options.deprecationType || 'JS';

        var deprecatedConstructor = deprecateFunctionExpression(constructorFn, displayName, options);
        deprecatedConstructor.prototype = constructorFn.prototype;
        $.extend(deprecatedConstructor, constructorFn); //copy static methods across;

        return deprecatedConstructor;
    }


    var supportsProperties = false;
    try {
        if (Object.defineProperty) {
            Object.defineProperty({}, 'blam', { get : function() {}, set: function() {} });
            supportsProperties = true;
        }
    } catch(e) {
        /* IE8 doesn't support on non-DOM elements */
    }

    /**
     * Wraps a "value" object property in a deprecation warning in browsers supporting Object.defineProperty
     * @param {Object} obj the object containing the property
     * @param {string} prop the name of the property to deprecate
     * @param {string} options.removeInVersion the version this will be removed in
     * @param {string} options.displayName the display name of the property to deprecate (optional, will fall back to the property name)
     * @param {string} options.alternativeName the name of an alternative to use
     * @param {string} options.sinceVersion the version this has been deprecated since
     * @param {string} options.extraInfo extra information to be printed at the end of the deprecation log
     */
    function deprecateValueProperty(obj, prop, options) {
        if (supportsProperties) {
            var oldVal = obj[prop];
            options = options || {};
            options.deprecationType = options.deprecationType || 'JS';

            var displayNameOrShowMessageFn = options.displayName || prop;
            var showDeprecationMessage = getShowDeprecationMessage(displayNameOrShowMessageFn, options);
            Object.defineProperty(obj, prop, {
                get : function () {
                    showDeprecationMessage();
                    return oldVal;
                },
                set : function(val) {
                    oldVal = val;
                    showDeprecationMessage();
                    return val;
                }
            });
        } else {
            // Browser doesn't support properties, so we can't hook in to show the deprecation warning.
        }
    }

    /**
     * Wraps an object property in a deprecation warning, if possible. functions will always log warnings, but other
     * types of properties will only log in browsers supporting Object.defineProperty
     * @param {Object} obj the object containing the property
     * @param {string} prop the name of the property to deprecate
     * @param {string} options.removeInVersion the version this will be removed in
     * @param {string} options.displayName the display name of the property to deprecate (optional, will fall back to the property name)
     * @param {string} options.alternativeName the name of an alternative to use
     * @param {string} options.sinceVersion the version this has been deprecated since
     * @param {string} options.extraInfo extra information to be printed at the end of the deprecation log
     */
    function deprecateObjectProperty(obj, prop, options) {
        if (typeof obj[prop] === 'function') {
            options = options || {};
            options.deprecationType = options.deprecationType || 'JS';

            var displayNameOrShowMessageFn = options.displayName || prop;
            obj[prop] = deprecateFunctionExpression(obj[prop], displayNameOrShowMessageFn, options);
        } else {
            deprecateValueProperty(obj, prop, options);
        }
    }

    /**
     * Wraps all an objects properties in a deprecation warning, if possible. functions will always log warnings, but other
     * types of properties will only log in browsers supporting Object.defineProperty
     * @param {Object} obj the object to be wrapped
     * @param {string} objDisplayPrefix the object's prefix to be used in logs
     * @param {string} options.removeInVersion the version this will be removed in
     * @param {string} options.alternativeNamePrefix the name of another object to prefix the deprecated objects properties with
     * @param {string} options.sinceVersion the version this has been deprecated since
     * @param {string} options.extraInfo extra information to be printed at the end of the deprecation log
     */
    function deprecateAllProperties(obj, objDisplayPrefix, options) {
        options = options || {};
        for(var attr in obj) {
            if (has.call(obj, attr)) {
                options.deprecationType = options.deprecationType || 'JS';
                options.displayName = objDisplayPrefix + attr;
                options.alternativeName = options.alternativeNamePrefix && (options.alternativeNamePrefix + attr);
                deprecateObjectProperty(obj, attr, $.extend({}, options));
            }
        }
    }

    function matchesSelector(el, selector) {
        return (el.matches || el.msMatchesSelector || el.webkitMatchesSelector || el.mozMatchesSelector || el.oMatchesSelector).call(el, selector);
    }

    function handleAddingSelector(options) {
        return function (selector, index) {
            var selectorMap = {
                selector: selector,
                options: options || {}
            };

            deprecatedSelectorMap.push(selectorMap);

            // Search if matches have already been added
            var matches = document.querySelectorAll(selector);
            for (var i = 0; i < matches.length; i++) {
                logCssDeprecation(selectorMap, matches[i]);
            }
        };
    }

    /**
     * Return a function that logs a deprecation warning to the console the first time it is called from a certain location.
     * It will also print the stack frame of the calling function.
     *
     * @param {string|Array} selectors a selector or list of selectors that match deprecated markup
     * @param {object} options
     * @param {string} options.displayName a name describing these selectors
     * @param {string} options.alternativeName the name of an alternative to use
     * @param {string} options.removeInVersion the version these will be removed in
     * @param {string} options.sinceVersion the version these have been deprecated since
     * @param {string} options.extraInfo extra information to be printed at the end of the deprecation log
     */
    function deprecateCSS(selectors, options) {
        if (!window.MutationObserver) {
            exports.__logger('CSS could not be deprecated as Mutation Observer was not found.');
            return;
        }

        if (typeof selectors === 'string') {
            selectors = [selectors];
        }

        selectors.forEach(handleAddingSelector(options));
    }

    function testAndHandleDeprecation(newNode) {
        return function (selectorMap, index) {
            if (matchesSelector(newNode, selectorMap.selector)) {
                logCssDeprecation(selectorMap, newNode);
            }
        };
    }

    function logCssDeprecation(selectorMap, newNode) {
        var displayName = selectorMap.options.displayName;
        displayName = displayName ? ' (' + displayName + ')': '';

        var options = $.extend({
            deprecationType: 'CSS',
            extraObject: newNode
        }, selectorMap.options);

        getShowDeprecationMessage('\'' + selectorMap.selector + '\' pattern' + displayName, options)();
    }

    if (window.MutationObserver) {
        var deprecatedSelectorMap = [];
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                // TODO - should this also look at class changes, if possible?
                var addedNodes = mutation.addedNodes;

                for (var i = 0; i < addedNodes.length; i++) {
                    var newNode = addedNodes[i];
                    if (newNode.nodeType === 1) {
                        deprecatedSelectorMap.forEach(testAndHandleDeprecation(newNode));
                    }
                }
            });
        });

        var config = {
            childList: true,
            subtree: true
        };

        observer.observe(document, config);
    }

    exports.fn = deprecateFunctionExpression;
    exports.construct = deprecateConstructor;
    exports.css = deprecateCSS;
    exports.prop = deprecateObjectProperty;
    exports.obj = deprecateAllProperties;
    exports.propertyDeprecationSupported = supportsProperties;
    exports.getMessageLogger = getShowDeprecationMessage;

    return exports;

});

/*! Atlassian UI and the Atlassian Design Guidelines are created by Atlassian. See https://developer.atlassian.com/display/AUI/ for API documentation and https://developer.atlassian.com/design/ for license details. */

/**
 * A collection of Atlassian JavaScript UI components.
 *
 * AUI components/functions should be assumed Private unless included in the API documentation at http://developer.atlassian.com/display/AUI
 *
 * @module AJS
 * @requires jQuery
 */
(function () {

    'use strict';

    if (!window.jQuery && !window.Zepto) {
        throw new Error('either jQuery or Zepto is required for AJS to function.');
    }

    /**
     * AJS contains utility methods, used by various components. It also provides the namespacing for all AUI components.
     *
     * @class AJS
     * @requires jQuery
     */
    window.AJS = (function () {
        var included = [];
        var uniqueID;
        var uniqueIDstring;
        var uniqueIDcounter = 0;

        function escapeHtmlReplacement(str) {
            var special = {
                '<': '&lt;',
                '>': '&gt;',
                '&': '&amp;',
                '\'': '&#39;',
                '`': '&#96;'
            };

            if (typeof special[str] === 'string') {
                return special[str];
            }

            return '&quot;';
        }

        var ESCAPE_HTML_SPECIAL_CHARS = /[&"'<>`]/g;
        var res = {
            /**
             * Version number to allow for rough backwards compatibility via conditionals
             * NOTE: Don't change. Generated by the Maven at build.
             * @property version
             */
            version: '5.8.11',

            /**
             * Parameters are loaded from the DOM on page load.
             * @property params
             */
            params: {},

            /**
             * Returns an HTMLElement reference.
             * @method $
             * @param {String | HTMLElement |Array} el Accepts a string to use as an ID for getting a DOM reference, an actual DOM reference, or an Array of IDs and/or HTMLElements.
             * @return {HTMLElement | Array} A DOM reference to an HTML element or an array of HTMLElements.
             */
            $: window.jQuery || window.Zepto,

            /**
             * Calls e.preventDefault. This is designed for event handlers that only need to prevent the default browser
             * action, eg:
             * AJS.$(".my-class").click(AJS.preventDefault)
             * @param e jQuery event
             */
            preventDefault: function (e) {
                e.preventDefault();
            },

            /**
             * Prevent further handling of an event. Returns false, which you should use as the return value of your event handler:
             * return AJS.stopEvent(e);
             * @param e jQuery event
             * @deprecated use AJS.preventDefault() instead
             */
            stopEvent: function (e) {
                e.stopPropagation();
                return false; // required for JWebUnit pop-up links to work properly
            },

            include: function (url) {
                if (!this.contains(included, url)) {
                    included.push(url);
                    var s = document.createElement('script');
                    s.src = url;
                    this.$('body').append(s);
                }
            },

            /**
             * Shortcut function to toggle class name of an element.
             * @method toggleClassName
             * @param {String | HTMLElement} element The HTMLElement or an ID to toggle class name on.
             * @param {String} className The class name to remove or add.
             */
            toggleClassName: function (element, className) {
                if (!(element = this.$(element))) {
                    return;
                }

                element.toggleClass(className);
            },

            /**
             * Shortcut function adds or removes 'hidden' classname to an element based on a passed boolean.
             * @method setVisible
             * @param {String | HTMLElement} element The HTMLElement or an ID to show or hide.
             * @param {boolean} show true to show, false to hide
             */
            setVisible: function (element, show) {
                if (!(element = this.$(element))) {
                    return;
                }
                // aliased for use inside function below
                var $ = this.$;

                $(element).each(function () {
                    var isHidden = $(this).hasClass('hidden');

                    if (isHidden && show) {
                        $(this).removeClass('hidden');
                    } else if (!isHidden && !show) {
                        $(this).addClass('hidden');
                    }
                });
            },

            /**
             * Shortcut function adds or removes 'current' classname to an element based on a passed boolean.
             * @param {String | HTMLElement} element The HTMLElement or an ID to show or hide.
             * @param {boolean} show true to add 'current' class, false to remove
             */
            setCurrent: function (element, current) {
                if (!(element = this.$(element))) {
                    return;
                }

                if (current) {
                    element.addClass('current');
                }
                else {
                    element.removeClass('current');
                }
            },

            /**
             * Shortcut function to see if passed element is currently visible on screen.
             * @method isVisible
             * @param {String | HTMLElement} element The HTMLElement or an jQuery selector to check.
             */
            isVisible: function (element) {
                return !this.$(element).hasClass('hidden');
            },

            /**
             * Shortcut function to see if passed element is truncated/clipped, eg. with text-overflow: ellipsis
             * @method isClipped
             * @param {String | HTMLElement} element The HTMLElement or an jQuery selector to check.
             */
            isClipped: function (el) {
                el = AJS.$(el);
                return (el.prop('scrollWidth') > el.prop('clientWidth'));
            },

            /**
             * Find parameters in the DOM and store them in the provided object, or the ajs.params object if parameter is not present.
             */
            populateParameters: function (parameters) {
                if (!parameters) {
                    parameters = this.params;
                }

                var ajs = this;

                this.$('.parameters input').each(function () {
                    var value = this.value,
                        id = this.title || this.id;
                    if (ajs.$(this).hasClass('list')) {
                        if (parameters[id]) {
                            parameters[id].push(value);
                        } else {
                            parameters[id] = [value];
                        }
                    } else {
                        parameters[id] = (value.match(/^(tru|fals)e$/i) ? value.toLowerCase() === 'true' : value);
                    }
                });
            },

            /**
             * Adds functions to the list of methods to be run on initialisation. Wraps
             * error handling around the provided function so its failure won't prevent
             * other init functions running.
             * @method toInit
             * @param {Function} func Function to be call on initialisation.
             * @return AJS object.
             */
            toInit: function (func) {
                var ajs = this;

                this.$(function () {
                    try {
                        func.apply(this, arguments);
                    } catch (ex) {
                        ajs.log('Failed to run init function: ' + ex + '\n' + func.toString());
                    }
                });

                return this;
            },

            /**
             * Finds the index of an element in the array.
             * @method indexOf
             * @param item Array element which will be searched.
             * @param fromIndex (optional) the index from which the item will be searched. Negative values will search from the
             * end of the array.
             * @return a zero based index of the element.
             */
            indexOf: function (array, item, fromIndex) {
                var length = array.length;

                if (!fromIndex) {
                    fromIndex = 0;
                } else if (fromIndex < 0) {
                    fromIndex = Math.max(0, length + fromIndex);
                }

                for (var i = fromIndex; i < length; i++) {
                    if (array[i] === item) {
                        return i;
                    }
                }

                return -1;
            },

            /**
             * Looks for an element inside the array.
             * @method contains
             * @param item Array element which will be searched.
             * @return {Boolean} Is element in array.
             */
            contains: function (array, item) {
                return this.indexOf(array, item) > -1;
            },

            /**
             * Includes firebug lite for debugging in IE. Especially in IE.
             * @method firebug
             * @usage Type in addressbar "javascript:alert(AJS.firebug());"
             * @deprecated
             */
            firebug: function () {
                // Deprecated in 5.1
                var script = this.$(document.createElement('script'));
                script.attr('src', 'https://getfirebug.com/releases/lite/1.2/firebug-lite-compressed.js');
                this.$('head').append(script);
                (function () {
                    if (window.firebug) {
                        firebug.init();
                    } else {
                        setTimeout(AJS.firebug, 0);
                    }
                })();
            },

            /**
             * Clones the element specified by the selector and removes the id attribute
             * @param selector a jQuery selector
             */
            clone : function (selector) {
                return AJS.$(selector).clone().removeAttr('id');
            },

            /**
             * Compare two strings in alphanumeric way
             * @method alphanum
             * @param {String} a first string to compare
             * @param {String} b second string to compare
             * @return {Number(-1|0|1)} -1 if a < b, 0 if a = b, 1 if a > b
             * @usage a.sort(AJS.alphanum)
             */
            alphanum: function (a, b) {
                a = (a + '').toLowerCase();
                b = (b + '').toLowerCase();

                var chunks = /(\d+|\D+)/g;
                var am = a.match(chunks);
                var bm = b.match(chunks);
                var len = Math.max(am.length, bm.length);

                for (var i = 0; i < len; i++) {
                    if (i === am.length) {
                        return -1;
                    }

                    if (i === bm.length) {
                        return 1;
                    }

                    var ad = parseInt(am[i], 10) + '';
                    var bd = parseInt(bm[i], 10) + '';

                    if (ad === am[i] && bd === bm[i] && ad !== bd) {
                        return (ad - bd) / Math.abs(ad - bd);
                    }

                    if ((ad !== am[i] || bd !== bm[i]) && am[i] !== bm[i]) {
                        return am[i] < bm[i] ? -1 : 1;
                    }
                }
                return 0;
            },

            onTextResize: function (f) {
                if (typeof f === 'function') {
                    if (AJS.onTextResize['on-text-resize']) {
                        AJS.onTextResize['on-text-resize'].push(function (emsize) {
                            f(emsize);
                        });
                    } else {
                        var em = AJS('div');

                        em.css({
                            width: '1em',
                            height: '1em',
                            position: 'absolute',
                            top: '-9999em',
                            left: '-9999em'
                        });

                        this.$('body').append(em);
                        em.size = em.width();

                        setInterval(function () {
                            if (em.size !== em.width()) {
                                em.size = em.width();

                                for (var i = 0, ii = AJS.onTextResize['on-text-resize'].length; i < ii; i++) {
                                    AJS.onTextResize['on-text-resize'][i](em.size);
                                }
                            }
                        }, 0);
                        AJS.onTextResize.em = em;
                        AJS.onTextResize['on-text-resize'] = [function (emsize) {
                            f(emsize);
                        }];
                    }
                }
            },

            unbindTextResize: function (f) {
                for (var i = 0, ii = AJS.onTextResize['on-text-resize'].length; i < ii; i++) {
                    if (AJS.onTextResize['on-text-resize'][i] === f) {
                        return AJS.onTextResize['on-text-resize'].splice(i, 1);
                    }
                }
            },

            /**
             * Similar to Javascript's in-built escape() function, but where the built-in escape()
             * might encode unicode charaters as %uHHHH, this function will leave them as-is.
             *
             * NOTE: this function does not do html-escaping, see AJS.escapeHtml()
             */
            escape: function (string) {
                return escape(string).replace(/%u\w{4}/gi, function (w) {
                    return unescape(w);
                });
            },

            /**
             * Sanitise a string for use with innerHTML or as an attribute.
             *
             * @param {String} str
             */
            escapeHtml: function (str) {
                return str.replace(ESCAPE_HTML_SPECIAL_CHARS, escapeHtmlReplacement);
            },

            /**
             * Filters a list of entries by a passed search term.
             *
             * Options :
             *   - "keywordsField" - name of entry field containing keywords, default "keywords"
             *   - "ignoreForCamelCase" - ignore search case for camel case, e.g. CB matches Code Block *and* Code block
             *   - "matchBoundary" - match words only at boundary, e.g. link matches "linking" but not "hyperlinks"
             *   - "splitRegex" - regex to split search words, instead of on whitespace
             *
             * @param entries an index array of objects with a "keywords" property
             * @param search one or more words to search on, which may include camel-casing.
             * @param options - optional - specifiy to override default behaviour
             */
            filterBySearch : function (entries, search, options) {
                // search for nothing, get nothing - up to calling code to handle.
                if (!search) {
                    return [];
                }

                var $ = this.$;
                var keywordsField = (options && options.keywordsField) || 'keywords';
                var camelCaseFlags = (options && options.ignoreForCamelCase) ? 'i' : '';
                var boundaryFlag  = (options && options.matchBoundary) ? '\\b' : '';
                var splitRegex = (options && options.splitRegex) || (/\s+/);

                // each word in the input is considered a distinct filter that has to match a keyword in the record
                var filterWords = search.split(splitRegex);
                var filters = [];

                filterWords.forEach(function(word) {
                    // anchor on word boundaries
                    var subfilters = [new RegExp(boundaryFlag + word, 'i')];

                    // split camel-case into separate words
                    if (/^([A-Z][a-z]*) {2,}$/.test(this)) {
                        var camelRegexStr = this.replace(/([A-Z][a-z]*)/g, '\\b$1[^,]*');

                        subfilters.push(new RegExp(camelRegexStr, camelCaseFlags));
                    }

                    filters.push(subfilters);
                });

                var result = [];

                entries.forEach(function(entry) {
                    for (var i = 0; i < filters.length; i++) {
                        var somethingMatches = false;

                        for (var j = 0; j < filters[i].length; j++) {
                            if (filters[i][j].test(entry[keywordsField])) {
                                somethingMatches = true;
                                break;
                            }
                        }

                        if (!somethingMatches) {
                            return;
                        }
                    }

                    result.push(entry);
                });

                return result;
            },

            /**
             * Draws an AUI logo with SVG.
             * @deprecated
             */
            drawLogo : function (options) {
                // Deprecated in 5.1
                var scale = options.scaleFactor || 1;
                var fill = options.fill || '#fff';
                var stroke = options.stroke || '#000';
                var width = 400 * scale;
                var height = 40 * scale;
                var strokeWidth = options.strokeWidth || 1;
                var containerID = options.containerID || '.aui-logo';

                if (!AJS.$('.aui-logo').length) {
                    AJS.$('body').append('<div id="aui-logo" class="aui-logo"><div>');
                }

                var logoCanvas = Raphael(containerID, width + 50 * scale, height + 100 * scale);
                var logo = logoCanvas.path('M 0,0 c 3.5433333,-4.7243333 7.0866667,-9.4486667 10.63,-14.173 -14.173,0 -28.346,0 -42.519,0 C -35.432667,-9.4486667 -38.976333,-4.7243333 -42.52,0 -28.346667,0 -14.173333,0 0,0 z m 277.031,28.346 c -14.17367,0 -28.34733,0 -42.521,0 C 245.14,14.173 255.77,0 266.4,-14.173 c -14.17267,0 -28.34533,0 -42.518,0 C 213.25167,0 202.62133,14.173 191.991,28.346 c -14.17333,0 -28.34667,0 -42.52,0 14.17333,-18.8976667 28.34667,-37.7953333 42.52,-56.693 -7.08667,-9.448667 -14.17333,-18.897333 -21.26,-28.346 -14.173,0 -28.346,0 -42.519,0 7.08667,9.448667 14.17333,18.897333 21.26,28.346 -14.17333,18.8976667 -28.34667,37.7953333 -42.52,56.693 -14.173333,0 -28.346667,0 -42.52,0 10.63,-14.173 21.26,-28.346 31.89,-42.519 -14.390333,0 -28.780667,0 -43.171,0 C 42.520733,1.330715e-4 31.889933,14.174867 21.26,28.347 c -42.520624,6.24e-4 -85.039187,-8.13e-4 -127.559,-0.001 11.220667,-14.961 22.441333,-29.922 33.662,-44.883 -6.496,-8.661 -12.992,-17.322 -19.488,-25.983 5.905333,0 11.810667,0 17.716,0 -10.63,-14.173333 -21.26,-28.346667 -31.89,-42.52 14.173333,0 28.346667,0 42.52,0 10.63,14.173333 21.26,28.346667 31.89,42.52 14.173333,0 28.3466667,0 42.52,0 -10.63,-14.173333 -21.26,-28.346667 -31.89,-42.52 14.1733333,0 28.3466667,0 42.52,0 10.63,14.173333 21.26,28.346667 31.89,42.52 14.390333,0 28.780667,0 43.171,0 -10.63,-14.173333 -21.26,-28.346667 -31.89,-42.52 42.51967,0 85.03933,0 127.559,0 10.63033,14.173333 21.26067,28.346667 31.891,42.52 14.17267,0 28.34533,0 42.518,0 -10.63,-14.173333 -21.26,-28.346667 -31.89,-42.52 14.17367,0 28.34733,0 42.521,0 14.17333,18.897667 28.34667,37.795333 42.52,56.693 -14.17333,18.8976667 -28.34667,37.7953333 -42.52,56.693 z');

                logo.scale(scale, -scale, 0, 0);
                logo.translate(120 * scale, height);
                logo.attr('fill', fill);
                logo.attr('stroke', stroke);
                logo.attr('stroke-width', strokeWidth);
            },

            /**
             * Debounce a function to avoid performance problems.
             */
            debounce: function (func, wait) {
                var timeout;
                var result;
                return function () {
                    var args = arguments;
                    var context = this;
                    var debounced = function () {
                        result = func.apply(context, args);
                    };
                    clearTimeout(timeout);
                    timeout = setTimeout(debounced, wait);
                    return result;
                };
            },

            /**
             * Generate a unique ID string, checking the ID is not present in the DOM before returning.
             * Note uniqueID, uniqueIDstring, uniqueIDcounter = 0; set at top of file.
             * @param {string} prefix Optional. String to prepend to ID instead of default AUI prefix.
             */
            id: function (prefix) {
                uniqueID = uniqueIDcounter++ + '';
                uniqueIDstring = prefix ? prefix + uniqueID : 'aui-uid-' + uniqueID;

                if (!document.getElementById(uniqueIDstring)) {
                    return uniqueIDstring;
                } else {
                    uniqueIDstring = uniqueIDstring + '-' + new Date().getTime();

                    if (!document.getElementById(uniqueIDstring)) {
                        return uniqueIDstring;
                    } else {
                        // if we still have a clash, something is deeply weird and needs attention.
                        throw new Error('ERROR: timestamped fallback ID ' + uniqueIDstring + ' exists. AJS.id stopped.');
                    }
                }
            },

            /**
             * Apply a unique ID to the element. Preserves ID if the element already has one.
             * @private
             * @param {HTMLElement} el Selector to find target element.
             * @param {string} prefix Optional. String to prepend to ID instead of default AUI prefix.
             */
            _addID: function (el, prefix) {
                var element = AJS.$(el);
                var addprefix = prefix || false;

                element.each(function () {
                    var $el = AJS.$(this);

                    if (!$el.attr('id')) {
                        $el.attr('id', AJS.id(addprefix));
                    }
                });
            },

            /**
             * Enables or disables any matching elements.
             */
            enable: function (el, b) {
                var $el = AJS.$(el);

                if (typeof b === 'undefined') {
                    b = true;
                }

                return $el.each(function () {
                    this.disabled = !b;
                });
            }
        };

        if (typeof AJS !== 'undefined') {
            for (var i in AJS) {
                res[i] = AJS[i];
            }
        }

        /**
         * Creates DOM object
         * @method AJS
         * @param {String} element tag name
         * @return {jQuery object}
         * @usage var a = AJS("div");
         */
        var result = function () {
            var res = null;

            if (arguments.length && typeof arguments[0] === 'string') {
                res = AJS.$(document.createElement(arguments[0]));

                if (arguments.length === 2) {
                    res.html(arguments[1]);
                }
            }

            return res;
        };

        for (var j in res) {
            result[j] = res[j];
        }

        return result;
    })();

    AJS.$(function () {
        //add version data to the body
        var $body = AJS.$('body');

        if (!$body.data('auiVersion')) {
            $body.attr('data-aui-version', AJS.version);
        }

        AJS.populateParameters();
    });

    // Setting Traditional to handle our default param serialisation
    // See http://api.jquery.com/jQuery.param/ for more
    AJS.$.ajaxSettings.traditional = true;

    AJS.deprecate.prop(AJS, 'firebug');
    AJS.deprecate.prop(AJS, 'stopEvent', {alternativeName: 'AJS.preventDefault()'});
    AJS.deprecate.prop(AJS, 'drawLogo');
    AJS.deprecate.prop(AJS, 'toggleClassName');

})();

/**
 * Replaces tokens in a string with arguments, similar to Java's MessageFormat.
 * Tokens are in the form {0}, {1}, {2}, etc.
 *
 * This version also provides support for simple choice formats (excluding floating point numbers) of the form
 * {0,choice,0#0 issues|1#1 issue|1<{0,number} issues}
 *
 * Number format is currently not implemented, tokens of the form {0,number} will simply be printed as {0}
 *
 * @method format
 * @param message the message to replace tokens in
 * @param arg (optional) replacement value for token {0}, with subsequent arguments being {1}, etc.
 * @return {String} the message with the tokens replaced
 * @usage AJS.format("This is a {0} test", "simple");
 */
AJS.format = function (message) {
    var apos = /'(?!')/g, // founds "'", but not "''"
        simpleFormat = /^\d+$/,
        numberFormat = /^(\d+),number$/, // TODO: incomplete, as doesn't support floating point numbers
        choiceFormat = /^(\d+)\,choice\,(.+)/,
        choicePart = /^(\d+)([#<])(.+)/; // TODO: does not work for floating point numbers!
    // we are caching RegExps, so will not spend time on recreating them on each call

    // formats a value, currently choice and simple replacement are implemented, proper
    var getParamValue = function(format, args) {
        // simple substitute
        /*jshint boss:true */
        var res = '', match;
        if (match = format.match(simpleFormat)) { // TODO: heavy guns for checking whether format is a simple number...
            res = args.length > ++format ? args[format] : ''; // use the argument as is, or use '' if not found
        }

        // number format
        else if (match = format.match(numberFormat)) {
            // TODO: doesn't actually format the number...
            res = args.length > ++match[1] ? args[match[1]] : '';
        }

        // choice format
        else if (match = format.match(choiceFormat)) {
            // format: "0,choice,0#0 issues|1#1 issue|1<{0,number} issues"
            // match[0]: "0,choice,0#0 issues|1#1 issue|1<{0,number} issues"
            // match[1]: "0"
            // match[2]: "0#0 issues|1#1 issue|1<{0,number} issues"

            // get the argument value we base the choice on
            var value = (args.length > ++match[1] ? args[match[1]] : null);
            if (value !== null) {
                // go through all options, checking against the number, according to following formula,
                // if X < the first entry then the first entry is returned, if X > last entry, the last entry is returned
                //
                //    X matches j if and only if limit[j] <= X < limit[j+1]
                //
                var options = match[2].split('|');

                var prevOptionValue = null; // holds last passed option
                for (var i=0; i < options.length; i++) {
                    // option: "0#0 issues"
                    // part[0]: "0#0 issues"
                    // part[1]: "0"
                    // part[2]: "#"
                    // part[3]" "0 issues";
                    var parts = options[i].match(choicePart);

                    // if value is smaller, we take the previous value, or the current if no previous exists
                    var argValue = parseInt(parts[1], 10);
                    if (value < argValue) {
                        if (prevOptionValue) {
                            res = prevOptionValue;
                            break;
                        } else {
                            res = parts[3];
                            break;
                        }
                    }
                    // if value is equal the condition, and the match is equality match we accept it
                    if (value == argValue && parts[2] == '#') {
                        res = parts[3];
                        break;
                    }
                    else {
                        // value is greater the condition, fall through to next iteration
                    }

                    // check whether we are the last option, in which case accept it even if the option does not match
                    if (i == options.length - 1) {
                        res = parts[3];
                    }

                    // retain current option
                    prevOptionValue = parts[3];
                }

                // run result through format, as the parts might contain substitutes themselves
                var formatArgs = [res].concat(Array.prototype.slice.call(args, 1));
                res = AJS.format.apply(AJS, formatArgs);
            }
        }
        return res;
    };

    // drop in replacement for the token regex
    // splits the message to return the next accurance of a i18n placeholder.
    // Does not use regexps as we need to support nested placeholders
    // text between single ticks ' are ignored
    var _performTokenRegex = function(message) {
        var tick=false, openIndex=-1, openCount=0;
        for (var i=0; i < message.length; i++) {
            // handle ticks
            var c = message.charAt(i);
            if (c == "'") {
                // toggle
                tick = !tick;
            }
            // skip if we are between ticks
            if (tick) {
                continue;
            }
            // check open brackets
            if (c === '{') {
                if (openCount === 0) {
                    openIndex = i;
                }
                openCount++;
            }
            else if (c === '}') {
                if (openCount > 0) {
                    openCount--;
                    if (openCount === 0) {
                        // we found a bracket match - generate the result array (
                        var match = [];
                        match.push(message.substring(0, i+1)); // from begin to match
                        match.push(message.substring(0, openIndex)); // everything until match start
                        match.push(message.substring(openIndex+1, i)); // matched content
                        return match;
                    }
                }
            }
        }
        return null;
    };

    var _format = function (message) {
        var args = arguments,
            res = "",
            match = _performTokenRegex(message); //message.match(token);
        while (match) {
            // reduce message to string after match
            message = message.substring(match[0].length);

            // add value before match to result
            res += match[1].replace(apos, "");

            // add formatted parameter
            res += getParamValue(match[2], args);

            // check for next match
            match = _performTokenRegex(message); //message.match(token);
        }
        // add remaining message to result
        res += message.replace(apos, "");
        return res;
    };
    return _format.apply(AJS, arguments);
};


/**
 * Returns the value defined in AJS.I18n.keys for the given key. If AJS.I18n.keys does not exist, or if the given key does not exist,
 * the key is returned - this could occur in plugin mode if the I18n transform is not performed;
 * or in flatpack mode if the i18n JS file is not loaded.
 */
AJS.I18n = {
    getText: function(key) {
        var params = Array.prototype.slice.call(arguments, 1);
        if (AJS.I18n.keys && Object.prototype.hasOwnProperty.call(AJS.I18n.keys, key)) {
            return AJS.format.apply(null, [ AJS.I18n.keys[key] ].concat(params));
        }
        return key;
    }
};
;(function(init) {
    'use strict';

    AJS._internal = AJS._internal || {};
    AJS._internal.widget = init(AJS.$);
})(function($) {
    'use strict';

    /**
     * @param {string} name The name of the widget to use in any messaging.
     * @param {function(new:{ $el: jQuery }, ?jQuery, ?Object)} Ctor
     *     A constructor which will only ever be called with "new". It must take a JQuery object as the first
     *     parameter, or generate one if not provided. The second parameter will be a configuration object.
     *     The returned object must have an $el property and a setOptions function.
     * @constructor
     */
    return function widget (name, Ctor) {
        var dataAttr = '_aui-widget-' + name;
        return function(selectorOrOptions, maybeOptions) {
            var selector;
            var options;
            if ($.isPlainObject(selectorOrOptions)) {
                options = selectorOrOptions;
            } else {
                selector = selectorOrOptions;
                options = maybeOptions;
            }

            var $el = selector && $(selector);

            var widget;
            if (!$el || !$el.data(dataAttr)) {
                widget = new Ctor($el, options || {});
                $el = widget.$el;
                $el.data(dataAttr, widget);
            } else {
                widget = $el.data(dataAttr);
                // options are discarded if $el has already been constructed
            }

            return widget;
        };
    };
});

;(function(init) {
    'use strict';

    AJS.Alignment = init(window.Tether);

    if (typeof define === 'function') {
        define('aui/internal/alignment',['aui/internal/tether'], function() {
            return AJS.Alignment;
        });
    }
})(function (Tether) {
    'use strict';

    var ATTR_ALIGNMENT = 'alignment';
    var ATTR_ALIGNMENT_STATIC = 'alignment-static';
    var ATTR_CONTAINER = 'alignment-container';
    var CLASS_PREFIX_ALIGNMENT = 'aui-alignment';
    var CLASS_PREFIX_SIDE = 'aui-alignment-side-';
    var CLASS_PREFIX_SNAP = 'aui-alignment-snap-';
    var DEFAULT_ATTACHMENT = 'right middle';
    var attachmentMap = {
        'top left': { el:'bottom left', target: 'top left' },
        'top center': { el: 'bottom center', target: 'top center' },
        'top right': { el: 'bottom right', target: 'top right' },
        'right top': { el: 'top left', target: 'top right' },
        'right middle': { el: 'middle left', target: 'middle right' },
        'right bottom': { el: 'bottom left', target: 'bottom right' },
        'bottom left': { el: 'top left', target: 'bottom left' },
        'bottom center': { el: 'top center', target: 'bottom center' },
        'bottom right': { el: 'top right', target: 'bottom right' },
        'left top': { el: 'top right', target: 'top left' },
        'left middle': { el: 'middle right', target: 'middle left' },
        'left bottom': { el: 'bottom right', target: 'bottom left' },
        'submenu left': { el: 'top left', target: 'top right' },
        'submenu right': { el: 'top right', target: 'top left' }
    };

    function addAlignmentClasses (element, side, snap) {
        var sideClass = CLASS_PREFIX_SIDE + side;
        var snapClass = CLASS_PREFIX_SNAP + snap;

        element.className += ' ' + sideClass + ' ' + snapClass;
    }

    function getAttribute (element, name) {
        return element.getAttribute(name) || element.getAttribute('data-aui-' + name);
    }

    function hasAttribute (element, name) {
        return element.hasAttribute(name) || element.hasAttribute('data-aui-' + name);
    }

    function getAlignment (element) {
        var alignment = (getAttribute(element, ATTR_ALIGNMENT) || DEFAULT_ATTACHMENT).split(' ');

        return {
            side: alignment[0],
            snap: alignment[1]
        };
    }

    function getContainer (element) {
        var container = getAttribute(element, ATTR_CONTAINER) || window;

        if (typeof container === 'string') {
            container = document.querySelector(container);
        }

        return container;
    }

    function calculateBestAlignmentSnap (target, container) {
        var snap = 'left';
        var containerBounds, targetBounds;

        if (!container || container === window || container === document) {
            container = document.documentElement;
        }

        if (container && container.nodeType && container.nodeType === 1) {
            containerBounds = container.getBoundingClientRect();
            targetBounds = target.getBoundingClientRect();

            if (targetBounds.left > containerBounds.right/2) {
                snap = 'right';
            }
        }

        return snap;
    }

    function getAttachment (side, snap) {
        return attachmentMap[side + ' ' + snap] || attachmentMap[DEFAULT_ATTACHMENT];
    }


    function Alignment (element, target) {
        var container = getContainer(element);
        var alignment = getAlignment(element);

        if (!alignment.snap || alignment.snap === 'auto') {
            alignment.snap = calculateBestAlignmentSnap(target, container);
        }

        var attachment = getAttachment(alignment.side, alignment.snap);
        var isStaticallyAligned = hasAttribute(element, ATTR_ALIGNMENT_STATIC);
        var tether = new Tether({
            enabled: false,
            element: element,
            target: target,
            attachment: attachment.el,
            targetAttachment: attachment.target,
            classPrefix: CLASS_PREFIX_ALIGNMENT,
            constraints: [
                {
                    // Try and keep the element on page
                    to: (container === window) ? 'window' : container,
                    attachment: isStaticallyAligned === true ? 'none' : 'together'
                }
            ]
        });

        addAlignmentClasses(element, alignment.side, alignment.snap);

        this._auiTether = tether;
    }

    Alignment.prototype = {
        /**
         * Stops aligning and cleans up.
         *
         * @returns {Alignment}
         */
        destroy: function () {
            this._auiTether.destroy();
            return this;
        },

        /**
         * Disables alignment.
         *
         * @returns {Alignment}
         */
        disable: function () {
            this._auiTether.disable();
            return this;
        },

        /**
         * Enables alignment.
         *
         * @returns {Alignment}
         */
        enable: function () {
            this._auiTether.enable();
            return this;
        }
    };

    return Alignment;
});

;window.AJS = window.AJS || {};
(function(exports) {
    'use strict';

    exports._internal = exports._internal || {};
    exports._internal.animation = {};

    /**
     * Force a re-compute of the style of an element.
     *
     * This is useful for CSS transitions and animations that need computed style changes to occur.
     * CSS transitions will fire when the computed value of the property they are transitioning changes.
     * This may not occur if the style changes get batched into one style change event by the browser.
     * We can force the browser to recognise the two different computed values by calling this function when we want it
     * to recompute the styles.
     *
     * For example, consider a transition on the opacity property.
     * 
     * With recomputeStyle:
     * $parent.append($el); //opacity=0
     * AJS._internal.animation.recomputeStyle($el);
     * $el.addClass('visible'); //opacity=1
     * //Browser calculates value of opacity=0, and then transitions it to opacity=1
     *
     * Without recomputeStyle:
     * $parent.append($el); //opacity=0
     * $el.addClass('visible'); //opacity=1
     * //Browser calculates value of opacity=1 but no transition
     *
     * @param el The DOM or jQuery element for which style should be recomputed
     */
    exports._internal.animation.recomputeStyle = function(el) {
        el = el.length ? el[0] : el;
        //Force a style compute by getting an arbitrary CSS value
        window.getComputedStyle(el, null).getPropertyValue('left');
    };
}(AJS));
;(function(init) {
    'use strict';

    AJS._internal = AJS._internal || {};
    AJS._internal.browser = init(AJS.$);
})(function($) {
    'use strict';

    var exports = {};
    var supportsCalc = null;
    var isMacOSX = (/Mac OS X/.test(navigator.userAgent));

    exports.supportsCalc = function() {
        if (supportsCalc === null) {
            var $d = $('<div style="height: 10px; height: -webkit-calc(20px + 0); height: calc(20px);"></div>');
            supportsCalc = (20 === $d.appendTo(document.documentElement).height());
            $d.remove();
        }

        return supportsCalc;
    };

    exports.supportsRequestAnimationFrame = function() {
        return !!window.requestAnimationFrame;
    };

    exports.supportsVoiceOver = function() {
        return isMacOSX;
    };

    return exports;
});

AJS.I18n.keys = {};
AJS.I18n.keys["aui.words.add"] = "Add";
AJS.I18n.keys["aui.words.update"] = "Update";
AJS.I18n.keys["aui.words.delete"] = "Delete";
AJS.I18n.keys["aui.words.remove"] = "Remove";
AJS.I18n.keys["aui.words.cancel"] = "Cancel";
AJS.I18n.keys["aui.words.loading"] = "Loading";
AJS.I18n.keys["aui.words.close"] = "Close";
AJS.I18n.keys["aui.enter.value"] = "Enter value";
AJS.I18n.keys["aui.words.more"] = "More";
AJS.I18n.keys["aui.words.moreitem"] = "More\u2026";
AJS.I18n.keys["aui.keyboard.shortcut.type.x"] = "Type ''{0}''";
AJS.I18n.keys["aui.keyboard.shortcut.then.x"] = "then ''{0}''";
AJS.I18n.keys["aui.keyboard.shortcut.or.x"] = "OR ''{0}''";
AJS.I18n.keys["aui.sidebar.expand.tooltip"] = "Expand sidebar ( [ )";
AJS.I18n.keys["aui.sidebar.collapse.tooltip"] = "Collapse sidebar ( [ )";
AJS.I18n.keys["aui.validation.message.maxlength"] = "Must be fewer than {0} characters";
AJS.I18n.keys["aui.validation.message.minlength"] = "Must be greater than {0} characters";
AJS.I18n.keys["aui.validation.message.matchingfield"] = "{0} and {1} do not match.";
AJS.I18n.keys["aui.validation.message.matchingfield-novalue"] = "These fields do not match.";
AJS.I18n.keys["aui.validation.message.doesnotcontain"] = "Do not include the phrase {0} in this field";
AJS.I18n.keys["aui.validation.message.pattern"] = "This field does not match the required format";
AJS.I18n.keys["aui.validation.message.required"] = "This is a required field";
AJS.I18n.keys["aui.validation.message.validnumber"] = "Please enter a valid number";
AJS.I18n.keys["aui.validation.message.min"] = "Enter a value greater than {0}";
AJS.I18n.keys["aui.validation.message.max"] = "Enter a value less than {0}";
AJS.I18n.keys["aui.validation.message.dateformat"] = "Enter a valid date";
AJS.I18n.keys["aui.validation.message.minchecked"] = "Tick at least {0,choice,0#0 checkboxes|1#1 checkbox|1<{0,number} checkboxes}.";
AJS.I18n.keys["aui.validation.message.maxchecked"] = "Tick at most {0,choice,0#0 checkboxes|1#1 checkbox|1<{0,number} checkboxes}.";
AJS.I18n.keys["aui.checkboxmultiselect.clear.selected"] = "Clear selected items";
AJS.I18n.keys["aui.select.no.suggestions"] = "No suggestions";
AJS.I18n.keys["aui.select.new.suggestions"] = "New suggestions added. Please use the up and down arrows to select.";

(function($) {
    
    var $overflowEl;

    /**
     *
     * Dims the screen using a blanket div
     * @param useShim deprecated, it is calculated by dim() now
     */
    AJS.dim = function (useShim, zIndex) {

        if  (!$overflowEl) {
            $overflowEl = $(document.body);
        }

        if (useShim === true) {
            useShimDeprecationLogger();
        }

        var isBlanketShowing = (!!AJS.dim.$dim) && AJS.dim.$dim.attr('aria-hidden') === 'false';

        if(!!AJS.dim.$dim) {
            AJS.dim.$dim.remove();
            AJS.dim.$dim = null;
        }

        AJS.dim.$dim = AJS("div").addClass("aui-blanket");
        AJS.dim.$dim.attr('tabindex', '0'); //required, or the last element's focusout event will go to the browser
        AJS.dim.$dim.appendTo(document.body);

        if (!isBlanketShowing) {
            //recompute after insertion and before setting aria-hidden=false to ensure we calculate a difference in
            //computed styles
            AJS._internal.animation.recomputeStyle(AJS.dim.$dim);

            AJS.dim.cachedOverflow = $overflowEl.css("overflow");
            $overflowEl.css("overflow", "hidden");
        }

        AJS.dim.$dim.attr('aria-hidden', 'false');

        if (zIndex) {
            AJS.dim.$dim.css({zIndex: zIndex});
        }

        return AJS.dim.$dim;
    };

    /**
     * Removes semitransparent DIV
     * @see AJS.dim
     */
    AJS.undim = function() {
        if (AJS.dim.$dim) {
            AJS.dim.$dim.attr('aria-hidden', 'true');

            $overflowEl && $overflowEl.css("overflow",  AJS.dim.cachedOverflow);
        }
    };

    var useShimDeprecationLogger = AJS.deprecate.getMessageLogger('useShim', {
        extraInfo: 'useShim has no alternative as it is now calculated by dim().'
    });

}(AJS.$));
;(function(init) {
    'use strict';

    AJS.layer = init(AJS.$, AJS._internal.widget);

    if (typeof define === 'function') {
        define('layer',[],function () {
            return AJS.layer;
        });
    }
})(function($, widget) {
    'use strict';

    var EVENT_PREFIX = '_aui-internal-layer-';
    var GLOBAL_EVENT_PREFIX = '_aui-internal-layer-global-';
    var LAYER_EVENT_PREFIX = 'aui-layer-';
    var $doc = $(document);

    function ariaHide ($el) {
        $el.attr('aria-hidden', 'true');
    }

    function ariaShow ($el) {
        $el.attr('aria-hidden', 'false');
    }

    function triggerEvent ($el, deprecatedName, newNativeName) {
        var e1 = $.Event(EVENT_PREFIX + deprecatedName);
        var e2 = $.Event(GLOBAL_EVENT_PREFIX + deprecatedName);
        var nativeEvent = new CustomEvent(LAYER_EVENT_PREFIX + newNativeName, {
            bubbles: true,
            cancelable: true
        });

        $el.trigger(e1);
        $el.trigger(e2, [$el]);
        $el[0].dispatchEvent(nativeEvent);

        return !e1.isDefaultPrevented() && !e2.isDefaultPrevented() && !nativeEvent.defaultPrevented;
    }


    function Layer (selector) {
        this.$el = $(selector || '<div class="aui-layer" aria-hidden="true"></div>');
        this.$el.addClass('aui-layer');
    }

    Layer.prototype = {
        /**
         * Returns the layer below the current layer if it exists.
         *
         * @returns {jQuery | undefined}
         */
        below: function () {
            return AJS.LayerManager.global.item(AJS.LayerManager.global.indexOf(this.$el) - 1);
        },

        /**
         * Returns the layer above the current layer if it exists.
         *
         * @returns {jQuery | undefined}
         */
        above: function () {
            return AJS.LayerManager.global.item(AJS.LayerManager.global.indexOf(this.$el) + 1);
        },

        /**
         * Sets the width and height of the layer.
         *
         * @param {Integer} width The width to set.
         * @param {Integer} height The height to set.
         *
         * @returns {Layer}
         */
        changeSize: function (width, height) {
            this.$el.css('width', width);
            this.$el.css('height', height === 'content' ? '' : height);
            return this;
        },

        /**
         * Binds a layer event.
         *
         * @param {String} event The event name to listen to.
         * @param {Function} fn The event handler.
         *
         * @returns {Layer}
         */
        on: function (event, fn) {
            this.$el.on(EVENT_PREFIX + event, fn);
            return this;
        },


        /**
         * Unbinds a layer event.
         *
         * @param {String} event The event name to unbind=.
         * @param {Function} fn Optional. The event handler.
         *
         * @returns {Layer}
         */
        off: function (event, fn) {
            this.$el.off(EVENT_PREFIX + event, fn);
            return this;
        },

        /**
         * Shows the layer.
         *
         * @returns {Layer}
         */
        show: function () {
            if (this.isVisible()) {
                ariaShow(this.$el);
                return this;
            }

            if (triggerEvent(this.$el, 'beforeShow', 'show')) {
                AJS.LayerManager.global.push(this.$el);
            }

            return this;
        },

        /**
         * Hides the layer.
         *
         * @returns {Layer}
         */
        hide: function () {
            if (!this.isVisible()) {
                ariaHide(this.$el);
                return this;
            }

            if (triggerEvent(this.$el, 'beforeHide', 'hide')) {
                AJS.LayerManager.global.popUntil(this.$el);
            }

            return this;
        },

        /**
         * Checks to see if the layer is visible.
         *
         * @returns {Boolean}
         */
        isVisible: function () {
            return this.$el.attr('aria-hidden') === 'false';
        },

        /**
         * Removes the layer and cleans up internal state.
         *
         * @returns {undefined}
         */
        remove: function () {
            this.hide();
            this.$el.remove();
            this.$el = null;
        },

        /**
         * Returns whether or not the layer is blanketed.
         *
         * @returns {Boolean}
         */
        isBlanketed: function () {
            return this.$el.attr('data-aui-blanketed') === 'true';
        },

        /**
         * Returns whether or not the layer is persistent.
         *
         * @returns {Boolean}
         */
        isPersistent: function () {
            var modal = this.$el.attr('modal') || this.$el.attr('data-aui-modal');
            var persistent = this.$el.attr('persistent') || this.$el.attr('data-aui-persistent');

            return modal === 'true' || persistent === 'true';
        },

        _hideLayer: function (triggerBeforeEvents) {
            if (this.isPersistent() || this.isBlanketed()) {
                AJS.FocusManager.global.exit(this.$el);
            }

            if (triggerBeforeEvents) {
                triggerEvent(this.$el, 'beforeHide', 'hide');
            }

            this.$el.attr('aria-hidden', 'true');
            this.$el.css('z-index', this.$el.data('_aui-layer-cached-z-index') || '');
            this.$el.data('_aui-layer-cached-z-index', '');
            this.$el.trigger(EVENT_PREFIX + 'hide');
            this.$el.trigger(GLOBAL_EVENT_PREFIX + 'hide', [this.$el]);
        },

        _showLayer: function (zIndex) {
            if (!this.$el.parent().is('body')) {
                this.$el.appendTo(document.body);
            }

            this.$el.data('_aui-layer-cached-z-index', this.$el.css('z-index'));
            this.$el.css('z-index', zIndex);
            this.$el.attr('aria-hidden', 'false');

            if (this.isPersistent() || this.isBlanketed()) {
                AJS.FocusManager.global.enter(this.$el);
            }

            this.$el.trigger(EVENT_PREFIX + 'show');
            this.$el.trigger(GLOBAL_EVENT_PREFIX + 'show', [this.$el]);
        }
    };

    var layerWidget = widget('layer', Layer);

    layerWidget.on = function (eventName, selector, fn) {
        $doc.on(GLOBAL_EVENT_PREFIX + eventName, selector, fn);
        return this;
    };

    layerWidget.off = function (eventName, selector, fn) {
        $doc.off(GLOBAL_EVENT_PREFIX + eventName, selector, fn);
        return this;
    };


    return layerWidget;
});

AJS.FocusManager = (function($) {

    (function initSelectors() {
        /*
         :tabbable and :focusable functions from jQuery UI v 1.10.4
         renamed to :aui-tabbable and :aui-focusable to not clash with jquery-ui if it's included.
         Code modified slightly to be compatible with jQuery < 1.8
            .addBack() replaced with .andSelf()
            $.curCSS() replaced with $.css()

         */
        function visible (element) {
            return ($.css(element, 'visibility') === 'visible');
        }

        function focusable (element, isTabIndexNotNaN) {
            var nodeName = element.nodeName.toLowerCase();

            if (nodeName === 'aui-select') {
                return true;
            }

            if (nodeName === 'area') {
                var map = element.parentNode;
                var mapName = map.name;
                var imageMap = $('img[usemap=#' + mapName + ']').get();

                if (!element.href || !mapName || map.nodeName.toLowerCase() !== 'map') {
                    return false;
                }
                return imageMap && visible(imageMap);
            }
            var isFormElement = /input|select|textarea|button|object/.test(nodeName);
            var isAnchor = nodeName === 'a';
            var isAnchorTabbable = (element.href || isTabIndexNotNaN);

            return (
                isFormElement ? !element.disabled :
                    (isAnchor ? isAnchorTabbable : isTabIndexNotNaN)
                ) && visible(element);
        }

        function tabbable (element) {
            var tabIndex = $.attr( element, "tabindex" ),
                isTabIndexNaN = isNaN( tabIndex );
            var hasTabIndex = ( isTabIndexNaN || tabIndex >= 0 );

            return hasTabIndex && focusable( element, !isTabIndexNaN );
        }

        $.extend( $.expr[ ":" ], {
            'aui-focusable': function( element ) {
                return focusable( element, !isNaN( $.attr( element, "tabindex" ) ) );
            },

            'aui-tabbable': tabbable
        });
    }());

    var RESTORE_FOCUS_DATA_KEY = "_aui-focus-restore";
    function FocusManager() {
        this._focusTrapStack = [];
        $(document).on('focusout', {focusTrapStack: this._focusTrapStack},  focusTrapHandler);
    }
    FocusManager.defaultFocusSelector = ":aui-tabbable";
    FocusManager.prototype.enter = function($el) {
        // remember focus on old element
        $el.data(RESTORE_FOCUS_DATA_KEY, $(document.activeElement));

        // focus on new selector
        if ($el.attr("data-aui-focus") !== "false") {
            var focusSelector = $el.attr('data-aui-focus-selector') || FocusManager.defaultFocusSelector;
            var $focusEl = $el.is(focusSelector) ? $el : $el.find(focusSelector);
            $focusEl.first().focus();
        }

        if (elementTrapsFocus($el)) {
            trapFocus($el, this._focusTrapStack);
        }
    };

    function trapFocus($el, focusTrapStack) {
        focusTrapStack.push($el);
    }

    function untrapFocus(focusTrapStack) {
        focusTrapStack.pop();
    }

    function elementTrapsFocus($el) {
        return $el.is('.aui-dialog2');
    }

    FocusManager.prototype.exit = function($el) {
        if (elementTrapsFocus($el)) {
            untrapFocus(this._focusTrapStack);
        }

        // AUI-1059: remove focus from the active element when dialog is hidden
        var activeElement = document.activeElement;
        if ($el[0] === activeElement || $el.has(activeElement).length) {
            $(activeElement).blur();
        }

        var $restoreFocus = $el.data(RESTORE_FOCUS_DATA_KEY);
        if ($restoreFocus && $restoreFocus.length) {
            $el.removeData(RESTORE_FOCUS_DATA_KEY);
            $restoreFocus.focus();
        }
    };

    function focusTrapHandler(event) {
        var focusTrapStack = event.data.focusTrapStack;

        if (!event.relatedTarget) { //Does not work in firefox, see https://bugzilla.mozilla.org/show_bug.cgi?id=687787
            return;
        }

        if (focusTrapStack.length === 0) {
            return;
        }

        var $focusTrapElement = focusTrapStack[focusTrapStack.length - 1];

        var focusOrigin = event.target;
        var focusTo = event.relatedTarget;

        var $tabbableElements = $focusTrapElement.find(':aui-tabbable');
        var $firstTabbableElement = AJS.$($tabbableElements.first());
        var $lastTabbableElement = AJS.$($tabbableElements.last());

        var elementContainsOrigin = $focusTrapElement.has(focusTo).length === 0;
        var focusLeavingElement = elementContainsOrigin && focusTo;
        if (focusLeavingElement) {
            if ($firstTabbableElement.is(focusOrigin)) {
                $lastTabbableElement.focus();
            } else if ($lastTabbableElement.is(focusOrigin)) {
                $firstTabbableElement.focus();
            }
        }

    }

    FocusManager.global = new FocusManager();

    return FocusManager;
}(AJS.$));

/**
 * Manages layers.
 *
 * There is a single global layer manager, AJS.LayerManager.global.
 * Additional instances can be created however this should generally only be used in tests.
 *
 * Layers are added by the push($el) method. Layers are removed by the
 * popUntil($el) method.
 *
 * popUntil's contract is that it pops all layers above & including the given
 * layer. This is used to support popping multiple layers.
 * Say we were showing a dropdown inside an inline dialog inside a dialog - we
 * have a stack of dialog layer, inline dialog layer, then dropdown layer. Calling
 * popUntil(dialog.$el) would hide all layers above & including the dialog.
 */
(function ($) {
    'use strict';

    function topIndexWhere (layerArr, fn) {
        var i = layerArr.length;

        while (i--) {
            if (fn(layerArr[i])) {
                return i;
            }
        }

        return -1;
    }

    function layerIndex (layerArr, $el) {
        return topIndexWhere(layerArr, function ($layer) {
            return $layer[0] === $el[0];
        });
    }

    function topBlanketedIndex (layerArr) {
        return topIndexWhere(layerArr, function ($layer) {
            return AJS.layer($layer).isBlanketed();
        });
    }

    function nextZIndex (layerArr) {
        var _nextZIndex;

        if (layerArr.length) {
            var $topEl = layerArr[layerArr.length - 1];
            var zIndex = parseInt($topEl.css('z-index'), 10);
            _nextZIndex = (isNaN(zIndex) ? 0 : zIndex) + 100;
        }
        else {
            _nextZIndex = 0;
        }

        return Math.max(3000, _nextZIndex);
    }

    function updateBlanket (stack, oldBlanketIndex) {
        var newTopBlanketedIndex = topBlanketedIndex(stack);
        if (oldBlanketIndex !== newTopBlanketedIndex) {
            if (newTopBlanketedIndex > -1) {
                AJS.dim(false, stack[newTopBlanketedIndex].css('z-index') - 20);
            } else {
                AJS.undim();
            }
        }
    }

    function popLayers (stack, stopIndex, forceClosePersistent) {
        if (stopIndex < 0) {
            return;
        }

        for (var a = stack.length - 1; a >= stopIndex; a--) {
            var $layer = stack[a];
            var layer = AJS.layer($layer);

            if (forceClosePersistent || !layer.isPersistent()) {
                layer._hideLayer(true);
                stack.splice(a, 1);
            }
        }
    }

    function getParentLayer ($childLayer) {
        var $layerTrigger = getTrigger($childLayer);

        if ($layerTrigger.length > 0) {
            return $layerTrigger.closest('.aui-layer');
        }
    }

    function hasTrigger ($layer) {
        return getTrigger($layer).length > 0;
    }

    function getTrigger ($layer) {
        return $('[aria-controls="' + $layer.attr('id') + '"]');
    }

    function LayerManager () {
        this._stack = [];
    }

    LayerManager.prototype = {
        /**
         * Pushes a layer onto the stack. The same element cannot be opened as a layer multiple times - if the given
         * element is already an open layer, this method throws an exception.
         *
         * @param {HTMLElement | String | jQuery} element  The element to push onto the stack.
         *
         * @returns {LayerManager}
         */
        push: function (element) {
            var $el = (element instanceof $) ? element : $(element);
            if (layerIndex(this._stack, $el) >= 0) {
                throw new Error('The given element is already an active layer.');
            }

            this.popLayersBeside($el);

            var layer = AJS.layer($el);
            var zIndex = nextZIndex(this._stack);

            layer._showLayer(zIndex);

            if (layer.isBlanketed()) {
                AJS.dim(false, zIndex - 20);
            }

            this._stack.push($el);

            return this;
        },

        popLayersBeside: function (element) {
            var $layer = (element instanceof $) ? element : $(element);
            if (!hasTrigger($layer)) {
                // We can't find this layer's trigger, we will pop all non-persistent until a blanket or the document
                var blanketedIndex = topBlanketedIndex(this._stack);
                popLayers(this._stack, ++blanketedIndex, false);
                return;
            }

            var $parentLayer = getParentLayer($layer);
            if ($parentLayer) {
                var parentIndex = this.indexOf($parentLayer);
                popLayers(this._stack, ++parentIndex, false);
            } else {
                popLayers(this._stack, 0, false);
            }

        },

        /**
         * Returns the index of the specified layer in the layer stack.
         *
         * @param {HTMLElement | String | jQuery} element  The element to find in the stack.
         *
         * @returns {Number} the (zero-based) index of the element, or -1 if not in the stack.
         */
        indexOf: function (element) {
            return layerIndex(this._stack, $(element));
        },

        /**
         * Returns the item at the particular index or false.
         *
         * @param {Number} index The index of the element to get.
         *
         * @returns {jQuery | Boolean}
         */
        item: function (index) {
            return this._stack[index];
        },

        /**
         * Hides all layers in the stack.
         *
         * @returns {LayerManager}
         */
        hideAll: function() {
            this._stack.reverse().forEach(function(element) {
                var layer = AJS.layer(element);
                if (layer.isBlanketed() || layer.isPersistent()) {
                    return;
                }
                layer.hide();
            });

            return this;
        },

        /**
         * Gets the previous layer below the given layer, which is non modal and non persistent. If it finds a blanketed layer on the way
         * it returns it regardless if it is modal or not
         *
         * @param {HTMLElement | String | jQuery} element layer to start the search from.
         *
         * @returns {jQuery | null} the next matching layer or null if none found.
         */
        getNextLowerNonPersistentOrBlanketedLayer: function(element) {
            var $el = (element instanceof $) ? element : $(element);
            var index = layerIndex(this._stack, $el);

            if (index < 0) {
                return null;
            }

            var $nextEl;
            index--;
            while (index >= 0) {
                $nextEl = this._stack[index];
                var layer = AJS.layer($nextEl);

                if (!layer.isPersistent() || layer.isBlanketed()) {
                    return $nextEl;
                }
                index--;
            }

            return null;
        },

        /**
         * Gets the next layer which is neither modal or blanketed, from the given layer.
         *
         * @param {HTMLElement | String | jQuery} element layer to start the search from.
         *
         * @returns {jQuery | null} the next non modal non blanketed layer or null if none found.
         */
        getNextHigherNonPeristentAndNonBlanketedLayer: function(element) {
            var $el = (element instanceof $) ? element : $(element);
            var index = layerIndex(this._stack, $el);

            if (index < 0) {
                return null;
            }

            var $nextEl;
            index++;
            while (index < this._stack.length) {
                $nextEl = this._stack[index];
                var layer = AJS.layer($nextEl);

                if (!(layer.isPersistent() || layer.isBlanketed())) {
                    return $nextEl;
                }
                index++;
            }

            return null;
        },

        /**
         * Removes all non-modal layers above & including the given element. If the given element is not an active layer, this method
         * is a no-op. The given element will be removed regardless of whether or not it is modal.
         *
         * @param {HTMLElement | String | jQuery} element layer to pop.
         *
         * @returns {jQuery} The last layer that was popped, or null if no layer matching the given $el was found.
         */
        popUntil: function (element) {
            var $el = (element instanceof $) ? element : $(element);
            var index = layerIndex(this._stack, $el);

            if (index === -1) {
                return null;
            }

            var oldTopBlanketedIndex = topBlanketedIndex(this._stack);

            // Removes all layers above the current one.
            popLayers(this._stack, index + 1, AJS.layer($el).isBlanketed());

            // Removes the current layer.
            AJS.layer($el)._hideLayer();
            this._stack.splice(index, 1);

            updateBlanket(this._stack, oldTopBlanketedIndex);

            return $el;
        },

        /**
         * Gets the top layer, if it exists.
         *
         * @returns The layer on top of the stack, if it exists, otherwise null.
         */
        getTopLayer: function () {
            if (!this._stack.length) {
                return null;
            }

            var $topLayer = this._stack[this._stack.length - 1];

            return $topLayer;
        },

        /**
         * Pops the top layer, if it exists and it is non modal and non persistent.
         *
         * @returns The layer that was popped, if it was popped.
         */
        popTopIfNonPersistent: function () {
            var $topLayer = this.getTopLayer();
            var layer = AJS.layer($topLayer);

            if (!$topLayer || layer.isPersistent()) {
                return null;
            }

            return this.popUntil($topLayer);
        },

        /**
         * Pops all layers above and including the top blanketed layer. If layers exist but none are blanketed, this method
         * does nothing.
         *
         * @returns The blanketed layer that was popped, if it exists, otherwise null.
         */
        popUntilTopBlanketed: function () {
            var i = topBlanketedIndex(this._stack);

            if (i < 0) {
                return null;
            }

            var $topBlanketedLayer = this._stack[i];
            var layer = AJS.layer($topBlanketedLayer);

            if (layer.isPersistent()) {
                // We can't pop the blanketed layer, only the things ontop
                var $next = this.getNextHigherNonPeristentAndNonBlanketedLayer($topBlanketedLayer);
                if ($next) {
                    var stopIndex = layerIndex(this._stack, $next);
                    popLayers(this._stack, stopIndex, true);
                    return $next;
                }
                return null;
            }

            popLayers(this._stack, i, true);
            updateBlanket(this._stack, i);
            return $topBlanketedLayer;
        },

        /**
         * Pops all layers above and including the top persistent layer. If layers exist but none are persistent, this method
         * does nothing.
         */
        popUntilTopPersistent: function () {
            var $toPop = AJS.LayerManager.global.getTopLayer();
            if (!$toPop) {
                return;
            }

            var stopIndex;
            var oldTopBlanketedIndex = topBlanketedIndex(this._stack);

            var toPop = AJS.layer($toPop);
            if (toPop.isPersistent()) {
                if (toPop.isBlanketed()) {
                    return;
                } else {
                    // Get the closest non modal layer below, stop at the first blanketed layer though, we don't want to pop below that
                    $toPop = AJS.LayerManager.global.getNextLowerNonPersistentOrBlanketedLayer($toPop);
                    toPop = AJS.layer($toPop);

                    if ($toPop && !toPop.isPersistent()) {
                        stopIndex = layerIndex(this._stack, $toPop);
                        popLayers(this._stack, stopIndex, true);
                        updateBlanket(this._stack, oldTopBlanketedIndex);
                    } else {
                        // Here we have a blanketed persistent layer
                        return;
                    }
                }
            } else {
                stopIndex = layerIndex(this._stack, $toPop);
                popLayers(this._stack, stopIndex, true);
                updateBlanket(this._stack, oldTopBlanketedIndex);
            }
        }
    };

    AJS.LayerManager = LayerManager;

}(AJS.$));

/**
 * Copy of jQuery UI keycodes, without the weight of everything in jQuery UI
 */
(function() {
    'use strict';

    // Source: jQuery UI keycodes
    AJS.keyCode = {
        ALT: 18,
        BACKSPACE: 8,
        CAPS_LOCK: 20,
        COMMA: 188,
        COMMAND: 91,
        COMMAND_LEFT: 91, // COMMAND
        COMMAND_RIGHT: 93,
        CONTROL: 17,
        DELETE: 46,
        DOWN: 40,
        END: 35,
        ENTER: 13,
        ESCAPE: 27,
        HOME: 36,
        INSERT: 45,
        LEFT: 37,
        MENU: 93, // COMMAND_RIGHT
        NUMPAD_ADD: 107,
        NUMPAD_DECIMAL: 110,
        NUMPAD_DIVIDE: 111,
        NUMPAD_ENTER: 108,
        NUMPAD_MULTIPLY: 106,
        NUMPAD_SUBTRACT: 109,
        PAGE_DOWN: 34,
        PAGE_UP: 33,
        PERIOD: 190,
        RIGHT: 39,
        SHIFT: 16,
        SPACE: 32,
        TAB: 9,
        UP: 38,
        WINDOWS: 91 // COMMAND
    };
}());

(function($) {
    'use strict';

    var $doc = $(document);

    function initCloseLayerOnEscPress() {
        $doc.on('keydown', function(e) {
            if (e.keyCode === AJS.keyCode.ESCAPE) {
                AJS.LayerManager.global.popUntilTopPersistent();
                e.preventDefault();
            }
        });
    }

    function initCloseLayerOnBlanketClick() {
        $doc.on('click', '.aui-blanket', function(e) {
            if (AJS.LayerManager.global.popUntilTopBlanketed()) {
                e.preventDefault();
            }
        });
    }

    /*
        If its a click on a trigger, do nothing.
        If its a click on a layer, close all layers above.
        Otherwise, close all layers
     */
    function initCloseLayerOnOuterClick () {
        $doc.on('click', function (e) {
            var $target = $(e.target);
            if ($target.closest('.aui-blanket').length) {
                return;
            }

            var $trigger = $target.closest('[aria-controls]');
            var $layer = $target.closest('.aui-layer');
            if (!$layer.length && !hasLayer($trigger)) {
                AJS.LayerManager.global.hideAll();
                return;
            }

            // Triggers take precedence over layers
            if (hasLayer($trigger)) {
                return;
            }

            if ($layer.length) {
                // We dont want to explicitly call close on a modal dialog if it happens to be next.
                // All blanketed layers should be below us, as otherwise the blanket should have caught the click.
                // We make sure we dont close a blanketed one explicitly as a hack, this is to fix the problem arising
                // from dialog2 triggers inside dialog2's having no aria controls, where the dialog2 that was just
                // opened would be closed instantly
                var $next = AJS.LayerManager.global.getNextHigherNonPeristentAndNonBlanketedLayer($layer);

                if ($next) {
                    AJS.layer($next).hide();
                }
            }
        });
    }

    function hasLayer($trigger) {
        if (!$trigger.length) {
            return false;
        }

        var layer = document.getElementById($trigger.attr('aria-controls'));
        return AJS.LayerManager.global.indexOf(layer) > -1;
    }

    initCloseLayerOnEscPress();
    initCloseLayerOnBlanketClick();
    initCloseLayerOnOuterClick();

    AJS.LayerManager.global = new AJS.LayerManager();
}(AJS.$));

;(function(init) {
    'use strict';

    AJS.dialog2 = init(AJS.$, AJS.layer, AJS._internal.widget);
})(function($, layerWidget, widget) {
    'use strict';


    var defaults = {
        'aui-focus': 'false', // do not focus by default as it's overridden below
        'aui-blanketed': 'true'
    };

    function applyDefaults($el) {
        $.each(defaults, function(key, value) {
            var dataKey = 'data-' + key;
            if (!$el[0].hasAttribute(dataKey)) {
                $el.attr(dataKey, value);
            }
        });
    }

    function Dialog2(selector) {
        if (selector) {
            this.$el = $(selector);
        }
        else {
            this.$el = $(aui.dialog.dialog2({}));
        }
        applyDefaults(this.$el);
    }

    Dialog2.prototype.on = function(event, fn) {
        layerWidget(this.$el).on(event, fn);
        return this;
    };

    Dialog2.prototype.off = function(event, fn) {
        layerWidget(this.$el).off(event, fn);
        return this;
    };

    Dialog2.prototype.show = function() {
        layerWidget(this.$el).show();
        return this;
    };

    Dialog2.prototype.hide = function() {
        layerWidget(this.$el).hide();
        return this;
    };

    Dialog2.prototype.remove = function() {
        layerWidget(this.$el).remove();
        return this;
    };

    Dialog2.prototype.isVisible = function() {
        return layerWidget(this.$el).isVisible();
    };

    var dialog2Widget = widget('dialog2', Dialog2);

    dialog2Widget.on = function(eventName, fn) {
        layerWidget.on(eventName, '.aui-dialog2', fn);
        return this;
    };

    dialog2Widget.off = function(eventName, fn) {
        layerWidget.off(eventName, '.aui-dialog2', fn);
        return this;
    };

    /* Live events */

    $(document).on('click', '.aui-dialog2-header-close', function(e) {
        e.preventDefault();
        dialog2Widget($(this).closest('.aui-dialog2')).hide();
    });

    dialog2Widget.on('show', function(e, $el) {
        var selectors = ['.aui-dialog2-content', '.aui-dialog2-footer', '.aui-dialog2-header'];
        var $selected;
        selectors.some(function(selector) {
            $selected = $el.find(selector + ' :aui-tabbable');
            return $selected.length;
        });
        $selected && $selected.first().focus();
    });

    dialog2Widget.on('hide', function(e,$el) {
        var layer = layerWidget($el);

        if ($el.data('aui-remove-on-hide')) {
            layer.remove();
        }
    });

    return dialog2Widget;
});

(function () {

    // Cookie handling functions

    var COOKIE_NAME = "AJS.conglomerate.cookie",
        UNESCAPE_COOKIE_REGEX = /(\\|^"|"$)/g,
        CONSECUTIVE_PIPE_CHARS_REGEX = /\|\|+/g,
        ANY_QUOTE_REGEX = /"/g,
        REGEX_SPECIAL_CHARS = /[.*+?|^$()[\]{\\]/g;

    function getValueFromConglomerate(name, cookieValue) {
        // a null cookieValue is just the first time through so create it
        cookieValue = cookieValue || "";
        var reg = new RegExp(regexEscape(name) + "=([^|]+)"),
            res = cookieValue.match(reg);
        return res && res[1];
    }

    //either append or replace the value in the cookie string
    function addOrAppendToValue(name, value, cookieValue) {
        //A cookie name follows after any amount of white space mixed with any amount of '|' characters
        //A cookie value is preceded by '=', then anything except for '|'
        var reg = new RegExp("(\\s|\\|)*\\b" + regexEscape(name) + "=[^|]*[|]*");

        cookieValue = cookieValue || "";
        cookieValue = cookieValue.replace(reg, "|");
        if (value !== "") {
            var pair = name + "=" + value;
            if (cookieValue.length + pair.length < 4020) {
                cookieValue += "|" + pair;
            }
        }
        return cookieValue.replace(CONSECUTIVE_PIPE_CHARS_REGEX, "|");
    }

    function unescapeCookieValue(name) {
        return name.replace(UNESCAPE_COOKIE_REGEX, "");
    }

    function getCookieValue(name) {
        var reg = new RegExp("\\b" + regexEscape(name) + "=((?:[^\\\\;]+|\\\\.)*)(?:;|$)"),
            res = document.cookie.match(reg);
        return res && unescapeCookieValue(res[1]);
    }

    function saveCookie(name, value, days) {
        var ex = "",
            d,
            quotedValue = '"' + value.replace(ANY_QUOTE_REGEX, '\\"') + '"';

        if (days) {
            d = new Date();
            d.setTime(+d + days * 24 * 60 * 60 * 1000);
            ex = "; expires=" + d.toGMTString();
        }
        document.cookie = name + "=" + quotedValue + ex + ";path=/";
    }

    function regexEscape(str) {
        return str.replace(REGEX_SPECIAL_CHARS, "\\$&");
    }

    /**
     * The Atlassian Conglomerate Cookie - to let us use cookies without running out.
     * @class Cookie
     * @namespace AJS
     */
    AJS.Cookie = {
        /**
         * Save a cookie.
         * @param name {String} name of cookie
         * @param value {String} value of cookie
         * @param expires {Number} number of days before cookie expires
         */
        save : function (name, value, expires) {
            var cookieValue = getCookieValue(COOKIE_NAME);
            cookieValue = addOrAppendToValue(name, value, cookieValue);
            saveCookie(COOKIE_NAME, cookieValue, expires || 365);
        },
        /**
         * Get the value of a cookie.
         * @param name {String} name of cookie to read
         * @param defaultValue {String} the default value of the cookie to return if not found
         */
        read : function(name, defaultValue) {
            var cookieValue = getCookieValue(COOKIE_NAME);
            var value = getValueFromConglomerate(name, cookieValue);
            if (value != null) {
                return value;
            }
            return defaultValue;
        },
        /**
         * Remove the given cookie.
         * @param name {String} the name of the cookie to remove
         */
        erase: function (name) {
            this.save(name, "");
        }
    };

    AJS.deprecate.prop(AJS.Cookie, 'save', {alternativeName: 'AJS.cookie'});
    
})();


/**
 * Binds events to the window object. See jQuery bind documentation for more details.
 * <br>
 * Exceptions are caught and logged.
 *
 * @method bind
 * @namespace AJS
 * @for AJS
 */
AJS.bind = function (eventType, eventData, handler) {
    try {
        if (typeof handler === "function") {
            return AJS.$(window).bind(eventType, eventData, handler);
        } else {
            return AJS.$(window).bind(eventType, eventData);
        }
    } catch (e) {
        AJS.log("error while binding: " + e.message);
    }
};

/**
 * Unbinds event handlers from the window object. See jQuery unbind documentation for more details.
 * <br>
 * Exceptions are caught and logged.
 *
 * @method unbind
 * @namespace AJS
 * @for AJS
 */
AJS.unbind = function (eventType, handler) {
    try {
        return AJS.$(window).unbind(eventType, handler);
    } catch (e) {
        AJS.log("error while unbinding: " + e.message);
    }
};

/**
 * Triggers events on the window object. See jQuery trigger documentation for more details.
 * <br>
 * Exceptions are caught and logged.
 *
 * @method bind
 * @namespace AJS
 * @for AJS
 */
AJS.trigger = function(eventType, extraParameters) {
    try {
        return AJS.$(window).trigger(eventType, extraParameters);
    } catch (e) {
        AJS.log("error while triggering: " + e.message);
    }
};
/**
 * Creates a generic popup that will be displayed in the center of the screen with a
 * grey blanket in the background.
 * Usage:
 * <pre>
 * new AJS.popup({
 *     width: 800,
 *     height: 400,
 *     id: "my-dialog"
 * });
 * </pre>
 * @class popup
 * @constructor
 * @namespace AJS
 * @param options {object} [optional] Permitted options and defaults are as follows:
 * width (800), height (600), keypressListener (closes dialog on ESC).
*/
AJS.popup = function (options) {
    var defaults = {
        width: 800,
        height: 600,
        closeOnOutsideClick: false,
        keypressListener: function (e) {
            if (e.keyCode === 27 && popup.is(":visible")) {
                res.hide();
            }
        }
    };
    // for backwards-compatibility
    if (typeof options != "object") {
        options = {
            width: arguments[0],
            height: arguments[1],
            id: arguments[2]
        };
        options = AJS.$.extend({}, options, arguments[3]);
    }
    options = AJS.$.extend({}, defaults, options);
    var popup = AJS("div").addClass("aui-popup");

    if (options.id) {
        popup.attr("id", options.id);
    }
    //find the highest z-index on the page to ensure any new popup that is shown is shown on top
    var highestZIndex = 3000;
    AJS.$(".aui-dialog").each(function() {
        var currentPopup = AJS.$(this);
        highestZIndex = (currentPopup.css("z-index") > highestZIndex) ? currentPopup.css("z-index") : highestZIndex;
    });

    var applySize = (function (width, height) {
        options.width = (width = (width || options.width));
        options.height = (height = (height || options.height));

        popup.css({
            marginTop: - Math.round(height / 2) +"px",
            marginLeft: - Math.round(width / 2) + "px",
            width: width,
            height: height,
            "z-index": parseInt(highestZIndex,10) + 2  //+ 2 so that the shadow can be shown on +1 (underneath the popup but above everything else)
        });
        return arguments.callee;
    })(options.width, options.height);

    AJS.$("body").append(popup);

    popup.hide();

    AJS.enable(popup);
    /**
     * Popup object
     * @class Popup
     * @static
    */

    //blanket for reference further down
    var blanket = AJS.$(".aui-blanket"),
        focusItem = function(selector, element) {
            var item = AJS.$(selector, element);
            if (item.length) {
                item.focus();
                return true;
            }
            return false;
        },
        // we try and place focus, in the configured element or by looking for the first input
        // in page body, then button panel and finally page menu.
        focusDialog = function(element) {
            if (AJS.$(".dialog-page-body", element).find(":focus").length !== 0) {
                return;
            }
            if (options.focusSelector) {
                return focusItem(options.focusSelector, element);
            }
            var defaultFocusSelector = ":input:visible:enabled:first";
            if (focusItem(defaultFocusSelector, AJS.$(".dialog-page-body", element)))
                return;
            if (focusItem(defaultFocusSelector, AJS.$(".dialog-button-panel", element)))
                return;

            focusItem(defaultFocusSelector, AJS.$(".dialog-page-menu", element));
        };

    var res = {

        changeSize: function (w, h) {
            if ((w && w != options.width) || (h && h != options.height)) {
                applySize(w, h);
            }
            this.show();
        },

        /**
         * Shows the popup
         * @method show
        */
        show: function () {

            var show = function () {
                AJS.$(document)
                    .off("keydown", options.keypressListener)
                    .on("keydown", options.keypressListener);
                AJS.dim();
                blanket = AJS.$(".aui-blanket");
                if(blanket.size()!=0 && options.closeOnOutsideClick){
                    blanket.click( function(){
                        if(popup.is(":visible")){
                            res.hide();
                        }
                    });
                }
                popup.show();

                AJS.popup.current = this;
                focusDialog(popup);
                AJS.$(document).trigger("showLayer", ["popup", this]);
            };
            show.call(this);
            this.show = show;
        },
        /**
         * Hides the popup.
         * @method hide
        */
        hide: function () {
            AJS.$(document).unbind("keydown", options.keypressListener);
            blanket.unbind();
            this.element.hide();

            //only undim if no other dialogs are visible
            if (AJS.$(".aui-dialog:visible").size()==0) {
                AJS.undim();
            }

            // AUI-1059: remove focus from the active element when dialog is hidden
            var activeElement = document.activeElement;
            if (this.element.has(activeElement).length) {
                activeElement.blur();
            }

            AJS.$(document).trigger("hideLayer", ["popup", this]);
            AJS.popup.current = null;
            this.enable();
        },
        /**
         * jQuery object, representing popup DOM element
         * @property element
        */
        element: popup,
        /**
         * Removes popup elements from the DOM
         * @method remove
        */
        remove: function () {
            popup.remove();
            this.element = null;
        },
        /**
         * disables the popup
         * @method disable
        */
        disable: function() {
            if(!this.disabled){
                this.popupBlanket = AJS.$("<div class='dialog-blanket'> </div>").css({
                    height: popup.height(),
                    width: popup.width()
                });
                popup.append(this.popupBlanket);
                this.disabled = true;
            }
        },
        /**
         * enables the popup if it is disabled
         * @method enable
        */
        enable: function() {
            if(this.disabled) {
                this.disabled = false;
                this.popupBlanket.remove();
                this.popupBlanket=null;
            }
        }
    };

    return res;
};

// Scoping function
(function () {
    /**
     * @class Button
     * @constructor Button
     * @param page {number} page id
     * @param label {string} button label
     * @param onclick {function} [optional] click event handler
     * @param className {string} [optional] class name
     * @private
    */
    function Button(page, label, onclick, className) {
        if (!page.buttonpanel) {
            page.addButtonPanel();
        }
        this.page = page;
        this.onclick = onclick;
        this._onclick = function (e) {
            return onclick.call(this, page.dialog, page, e) === true;
        };
        this.item = AJS("button", label).addClass("button-panel-button");
        if (className) {
            this.item.addClass(className);
        }
        if (typeof onclick == "function") {
            this.item.click(this._onclick);
        }
        page.buttonpanel.append(this.item);
        this.id = page.button.length;
        page.button[this.id] = this;
    }

    /**
     * @class Link
     * @constructor Link
     * @param page {number} page id
     * @param label {string} button label
     * @param onclick {function} [optional] click event handler
     * @param className {string} [optional] class name
     * @private
    */
    function Link(page, label, onclick, className, url) {
        if (!page.buttonpanel) {
            page.addButtonPanel();
        }

        //if no url is given use # as default
        if(!url){
            url = "#";
        }

        this.page = page;
        this.onclick = onclick;
        this._onclick = function (e) {
            return onclick.call(this, page.dialog, page, e) === true;
        };
        this.item = AJS("a", label).attr("href", url).addClass("button-panel-link");
        if (className) {
            this.item.addClass(className);
        }
        if (typeof onclick == "function") {
            this.item.click(this._onclick);
        }
        page.buttonpanel.append(this.item);
        this.id = page.button.length;
        page.button[this.id] = this;
    }

    function itemMove (leftOrRight, target) {
        var dir = leftOrRight == "left"? -1 : 1;
        return function (step) {
            var dtarget = this.page[target];
            if (this.id != ((dir == 1) ? dtarget.length - 1 : 0)) {
                dir *= (step || 1);
                dtarget[this.id + dir].item[(dir < 0 ? "before" : "after")](this.item);
                dtarget.splice(this.id, 1);
                dtarget.splice(this.id + dir, 0, this);
                for (var i = 0, ii = dtarget.length; i < ii; i++) {
                    if (target == "panel" && this.page.curtab == dtarget[i].id) {
                        this.page.curtab = i;
                    }
                    dtarget[i].id = i;
                }
            }
            return this;
        };
    }
    function itemRemove(target) {
        return function () {
            this.page[target].splice(this.id, 1);
            for (var i = 0, ii = this.page[target].length; i < ii; i++) {
                this.page[target][i].id = i;
            }
            this.item.remove();
        };
    }
    /**
     * Moves item left in the hierarchy
     * @method moveUp
     * @method moveLeft
     * @param step {number} how many items to move, default is 1
     * @return {object} button
    */
    Button.prototype.moveUp = Button.prototype.moveLeft = itemMove("left", "button");
    /**
     * Moves item right in the hierarchy
     * @method moveDown
     * @method moveRight
     * @param step {number} how many items to move, default is 1
     * @return {object} button
    */
    Button.prototype.moveDown = Button.prototype.moveRight = itemMove("right", "button");
    /**
     * Removes item
     * @method remove
    */
    Button.prototype.remove = itemRemove("button");

    /**
     * Getter and setter for label
     * @method label
     * @param label {string} [optional] label of the button
     * @return {string} label, if nothing is passed in
     * @return {object} jQuery button object, if label is passed in
    */
    Button.prototype.html = function (label) {
        return this.item.html(label);
    };
    /**
     * Getter and setter of onclick event handler
     * @method onclick
     * @param onclick {function} [optional] new event handler, that is going to replace the old one
     * @return {function} existing event handler if new one is undefined
    */
    Button.prototype.onclick = function (onclick) {
        if (typeof onclick == "undefined") {
            return this.onclick;
        } else {
            this.item.unbind("click", this._onclick);
            this._onclick = function (e) {
                return onclick.call(this, page.dialog, page, e) === true;
            };
            if (typeof onclick == "function") {
                this.item.click(this._onclick);
            }
        }
    };

    var DEFAULT_PADDING = 20;

    /**
     * Class for panels
     * @class Panel
     * @constructor
     * @param page {number} page id
     * @param title {string} panel title
     * @param reference {string} or {object} jQuery object or selector for the contents of the Panel
     * @param className {string} [optional] HTML class name
     * @param panelButtonId {string} the unique id that will be put on the button element for this panel.
     * @private
    */
    var Panel = function (page, title, reference, className, panelButtonId) {
        if (!(reference instanceof AJS.$)) {
            reference = AJS.$(reference);
        }

        this.dialog = page.dialog;
        this.page = page;
        this.id = page.panel.length;
        this.button = AJS("button").html(title).addClass("item-button");

        if (panelButtonId) {
            this.button[0].id = panelButtonId;
        }

        this.item = AJS("li").append(this.button).addClass("page-menu-item");
        this.body = AJS("div").append(reference).addClass("dialog-panel-body").css("height", page.dialog.height + "px");
        this.padding = DEFAULT_PADDING;
        if (className) {
            this.body.addClass(className);
        }
        var i = page.panel.length,
            tab = this;
        page.menu.append(this.item);
        page.body.append(this.body);
        page.panel[i] = this;
        var onclick = function () {
            var cur;
            if (page.curtab + 1) {
                cur = page.panel[page.curtab];
                cur.body.hide();
                cur.item.removeClass("selected");
                (typeof cur.onblur == "function") && cur.onblur();
            }
            page.curtab = tab.id;
            tab.body.show();
            tab.item.addClass("selected");
            (typeof tab.onselect == "function") && tab.onselect();
            (typeof page.ontabchange == "function") && page.ontabchange(tab, cur);
        };
        if (!this.button.click) {
            AJS.log("atlassian-dialog:Panel:constructor - this.button.click false");
            this.button.onclick = onclick;
        }
        else {
            this.button.click(onclick);
        }
        onclick();
        if (i == 0) {
            page.menu.css("display", "none"); // don't use jQuery hide()
        } else {
            page.menu.show();
        }
    };
    /**
     * Selects current panel
     * @method select
    */
    Panel.prototype.select = function () {
        this.button.click();
    };
    /**
     * Moves item left in the hierarchy
     * @method moveUp
     * @method moveLeft
     * @param step {number} how many items to move, default is 1
     * @return {object} panel
    */
    Panel.prototype.moveUp = Panel.prototype.moveLeft = itemMove("left", "panel");
    /**
     * Moves item right in the hierarchy
     * @method moveDown
     * @method moveRight
     * @param step {number} how many items to move, default is 1
     * @return {object} panel
    */
    Panel.prototype.moveDown = Panel.prototype.moveRight = itemMove("right", "panel");
    /**
     * Removes item
     * @method remove
    */
    Panel.prototype.remove = itemRemove("panel");
    /**
     * Getter and setter of inner HTML of the panel
     * @method html
     * @param html {string} HTML source to set up
     * @return {object} panel
     * @return {string} current HTML source
    */
    Panel.prototype.html = function (html) {
        if (html) {
            this.body.html(html);
            return this;
        } else {
            return this.body.html();
        }
    };
    /**
     * This method gives you ability to overwrite default padding value. Use it with caution.
     * @method setPadding
     * @param padding {number} padding in pixels
     * @return {object} panel
     * @see DEFAULT_PADDING
    */
    Panel.prototype.setPadding = function (padding) {
        if (!isNaN(+padding)) {
            this.body.css("padding", +padding);
            this.padding = +padding;
            this.page.recalcSize();
        }
        return this;
    };

    var HEADER_HEIGHT = 56;
    var BUTTONS_HEIGHT = 51;
    var MIN_DIALOG_VERTICAL_BUFFER = 50;

    /**
     * Class for pages
     * @class Page
     * @constructor
     * @param dialog {object} dialog object
     * @param className {string} [optional] HTML class name
     * @private
    */
    var Page = function (dialog, className) {
        this.dialog = dialog;
        this.id = dialog.page.length;
        this.element = AJS("div").addClass("dialog-components");
        this.body = AJS("div").addClass("dialog-page-body");
        this.menu = AJS("ul").addClass("dialog-page-menu").css("height", dialog.height + "px");
        this.body.append(this.menu);
        this.curtab;
        this.panel = [];
        this.button = [];
        if (className) {
            this.body.addClass(className);
        }
        dialog.popup.element.append(this.element.append(this.menu).append(this.body));
        dialog.page[dialog.page.length] = this;
    };

    /**
     * Size updater for contents of the page. For internal use
     * @method recalcSize
    */
    Page.prototype.recalcSize = function () {
        var headerHeight = this.header ? HEADER_HEIGHT : 0;
        var buttonHeight = this.buttonpanel ? BUTTONS_HEIGHT : 0;
        for (var i = this.panel.length; i--;) {
            var dialogComponentsHeight = this.dialog.height - headerHeight - buttonHeight;
            this.panel[i].body.css("height", dialogComponentsHeight);
            this.menu.css("height", dialogComponentsHeight);
        }
    };

    /**
     * Adds a button panel to the bottom of dialog
     * @method addButtonPanel
     */
    Page.prototype.addButtonPanel = function () {
        this.buttonpanel = AJS("div").addClass("dialog-button-panel");
        this.element.append(this.buttonpanel);
    };

    /**
     * Method for adding new panel to the page
     * @method addPanel
     * @param title {string} panel title
     * @param reference {string} or {object} jQuery object or selector for the contents of the Panel
     * @param className {string} [optional] HTML class name
     * @param panelButtonId {string} [optional] The unique id for the panel's button.
     * @return {object} the page
    */
    Page.prototype.addPanel = function (title, reference, className, panelButtonId) {
        new Panel(this, title, reference, className, panelButtonId);
        this.recalcSize();
        return this;
    };
    /**
     * Method for adding header to the page
     * @method addHeader
     * @param title {string} panel title
     * @param className {string} [optional] CSS class name
     * @return {object} the page
    */
    Page.prototype.addHeader = function (title, className) {
        if (this.header) {
            this.header.remove();
        }
        this.header =  AJS("h2").text(title || '').addClass("dialog-title");
        className && this.header.addClass(className);
        this.element.prepend(this.header);
        this.recalcSize();
        return this;
    };
    /**
     * Method for adding new button to the page
     * @method addButton
     * @param label {string} button label
     * @param onclick {function} [optional] click event handler
     * @param className {string} [optional] class name
     * @return {object} the page
    */
    Page.prototype.addButton = function (label, onclick, className) {
        new Button(this, label, onclick, className);
        this.recalcSize();
        return this;
    };
    /**
     * Method for adding new link to the page
     * @method addLink
     * @param label {string} button label
     * @param onclick {function} [optional] click event handler
     * @param className {string} [optional] class name
     * @return {object} the page
    */
    Page.prototype.addLink = function (label, onclick, className, url) {
        new Link(this, label, onclick, className, url);
        this.recalcSize();
        return this;
    };

    /**
     * Selects corresponding panel
     * @method gotoPanel
     * @param panel {object} panel object
     * @param panel {number} id of the panel
    */
    Page.prototype.gotoPanel = function (panel) {
        this.panel[panel.id || panel].select();
    };
    /**
     * Returns current panel on the page
     * @method getCurrentPanel
     * @return panel {object} the panel
    */
    Page.prototype.getCurrentPanel = function () {
        return this.panel[this.curtab];
    };
    /**
     * Hides the page
     * @method hide
    */
    Page.prototype.hide = function () {
        this.element.hide();
    };
    /**
     * Shows the page, if it was hidden
     * @method show
    */
    Page.prototype.show = function () {
        this.element.show();
    };
    /**
     * Removes the page
     * @method remove
    */
    Page.prototype.remove = function () {
        this.element.remove();
    };



    /**
     * Constructor for a Dialog. A Dialog is a popup which consists of Pages, where each Page can consist of Panels,
     * Buttons and a Header. The dialog must be constructed in page order as it has a current page state. For example,
     * calling addButton() will add a button to the 'current' page.
     * <p>
     * By default, a new Dialog will have one page. If there are multiple Panels on a Page, a
     * menu is displayed on the left side of the dialog.
     * </p>
     * Usage:
     * <pre>
     * var dialog = new AJS.Dialog(860, 530);
     * dialog.addHeader("Insert Macro")
     * .addPanel("All", "&lt;p&gt;&lt;/p&gt;")
     * .addPanel("Some", "&lt;p&gt;&lt;/p&gt;")
     * .addButton("Next", function (dialog) {dialog.nextPage();})
     * .addButton("Cancel", function (dialog) {dialog.hide();});
     *
     * dialog.addPage()
     * .addButton("Cancel", function (dialog) {dialog.hide();});
     *
     * somebutton.click(function () {dialog.show();});
     * </pre>
     * @class Dialog
     * @namespace AJS
     * @constructor
     * @param width {number} dialog width in pixels, or an object containing the Dialog parameters
     * @param height {number} dialog height in pixels
     * @param id {number} [optional] dialog id
    */
    AJS.Dialog = function (width, height, id) {
        var options = {};
        if (!+width) {
            options = Object(width);
            width = options.width;
            height = options.height;
            id = options.id;
        }
        this.height = height || 480;
        this.width = width || 640;
        this.id = id;
        options = AJS.$.extend({}, options, {
            width: this.width,
            height: this.height,
            id: this.id
        });
        this.popup = AJS.popup(options);

        this.popup.element.addClass("aui-dialog");
        this.page = [];
        this.curpage = 0;

        new Page(this);
    };


    /**
     * Method for adding header to the current page
     * @method addHeader
     * @param title {string} panel title
     * @param className {string} [optional] HTML class name
     * @return {object} the dialog
    */
    AJS.Dialog.prototype.addHeader = function (title, className) {
        this.page[this.curpage].addHeader(title, className);
        return this;
    };
    /**
     * Method for adding new button to the current page
     * @method addButton
     * @param label {string} button label
     * @param onclick {function} [optional] click event handler
     * @param className {string} [optional] class name
     * @return {object} the dialog
    */
    AJS.Dialog.prototype.addButton = function (label, onclick, className) {
        this.page[this.curpage].addButton(label, onclick, className);
        return this;
    };

    /**
     * Method for adding new link to the current page
     * @method addButton
     * @param label {string} link label
     * @param onclick {function} [optional] click event handler
     * @param className {string} [optional] class name
     * @return {object} the dialog
    */
    AJS.Dialog.prototype.addLink = function (label, onclick, className, url) {
        this.page[this.curpage].addLink(label, onclick, className, url);
        return this;
    };

    /**
    * Method for adding a submit button to the current page
    * @method addSubmit
    * @param label {string} link label
    * @param onclick {function} [optional] click event handler
    * @return {object} the dialog
    */
    AJS.Dialog.prototype.addSubmit = function (label, onclick) {
        this.page[this.curpage].addButton(label, onclick, "button-panel-submit-button");
        return this;
    };

    /**
    * Method for adding a cancel link to the current page
    * @method addCancel
    * @param label {string} link label
    * @param onclick {function} [optional] click event handler
    * @return {object} the dialog
    */
    AJS.Dialog.prototype.addCancel= function (label, onclick) {
        this.page[this.curpage].addLink(label, onclick, "button-panel-cancel-link");
        return this;
    };


    /**
     * Method for adding new button panel to the current page
     * @return {object} the dialog
    */
    AJS.Dialog.prototype.addButtonPanel = function () {
        this.page[this.curpage].addButtonPanel();
        return this;
    };


    /**
     * Method for adding new panel to the current page.
     * @method addPanel
     * @param title {string} panel title
     * @param reference {string} or {object} jQuery object or selector for the contents of the Panel
     * @param className {string} [optional] HTML class name
     * @param panelButtonId {String} [optional] The unique id for the panel's button.
     * @return {object} the dialog
    */
    AJS.Dialog.prototype.addPanel = function (title, reference, className, panelButtonId) {
        this.page[this.curpage].addPanel(title, reference, className, panelButtonId);
        return this;
    };
    /**
     * Adds a new page to the dialog and sets the new page as the current page
     * @method addPage
     * @param className {string} [optional] HTML class name
     * @return {object} the dialog
    */
    AJS.Dialog.prototype.addPage = function (className) {
        new Page(this, className);
        this.page[this.curpage].hide();
        this.curpage = this.page.length - 1;
        return this;
    };
    /**
     * Making next page in hierarchy visible and active
     * @method nextPage
     * @return {object} the dialog
    */
    AJS.Dialog.prototype.nextPage = function () {
        this.page[this.curpage++].hide();
        if (this.curpage >= this.page.length) {
            this.curpage = 0;
        }
        this.page[this.curpage].show();
        return this;
    };
    /**
     * Making previous page in hierarchy visible and active
     * @method prevPage
     * @return {object} the dialog
    */
    AJS.Dialog.prototype.prevPage = function () {
        this.page[this.curpage--].hide();
        if (this.curpage < 0) {
            this.curpage = this.page.length - 1;
        }
        this.page[this.curpage].show();
        return this;
    };
    /**
     * Making specified page visible and active
     * @method gotoPage
     * @param num {number} page id
     * @return {object} the dialog
    */
    AJS.Dialog.prototype.gotoPage = function (num) {
        this.page[this.curpage].hide();
        this.curpage = num;
        if (this.curpage < 0) {
            this.curpage = this.page.length - 1;
        } else if (this.curpage >= this.page.length) {
            this.curpage = 0;
        }
        this.page[this.curpage].show();
        return this;
    };
    /**
     * Returns specified panel at the current page
     * @method getPanel
     * @param pageorpanelId {number} page id or panel id
     * @param panelId {number} panel id
     * @return {object} the internal Panel object
    */
    AJS.Dialog.prototype.getPanel = function (pageorpanelId, panelId) {
        var pageid = (panelId == null) ? this.curpage : pageorpanelId;
        if (panelId == null) {
            panelId = pageorpanelId;
        }
        return this.page[pageid].panel[panelId];
    };
    /**
     * Returns specified page
     * @method getPage
     * @param pageid {number} page id
     * @return {object} the internal Page Object
    */
    AJS.Dialog.prototype.getPage = function (pageid) {
        return this.page[pageid];
    };
    /**
     * Returns current panel at the current page
     * @method getCurrentPanel
     * @return {object} the internal Panel object
    */
    AJS.Dialog.prototype.getCurrentPanel = function () {
        return this.page[this.curpage].getCurrentPanel();
    };

    /**
     * Selects corresponding panel
     * @method gotoPanel
     * @param pageorpanel {object} panel object or page object
     * @param panel {object} panel object
     * @param panel {number} id of the panel
    */
    AJS.Dialog.prototype.gotoPanel = function (pageorpanel, panel) {
        if (panel != null) {
            var pageid = pageorpanel.id || pageorpanel;
            this.gotoPage(pageid);
        }
        this.page[this.curpage].gotoPanel(typeof panel == "undefined" ? pageorpanel : panel);
    };

    /**
     * Shows the dialog, if it is not visible
     * @method show
     * @return {object} the dialog
    */
    AJS.Dialog.prototype.show = function () {
        this.popup.show();
        AJS.trigger("show.dialog", {dialog: this});
        return this;
    };
    /**
     * Hides the dialog, if it was visible
     * @method hide
     * @return {object} the dialog
    */
    AJS.Dialog.prototype.hide = function () {
        this.popup.hide();
        AJS.trigger("hide.dialog", {dialog: this});
        return this;
    };
    /**
     * Removes the dialog elements from the DOM
     * @method remove
    */
    AJS.Dialog.prototype.remove = function () {
        this.popup.hide();
        this.popup.remove();
        AJS.trigger("remove.dialog", {dialog: this});
    };
    /**
     * Disables the dialog if enabled
     * @method disable
    */
    AJS.Dialog.prototype.disable = function () {
        this.popup.disable();
        return this;
    };
    /**
     * Enables the dialog if disabled
     * @method disable
    */
    AJS.Dialog.prototype.enable = function () {
        this.popup.enable();
        return this;
    };
    /**
     * Gets set of items depending on query
     * @method get
     * @param query {string} query to search for panels, pages, headers or buttons
     * e.g.
     *      '#Name' will find all dialog components with the given name such as panels and buttons, etc
     *      'panel#Name' will find only panels with the given name
     *      'panel#"Foo bar"' will find only panels with given name
     *      'panel:3' will find the third panel
     */
    AJS.Dialog.prototype.get = function (query) {
        var coll = [],
            dialog = this;
        var nameExp = '#([^"][^ ]*|"[^"]*")';     // a name is a hash followed by either a bare word or quoted string
        var indexExp = ":(\\d+)";                 // an index is a colon followed by some digits
        var typeExp = "page|panel|button|header"; // one of the allowed types
        var selectorExp = "(?:" +                 // a selector is either ...
            "(" + typeExp + ")(?:" + nameExp + "|" + indexExp + ")?" + // a type optionally followed by either #name or :index
            "|" + nameExp +                       // or just a #name
            ")";
        var queryRE = new RegExp("(?:^|,)" +      // a comma or at the start of the line
            "\\s*" + selectorExp +                // optional space and a selector
            "(?:\\s+" + selectorExp + ")?" +      // optionally, followed by some space and a second selector
            "\\s*(?=,|$)", "ig");                 // followed by, but not including, a comma or the end of the string
        (query + "").replace(queryRE, function (all, name, title, id, justtitle, name2, title2, id2, justtitle2) {
            name = name && name.toLowerCase();
            var pages = [];
            if (name == "page" && dialog.page[id]) {
                pages.push(dialog.page[id]);
                name = name2;
                name = name && name.toLowerCase();
                title = title2;
                id = id2;
                justtitle = justtitle2;
            } else {
                pages = dialog.page;
            }
            title = title && (title + "").replace(/"/g, "");
            title2 = title2 && (title2 + "").replace(/"/g, "");
            justtitle = justtitle && (justtitle + "").replace(/"/g, "");
            justtitle2 = justtitle2 && (justtitle2 + "").replace(/"/g, "");
            if (name || justtitle) {
                for (var i = pages.length; i--;) {
                    if (justtitle || (name == "panel" && (title || (!title && id == null)))) {
                        for (var j = pages[i].panel.length; j--;) {
                            if (pages[i].panel[j].button.html() == justtitle || pages[i].panel[j].button.html() == title || (name == "panel" && !title && id == null)) {
                                coll.push(pages[i].panel[j]);
                            }
                        }
                    }
                    if (justtitle || (name == "button" && (title || (!title && id == null)))) {
                        for (var j = pages[i].button.length; j--;) {
                            if (pages[i].button[j].item.html() == justtitle || pages[i].button[j].item.html() == title || (name == "button" && !title && id == null)) {
                                coll.push(pages[i].button[j]);
                            }
                        }
                    }
                    if (pages[i][name] && pages[i][name][id]) {
                        coll.push(pages[i][name][id]);
                    }
                    if (name == "header" && pages[i].header) {
                        coll.push(pages[i].header);
                    }
                }
            } else {
                coll = coll.concat(pages);
            }
        });
        var res = {
            length: coll.length
        };
        for (var i = coll.length; i--;) {
            res[i] = coll[i];
            for (var method in coll[i]) {
                if (!(method in res)) {
                    (function (m) {
                        res[m] = function () {
                            for (var j = this.length; j--;) {
                                if (typeof this[j][m] == "function") {
                                    this[j][m].apply(this[j], arguments);
                                }
                            }
                        };
                    })(method);
                }
            }
        }
        return res;
    };

    /**
     * Updates height of panels, to contain content without the need for scroll bars.
     *
     * @method updateHeight
     */
    AJS.Dialog.prototype.updateHeight = function () {
        var height = 0;
        var maxDialogHeight = AJS.$(window).height() - HEADER_HEIGHT - BUTTONS_HEIGHT - (MIN_DIALOG_VERTICAL_BUFFER * 2);
        for (var i=0; this.getPanel(i); i++) {
            if (this.getPanel(i).body.css({height: "auto", display: "block"}).outerHeight() > height) {
                height = Math.min(maxDialogHeight, this.getPanel(i).body.outerHeight());
            }
            if (i !== this.page[this.curpage].curtab) {
                this.getPanel(i).body.css({display:"none"});
            }
        }
        for (i=0; this.getPanel(i); i++) {
            this.getPanel(i).body.css({height: height || this.height});
        }
        this.page[0].menu.height(height);
        this.height = height + HEADER_HEIGHT + BUTTONS_HEIGHT + 1;
        this.popup.changeSize(undefined, this.height);
    };

    /**
     * Returns whether the dialog has been resized to it's maximum height (has been capped by the viewport height and vertical buffer).
     *
     * @method isMaximised
     */
    AJS.Dialog.prototype.isMaximised = function () {
        return this.popup.element.outerHeight() >= AJS.$(window).height() - (MIN_DIALOG_VERTICAL_BUFFER * 2);
    };

    /**
     * Returns the current panel.
     * @deprecated Since 3.0.1 Use getCurrentPanel() instead.
     */
    AJS.Dialog.prototype.getCurPanel = function () {
        return this.getPanel(this.page[this.curpage].curtab);
    };

    /**
     * Returns the current button panel.
     * @deprecated Since 3.0.1 Use get() instead.
     */
    AJS.Dialog.prototype.getCurPanelButton = function () {
        return this.getCurPanel().button;
    };

    AJS.Dialog = AJS.deprecate.construct(AJS.Dialog, 'Dialog constructor', {alternativeName: 'Dialog2'});
    AJS.popup = AJS.deprecate.construct(AJS.popup, 'Dialog popup constructor', {alternatveName: 'Dialog2'});

})();
(function($, Alignment, skate, template, browser) {
    'use strict';

    function isChecked(el) {
        return $(el).is('.checked, .aui-dropdown2-checked, [aria-checked="true"]');
    }

    function getTrigger(control) {
        return $('[aria-controls="' + control.id + '"]')[0];
    }

    function doIfTrigger(triggerable, callback) {
        var trigger = getTrigger(triggerable);

        if (trigger) {
            callback(trigger);
        }
    }

    function setDropdownTriggerActiveState(trigger, isActive) {
        var $trigger = $(trigger);

        if (isActive) {
            $trigger.attr('aria-expanded', 'true');
            $trigger.addClass('active aui-dropdown2-active');
        } else {
            $trigger.attr('aria-expanded', 'false');
            $trigger.removeClass('active aui-dropdown2-active');
        }
    }


    // The dropdown's trigger
    // ----------------------

    function triggerCreated (trigger) {
        var dropdownID = trigger.getAttribute('aria-controls');

        if (!dropdownID) {
            dropdownID = trigger.getAttribute('aria-owns');

            if (!dropdownID) {
                AJS.error('Dropdown triggers need either a "aria-owns" or "aria-controls" attribute');
            } else {
                trigger.removeAttribute('aria-owns');
                trigger.setAttribute('aria-controls', dropdownID);
            }
        }

        trigger.setAttribute('aria-haspopup', true);
        trigger.setAttribute('aria-expanded', false);
        trigger.setAttribute('href', '#');

        function handleIt(e) {
            e.preventDefault();

            if (!trigger.isEnabled()) {
                return;
            }

            var dropdown = document.getElementById(dropdownID);
            dropdown.toggle();
            dropdown.isSubmenu = trigger.hasSubmenu();

            return dropdown;
        }

        function handleOpen(e) {
            e.preventDefault();

            if (!trigger.isEnabled() || !trigger.hasSubmenu()) {
                return;
            }

            var dropdown = document.getElementById(dropdownID);
            dropdown.show();
            dropdown.isSubmenu = trigger.hasSubmenu();

            return dropdown;
        }

        function handleKeydown(e) {
            var normalInvoke = (e.keyCode === AJS.keyCode.ENTER || e.keyCode === AJS.keyCode.SPACE);
            var submenuInvoke = (e.keyCode === AJS.keyCode.RIGHT && trigger.hasSubmenu());
            var rootMenuInvoke = ((e.keyCode === AJS.keyCode.UP || e.keyCode === AJS.keyCode.DOWN) && !trigger.hasSubmenu());

            if (normalInvoke || submenuInvoke || rootMenuInvoke) {
                var dropdown = handleIt(e);

                if (dropdown) {
                    dropdown.focusItem(0);
                }
            }
        }

        $(trigger)
            .on('aui-button-invoke', handleIt)
            .on('click', handleIt)
            .on('keydown', handleKeydown)
            .on('mouseenter', handleOpen)
        ;
    }

    var triggerPrototype = {
        disable: function() {
            this.setAttribute('aria-disabled', 'true');
        },

        enable: function() {
            this.setAttribute('aria-disabled', 'false');
        },

        isEnabled: function() {
            return this.getAttribute('aria-disabled') !== 'true';
        },

        hasSubmenu: function() {
            var triggerClasses = (this.className || '').split(/\s+/);
            return triggerClasses.indexOf('aui-dropdown2-sub-trigger') !== -1;
        }
    };

    skate('aui-dropdown2-trigger', {
        type: skate.types.CLASS,
        created: triggerCreated,
        prototype: triggerPrototype
    });

    //To remove at a later date. Some dropdown triggers initialise lazily, so we need to listen for mousedown
    //and synchornously init before the click event is fired.
    //TODO: delete in AUI 6.0.0, see AUI-2868
    function bindLazyTriggerInitialisation() {
        $(document).on('mousedown', '.aui-dropdown2-trigger', function () {
            var isElementSkated = this.hasAttribute('resolved');
            if (!isElementSkated) {
                skate.init(this);
                var lazyDeprecate = AJS.deprecate.getMessageLogger('Dropdown2 lazy initialisation', {
                    removeInVersion: '6.0.0',
                    alternativeName: 'initialisation on DOM insertion',
                    sinceVersion: '5.8.0',
                    extraInfo: 'Dropdown2 triggers should have all necessary attributes on DOM insertion',
                    deprecationType: 'JS'
                });
                lazyDeprecate();
            }
        });
    }

    bindLazyTriggerInitialisation();

    skate('aui-dropdown2-sub-trigger', {
        type: skate.types.CLASS,
        created: function(trigger) {
            trigger.className += ' aui-dropdown2-trigger';
            skate.init(trigger);
        }
    });


    // Dropdown trigger groups
    // -----------------------

    $(document).on('mouseenter', '.aui-dropdown2-trigger-group a, .aui-dropdown2-trigger-group button', function(e) {
        var $item = $(e.target);
        var groupHasOpenDropdown;

        if ($item.is('.aui-dropdown2-active')) {
            return; // No point doing anything if we're hovering over the already-active item trigger.
        }

        if ($item.closest('.aui-dropdown2').size()) {
            return; // We don't want to deal with dropdown items, just the potential triggers in the group.
        }

        groupHasOpenDropdown = $item.closest('.aui-dropdown2-trigger-group').find('.aui-dropdown2-active').size();

        if (groupHasOpenDropdown && $item.is('.aui-dropdown2-trigger')) {
            $item.trigger('aui-button-invoke'); // Open this trigger's menu.
            e.preventDefault();
        }
    });


    // Dropdown items
    // --------------

    function getDropdownItems (dropdown, filter) {
        return $(dropdown)
            .find('> ul > li, > .aui-dropdown2-section > ul > li, > div > .aui-dropdown2-section > div[role="group"] > ul > li')
            .filter(filter)
            .children('a, button, [role="checkbox"], [role="menuitemcheckbox"], [role="radio"], [role="menuitemradio"]');
    }

    function getAllDropdownItems (dropdown) {
        return getDropdownItems(dropdown, function() { return true;});
    }

    function getVisibleDropdownItems (dropdown) {
        return getDropdownItems(dropdown, function() { return this.className.indexOf('hidden') === -1; });
    }

    function amendDropdownItem (item) {
        var $item = $(item);

        $item.attr('tabindex', '-1');

        /**
         * Honouring the documentation.
         * @link https://docs.atlassian.com/aui/latest/docs/dropdown2.html
         */
        if ($item.hasClass('aui-dropdown2-disabled') || $item.parent().hasClass('aui-dropdown2-hidden')) {
            $item.attr('aria-disabled', true);
        }
    }

    function amendDropdownContent (dropdown) {
        // Add assistive semantics to each dropdown item
        getAllDropdownItems(dropdown).each(function() {
            amendDropdownItem(this);
        });
    }

    /**
     * Honours behaviour for code written using only the legacy class names.
     * To maintain old behaviour (i.e., remove the 'hidden' class and the item will become un-hidden)
     * whilst allowing our code to only depend on the new classes, we need to
     * keep the state of the DOM in sync with legacy classes.
     *
     * Calling this function will add the new namespaced classes to elements with legacy names.
     * @returns {Function} a function to remove the new namespaced classes, only from the elements they were added to.
     */
    function migrateAndSyncLegacyClassNames (dropdown) {
        var $dropdown = $(dropdown);

        // Migrate away from legacy class names
        var $hiddens = $dropdown.find('.hidden').addClass('aui-dropdown2-hidden');
        var $disableds = $dropdown.find('.disabled').addClass('aui-dropdown2-disabled');
        var $interactives = $dropdown.find('.interactive').addClass('aui-dropdown2-interactive');

        return function revertToOriginalMarkup() {
            $hiddens.removeClass('aui-dropdown2-hidden');
            $disableds.removeClass('aui-dropdown2-disabled');
            $interactives.removeClass('aui-dropdown2-interactive');
        };
    }


    // The Dropdown itself
    // -------------------

    function setLayerAlignment(dropdown, trigger) {
        var hasSubmenu = trigger && trigger.hasSubmenu && trigger.hasSubmenu();
        dropdown.setAttribute('data-aui-alignment', hasSubmenu ? 'submenu auto' : 'bottom auto');
        dropdown.setAttribute('data-aui-alignment-static', true);

        if (dropdown._auiAlignment) {
            dropdown._auiAlignment.destroy();
        }

        dropdown._auiAlignment = new Alignment(dropdown, trigger);

        dropdown._auiAlignment.enable();
    }

    function getDropdownHideLocation(dropdown, trigger) {
        var possibleHome = trigger.getAttribute('data-dropdown2-hide-location');
        return document.getElementById(possibleHome) || dropdown.parentNode;
    }

    function bindDropdownBehaviourToLayer(dropdown) {
        AJS.layer(dropdown);

        dropdown.addEventListener('aui-layer-show', function() {
            $(dropdown).trigger('aui-dropdown2-show');

            dropdown._syncClasses = migrateAndSyncLegacyClassNames(dropdown);

            amendDropdownContent(this);
            doIfTrigger(dropdown, function(trigger) {
                setDropdownTriggerActiveState(trigger, true);

                dropdown._returnTo = getDropdownHideLocation(dropdown, trigger);
            });
        });

        dropdown.addEventListener('aui-layer-hide', function() {
            $(dropdown).trigger('aui-dropdown2-hide');

            if (dropdown._syncClasses) {
                dropdown._syncClasses();
                delete dropdown._syncClasses;
            }

            if (dropdown._auiAlignment) {
                dropdown._auiAlignment.disable();
                dropdown._auiAlignment.destroy();
            }

            if (dropdown._returnTo) {
                if (dropdown.parentNode && dropdown.parentNode !== dropdown._returnTo) {
                    dropdown.parentNode.removeChild(dropdown);
                }
                dropdown._returnTo.appendChild(dropdown);
            }

            getVisibleDropdownItems(dropdown).removeClass('active aui-dropdown2-active');

            doIfTrigger(dropdown, function(trigger) {
                if (wasProbablyClosedViaKeyboard()) {
                    trigger.focus();
                    setDropdownTriggerActiveState(trigger, trigger.hasSubmenu && trigger.hasSubmenu());
                } else {
                    setDropdownTriggerActiveState(trigger, false);
                }
            });

            // Gets set by submenu trigger invocation. Bad coupling point?
            delete dropdown.isSubmenu;
        });
    }

    var keyboardClose = false;
    function keyboardCloseDetected () {
        keyboardClose = true;
    }

    function wasProbablyClosedViaKeyboard () {
        var result = (keyboardClose === true);
        keyboardClose = false;
        return result;
    }

    function bindItemInteractionBehaviourToDropdown (dropdown) {
        var $dropdown = $(dropdown);

        $dropdown.on('keydown', function(e) {
            if (e.keyCode === AJS.keyCode.DOWN) {
                dropdown.focusNext();
                e.preventDefault();
            } else if (e.keyCode === AJS.keyCode.UP) {
                dropdown.focusPrevious();
                e.preventDefault();
            } else if (e.keyCode === AJS.keyCode.LEFT) {
                if (dropdown.isSubmenu) {
                    keyboardCloseDetected();
                    dropdown.hide();
                    e.preventDefault();
                }
            } else if (e.keyCode === AJS.keyCode.ESCAPE) {
                // The closing will be handled by the LayerManager!
                keyboardCloseDetected();
            } else if (e.keyCode === AJS.keyCode.TAB) {
                keyboardCloseDetected();
                dropdown.hide();
            }
        });

        // close the menu when clicking on elements which aren't "interactive"
        $dropdown.on('click', 'a, button, [role="menuitem"], [role="menuitemcheckbox"], [role="checkbox"], [role="menuitemradio"], [role="radio"]', function(e) {
            var $item = $(e.target);

            if ($item.attr('aria-disabled') === 'true') {
                e.preventDefault();
            }

            if (!e.isDefaultPrevented() && !$item.is('.aui-dropdown2-interactive')) {
                var theMenu = dropdown;
                do {
                    var dd = AJS.layer(theMenu);
                    theMenu = AJS.layer(theMenu).below();
                    if (dd.$el.is('.aui-dropdown2')) {
                        dd.hide();
                    }
                } while (theMenu);
            }
        });

        // close a submenus when the mouse moves over items other than its trigger
        $dropdown.on('mouseenter', 'a, button, [role="menuitem"], [role="menuitemcheckbox"], [role="checkbox"], [role="menuitemradio"], [role="radio"]', function(e) {
            var item = e.target;
            var hasSubmenu = item.hasSubmenu && item.hasSubmenu();

            if (!e.isDefaultPrevented() && !hasSubmenu) {
                var maybeALayer = AJS.layer(dropdown).above();

                if (maybeALayer) {
                    AJS.layer(maybeALayer).hide();
                }
            }
        });
    }


    // Dropdowns
    // ---------

    function dropdownCreated (dropdown) {
        var $dropdown = $(dropdown);

        $dropdown.addClass('aui-dropdown2');

        // swap the inner div to presentation as application is only needed for Windows
        if (browser.supportsVoiceOver()) {
            $dropdown.find('> div[role="application"]').attr('role', 'presentation');
        }

        if (dropdown.hasAttribute('data-container')) {
            $dropdown.attr('data-aui-alignment-container', $dropdown.attr('data-container'));
            $dropdown.removeAttr('data-container');
        }

        bindDropdownBehaviourToLayer(dropdown);
        bindItemInteractionBehaviourToDropdown(dropdown);
        dropdown.hide();
    }

    var dropdownPrototype = {
        /**
         * Toggles the visibility of the dropdown menu
         *
         * @returns {undefined}
         */
        toggle: function() {
            if (this.isVisible()) {
                this.hide();
            } else {
                this.show();
            }
        },

        /**
         * Explicitly shows the menu
         *
         * @returns {HTMLElement}
         */
        show: function() {
            AJS.layer(this).show();

            var dropdown = this;
            doIfTrigger(dropdown, function(trigger) {
                setLayerAlignment(dropdown, trigger);
            });

            return this;
        },

        /**
         * Explicitly hides the menu
         *
         * @returns {HTMLElement}
         */
        hide: function() {
            AJS.layer(this).hide();
            return this;
        },

        /**
         * Shifts explicit focus to the next available item in the menu
         *
         * @returns {undefined}
         */
        focusNext: function() {
            var $items = getVisibleDropdownItems(this);
            var selected = document.activeElement;
            var idx;

            if ($items.last()[0] !== selected) {
                idx = $items.toArray().indexOf(selected);
                this.focusItem($items.get(idx+1));
            }
        },

        /**
         * Shifts explicit focus to the previous available item in the menu
         *
         * @returns {undefined}
         */
        focusPrevious: function() {
            var $items = getVisibleDropdownItems(this);
            var selected = document.activeElement;
            var idx;

            if ($items.first()[0] !== selected) {
                idx = $items.toArray().indexOf(selected);
                this.focusItem($items.get(idx-1));
            }
        },

        /**
         * Shifts explicit focus to the menu item matching the index param
         *
         * @param {number} message The message to act on.
         *
         * @returns {undefined}
         */
        focusItem: function(item) {
            var $items = getVisibleDropdownItems(this);
            var $item;
            if (typeof item === 'number') {
                item = $items.get(item);
            }
            $item = $(item);
            $item.focus();
            $items.removeClass('active aui-dropdown2-active');
            $item.addClass('active aui-dropdown2-active');
        },

        /**
         * Checks whether or not the menu is currently displayed
         *
         * @returns {Boolean}
         */
        isVisible: function() {
            return AJS.layer(this).isVisible();
        }
    };

    skate('aui-dropdown', {
        attributes: {
            label: function (element, data) {
                element.children[0].textContent = data.newValue;
            }
        },

        created: function (element) {
            var dropdown = element.children[1];
            var trigger = element.children[0];

            dropdown.id = element.id + '-dropdown';
            trigger.id = element.id + '-trigger';
            trigger.setAttribute('aria-controls', dropdown.id);
            trigger.setAttribute('aria-owns', dropdown.id);

            // Rebind all prototype methods to use the dropdown element. This
            // can be removed once the old markup pattern is removed as it's
            // only here to share code.
            Object.keys(dropdownPrototype).forEach(function (key) {
                element[key] = element[key].bind(dropdown);
            });

            bindDropdownBehaviourToLayer(dropdown);
            bindItemInteractionBehaviourToDropdown(dropdown);
            element.hide();
        },

        prototype: dropdownPrototype,

        template: window.skateTemplateHtml(
            '<a class="aui-dropdown2-trigger" href="#"></a>',
            '<div aria-hidden="true" class="aui-dropdown2 aui-style-default" role="menu">',
                '<div role="application">',
                    '<content select="ul"></content>',
                '</div>',
            '</div>'
        ),

        type: skate.types.TAG
    });

    skate('aui-dropdown2', {
        type: skate.types.CLASS,
        created: dropdownCreated,
        prototype: dropdownPrototype
    });

    skate('data-aui-dropdown2', {
        type: skate.types.ATTR,
        created: dropdownCreated,
        prototype: dropdownPrototype
    });


    // Checkboxes and radios
    // ---------------------

    skate('aui-dropdown2-checkbox', {
        type: skate.types.CLASS,

        created: function(checkbox) {
            var checked = isChecked(checkbox);
            checkbox.setAttribute('aria-checked', checked);
            checkbox.setAttribute('tabindex', '0');

            // swap from menuitemcheckbox to just plain checkbox for VoiceOver
            if (browser.supportsVoiceOver()) {
                checkbox.setAttribute('role','checkbox');
            }

            $(checkbox).on('click keydown', function(e) {
                if (e.type === 'click' || e.keyCode === AJS.keyCode.ENTER || e.keyCode === AJS.keyCode.SPACE) {
                    if (checkbox.isInteractive()) {
                        e.preventDefault();
                    }

                    if (checkbox.isEnabled()) {
                        // toggle the checked state
                        if (checkbox.isChecked()) {
                            checkbox.uncheck();
                        } else {
                            checkbox.check();
                        }
                    }
                }
            });
        },

        prototype: {
            isEnabled: function() {
                return !(this.getAttribute('aria-disabled') !== null && this.getAttribute('aria-disabled') === 'true');
            },

            isChecked: function() {
                return this.getAttribute('aria-checked') !== null && this.getAttribute('aria-checked') === 'true';
            },

            isInteractive: function() {
                return $(this).hasClass('aui-dropdown2-interactive');
            },

            uncheck: function() {
                this.setAttribute('aria-checked', 'false');
                $(this).removeClass('checked aui-dropdown2-checked');
                $(this).trigger('aui-dropdown2-item-uncheck');
            },

            check: function() {
                this.setAttribute('aria-checked', 'true');
                $(this).addClass('checked aui-dropdown2-checked');
                $(this).trigger('aui-dropdown2-item-check');
            }
        }
    });

    skate('aui-dropdown2-radio', {
        type: skate.types.CLASS,

        created: function(radio) {
            // add a dash of ARIA
            var checked = isChecked(radio);
            radio.setAttribute('aria-checked', checked);
            radio.setAttribute('tabindex', '0');

            // swap from menuitemradio to just plain radio for VoiceOver
            if (browser.supportsVoiceOver()) {
                radio.setAttribute('role','radio');
            }

            $(radio).on('click keydown', function(e){
                if (e.type === 'click' || e.keyCode === AJS.keyCode.ENTER || e.keyCode === AJS.keyCode.SPACE) {
                    if (radio.isInteractive()) {
                        e.preventDefault();
                    }
                    var $radio = $(this);

                    if (this.isEnabled() && this.isChecked() === false) {
                        // toggle the checked state
                        $radio.closest('ul').find('.aui-dropdown2-checked').not(this).each(function(){
                            this.uncheck();
                        });
                        radio.check();
                    }
                }
            });
        },

        prototype: {
            isEnabled: function() {
                return !(this.getAttribute('aria-disabled') !== null && this.getAttribute('aria-disabled') === 'true');
            },

            isChecked: function() {
                return this.getAttribute('aria-checked') !== null && this.getAttribute('aria-checked') === 'true';
            },

            isInteractive: function() {
                return $(this).hasClass('aui-dropdown2-interactive');
            },

            uncheck: function() {
                this.setAttribute('aria-checked', 'false');
                $(this).removeClass('checked aui-dropdown2-checked');
                $(this).trigger('aui-dropdown2-item-uncheck');
            },

            check: function() {
                this.setAttribute('aria-checked', 'true');
                $(this).addClass('checked aui-dropdown2-checked');
                $(this).trigger('aui-dropdown2-item-check');
            }
        }
    });
}(AJS.$, AJS.Alignment, window.skate, window.skateTemplateHtml, AJS._internal.browser));

/**
 * Forms: Inline Help - toggles visibility of inline help content.
 *
 * @method inlineHelp
 * @namespace AJS
 * @for AJS
 */
AJS.inlineHelp = function () {
    AJS.$(".icon-inline-help").click(function(){
        var $t = AJS.$(this).siblings(".field-help");
        if ($t.hasClass("hidden")){
            $t.removeClass("hidden");
        } else {
            $t.addClass("hidden");
        }
    });
};
/*global Raphael: true */
/*jshint quotmark:false, eqeqeq:false, strict:false */

(function($) {
    /**
     * Creates a new inline dialog.
     *
     * @class InlineDialog
     * @namespace AJS
     * @constructor
     * @param items jQuery object - the items that trigger the display of this popup when the user mouses over.
     * @param identifier A unique identifier for this popup. This should be unique across all popups on the page and a valid CSS class.
     * @param url The URL to retrieve popup contents.
     * @param options Custom options to change default behaviour. See AJS.InlineDialog.opts for default values and valid options.
     */
    AJS.InlineDialog = function (items, identifier, url, options) {
        options = options || [];
        if (options.hasOwnProperty('getArrowAttributes')) {
            getArrowAttributesDeprecationLogger();
        }

        if (options.hasOwnProperty('getArrowPath')) {
            getArrowPathDeprecationLogger();
            if (options.hasOwnProperty('gravity')) {
                getArrowPathWithGravityDeprecationLogger();
            }
        }

        if (options.hasOwnProperty('onTop')) {
            onTopDeprecationLogger();
            if (options.onTop && options.gravity === undefined) {
                options.gravity = 's';
            }
        }

        // attempt to generate a random identifier if it doesn't exist
        if (typeof identifier === 'undefined') {

            identifier = String(Math.random()).replace('.', '');

            // if the generated supplied identifier already exists when combined with the prefixes we'll be using, then bail
            if ($('#inline-dialog-' + identifier + ', #arrow-' + identifier + ', #inline-dialog-shim-' + identifier).length) {
                throw 'GENERATED_IDENTIFIER_NOT_UNIQUE';
            }

        }

        var opts = $.extend(false, AJS.InlineDialog.opts, options);
        if (opts.gravity === 'w') {
            // TODO Once support for gravity: 'e' is added, it should also
            //      transpose the defaults for offsetX and offsetY.
            opts.offsetX = options.offsetX === undefined ? 10 : options.offsetX;
            opts.offsetY = options.offsetY === undefined ? 0 : options.offsetY;
        }
        var renderAsSVG = function() {
            return window.Raphael && options && (options.getArrowPath || options.getArrowAttributes);
        };

        var hash;
        var hideDelayTimer;
        var showTimer;
        var beingShown = false;
        var shouldShow = false;
        var contentLoaded = false;
        var mousePosition;
        var targetPosition;
        var popup  = $('<div id="inline-dialog-' + identifier
            + '" class="aui-inline-dialog"><div class="aui-inline-dialog-contents contents"></div><div id="arrow-' +
            identifier + '" class="aui-inline-dialog-arrow arrow"></div></div>');

        var arrow = $("#arrow-" + identifier, popup);
        var contents = popup.find(".contents");

        if (!renderAsSVG()) {
            popup.find(".aui-inline-dialog-arrow").addClass("aui-css-arrow");
        }

        if (!opts.displayShadow) {
            contents.addClass('aui-inline-dialog-no-shadow');
        }

        if (opts.autoWidth) {
            contents.addClass('aui-inline-dialog-auto-width');
        } else {
            contents.width(opts.width);
        }

        contents.on({
            'mouseenter': function() {
                clearTimeout(hideDelayTimer);
                popup.unbind("mouseenter");
            },
            'mouseleave': function() {
                hidePopup();
            }
        });

        var getHash = function () {
            if (!hash) {
                hash = {
                    popup: popup,
                    hide: function(){
                        hidePopup(0);
                    },
                    id: identifier,
                    show: function(){
                        showPopup();
                    },
                    persistent: opts.persistent ? true : false,
                    reset: function () {

                        function drawPopup (popup, positions) {
                            //Position the popup using the left and right parameters
                            popup.css(positions.popupCss);

                            if (renderAsSVG()) {
                                //special adjustment for downards raphael arrow
                                if (positions.gravity === 's'){
                                    positions.arrowCss.top -= $.browser.msie ? 10 : 9;
                                }

                                if (!popup.arrowCanvas) {
                                    popup.arrowCanvas = Raphael("arrow-"+identifier, 16, 16);  //create canvas using arrow element
                                }
                                var getArrowPath = opts.getArrowPath,
                                    arrowPath = $.isFunction(getArrowPath) ?
                                        getArrowPath(positions) :
                                        getArrowPath;
                                //draw the arrow
                                popup.arrowCanvas
                                    .path(arrowPath)
                                    .attr(opts.getArrowAttributes());

                            } else {
                                arrow.removeClass('aui-bottom-arrow aui-left-arrow aui-right-arrow');
                                if (positions.gravity === 's' && !arrow.hasClass("aui-bottom-arrow")) {
                                    arrow.addClass("aui-bottom-arrow");
                                } else if (positions.gravity === 'n') {
                                    // Default styles are for 'n' gravity.
                                } else if (positions.gravity === 'w') {
                                    arrow.addClass('aui-left-arrow');
                                } else if (positions.gravity === 'e') {
                                    arrow.addClass('aui-right-arrow');
                                }
                            }


                            arrow.css(positions.arrowCss);
                        }

                        //DRAW POPUP
                        var viewportHeight = AJS.$(window).height();
                        var popupMaxHeight = Math.round(viewportHeight * 0.75);
                        popup.children('.aui-inline-dialog-contents')
                            .css('max-height', popupMaxHeight);

                        var positions = opts.calculatePositions(popup, targetPosition, mousePosition, opts);
                        if (positions.hasOwnProperty('displayAbove')) {
                            displayAboveDeprecationLogger();
                            positions.gravity = positions.displayAbove ? 's' : 'n';
                        }

                        drawPopup(popup, positions);

                        // reset position of popup box
                        popup.fadeIn(opts.fadeTime, function() {
                            // once the animation is complete, set the tracker variables
                            // beingShown = false; // is this necessary? Maybe only the shouldShow will have to be reset?
                        });

                        if ($.browser.msie && ~~($.browser.version) < 10) {
                            // iframeShim, prepend if it doesnt exist
                            var jQueryCache = $('#inline-dialog-shim-' + identifier);
                            if (!jQueryCache.length) {
                                $(popup).prepend($('<iframe class = "inline-dialog-shim" id="inline-dialog-shim-' + identifier + '" frameBorder="0" src="javascript:false;"></iframe>'));
                            }
                            // adjust height and width of shim according to the popup
                            jQueryCache.css({
                                width: contents.outerWidth(),
                                height: contents.outerHeight()
                            });
                        }
                    }
                };
            }
            return hash;
        };

        var showPopup = function() {
            if (popup.is(":visible")) {
                return;
            }
            showTimer = setTimeout(function() {
                if (!contentLoaded || !shouldShow) {
                    return;
                }
                opts.addActiveClass && $(items).addClass("active");
                beingShown = true;
                if (!opts.persistent) {
                    bindHideEvents();
                }
                AJS.InlineDialog.current = getHash();
                $(document).trigger("showLayer", ["inlineDialog", getHash()]);
                // retrieve the position of the click target. The offsets might be different for different types of targets and therefore
                // either have to be customisable or we will have to be smarter about calculating the padding and elements around it

                getHash().reset();

            }, opts.showDelay);
        };

        var hidePopup = function(delay) {
            // do not auto hide the popup if persistent is set as true
            if (typeof delay == 'undefined' && opts.persistent) {
                return;
            }
            if (typeof popup.get(0)._datePickerPopup !== 'undefined') {
                // AUI-2696 - This inline dialog is host to a date picker... so we shouldn't close it.
                return;
            }

            shouldShow = false;
            // only exectute the below if the popup is currently being shown
            // and the arbitrator callback gives us the green light
            if (beingShown && opts.preHideCallback.call(popup[0].popup)) {
                delay = (delay == null) ? opts.hideDelay : delay;
                clearTimeout(hideDelayTimer);
                clearTimeout(showTimer);
                // store the timer so that it can be cleared in the mouseenter if required
                //disable auto-hide if user passes null for hideDelay
                if (delay != null) {
                    hideDelayTimer = setTimeout(function() {
                        unbindHideEvents();
                        opts.addActiveClass && $(items).removeClass("active");
                        popup.fadeOut(opts.fadeTime, function() { opts.hideCallback.call(popup[0].popup); });
                        //If there's a raphael arrow remove it properly
                        if(popup.arrowCanvas){
                            popup.arrowCanvas.remove();
                            popup.arrowCanvas = null;
                        }
                        beingShown = false;
                        shouldShow = false;
                        $(document).trigger("hideLayer", ["inlineDialog", getHash()]);
                        AJS.InlineDialog.current = null;
                        if (!opts.cacheContent) {
                            //if not caching the content, then reset the
                            //flags to false so as to reload the content
                            //on next mouse hover.
                            contentLoaded = false;
                            contentLoading = false;
                        }

                    }, delay);
                }

            }
        };

        // the trigger is the jquery element that is triggering the popup (i.e., the element that the mousemove event is bound to)
        var initPopup = function(e, trigger) {
            var $trigger = $(trigger);

            opts.upfrontCallback.call({
                popup: popup,
                hide: function () {hidePopup(0);},
                id: identifier,
                show: function () {showPopup();}
            });

            popup.each(function() {
                if (typeof this.popup != "undefined") {
                    this.popup.hide();
                }
            });

            //Close all other popups if neccessary
            if (opts.closeOthers) {
                $(".aui-inline-dialog").each(function() {
                    !this.popup.persistent && this.popup.hide();
                });
            }

            //handle programmatic showing where there is no event
            targetPosition = {target: $trigger};
            if (!e) {
                mousePosition = { x: $trigger.offset().left, y: $trigger.offset().top };
            } else {
                mousePosition = { x: e.pageX, y: e.pageY };
            }



            if (!beingShown) {
                clearTimeout(showTimer);
            }
            shouldShow = true;
            var doShowPopup = function() {
                contentLoading = false;
                contentLoaded = true;
                opts.initCallback.call({
                    popup: popup,
                    hide: function () {hidePopup(0);},
                    id: identifier,
                    show: function () {showPopup();}
                });
                showPopup();
            };
            // lazy load popup contents
            if (!contentLoading) {
                contentLoading = true;
                if ($.isFunction(url)) {
                    // If the passed in URL is a function, execute it. Otherwise simply load the content.
                    url(contents, trigger, doShowPopup);
                } else {
                    //Retrive response from server
                    $.get(url, function (data, status, xhr) {
                        //Load HTML contents into the popup
                        contents.html(opts.responseHandler(data, status, xhr));
                        //Show the popup
                        contentLoaded = true;
                        opts.initCallback.call({
                            popup: popup,
                            hide: function () {hidePopup(0);},
                            id: identifier,
                            show: function () {showPopup();}
                        });
                        showPopup();
                    });
                }
            }
            // stops the hide event if we move from the trigger to the popup element
            clearTimeout(hideDelayTimer);
            // don't trigger the animation again if we're being shown
            if (!beingShown) {
                showPopup();
            }
            return false;
        };

        popup[0].popup = getHash();

        var contentLoading = false;
        var added  = false;
        var appendPopup = function () {
            if (!added) {
                $(opts.container).append(popup);
                added = true;
            }
        };
        var $items = $(items);

        if (opts.onHover) {
            if (opts.useLiveEvents) {
                // We're using .on() to emulate the behaviour of .live() here. on() requires the jQuery object to have
                // a selector - this is actually how .live() is implemented in jQuery 1.7+.
                // Note that .selector is deleted in jQuery 1.9+.
                // This means that jQuery objects created by selection eg $(".my-class-selector") will work, but
                // object created by DOM parsing eg $("<div class='.my-class'></div>") will not work.
                // Ideally we should throw an error if the $items has no selector but that is backwards incompatible,
                // so we warn and do a no-op - this emulates the behaviour of live() but has the added warning.
                if ($items.selector) {
                    $(document).on("mouseenter", $items.selector, function(e) {
                        appendPopup();
                        initPopup(e, this);
                    }).on("mouseleave", $items.selector, function() {
                        hidePopup();
                    });
                }
                else {
                    AJS.log("Warning: inline dialog trigger elements must have a jQuery selector when the useLiveEvents option is enabled.");
                }
            } else {
                $items.on({
                    'mouseenter': function(e) {
                        appendPopup();
                        initPopup(e,this);
                    },
                    'mouseleave': function() {
                        hidePopup();
                    }
                });
            }
        } else {
            if (!opts.noBind) {   //Check if the noBind option is turned on
                if (opts.useLiveEvents) {
                    // See above for why we filter by .selector
                    if ($items.selector) {
                        $(document).on("click", $items.selector, function(e) {
                            appendPopup();
                            if (shouldCloseOnTriggerClick()) {
                                popup.hide();
                            } else {
                                initPopup(e,this);
                            }
                            return false;
                        }).on("mouseleave", $items.selector, function() {
                            hidePopup();
                        });
                    }
                    else {
                        AJS.log("Warning: inline dialog trigger elements must have a jQuery selector when the useLiveEvents option is enabled.");
                    }
                } else {
                    $items.on("click", function(e) {
                        appendPopup();
                        if (shouldCloseOnTriggerClick()) {
                            popup.hide();
                        } else {
                            initPopup(e,this);
                        }
                        return false;
                    }).on("mouseleave", function() {
                        hidePopup();
                    });
                }
            }
        }

        var shouldCloseOnTriggerClick = function() {
            return beingShown && opts.closeOnTriggerClick;
        }

        var bindHideEvents = function() {
            bindHideOnExternalClick();
            bindHideOnEscPressed();
        };

        var unbindHideEvents = function() {
            unbindHideOnExternalClick();
            unbindHideOnEscPressed();
        };

        // Be defensive and make sure that we haven't already bound the event
        var hasBoundOnExternalClick = false;
        var externalClickNamespace = identifier + ".inline-dialog-check";

        /**
         * Catch click events on the body to see if the click target occurs outside of this popup
         * If it does, the popup will be hidden
         */
        var bindHideOnExternalClick = function () {
            if (!hasBoundOnExternalClick) {
                $("body").bind("click." + externalClickNamespace, function(e) {
                    var $target = $(e.target);
                    // hide the popup if the target of the event is not in the dialog
                    if ($target.closest('#inline-dialog-' + identifier + ' .contents').length === 0) {
                        hidePopup(0);
                    }
                });
                hasBoundOnExternalClick = true;
            }
        };

        var unbindHideOnExternalClick = function () {
            if (hasBoundOnExternalClick) {
                $("body").unbind("click." + externalClickNamespace);
            }
            hasBoundOnExternalClick = false;
        };

        var onKeydown = function(e) {
            if (e.keyCode === 27) {
                hidePopup(0);
            }
        };

        var bindHideOnEscPressed = function() {
            $(document).on("keydown", onKeydown);
        };

        var unbindHideOnEscPressed = function() {
            $(document).off("keydown", onKeydown);
        };

        /**
         * Show the inline dialog.
         * @method show
         */
        popup.show = function (e, trigger) {
            if (e) {
                e.stopPropagation();
            }
            appendPopup();
            if (opts.noBind && !(items && items.length)) {
                initPopup(e, trigger === undefined ? e.target : trigger);
            } else {
                initPopup(e, items);
            }
        };
        /**
         * Hide the inline dialog.
         * @method hide
         */
        popup.hide = function () {
            hidePopup(0);
        };
        /**
         * Repositions the inline dialog if being shown.
         * @method refresh
         */
        popup.refresh = function () {
            if (beingShown) {
                getHash().reset();
            }
        };

        popup.getOptions = function(){
            return opts;
        };

        return popup;
    };

    function dimensionsOf(el) {
        var $el = $(el);
        var offset = $.extend({left: 0, top: 0}, $el.offset());
        return {
            left: offset.left,
            top: offset.top,
            width: $el.outerWidth(),
            height: $el.outerHeight()
        };
    }

    function getDimensions(popup, targetPosition, mousePosition, opts) {
        var offsetX = AJS.$.isFunction(opts.offsetX) ? opts.offsetX(popup, targetPosition, mousePosition, opts) : opts.offsetX;
        var offsetY = AJS.$.isFunction(opts.offsetY) ? opts.offsetY(popup, targetPosition, mousePosition, opts) : opts.offsetY;
        var arrowOffsetX = AJS.$.isFunction(opts.arrowOffsetX) ? opts.arrowOffsetX(popup, targetPosition, mousePosition, opts) : opts.arrowOffsetX;
        var arrowOffsetY = AJS.$.isFunction(opts.arrowOffsetY) ? opts.arrowOffsetY(popup, targetPosition, mousePosition, opts) : opts.arrowOffsetY;

        // Support positioning inside a scroll container other than <body>
        var isConstrainedScroll = opts.container.toLowerCase() !== 'body';
        var $scrollContainer = AJS.$(opts.container);
        var $scrollWindow = isConstrainedScroll ?
            AJS.$(opts.container).parent() :
            AJS.$(window);
        var scrollContainerOffset = isConstrainedScroll ?
            $scrollContainer.offset() : { left: 0, top: 0 };
        var scrollWindowOffset = isConstrainedScroll ?
            $scrollWindow.offset() : { left: 0, top: 0 };

        var trigger = targetPosition.target;
        var triggerOffset = trigger.offset();
        // Support SVG elements as triggers
        // TODO Should calculateNorthSouthPositions also try getBBox()?
        var triggerBBox = trigger[0].getBBox && trigger[0].getBBox();

        return {
            // determines how close to the edge the dialog needs to be before it is considered offscreen
            screenPadding: 10,
            // Min distance arrow needs to be from the edge of the dialog
            arrowMargin: 5,
            window: {
                top: scrollWindowOffset.top,
                left: scrollWindowOffset.left,
                scrollTop: $scrollWindow.scrollTop(),
                scrollLeft: $scrollWindow.scrollLeft(),
                width: $scrollWindow.width(),
                height: $scrollWindow.height()
            },
            scrollContainer: {
                width: $scrollContainer.width(),
                height: $scrollContainer.height()
            },
            // Position of the trigger is relative to the scroll container
            trigger: {
                top: triggerOffset.top - scrollContainerOffset.top,
                left: triggerOffset.left - scrollContainerOffset.left,
                width: triggerBBox ? triggerBBox.width : trigger.outerWidth(),
                height: triggerBBox ? triggerBBox.height : trigger.outerHeight()
            },
            dialog: {
                width: popup.width(),
                height: popup.height(),
                offset: {
                    top: offsetY,
                    left: offsetX
                }
            },
            arrow: {
                height: popup.find('.arrow').outerHeight(),
                offset: {
                    top: arrowOffsetY,
                    left: arrowOffsetX
                }
            }
        };
    }

    function calculateWestPositions(popup, targetPosition, mousePosition, opts) {
        var dimensions = getDimensions(popup, targetPosition, mousePosition, opts);
        var screenPadding = dimensions.screenPadding;
        var win = dimensions.window;
        var trigger = dimensions.trigger;
        var dialog = dimensions.dialog;
        var arrow = dimensions.arrow;
        var scrollContainer = dimensions.scrollContainer;

        var triggerScrollOffset = {
            top: trigger.top - win.scrollTop,
            left: trigger.left - win.scrollLeft
        };

        // Halves - because the browser doesn't do sub-pixel positioning, we need to consistently floor
        // all decimal values or you can get 1px jumps in arrow positioning when the dialog's height changes.
        var halfTriggerHeight = Math.floor(trigger.height / 2);
        var halfPopupHeight = Math.floor(dialog.height / 2);
        var halfArrowHeight = Math.floor(arrow.height / 2);

        // Figure out where to position the dialog, preferring the right (gravity: 'w').
        var spaceOnLeft = triggerScrollOffset.left - dialog.offset.left - screenPadding;

        // This implementation may not be suitable for horizontally scrolling containers
        var spaceOnRight = scrollContainer.width - triggerScrollOffset.left - trigger.width - dialog.offset.left - screenPadding;

        var enoughSpaceOnLeft = spaceOnLeft >= dialog.width;
        var enoughSpaceOnRight = spaceOnRight >= dialog.width;
        var gravity = !enoughSpaceOnRight && enoughSpaceOnLeft ? 'e' : 'w';

        // Screen padding needs to be adjusted if the arrow would extend into it
        var arrowScreenTop = triggerScrollOffset.top + halfTriggerHeight - halfArrowHeight;
        var arrowScreenBottom = win.height - arrowScreenTop - arrow.height;
        screenPadding = Math.min(screenPadding, arrowScreenTop - dimensions.arrowMargin);
        screenPadding = Math.min(screenPadding, arrowScreenBottom - dimensions.arrowMargin);

        // Figure out if the dialog needs to be adjusted up or down to fit on the screen
        var middleOfTrigger = triggerScrollOffset.top + halfTriggerHeight;
        var spaceAboveMiddleOfTrigger = Math.max(middleOfTrigger - screenPadding, 0);
        var spaceBelowMiddleOfTrigger = Math.max(win.height - middleOfTrigger - screenPadding, 0);

        var isOverflowingAbove = halfPopupHeight - dialog.offset.top > spaceAboveMiddleOfTrigger;
        var isOverflowingBelow = halfPopupHeight + dialog.offset.top > spaceBelowMiddleOfTrigger;

        var popupCss;
        var arrowCss;
        if (isOverflowingAbove) {
            popupCss = {
                top: win.scrollTop + screenPadding,
                left: gravity === 'w' ?
                    trigger.left + trigger.width + dialog.offset.left :
                    trigger.left - dialog.width - dialog.offset.left
            };
            arrowCss = {
                top: (trigger.top + halfTriggerHeight) - (popupCss.top + halfArrowHeight)
            };
        } else if (isOverflowingBelow) {
            popupCss = {
                top: win.scrollTop + win.height - dialog.height - screenPadding,
                left: gravity === 'w' ?
                    trigger.left + trigger.width + dialog.offset.left :
                    trigger.left - dialog.width - dialog.offset.left
            };
            arrowCss = {
                top: (trigger.top + halfTriggerHeight) - (popupCss.top + halfArrowHeight)
            };
        } else {
            popupCss = {
                top: trigger.top + halfTriggerHeight - halfPopupHeight + dialog.offset.top,
                left: gravity === 'w' ?
                    trigger.left + trigger.width + dialog.offset.left :
                    trigger.left - dialog.width - dialog.offset.left
            };
            arrowCss = {
                top: halfPopupHeight - halfArrowHeight + arrow.offset.top
            };
        }

        return {
            gravity: gravity,
            popupCss: popupCss,
            arrowCss: arrowCss
        };
    }

    function calculateNorthSouthPositions(popup, targetPosition, mousePosition, opts) {
        var offsetX = AJS.$.isFunction(opts.offsetX) ? opts.offsetX(popup, targetPosition, mousePosition, opts) : opts.offsetX;
        var offsetY = AJS.$.isFunction(opts.offsetY) ? opts.offsetY(popup, targetPosition, mousePosition, opts) : opts.offsetY;
        var arrowOffsetX = AJS.$.isFunction(opts.arrowOffsetX) ? opts.arrowOffsetX(popup, targetPosition, mousePosition, opts) : opts.arrowOffsetX;
        var arrowOffsetY = AJS.$.isFunction(opts.arrowOffsetY) ? opts.arrowOffsetY(popup, targetPosition, mousePosition, opts) : opts.arrowOffsetY;

        var viewportDimensions = dimensionsOf(window);
        var targetDimensions = dimensionsOf(targetPosition.target);
        var popupDimensions = dimensionsOf(popup);
        var arrowDimensions = dimensionsOf(popup.find(".aui-inline-dialog-arrow"));

        var middleOfTrigger = targetDimensions.left + targetDimensions.width/2; //The absolute x position of the middle of the Trigger
        var bottomOfViewablePage = (window.pageYOffset || document.documentElement.scrollTop) + viewportDimensions.height;
        var SCREEN_PADDING = 10; //determines how close to the edge the dialog needs to be before it is considered offscreen

        // Set popup's position (within the viewport)
        popupDimensions.top = targetDimensions.top + targetDimensions.height + ~~offsetY;
        popupDimensions.left = targetDimensions.left + ~~offsetX;

        // Calculate if the popup would render off the side of the viewport
        var diff = viewportDimensions.width - (popupDimensions.left + popupDimensions.width + SCREEN_PADDING);

        // Set arrow's position (within the popup)
        arrowDimensions.left = middleOfTrigger - popupDimensions.left + ~~arrowOffsetX;
        // TODO arrowDimensions.top should also use arrowOffsetY.
        arrowDimensions.top = -(arrowDimensions.height/2);

        // Check whether the popup should display above or below the trigger
        var enoughRoomAbove = targetDimensions.top > popupDimensions.height;
        var enoughRoomBelow = (popupDimensions.top + popupDimensions.height) < bottomOfViewablePage;
        var displayAbove = (!enoughRoomBelow && enoughRoomAbove) || (enoughRoomAbove && opts.gravity === 's');

        if (displayAbove) {
            popupDimensions.top = targetDimensions.top - popupDimensions.height - (arrowDimensions.height/2);
            arrowDimensions.top = popupDimensions.height;
        }

        // Check if the popup should show up relative to the mouse
        if(opts.isRelativeToMouse){
            if(diff < 0){
                popupDimensions.right = SCREEN_PADDING;
                popupDimensions.left = "auto";
                // TODO Why doesn't arrowDimentions.left here use arrowOffsetX?
                arrowDimensions.left = mousePosition.x - (viewportDimensions.width - popupDimensions.width);
            }else{
                popupDimensions.left = mousePosition.x - 20;
                // TODO Why doesn't arrowDimentions.left here use arrowOffsetX?
                arrowDimensions.left = mousePosition.x - popupDimensions.left;
            }
        }else{
            if(diff < 0){
                popupDimensions.right = SCREEN_PADDING;
                popupDimensions.left = "auto";

                var popupRightEdge = viewportDimensions.width - popupDimensions.right;
                var popupLeftEdge = popupRightEdge - popupDimensions.width;

                //arrow's position must be relative to the popup's position and not of the screen.
                arrowDimensions.right = "auto";
                // TODO Why doesn't arrowDimentions.left here use arrowOffsetX?
                arrowDimensions.left = middleOfTrigger - popupLeftEdge - arrowDimensions.width/2;
            } else if(popupDimensions.width <= targetDimensions.width/2){
                // TODO Why doesn't arrowDimentions.left here use arrowOffsetX?
                arrowDimensions.left = popupDimensions.width/2;
                popupDimensions.left = middleOfTrigger - popupDimensions.width/2;
            }
        }
        return {
            gravity: displayAbove ? 's' : 'n',
            displayAbove: displayAbove,  // Replaced with gravity but remains for backward compatibility.
            popupCss: {
                left: popupDimensions.left,
                top: popupDimensions.top,
                right: popupDimensions.right
            },
            arrowCss: {
                left: arrowDimensions.left,
                top: arrowDimensions.top,
                right: arrowDimensions.right
            }
        };
    }


    AJS.InlineDialog.opts = {
        onTop: false,
        responseHandler: function(data, status, xhr) {
            //assume data is html
            return data;
        },
        closeOthers: true,
        isRelativeToMouse: false,
        addActiveClass: true, // if false, signifies that the triggers should not have the "active" class applied
        onHover: false,
        useLiveEvents: false,
        noBind: false,
        fadeTime: 100,
        persistent: false,
        hideDelay: 10000,
        showDelay: 0,
        width: 300,
        offsetX: 0,
        offsetY: 10,
        arrowOffsetX: 0,
        arrowOffsetY: 0,
        container: "body",
        cacheContent : true,
        displayShadow: true,
        autoWidth: false,
        gravity: 'n',
        closeOnTriggerClick: false,
        preHideCallback: function () { return true; },
        hideCallback: function(){}, // if defined, this method will be exected after the popup has been faded out.
        initCallback: function(){}, // A function called after the popup contents are loaded. `this` will be the popup jQuery object, and the first argument is the popup identifier.
        upfrontCallback: function() {}, // A function called before the popup contents are loaded. `this` will be the popup jQuery object, and the first argument is the popup identifier.
        /**
         * Returns an object with the following attributes:
         *      popupCss css attributes to apply on the popup element
         *      arrowCss css attributes to apply on the arrow element
         *
         * @param popup
         * @param targetPosition position of the target element
         * @param mousePosition current mouse position
         * @param opts options
         */
        calculatePositions: function (popup, targetPosition, mousePosition, opts) {
            opts = opts || {};
            var algorithm = opts.gravity === 'w'? calculateWestPositions : calculateNorthSouthPositions;
            return algorithm(popup, targetPosition, mousePosition, opts)
        },
        getArrowPath : function (positions) {
            if (positions.gravity === 's') {
                return "M0,8L8,16,16,8";
            } else {
                return "M0,8L8,0,16,8";
            }
        },
        getArrowAttributes: function () {
            return {
                fill : "#fff",
                stroke : "#ccc"
            };
        }
    };

    AJS.InlineDialog = AJS.deprecate.construct(AJS.InlineDialog, 'Inline dialog constructor', {
        alternativeName: 'inline dialog 2'
    });

    // Option deprecations
    var displayAboveDeprecationLogger = AJS.deprecate.getMessageLogger('displayAbove', '[remove version]', {alternativeName: 'gravity', extraInfo: 'See https://ecosystem.atlassian.net/browse/AUI-2197.'});
    var onTopDeprecationLogger = AJS.deprecate.getMessageLogger('onTop', '[remove version]', {alternativeName: 'gravity', extraInfo: 'See https://ecosystem.atlassian.net/browse/AUI-2197.'});
    var getArrowAttributesDeprecationLogger = AJS.deprecate.getMessageLogger('getArrowAttributes', '[remove version]', {extraInfo: 'See https://ecosystem.atlassian.net/browse/AUI-1362.'});
    var getArrowPathDeprecationLogger = AJS.deprecate.getMessageLogger('getArrowPath', '[remove version]', {extraInfo: 'See https://ecosystem.atlassian.net/browse/AUI-1362.'});
    var getArrowPathWithGravityDeprecationLogger = AJS.deprecate.getMessageLogger('getArrowPath does not support gravity', '[remove version]', {extraInfo: 'See https://ecosystem.atlassian.net/browse/AUI-2197.'});

})(AJS.$);

/**
 * Creates an object with methods for template support.
 *
 * See <a href="http://confluence.atlassian.com/display/AUI/AJS.template">CAC Documentation</a>.
 *
 * @constructor
 * @class template
 * @namespace AJS
 */
AJS.template = (function ($) {
    'use strict';

    var tokenRegex = /\{([^\}]+)\}/g, // matches "{xxxxx}"
        objNotationRegex = /(?:(?:^|\.)(.+?)(?=\[|\.|$|\()|\[('|")(.+?)\2\])(\(\))?/g, // matches ".xxxxx" or "["xxxxx"]" to run over object properties

        // internal function
        // parses "{xxxxx}" and returns actual value from the given object that matches the expression
        replacer = function (all, key, obj, isHTML) {
            var res = obj;
            key.replace(objNotationRegex, function (all, name, quote, quotedName, isFunc) {
                name = name || quotedName;
                if (res) {
                    if (name + ':html' in res) {
                        res = res[name + ':html'];
                        isHTML = true;
                    } else if (name in res) {
                        res = res[name];
                    }
                    if (isFunc && typeof res === 'function') {
                        res = res();
                    }
                }
            });
            // if not found restore original value
            if (res == null || res == obj) {
                res = all;
            }
            res = String(res);
            if (!isHTML) {
                res = T.escape(res);
            }
            return res;
        },
        /**
         * Replaces tokens in the template with corresponding values without HTML escaping
         * @method fillHtml
         * @param obj {Object} to populate the template with
         * @return {Object} the template object
         */
        fillHtml = function (obj) {
            this.template = this.template.replace(tokenRegex, function (all, key) {
                return replacer(all, key, obj, true);
            });
            return this;
        },
        /**
         * Replaces tokens in the template with corresponding values with HTML escaping
         * @method fill
         * @param obj {Object} to populate the template with
         * @return {Object} the template object
         */
        fill = function (obj) {
            this.template = this.template.replace(tokenRegex, function (all, key) {
                return replacer(all, key, obj);
            });
            return this;
        },
        /**
         * Returns the current templated string.
         * @method toString
         * @return {String} the current template
         */
        toString = function () {
            return this.template;
        };

    // internal function
    var T = function (s) {
        function res() {
            return res.template;
        }

        /**
         * The current templated string
         * @property template
         */
        res.template = String(s);
        res.toString = res.valueOf = toString;
        res.fill = fill;
        res.fillHtml = fillHtml;
        return res;
    },
    cache = {},
    count = [];

    var findScripts = function (title) {
        return $('script').filter(function() {
            return this.getAttribute('title') === title;
        });
    };

    // returns template taken form the script tag with given title. Type agnostic, but better put type="text/x-template"
    T.load = function (title) {
        title = String(title);
        if (!cache.hasOwnProperty(title)) {
            if (count.length >= 1e3) {
                delete cache[count.shift()]; // enforce maximum cache size
            }
            count.push(title);
            cache[title] = findScripts(title)[0].text;
        }
        return this(cache[title]);
    };
    // escape HTML dangerous characters
    T.escape = AJS.escapeHtml;
    return T;
})(AJS.$);

;(function (exports, $) {
    'use strict';

    var DEFAULT_FADEOUT_DURATION = 500;
    var DEFAULT_FADEOUT_DELAY = 5000;
    var FADEOUT_RESTORE_DURATION = 100;

    var MESSAGE_TEMPLATE =
        '<div class="aui-message aui-message-{type} {type} {closeable} {shadowed} {fadeout}">' +
            '<p class="title">' +
                '<strong>{title}</strong>' +
            '</p>' +
            '{body}<!-- .aui-message -->' +
        '</div>';

    function createMessageConstructor(type) {
        /**
         *
         * @param context
         * @param {Object} obj - message configuration
         * @param {boolean} [obj.id] - ID to add to the message
         * @param {boolean} obj.body - Content of the message
         * @param {boolean} [obj.closeable]
         * @param {boolean} [obj.shadowed]
         * @param {boolean} [obj.fadeout]
         * @param {boolean} [obj.duration]
         * @param {boolean} [obj.delay]
         * @returns {*|HTMLElement}
         */
        exports.messages[type] = function (context, obj) {
            if (!obj) {
                obj = context;
                context = '#aui-message-bar';
            }

            // Set up our template options
            obj.closeable = (obj.closeable !== false);
            // shadowed no longer does anything but left in so it doesn't break
            obj.shadowed = (obj.shadowed !== false);

            var $message = renderMessageElement(this.template, obj, type);
            insertMessageIntoContext($message, obj.insert, context);

            // Attach the optional extra behaviours
            if (obj.closeable) {
                makeCloseable($message);
            }
            if (obj.fadeout) {
                makeFadeout($message, obj.delay, obj.duration);
            }

            return $message;
        };
    }

    function makeCloseable(message) {
        $(message || 'div.aui-message.closeable').each(function () {
            var $this = $(this),
                $closeIcons = $this.find('.aui-icon.icon-close');
            var $icon = $closeIcons.length > 0 ? $closeIcons.first() : $('<span class="aui-icon icon-close" role="button" tabindex="0"></span>');
            $this.addClass('closeable');
            $this.append($icon);
            
            initCloseMessageBoxOnClickAndKeypress($this);
        });
    }

    function makeFadeout(message, delay, duration) {
        delay = (typeof delay !== 'undefined') ? delay : DEFAULT_FADEOUT_DELAY;
        duration = (typeof duration !== 'undefined') ? duration : DEFAULT_FADEOUT_DURATION;

        $(message || 'div.aui-message.fadeout').each(function () {
            var $this = $(this);

            //Store the component state to avoid collisions between animations
            var hasFocus = false;
            var isHover = false;

            //Small functions to keep the code easier to read and avoid code duplication
            function fadeOut(){
                //Algorithm:
                //1. Stop all running animations (first arg), including any fade animation and delay
                //   Do not jump to the end of the animation (second arg). This prevents the message to abruptly
                //   jump to opacity:0 or opacity:1
                //2. Wait <delay> ms before starting the fadeout
                //3. Start the fadeout with a duration of <duration> ms
                //4. Close the message at the end of the animation
                $this.stop(true,false).delay(delay).fadeOut(duration, function(){
                    $this.closeMessage();
                });
            }
            function resetFadeOut(){
                //Algorithm:
                //1. Stop all running animations (first arg), including any fade animation and delay
                //   Do not jump to the end of the animation (second arg). This prevents the message to abruptly
                //   jump to opacity:0 or opacity:1
                //2. Fast animation to opacity:1
                $this.stop(true,false).fadeTo(FADEOUT_RESTORE_DURATION, 1);
            }
            function shouldStartFadeOut(){
                return !hasFocus && !isHover;
            }

            //Attach handlers for user interactions (focus and hover)
            $this
                .focusin(function(){
                    hasFocus = true;
                    resetFadeOut();
                })
                .focusout(function(){
                    hasFocus = false;
                    if (shouldStartFadeOut()) {
                        fadeOut();
                    }
                })
                .hover(
                function(){  //should be called .hoverin(), but jQuery does not implement that method
                    isHover = true;
                    resetFadeOut();
                },
                function(){ //should be called .hoverout(), but jQuery does not implement that method
                    isHover = false;
                    if (shouldStartFadeOut()) {
                        fadeOut();
                    }
                }
            );

            //Initial animation
            fadeOut();
        });
    }

    /**
     * Utility methods to display different message types to the user.
     * Usage:
     * <pre>
     * AJS.messages.info("#container", {
     *   title: "Info",
     *   body: "You can choose to have messages without Close functionality.",
     *   closeable: false,
     *   shadowed: false
     * });
     * </pre>
     * @class messages
     * @namespace AJS
     * @requires AJS.keyCode
     */
    exports.messages = {
        setup: function () {
            createMessageConstructor('generic');
            createMessageConstructor('error');
            createMessageConstructor('warning');
            createMessageConstructor('info');
            createMessageConstructor('success');
            createMessageConstructor('hint');
            makeCloseable();
            makeFadeout();
        },
        makeCloseable: makeCloseable,
        makeFadeout: makeFadeout,
        template: MESSAGE_TEMPLATE,
        createMessage: createMessageConstructor
    };

    function initCloseMessageBoxOnClickAndKeypress($message) {
        $message.on('click', '.aui-icon.icon-close', function(e) {
            $(e.target).closest('.aui-message').closeMessage();
        }).on('keydown', '.aui-icon.icon-close', function (e) {
            if ((e.which === AJS.keyCode.ENTER) || (e.which === AJS.keyCode.SPACE)) {
                $(e.target).closest('.aui-message').closeMessage();
                e.preventDefault(); // this is especially important when handling the space bar, as we don't want to page down
            }
        });
    }

    function insertMessageIntoContext($message, insertWhere, context) {
        if (insertWhere === 'prepend') {
            $message.prependTo(context);
        } else {
            $message.appendTo(context);
        }
    }

    function renderMessageElement(template, options, type) {
        // Append the message using template
        var $message = $(AJS.template(template).fill({
            type: type,
            closeable: options.closeable ? 'closeable' : '',
            shadowed: options.shadowed ? 'shadowed' : '',
            fadeout: options.fadeout ? 'fadeout' : '',
            title: options.title || '',
            'body:html': options.body || ''
        }).toString());

        // Add ID if supplied
        if (options.id) {
            if (/[#\'\"\.\s]/g.test(options.id)) {
                // reject IDs that don't comply with style guide (ie. they'll break stuff)
                AJS.log('AJS.Messages error: ID rejected, must not include spaces, hashes, dots or quotes.');
            } else {
                $message.attr('id', options.id);
            }
        }

        return $message;
    }

    $.fn.closeMessage = function () {
        var $message = $(this);
        if ($message.hasClass('aui-message') && $message.hasClass('closeable')) {
            $message.stop(true); //Stop any running animation
            $message.trigger('messageClose', [this]).remove();  //messageClose event Deprecated as of 5.3
            $(document).trigger('aui-message-close', [this]);  //must trigger on document since the element has been removed
        }
    };

    $(function () {
        exports.messages.setup();
    });
    
    AJS.deprecate.prop(exports.messages, 'makeCloseable', {
        extraInfo: 'Use the "closeable" option in the constructor instead. Docs: https://docs.atlassian.com/aui/latest/docs/messages.html'
    });

    AJS.deprecate.prop(exports.messages, 'createMessage', {
        extraInfo: 'Use the provided convenience methods instead e.g. AJS.messages.generic(). Docs: https://docs.atlassian.com/aui/latest/docs/messages.html'
    });

    AJS.deprecate.prop(exports.messages, 'makeFadeout', {
        extraInfo: 'Use the "fadeout" option in the constructor instead. Docs: https://docs.atlassian.com/aui/latest/docs/messages.html'
    });

})(AJS, AJS.$);

(function ($) {

    'use strict';

    var REGEX = /#.*/;
    var STORAGE_PREFIX = '_internal-aui-tabs-';
    var RESPONSIVE_OPT_IN_SELECTOR = '.aui-tabs.horizontal-tabs[data-aui-responsive]:not([data-aui-responsive="false"])';

    function enhanceTabLink() {
        var $thisLink = $(this);
        AJS._addID($thisLink); // ensure there's an id for later
        $thisLink.attr('role', 'tab');
        var targetPane = $thisLink.attr('href'); // remember href includes # for selector
        $(targetPane).attr('aria-labelledby', $thisLink.attr('id'));

        if ($thisLink.parent().hasClass('active-tab')) {
            $thisLink.attr('aria-selected', 'true');
        } else {
            $thisLink.attr('aria-selected', 'false');
        }
    }

    var ResponsiveAdapter = {

        totalTabsWidth: function($visibleTabs, $dropdown) {
            var totalVisibleTabsWidth = this.totalVisibleTabWidth($visibleTabs);
            var totalDropdownTabsWidth = 0;
            $dropdown.find('li').each(function(index, tab){
                totalDropdownTabsWidth += parseInt(tab.getAttribute('data-aui-tab-width'));
            });

            return totalVisibleTabsWidth + totalDropdownTabsWidth;
        },

        totalVisibleTabWidth: function($tabs) {
            var totalWidth = 0;
            $tabs.each(function(index, tab) {
                totalWidth += $(tab).outerWidth();
            });
            return totalWidth;
        },

        removeResponsiveDropdown: function($dropdown, $dropdownTriggerTab) {
            $dropdown.remove();
            $dropdownTriggerTab.remove();
        },

        createResponsiveDropdownTrigger: function($tabsMenu, id) {
            var triggerMarkup = '<li class="menu-item aui-tabs-responsive-trigger-item">' +
                '<a class="aui-dropdown2-trigger aui-tabs-responsive-trigger aui-dropdown2-trigger-arrowless" id="aui-tabs-responsive-trigger-' + id + '" aria-haspopup="true" aria-controls="aui-tabs-responsive-dropdown-' + id + '" href="aui-tabs-responsive-dropdown-' + id + '">...</a>' +
                '</li>';
            $tabsMenu.append(triggerMarkup);
            var $trigger = $tabsMenu.find('.aui-tabs-responsive-trigger-item');
            return $trigger;
        },

        createResponsiveDropdown: function($tabsContainer, id) {
            var dropdownMarkup = '<div class="aui-dropdown2 aui-style-default aui-tabs-responsive-dropdown" id="aui-tabs-responsive-dropdown-' + id +'">' +
                '<ul>' +
                '</ul>' +
                '</div>';
            $tabsContainer.append(dropdownMarkup);
            var $dropdown = $tabsContainer.find('#aui-tabs-responsive-dropdown-' + id);
            return $dropdown;
        },

        findNewVisibleTabs: function(tabs, parentWidth, dropdownTriggerTabWidth) {
            function hasMoreSpace(currentTotalTabWidth, dropdownTriggerTabWidth, parentWidth) {
                return currentTotalTabWidth + dropdownTriggerTabWidth <= parentWidth;
            }

            var currentTotalTabWidth = 0;
            for(var i = 0; hasMoreSpace(currentTotalTabWidth, dropdownTriggerTabWidth, parentWidth) && i < tabs.length; i++) {
                var $tab = $(tabs[i]);
                var tabWidth = $tab.outerWidth(true);
                currentTotalTabWidth += tabWidth;
            }
            //i should now be at the tab index after the last visible tab because of the loop so we minus 1 to get the new visible tabs
            return tabs.slice(0, i - 1);
        },

        moveVisibleTabs: function(oldVisibleTabs, $tabsParent, $dropdownTriggerTab) {
            var dropdownId = $dropdownTriggerTab.find('a').attr('aria-controls');
            var $dropdown = $('#' + dropdownId);
            var newVisibleTabs = this.findNewVisibleTabs(oldVisibleTabs, $tabsParent.outerWidth(), $dropdownTriggerTab.parent().outerWidth(true));
            var lastTabIndex = newVisibleTabs.length - 1;

            for(var j = oldVisibleTabs.length - 1; j >= lastTabIndex;  j--) {
                var $tab = $(oldVisibleTabs[j]);
                this.moveTabToResponsiveDropdown($tab, $dropdown, $dropdownTriggerTab);
            }

            return $(newVisibleTabs);
        },

        moveTabToResponsiveDropdown: function($tab, $dropdown, $dropdownTriggerTab) {
            var $tabLink = $tab.find('a');
            $tab.attr('data-aui-tab-width', $tab.outerWidth(true));
            $tabLink.addClass('aui-dropdown2-radio aui-tabs-responsive-item');
            if($tab.hasClass('active-tab')) {
                $tabLink.addClass('aui-dropdown2-checked');
                $dropdownTriggerTab.addClass('active-tab');
            }
            $dropdown.find('ul').prepend($tab);
        },

        moveInvisibleTabs: function(tabsInDropdown, remainingSpace, $dropdownTriggerTab) {
            function hasMoreSpace(remainingSpace) {
                return remainingSpace > 0;
            }

            for(var i = 0; hasMoreSpace(remainingSpace) && i < tabsInDropdown.length; i++) {
                var $tab = $(tabsInDropdown[i]);
                var tabInDropdownWidth = parseInt($tab.attr('data-aui-tab-width'), 10);
                var shouldMoveTabOut = tabInDropdownWidth < remainingSpace;

                if(shouldMoveTabOut) {
                    this.moveTabOutOfDropdown($tab, $dropdownTriggerTab);
                }

                remainingSpace -= tabInDropdownWidth;
            }
        },
        moveTabOutOfDropdown: function($tab, $dropdownTriggerTab) {
            var isTabInDropdownActive = $tab.find('a').hasClass('aui-dropdown2-checked');
            if(isTabInDropdownActive){
                $tab.addClass('active-tab');
                $dropdownTriggerTab.removeClass('active-tab');
            }
            $tab.children('a').removeClass('aui-dropdown2-radio aui-tabs-responsive-item aui-dropdown2-checked');

            $dropdownTriggerTab.before($tab);
        }
    };


    function calculateResponsiveTabs(tabsContainer, index) {
        //this function is run by jquery .each() where 'this' is the current tabs container
        var $tabsContainer = $(tabsContainer);
        var $tabsMenu = $tabsContainer.find('.tabs-menu').first();
        var $visibleTabs = $tabsMenu.find('li:not(.aui-tabs-responsive-trigger-item)');
        var $dropdownTriggerTab = $tabsMenu.find('.aui-tabs-responsive-trigger').parent();
        var $dropdownTrigger = $dropdownTriggerTab.find('a');
        var dropdownId =  $dropdownTrigger.attr('aria-controls');
        var $dropdown = $(document).find('#' + dropdownId).attr('aria-checked', false);

        var isResponsive = $dropdown.length > 0;
        var totalTabsWidth = ResponsiveAdapter.totalTabsWidth($visibleTabs, $dropdown);
        var needsResponsive = totalTabsWidth > $tabsContainer.outerWidth();

        if(!isResponsive && needsResponsive) {
            $dropdownTriggerTab = ResponsiveAdapter.createResponsiveDropdownTrigger($tabsMenu, index);
            $dropdown = ResponsiveAdapter.createResponsiveDropdown($tabsContainer, index);
        }

        //reset id's in case tabs have changed DOM order
        $dropdownTrigger.attr('aria-controls', 'aui-tabs-responsive-dropdown-' + index);
        $dropdownTrigger.attr('id', 'aui-tabs-responsive-trigger-' + index);
        $dropdownTrigger.attr('href', 'aui-tabs-responsive-trigger-' + index);
        $dropdown.attr('id', 'aui-tabs-responsive-dropdown-' + index);

        if(needsResponsive) {
            var $newVisibleTabs = ResponsiveAdapter.moveVisibleTabs($visibleTabs.toArray(), $tabsContainer, $dropdownTriggerTab);
            var visibleTabWidth = ResponsiveAdapter.totalVisibleTabWidth($newVisibleTabs);
            var remainingSpace = $tabsContainer.outerWidth() - visibleTabWidth  - $dropdownTriggerTab.outerWidth(true);
            var hasSpace = remainingSpace > 0;
            if (hasSpace) {
                var $tabsInDropdown = $dropdown.find('li');
                ResponsiveAdapter.moveInvisibleTabs($tabsInDropdown.toArray(), remainingSpace, $dropdownTriggerTab);
            }
            $dropdown.on('click', 'a', handleTabClick);
        }

        if(isResponsive && !needsResponsive) {
            $dropdown.find('li').each(function(){
                ResponsiveAdapter.moveTabOutOfDropdown($(this), $dropdownTriggerTab);
            });
            ResponsiveAdapter.removeResponsiveDropdown($dropdown, $dropdownTriggerTab);
        }
    }

    function switchToTab($tab) {
        if ($tab.hasClass('aui-tabs-responsive-trigger')) {
            return;
        }

        var $pane = $($tab.attr('href').match(REGEX)[0]);
        $pane.addClass('active-pane').attr('aria-hidden', 'false')
            .siblings('.tabs-pane').removeClass('active-pane').attr('aria-hidden', 'true');

        var $dropdownTriggerTab = $tab.parents('.aui-tabs').find('.aui-tabs-responsive-trigger-item a');
        var dropdownId = $dropdownTriggerTab.attr('aria-controls');
        var $dropdown = $(document).find('#' + dropdownId);
        $dropdown.find('li a').attr('aria-checked', false).removeClass('checked aui-dropdown2-checked');
        $dropdown.find('li').removeClass('active-tab');

        $tab.parent('li.menu-item').addClass('active-tab')
            .siblings('.menu-item').removeClass('active-tab');

        if($tab.hasClass('aui-tabs-responsive-item')) {
            var $visibleTabs = $pane.parent('.aui-tabs').find('li.menu-item:not(.aui-tabs-responsive-trigger-item)');
            $visibleTabs.removeClass('active-tab');
            $visibleTabs.find('a').removeClass('checked').removeAttr('aria-checked');
        }

        if ($tab.hasClass('aui-tabs-responsive-item')) {
            $pane.parent('.aui-tabs').find('li.menu-item.aui-tabs-responsive-trigger-item').addClass('active-tab');
        }

        $tab.closest('.tabs-menu').find('a').attr('aria-selected', 'false');
        $tab.attr('aria-selected', 'true');
        $tab.trigger('tabSelect', {
            tab: $tab,
            pane: $pane
        });
    }

    function isPersistentTabGroup($tabGroup) {
        // Tab group persistent attribute exists and is not false
        return $tabGroup.attr('data-aui-persist') !== undefined && $tabGroup.attr('data-aui-persist') !== 'false';
    }

    function createPersistentKey($tabGroup) {
        var tabGroupId = $tabGroup.attr('id');
        var value = $tabGroup.attr('data-aui-persist');

        return STORAGE_PREFIX + (tabGroupId ? tabGroupId : '') + (value && value !== 'true' ? '-' + value : '');
    }

    function updateTabsFromLocalStorage($tabGroups) {
        for (var i=0, ii = $tabGroups.length; i < ii; i++) {
            var $tabGroup = $tabGroups.eq(i);
            if (isPersistentTabGroup($tabGroup) && window.localStorage) {
                var tabGroupId = $tabGroup.attr('id');
                if (tabGroupId) {
                    var persistentTabId = window.localStorage.getItem(createPersistentKey($tabGroup));
                    if (persistentTabId) {
                        var $tabmatch = $tabGroup.find('#' + persistentTabId);

                        if ($tabmatch.length) {
                            switchToTab($tabmatch);
                        }
                    }
                } else {
                    AJS.warn("A tab group must specify an id attribute if it specifies data-aui-persist");
                }
            }
        }
    }

    function updateLocalStorageEntry($tab) {
        var $tabGroup = $tab.closest('.aui-tabs');

        var tabGroupId = $tabGroup.attr('id');
        if (tabGroupId){
            var tabId = $tab.attr('id');
            if (tabId) {
                window.localStorage.setItem(createPersistentKey($tabGroup),tabId);
            }
        } else {
            AJS.warn('A tab group must specify an id attribute if it specifies data-aui-persist');
        }
    }

    function handleTabClick(e) {
        AJS.tabs.change($(this), e);
        e && e.preventDefault();
    }

    function responsiveResizeHandler(tabs) {
        tabs.forEach(function (tab, index) {
            calculateResponsiveTabs(tab, index);
        });
    }

    AJS.tabs = {
        setup: function () {
            var $allTabs = $('.aui-tabs:not(.aui-tabs-disabled)');
            var allResponsiveTabs = $(RESPONSIVE_OPT_IN_SELECTOR).toArray();

            responsiveResizeHandler(allResponsiveTabs);

            var debouncedResponsiveResizeHandler = AJS.debounce(responsiveResizeHandler, 200);
            $(window).resize(function(){
                debouncedResponsiveResizeHandler(allResponsiveTabs);
            });

            // Non-menu ARIA setup
            $allTabs.attr('role', 'application');
            $allTabs.find('.tabs-pane').each( function() {
                var thisPane = $(this);
                thisPane.attr('role', 'tabpanel');
                if (thisPane.hasClass('active-pane')) {
                    thisPane.attr('aria-hidden','false');
                } else {
                    thisPane.attr('aria-hidden','true');
                }
            });

            // Menu setup
            for (var i=0, ii = $allTabs.length; i < ii; i++) {
                var $tab = $allTabs.eq(i);
                if (!$tab.data('aui-tab-events-bound')) {
                    var $tabMenu = $tab.children('ul.tabs-menu');

                    // ARIA setup
                    $tabMenu.attr('role', 'tablist');
                    $tabMenu.children('li').attr('role', 'presentation'); // ignore the LIs so tab count is announced correctly
                    $tabMenu.find('> .menu-item a').each(enhanceTabLink);

                    // Set up click event for tabs
                    $tabMenu.delegate('a', 'click', handleTabClick);
                    $tab.data('aui-tab-events-bound', true);
                }
            }


            updateTabsFromLocalStorage($allTabs);

            // Vertical tab truncation setup (adds title if clipped)
            $('.aui-tabs.vertical-tabs').find('a').each(function() {
                var thisTab = $(this);
                // don't override existing titles
                if ( !thisTab.attr('title') ) {
                    // if text has been truncated, add title
                    if ( AJS.isClipped(thisTab) ) {
                        thisTab.attr('title', thisTab.text());
                    }
                }
            });
        },
        change: function ($a, e) {
            switchToTab($a);

            var $tabGroup = $a.closest('.aui-tabs');
            if (isPersistentTabGroup($tabGroup) && window.localStorage) {
                updateLocalStorageEntry($a);
            }
        }
    };
    $(AJS.tabs.setup);
})(AJS.$);

/**
* jQuery AOP - jQuery plugin to add features of aspect-oriented programming (AOP) to jQuery.
* http://jquery-aop.googlecode.com/
*
* Licensed under the MIT license:
* http://www.opensource.org/licenses/mit-license.php
*
* Version: 1.3
*
* Cross-frame type detection based on Daniel Steigerwald's code (http://daniel.steigerwald.cz)
* http://gist.github.com/204554
*
*/

(function() {

	var _after			= 1;
	var _afterThrow		= 2;
	var _afterFinally	= 3;
	var _before			= 4;
	var _around			= 5;
	var _intro			= 6;
	var _regexEnabled = true;
	var _arguments = 'arguments';
	var _undef = 'undefined';

	var getType = (function() {

		var toString = Object.prototype.toString,
			toStrings = {},
			nodeTypes = { 1: 'element', 3: 'textnode', 9: 'document', 11: 'fragment' },
			types = 'Arguments Array Boolean Date Document Element Error Fragment Function NodeList Null Number Object RegExp String TextNode Undefined Window'.split(' ');

		for (var i = types.length; i--; ) {
			var type = types[i], constructor = window[type];
			if (constructor) {
				try { toStrings[toString.call(new constructor)] = type.toLowerCase(); }
				catch (e) { }
			}
		}

		return function(item) {
			return item == null && (item === undefined ? _undef : 'null') ||
				item.nodeType && nodeTypes[item.nodeType] ||
				typeof item.length == 'number' && (
					item.callee && _arguments ||
					item.alert && 'window' ||
					item.item && 'nodelist') ||
				toStrings[toString.call(item)];
		};

	})();

	var isFunc = function(obj) { return getType(obj) == 'function'; };

	/**
	 * Private weaving function.
	 */
	var weaveOne = function(source, method, advice) {

		var old = source[method];

		// Work-around IE6/7 behavior on some native method that return object instances
		if (advice.type != _intro && !isFunc(old)) {
			var oldObject = old;
			old = function() {
				var code = arguments.length > 0 ? _arguments + '[0]' : '';

				for (var i=1;i<arguments.length;i++) {
					code += ',' + _arguments + '[' + i + ']';
				}

				return eval('oldObject(' + code + ');');
			};
		}

		var aspect;
		if (advice.type == _after || advice.type == _afterThrow || advice.type == _afterFinally)
			aspect = function() {
				var returnValue, exceptionThrown = null;

				try {
					returnValue = old.apply(this, arguments);
				} catch (e) {
					exceptionThrown = e;
				}

				if (advice.type == _after)
					if (exceptionThrown == null)
						returnValue = advice.value.apply(this, [returnValue, method]);
					else
						throw exceptionThrown;
				else if (advice.type == _afterThrow && exceptionThrown != null)
					returnValue = advice.value.apply(this, [exceptionThrown, method]);
				else if (advice.type == _afterFinally)
					returnValue = advice.value.apply(this, [returnValue, exceptionThrown, method]);

				return returnValue;
			};
		else if (advice.type == _before)
			aspect = function() {
				advice.value.apply(this, [arguments, method]);
				return old.apply(this, arguments);
			};
		else if (advice.type == _intro)
			aspect = function() {
				return advice.value.apply(this, arguments);
			};
		else if (advice.type == _around) {
			aspect = function() {
				var invocation = { object: this, args: Array.prototype.slice.call(arguments) };
				return advice.value.apply(invocation.object, [{ arguments: invocation.args, method: method, proceed :
					function() {
						return old.apply(invocation.object, invocation.args);
					}
				}] );
			};
		}

		aspect.unweave = function() {
			source[method] = old;
			pointcut = source = aspect = old = null;
		};

		source[method] = aspect;

		return aspect;

	};

	/**
	 * Private method search
	 */
	var search = function(source, pointcut, advice) {

		var methods = [];

		for (var method in source) {

			var item = null;

			// Ignore exceptions during method retrival
			try {
				item = source[method];
			}
			catch (e) { }

			if (item != null && method.match(pointcut.method) && isFunc(item))
				methods[methods.length] = { source: source, method: method, advice: advice };

		}

		return methods;
	};

	/**
	 * Private weaver and pointcut parser.
	 */
	var weave = function(pointcut, advice) {

		var source = typeof(pointcut.target.prototype) != _undef ? pointcut.target.prototype : pointcut.target;
		var advices = [];

		// If it's not an introduction and no method was found, try with regex...
		if (advice.type != _intro && typeof(source[pointcut.method]) == _undef) {

			// First try directly on target
			var methods = search(pointcut.target, pointcut, advice);

			// No method found, re-try directly on prototype
			if (methods.length == 0)
				methods = search(source, pointcut, advice);

			for (var i in methods)
				advices[advices.length] = weaveOne(methods[i].source, methods[i].method, methods[i].advice);

		}
		else
		{
			// Return as an array of one element
			advices[0] = weaveOne(source, pointcut.method, advice);
		}

		return _regexEnabled ? advices : advices[0];

	};

	jQuery.aop =
	{
		/**
		 * Creates an advice after the defined point-cut. The advice will be executed after the point-cut method
		 * has completed execution successfully, and will receive one parameter with the result of the execution.
		 * This function returns an array of weaved aspects (Function).
		 *
		 * @example jQuery.aop.after( {target: window, method: 'MyGlobalMethod'}, function(result) {
		 *                alert('Returned: ' + result);
		 *                return result;
		 *          } );
		 * @result Array<Function>
		 *
		 * @example jQuery.aop.after( {target: String, method: 'indexOf'}, function(index) {
		 *                alert('Result found at: ' + index + ' on:' + this);
		 *                return index;
		 *          } );
		 * @result Array<Function>
		 *
		 * @name after
		 * @param Map pointcut Definition of the point-cut to apply the advice. A point-cut is the definition of the object/s and method/s to be weaved.
		 * @option Object target Target object to be weaved.
		 * @option String method Name of the function to be weaved. Regex are supported, but not on built-in objects.
		 * @param Function advice Function containing the code that will get called after the execution of the point-cut. It receives one parameter
		 *                        with the result of the point-cut's execution. The function can choose to return this same value or a different one.
		 *
		 * @type Array<Function>
		 * @cat Plugins/General
		 */
		after : function(pointcut, advice)
		{
			return weave( pointcut, { type: _after, value: advice } );
		},

		/**
		 * Creates an advice after the defined point-cut only for unhandled exceptions. The advice will be executed
		 * after the point-cut method only if the execution failed and an exception has been thrown. It will receive one
		 * parameter with the exception thrown by the point-cut method.
		 * This function returns an array of weaved aspects (Function).
		 *
		 * @example jQuery.aop.afterThrow( {target: String, method: 'indexOf'}, function(exception) {
		 *                alert('Unhandled exception: ' + exception);
		 *                return -1;
		 *          } );
		 * @result Array<Function>
		 *
		 * @example jQuery.aop.afterThrow( {target: calculator, method: 'Calculate'}, function(exception) {
		 *                console.log('Unhandled exception: ' + exception);
		 *                throw exception;
		 *          } );
		 * @result Array<Function>
		 *
		 * @name afterThrow
		 * @param Map pointcut Definition of the point-cut to apply the advice. A point-cut is the definition of the object/s and method/s to be weaved.
		 * @option Object target Target object to be weaved.
		 * @option String method Name of the function to be weaved. Regex are supported, but not on built-in objects.
		 * @param Function advice Function containing the code that will get called after the execution of the point-cut. It receives one parameter
		 *                        with the exception thrown by the point-cut method.
		 *
		 * @type Array<Function>
		 * @cat Plugins/General
		 */
		afterThrow : function(pointcut, advice)
		{
			return weave( pointcut, { type: _afterThrow, value: advice } );
		},

		/**
		 * Creates an advice after the defined point-cut. The advice will be executed after the point-cut method
		 * regardless of its success or failure, and it will receive two parameters: one with the
		 * result of a successful execution or null, and another one with the exception thrown or null.
		 * This function returns an array of weaved aspects (Function).
		 *
		 * @example jQuery.aop.afterFinally( {target: window, method: 'MyGlobalMethod'}, function(result, exception) {
		 *                if (exception == null)
		 *                    return 'Returned: ' + result;
		 *                else
		 *                    return 'Unhandled exception: ' + exception;
		 *          } );
		 * @result Array<Function>
		 *
		 * @name afterFinally
		 * @param Map pointcut Definition of the point-cut to apply the advice. A point-cut is the definition of the object/s and method/s to be weaved.
		 * @option Object target Target object to be weaved.
		 * @option String method Name of the function to be weaved. Regex are supported, but not on built-in objects.
		 * @param Function advice Function containing the code that will get called after the execution of the point-cut regardless of its success or failure.
		 *                        It receives two parameters, the first one with the result of a successful execution or null, and the second one with the
		 *                        exception or null.
		 *
		 * @type Array<Function>
		 * @cat Plugins/General
		 */
		afterFinally : function(pointcut, advice)
		{
			return weave( pointcut, { type: _afterFinally, value: advice } );
		},


		/**
		 * Creates an advice before the defined point-cut. The advice will be executed before the point-cut method
		 * but cannot modify the behavior of the method, or prevent its execution.
		 * This function returns an array of weaved aspects (Function).
		 *
		 * @example jQuery.aop.before( {target: window, method: 'MyGlobalMethod'}, function() {
		 *                alert('About to execute MyGlobalMethod');
		 *          } );
		 * @result Array<Function>
		 *
		 * @example jQuery.aop.before( {target: String, method: 'indexOf'}, function(index) {
		 *                alert('About to execute String.indexOf on: ' + this);
		 *          } );
		 * @result Array<Function>
		 *
		 * @name before
		 * @param Map pointcut Definition of the point-cut to apply the advice. A point-cut is the definition of the object/s and method/s to be weaved.
		 * @option Object target Target object to be weaved.
		 * @option String method Name of the function to be weaved. Regex are supported, but not on built-in objects.
		 * @param Function advice Function containing the code that will get called before the execution of the point-cut.
		 *
		 * @type Array<Function>
		 * @cat Plugins/General
		 */
		before : function(pointcut, advice)
		{
			return weave( pointcut, { type: _before, value: advice } );
		},


		/**
		 * Creates an advice 'around' the defined point-cut. This type of advice can control the point-cut method execution by calling
		 * the functions '.proceed()' on the 'invocation' object, and also, can modify the arguments collection before sending them to the function call.
		 * This function returns an array of weaved aspects (Function).
		 *
		 * @example jQuery.aop.around( {target: window, method: 'MyGlobalMethod'}, function(invocation) {
		 *                alert('# of Arguments: ' + invocation.arguments.length);
		 *                return invocation.proceed();
		 *          } );
		 * @result Array<Function>
		 *
		 * @example jQuery.aop.around( {target: String, method: 'indexOf'}, function(invocation) {
		 *                alert('Searching: ' + invocation.arguments[0] + ' on: ' + this);
		 *                return invocation.proceed();
		 *          } );
		 * @result Array<Function>
		 *
		 * @example jQuery.aop.around( {target: window, method: /Get(\d+)/}, function(invocation) {
		 *                alert('Executing ' + invocation.method);
		 *                return invocation.proceed();
		 *          } );
		 * @desc Matches all global methods starting with 'Get' and followed by a number.
		 * @result Array<Function>
		 *
		 *
		 * @name around
		 * @param Map pointcut Definition of the point-cut to apply the advice. A point-cut is the definition of the object/s and method/s to be weaved.
		 * @option Object target Target object to be weaved.
		 * @option String method Name of the function to be weaved. Regex are supported, but not on built-in objects.
		 * @param Function advice Function containing the code that will get called around the execution of the point-cut. This advice will be called with one
		 *                        argument containing one function '.proceed()', the collection of arguments '.arguments', and the matched method name '.method'.
		 *
		 * @type Array<Function>
		 * @cat Plugins/General
		 */
		around : function(pointcut, advice)
		{
			return weave( pointcut, { type: _around, value: advice } );
		},

		/**
		 * Creates an introduction on the defined point-cut. This type of advice replaces any existing methods with the same
		 * name. To restore them, just unweave it.
		 * This function returns an array with only one weaved aspect (Function).
		 *
		 * @example jQuery.aop.introduction( {target: window, method: 'MyGlobalMethod'}, function(result) {
		 *                alert('Returned: ' + result);
		 *          } );
		 * @result Array<Function>
		 *
		 * @example jQuery.aop.introduction( {target: String, method: 'log'}, function() {
		 *                alert('Console: ' + this);
		 *          } );
		 * @result Array<Function>
		 *
		 * @name introduction
		 * @param Map pointcut Definition of the point-cut to apply the advice. A point-cut is the definition of the object/s and method/s to be weaved.
		 * @option Object target Target object to be weaved.
		 * @option String method Name of the function to be weaved.
		 * @param Function advice Function containing the code that will be executed on the point-cut.
		 *
		 * @type Array<Function>
		 * @cat Plugins/General
		 */
		introduction : function(pointcut, advice)
		{
			return weave( pointcut, { type: _intro, value: advice } );
		},

		/**
		 * Configures global options.
		 *
		 * @name setup
		 * @param Map settings Configuration options.
		 * @option Boolean regexMatch Enables/disables regex matching of method names.
		 *
		 * @example jQuery.aop.setup( { regexMatch: false } );
		 * @desc Disable regex matching.
		 *
		 * @type Void
		 * @cat Plugins/General
		 */
		setup: function(settings)
		{
			_regexEnabled = settings.regexMatch;
		}
	};

})();
/**->
 * Displays a drop down, typically used for menus.
 * 
 * @class dropDown
 * @namespace AJS
 * @constructor
 * @param obj {jQuery Object|String|Array} object to populate the drop down from.
 * @param usroptions optional dropdown configuration. Supported properties are:
 * <li>alignment - "left" or "right" alignment of the drop down</li>
 * <li>escapeHandler - function to handle on escape key presses</li>
 * <li>activeClass - class name to be added to drop down items when 'active' ie. hover over</li>
 * <li>selectionHandler - function to handle when drop down items are selected on</li>
 * <li>hideHandler - function to handle when the drop down is hidden</li>
 * When an object of type Array is passed in, you can also configure:
 * <li>isHiddenByDefault - set to true if you would like to hide the drop down on initialisation</li>
 * <li>displayHandler - function to display text in the drop down</li>
 * <li>useDisabled - If set to true, the dropdown will not appear if a class of disabled is added to aui-dd-parent</li>
 * @return {Array} an array of jQuery objects, referring to the drop down container elements
 */
 
AJS.dropDown = function (obj, usroptions) {
    var dd = null,
        result = [],
        moving = false,
        $doc = AJS.$(document),
        options = {
            item: "li:has(a)",
            activeClass: "active",
            alignment: "right",
            displayHandler: function(obj) {return obj.name;},
            escapeHandler: function () {
                this.hide("escape");
                return false;
            },
            hideHandler: function() {},
            moveHandler: function(selection,dir) {},
            useDisabled: false 
        };

    AJS.$.extend(options, usroptions);
    options.alignment = {left:"left",right:"right"}[options.alignment.toLowerCase()]  || "left";

    if (obj && obj.jquery) { // if AJS.$
        dd = obj;
    } else if (typeof obj == "string") { // if AJS.$ selector
        dd = AJS.$(obj);
    } else if (obj && obj.constructor == Array) { // if JSON
        dd = AJS("div").addClass("aui-dropdown").toggleClass("hidden", !!options.isHiddenByDefault);
        for (var i = 0, ii = obj.length; i < ii; i++) {
            var ol = AJS("ol");
            for (var j = 0, jj = obj[i].length; j < jj; j++) {
                var li = AJS("li");
                var properties = obj[i][j];
                if (properties.href) {
                    li.append(AJS("a")
                        .html("<span>" + options.displayHandler(properties) + "</span>")
                        .attr({href:  properties.href})
                        .addClass(properties.className));

                    // deprecated - use the properties on the li, not the span
                    AJS.$.data(AJS.$("a > span", li)[0], "properties", properties);
                } else {
                    li.html(properties.html).addClass(properties.className);
                }
                if (properties.icon) {
                    li.prepend(AJS("img").attr("src", properties.icon));
                }
                if (properties.insideSpanIcon){
                    li.children("a").prepend(AJS("span").attr("class","icon"));
                }
                if (properties.iconFontClass) {
                    li.children("a").prepend(AJS("span").addClass("aui-icon aui-icon-small aui-iconfont-" + properties.iconFontClass));
                }

                AJS.$.data(li[0], "properties", properties);
                ol.append(li);
            }
            if (i == ii - 1) {
                ol.addClass("last");
            }
            dd.append(ol);
        }
        AJS.$("body").append(dd);
    } else {
        throw new Error("AJS.dropDown function was called with illegal parameter. Should be AJS.$ object, AJS.$ selector or array.");
    }

    var moveDown = function() {
        move(+1);
    };

     var moveUp = function() {
        move(-1);
    };

    var move = function(dir) {
        var trigger = !moving,
            cdd = AJS.dropDown.current.$[0],
            links = AJS.dropDown.current.links,
            oldFocus = cdd.focused;
        moving = true;

        if (links.length === 0) {
            // Nothing to move focus to. Abort.
            return;
        }

        cdd.focused = (typeof oldFocus === "number") ? oldFocus : -1;

        if (!AJS.dropDown.current) {
            AJS.log("move - not current, aborting");
            return true;
        }

        cdd.focused += dir;

        // Resolve out of bounds values:
        if (cdd.focused < 0) {
            cdd.focused = links.length - 1;
        } else if (cdd.focused >= links.length) {
            cdd.focused = 0;
        }

        options.moveHandler(AJS.$(links[cdd.focused]), dir < 0 ? "up" : "down");
        if (trigger && links.length) {
            AJS.$(links[cdd.focused]).addClass(options.activeClass);
            moving = false;
        } else if(!links.length) {
            moving = false;
        }
    };

    var moveFocus = function (e) {
        if (!AJS.dropDown.current) {
            return true;
        }
        var c = e.which,
            cdd = AJS.dropDown.current.$[0],
            links = AJS.dropDown.current.links;

        AJS.dropDown.current.cleanActive();
        switch (c) {
            case 40: {
                moveDown();
                break;
            }
            case 38:{
                moveUp();
                break;
            }
            case 27:{
                return options.escapeHandler.call(AJS.dropDown.current, e);
            }
            case 13:{
                if (cdd.focused >= 0) {
                    if(!options.selectionHandler){
                        if(AJS.$(links[cdd.focused]).attr("nodeName")!='a'){
                            return AJS.$("a", links[cdd.focused]).trigger("focus");    //focus on the "a" within the parent item elements
                        } else {
                            return AJS.$(links[cdd.focused]).trigger("focus");     //focus on the "a"
                        }
                    } else {
                        return options.selectionHandler.call(AJS.dropDown.current, e, AJS.$(links[cdd.focused]));   //call the selection handler
                    }
                }
                return true;
            }
            default:{
                if (links.length) {
                    AJS.$(links[cdd.focused]).addClass(options.activeClass);
                }
                return true;
            }
        }

        e.stopPropagation();
        e.preventDefault();
        return false;
    };

    var hider = function (e) {
        if (!((e && e.which && (e.which == 3)) || (e && e.button && (e.button == 2)) || false)) { // right click check
            if (AJS.dropDown.current) {
                AJS.dropDown.current.hide("click");
            }
        }
    };
    var active = function (i) {
        return function () {
            if (!AJS.dropDown.current) {
                return;
            }
            AJS.dropDown.current.cleanFocus();
            this.originalClass = this.className;
            AJS.$(this).addClass(options.activeClass);
            AJS.dropDown.current.$[0].focused = i;
        };
    };

    var handleClickSelection = function (e) {
        if (e.button || e.metaKey || e.ctrlKey || e.shiftKey) {
            return true;
        }
        if (AJS.dropDown.current && options.selectionHandler) {
            options.selectionHandler.call(AJS.dropDown.current, e, AJS.$(this));
        }
    };

    var isEventsBound = function (el) {
        var bound = false;
        if (el.data("events")) {
            AJS.$.each(el.data("events"), function(i, handler){
                AJS.$.each(handler, function (type, handler) {
                    if (handleClickSelection === handler) {
                        bound = true;
                        return false;
                    }
                });
            });
        }
        return bound;
    };

    dd.each(function () {
        var cdd = this, $cdd = AJS.$(this), res = {};
        var methods = {
            reset: function () {
                res = AJS.$.extend(res, {
                    $: $cdd,
                    links: AJS.$(options.item || "li:has(a)", cdd),
                    cleanActive: function () {
                        if (cdd.focused + 1 && res.links.length) {
                            AJS.$(res.links[cdd.focused]).removeClass(options.activeClass);
                        }
                    },
                    cleanFocus: function () {
                        res.cleanActive();
                        cdd.focused = -1;
                    },
                    moveDown: moveDown,
                    moveUp: moveUp,
                    moveFocus: moveFocus,
                    getFocusIndex: function () {
                        return (typeof cdd.focused == "number") ? cdd.focused : -1;
                    }
                });
                res.links.each(function (i) {
                    var $this = AJS.$(this);
                    if (!isEventsBound($this)) {
                        $this.hover(active(i), res.cleanFocus);
                        $this.click(handleClickSelection);
                    }
                });
            },
            appear: function (dir) {
                if (dir) {
                    $cdd.removeClass("hidden");
                    //handle left or right alignment
                    $cdd.addClass("aui-dropdown-" + options.alignment);
                } else {
                    $cdd.addClass("hidden");
                }
            },
            fade: function (dir) {
                if (dir) {
                    $cdd.fadeIn("fast");
                } else {
                    $cdd.fadeOut("fast");
                }
            },
            scroll: function (dir) {
                if (dir) {
                    $cdd.slideDown("fast");
                } else {
                    $cdd.slideUp("fast");
                }
            }
        };

        res.reset = methods.reset;
        res.reset();

        /**
         * Uses Aspect Oriented Programming (AOP) to wrap a method around another method 
         * Allows control of the execution of the wrapped method.
         * specified method has returned @see AJS.$.aop
         * @method addControlProcess
         * @param {String} methodName - Name of a public method
         * @param {Function} callback - Function to be executed
         * @return {Array} weaved aspect
         */
        res.addControlProcess = function(method, process) {
            AJS.$.aop.around({target: this, method: method}, process);
        };

        /**
         * Uses Aspect Oriented Programming (AOP) to insert callback <em>after</em> the
         * specified method has returned @see AJS.$.aop
         * @method addCallback
         * @param {String} methodName - Name of a public method
         * @param {Function} callback - Function to be executed
         * @return {Array} weaved aspect
         */
        res.addCallback = function (method, callback) {
            return AJS.$.aop.after({target: this, method: method}, callback);
        };

        res.show = function (method) {
            if(options.useDisabled && this.$.closest('.aui-dd-parent').hasClass('disabled')) {
                return
            }

            this.alignment = options.alignment;
            hider();
            AJS.dropDown.current = this;
            this.method = method || this.method || "appear";
            
            this.timer = setTimeout(function () {
                $doc.click(hider);
            }, 0);

            $doc.keydown(moveFocus);

            if (options.firstSelected && this.links[0]) {
                active(0).call(this.links[0]);
            }

            AJS.$(cdd.offsetParent).css({zIndex: 2000});
            methods[this.method](true);

            AJS.$(document).trigger("showLayer", ["dropdown", AJS.dropDown.current]);
        };

        res.hide = function (causer) {
            this.method = this.method || "appear";
            AJS.$($cdd.get(0).offsetParent).css({zIndex: ""});
            this.cleanFocus();
            methods[this.method](false);
            $doc.unbind("click", hider).unbind("keydown", moveFocus);
            AJS.$(document).trigger("hideLayer", ["dropdown", AJS.dropDown.current]);
            AJS.dropDown.current = null;
            return causer;
        };

        res.addCallback("reset", function () {
           if (options.firstSelected && this.links[0]) {
               active(0).call(this.links[0]);
           }
        });

        if (!AJS.dropDown.iframes) {
            AJS.dropDown.iframes = [];
        }

        AJS.dropDown.createShims = function () {
            AJS.$("iframe").each(function (idx) {
               var iframe = this;
                if (!iframe.shim) {
                    iframe.shim = AJS.$("<div />")
                                     .addClass("shim hidden")
                                     .appendTo("body");
                    AJS.dropDown.iframes.push(iframe);
                }
            });
            return arguments.callee;
        }();

        res.addCallback("show", function() {
            AJS.$(AJS.dropDown.iframes).each(function() {
                var $this = AJS.$(this);
              
                if ($this.is(":visible")) {
                   var offset = $this.offset();
                   offset.height = $this.height();
                   offset.width = $this.width();
                   this.shim.css({
                       left: offset.left + "px",
                       top: offset.top + "px",
                       height: offset.height + "px",
                       width: offset.width + "px"
                   }).removeClass("hidden");
                }
            });
        });

        res.addCallback("hide", function () {
            AJS.$(AJS.dropDown.iframes).each(function(){
                this.shim.addClass("hidden");
            });
            options.hideHandler();
        });
        result.push(res);
    });
    return result;
};

/**
 * For the given item in the drop down get the value of the named additional property. If there is no
 * property with the specified name then null will be returned.
 *
 * @method getAdditionalPropertyValue
 * @namespace AJS.dropDown
 * @param item {Object} jQuery Object of the drop down item. An LI element is expected.
 * @param name {String} name of the property to retrieve
 */
AJS.dropDown.getAdditionalPropertyValue = function (item, name) {
    var el = item[0];
    if ( !el || (typeof el.tagName != "string") || el.tagName.toLowerCase() != "li" ) {
        // we are moving the location of the properties and want to deprecate the attachment to the span
        // but are unsure where and how its being called so for now we just log
        AJS.log("AJS.dropDown.getAdditionalPropertyValue : item passed in should be an LI element wrapped by jQuery");
    }
    var properties = AJS.$.data(el, "properties");
    return properties ? properties[name] : null;
};

/**
 * Only here for backwards compatibility
 * @method removeAllAdditionalProperties
 * @namespace AJS.dropDown
 * @deprecated Since 3.0
 */
AJS.dropDown.removeAllAdditionalProperties = function (item) {
};

 /**
  * Base dropdown control. Enables you to identify triggers that when clicked, display dropdown.
  *
  * @class Standard
  * @constructor
  * @namespace AJS.dropDown
  * @param {Object} usroptions
  * @return {Object
  */
 AJS.dropDown.Standard = function (usroptions) {

    var res = [], dropdownParents, options = {
        selector: ".aui-dd-parent",
        dropDown: ".aui-dropdown",
        trigger: ".aui-dd-trigger"
    };

     // extend defaults with user options
    AJS.$.extend(options, usroptions);

    var hookUpDropDown = function($trigger, $parent, $dropdown, ddcontrol) {
        // extend to control to have any additional properties/methods
        AJS.$.extend(ddcontrol, {trigger: $trigger});

        // flag it to prevent additional dd controls being applied
        $parent.addClass("dd-allocated");

        //hide dropdown if not already hidden
        $dropdown.addClass("hidden");

        //show the dropdown if isHiddenByDefault is set to false
        if (options.isHiddenByDefault == false) {
            ddcontrol.show();
        }

        ddcontrol.addCallback("show", function () {
            $parent.addClass("active");
        });
        
        ddcontrol.addCallback("hide", function () {
            $parent.removeClass("active");
        });
    };

    var handleEvent = function(event, $trigger, $dropdown, ddcontrol) {
        if (ddcontrol != AJS.dropDown.current) {
            $dropdown.css({top: $trigger.outerHeight()});
            ddcontrol.show();
            event.stopImmediatePropagation();
        }
        event.preventDefault();
    };

    if (options.useLiveEvents) {
        // cache arrays so that we don't have to recalculate the dropdowns. Since we can't store objects as keys in a map,
        // we have two arrays: keysCache stores keys of dropdown triggers; valuesCache stores a map of internally used objects
        var keysCache = [];
        var valuesCache = [];

        AJS.$(options.trigger).live("click", function (event) {
            var $trigger = AJS.$(this);
            var $parent, $dropdown, ddcontrol;

            // if we're cached, don't recalculate the dropdown and do all that funny shite.
            var index;
            if ((index = AJS.$.inArray(this, keysCache)) >= 0) {
                var val = valuesCache[index];
                $parent = val['parent'];
                $dropdown = val['dropdown'];
                ddcontrol = val['ddcontrol'];
            } else {
                $parent = $trigger.closest(options.selector);
                $dropdown = $parent.find(options.dropDown);
                // Sanity checking
                if ($dropdown.length === 0) {
                    return;
                }

                ddcontrol =  AJS.dropDown($dropdown, options)[0];
                // Sanity checking
                if (!ddcontrol) {
                    return;
                }

                // cache
                keysCache.push(this);
                val = {
                    parent : $parent,
                    dropdown : $dropdown,
                    ddcontrol : ddcontrol
                };

                hookUpDropDown($trigger, $parent, $dropdown, ddcontrol);

                valuesCache.push(val);
            }

            handleEvent(event, $trigger, $dropdown, ddcontrol);
        });
    } else {
          // handling for jQuery collections
        if (this instanceof AJS.$) {
            dropdownParents = this;
        // handling for selectors
        } else {
            dropdownParents = AJS.$(options.selector);
        }

        // a series of checks to ensure we are dealing with valid dropdowns
        dropdownParents = dropdownParents
                .not(".dd-allocated")
                .filter(":has(" + options.dropDown + ")")
                .filter(":has(" + options.trigger + ")");

        dropdownParents.each(function () {
            var
            $parent = AJS.$(this),
            $dropdown = AJS.$(options.dropDown, this),
            $trigger = AJS.$(options.trigger, this),
            ddcontrol = AJS.dropDown($dropdown, options)[0];

            // extend to control to have any additional properties/methods
            AJS.$.extend(ddcontrol, {trigger: $trigger});

            hookUpDropDown($trigger, $parent, $dropdown, ddcontrol);

            $trigger.click(function (e) {
                handleEvent(e, $trigger, $dropdown, ddcontrol);
            });

            // add control to the response
            res.push(ddcontrol);

        });
    }
    return res;
};


/**
 * A NewStandard dropdown, however, with the ability to populate its content's via ajax.
 *
 * @class Ajax
 * @constructor
 * @namespace AJS.dropDown
 * @param {Object} options
 * @return {Object} dropDown instance
 */
AJS.dropDown.Ajax = function (usroptions) {

    var dropdowns, options = {cache: true};

     // extend defaults with user options
    AJS.$.extend(options, usroptions || {});

    // we call with "this" in case we are called in the context of a jQuery collection
    dropdowns = AJS.dropDown.Standard.call(this, options);

    AJS.$(dropdowns).each(function () {

        var ddcontrol = this;

        AJS.$.extend(ddcontrol, {
            getAjaxOptions: function (opts) {
                var success = function (response) {
                    if (options.formatResults) {
                        response = options.formatResults(response);
                    }
                    if (options.cache) {
                        ddcontrol.cache.set(ddcontrol.getAjaxOptions(), response);
                    }
                    ddcontrol.refreshSuccess(response);
                };
                if (options.ajaxOptions) {


                    if (AJS.$.isFunction(options.ajaxOptions)) {
                        return AJS.$.extend(options.ajaxOptions.call(ddcontrol), {success: success});
                    } else {
                        return AJS.$.extend(options.ajaxOptions, {success: success});
                    }
                }
                return AJS.$.extend(opts, {success: success});
            },

            refreshSuccess: function (response) {
                this.$.html(response);
            },

            cache: function () {
                var c = {};
                return {
                    get: function (ajaxOptions) {
                        var data = ajaxOptions.data || "";
                        return c[(ajaxOptions.url + data).replace(/[\?\&]/gi,"")];
                    },
                    set: function (ajaxOptions, responseData) {
                        var data = ajaxOptions.data || "";
                        c[(ajaxOptions.url + data).replace(/[\?\&]/gi,"")] = responseData;
                    },
                    reset: function () {
                        c = {};
                    }
                };
            }(),

            show: function (superMethod) {
                return function (opts) {
                    if (options.cache && !!ddcontrol.cache.get(ddcontrol.getAjaxOptions())) {
                        ddcontrol.refreshSuccess(ddcontrol.cache.get(ddcontrol.getAjaxOptions()));
                        superMethod.call(ddcontrol);
                    } else {
                        AJS.$(AJS.$.ajax(ddcontrol.getAjaxOptions())).throbber({target: ddcontrol.$,
                            end: function () {
                                ddcontrol.reset();
                            }
                        });
                        superMethod.call(ddcontrol);
                        if (ddcontrol.iframeShim) {
                            ddcontrol.iframeShim.hide();
                        }
                    }
                };
            }(ddcontrol.show),

            resetCache: function () {
                ddcontrol.cache.reset();
            }
        });
        ddcontrol.addCallback("refreshSuccess", function () {
            ddcontrol.reset();
        });
    });
    return dropdowns;
};


AJS.$.fn.dropDown = function (type, options) {
    type = (type || "Standard").replace(/^([a-z])/, function (match) {
        return match.toUpperCase();
    });
    return AJS.dropDown[type].call(this, options);
};

AJS.$.fn.dropDown = AJS.deprecate.construct(AJS.$.fn.dropDown, 'Dropdown constructor', {alternativeName: 'Dropdown2'});

/*
 * Modified by Atlassian to allow chaining of keys
 *
 * jQuery Hotkeys Plugin
 * Copyright 2010, John Resig
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Based upon the plugin by Tzury Bar Yochay:
 * http://github.com/tzuryby/hotkeys
 *
 * Original idea by:
 * Binny V A, http://www.openjs.com/scripts/events/keyboard_shortcuts/
*/

(function(jQuery){

    jQuery.hotkeys = {
        version: "0.8",

        specialKeys: {
            8: "backspace", 9: "tab", 13: "return", 16: "shift", 17: "ctrl", 18: "alt", 19: "pause",
            20: "capslock", 27: "esc", 32: "space", 33: "pageup", 34: "pagedown", 35: "end", 36: "home",
            37: "left", 38: "up", 39: "right", 40: "down", 45: "insert", 46: "del",
            91 : "meta",
            96: "0", 97: "1", 98: "2", 99: "3", 100: "4", 101: "5", 102: "6", 103: "7",
            104: "8", 105: "9", 106: "*", 107: "+", 109: "-", 110: ".", 111 : "/",
            112: "f1", 113: "f2", 114: "f3", 115: "f4", 116: "f5", 117: "f6", 118: "f7", 119: "f8",
            120: "f9", 121: "f10", 122: "f11", 123: "f12", 144: "numlock", 145: "scroll",
            188: ",", 190: ".", 191: "/", 224: "meta", 219: '[', 221: ']'
        },

        // These only work under Mac Gecko when using keypress (see http://unixpapa.com/js/key.html).
        keypressKeys: [ "<", ">", "?" ],

        shiftNums: {
            "`": "~", "1": "!", "2": "@", "3": "#", "4": "$", "5": "%", "6": "^", "7": "&",
            "8": "*", "9": "(", "0": ")", "-": "_", "=": "+", ";": ":", "'": "\"", ",": "<",
            ".": ">",  "/": "?",  "\\": "|"
        }
    };

    jQuery.each(jQuery.hotkeys.keypressKeys, function (_, key) {
        jQuery.hotkeys.shiftNums[ key ] = key;
    });

    function TimedNumber(timer) {
        this.num = 0;
        this.timer = timer > 0 ? timer : false;
    }
    TimedNumber.prototype.val = function () {
        return this.num;
    };
    TimedNumber.prototype.inc = function () {
        if (this.timer) {
            clearTimeout(this.timeout);
            this.timeout = setTimeout(jQuery.proxy(TimedNumber.prototype.reset, this), this.timer);
        }
        this.num++;
    };
    TimedNumber.prototype.reset = function () {
        if (this.timer) {
            clearTimeout(this.timeout);
        }
        this.num = 0;
    };

    function keyHandler( handleObj ) {
        // Only care when a possible input has been specified
        if ( !(jQuery.isPlainObject(handleObj.data) || jQuery.isArray(handleObj.data) || typeof handleObj.data === "string") ) {
            return;
        }

        var origHandler = handleObj.handler,
            options = {
                timer: 700
            };

        (function (data) {
            if (typeof data === 'string') {
                options.combo = [ data ];
            } else if (jQuery.isArray(data)) {
                options.combo = data;
            } else {
                jQuery.extend(options, data);
            }
            options.combo = jQuery.map(options.combo, function (key) {
                return key.toLowerCase();
            });
        })(handleObj.data);

        handleObj.index = new TimedNumber(options.timer);
        handleObj.handler = function( event ) {
            // Don't fire in text-accepting inputs that we didn't directly bind to
            if (this !== event.target && (/textarea|select|input/i.test(event.target.nodeName))){
                return;
            }

            // Keypress represents characters, not special keys
            var special = event.type !== 'keypress' ? jQuery.hotkeys.specialKeys[ event.which ] : null,
                character = String.fromCharCode( event.which ).toLowerCase(),
                key, modif = "", possible = {};

            // check combinations (alt|ctrl|shift+anything)
            if ( event.altKey && special !== "alt" ) {
                modif += "alt+";
            }

            if ( event.ctrlKey && special !== "ctrl" ) {
                modif += "ctrl+";
            }

            // TODO: Need to make sure this works consistently across platforms
            if ( event.metaKey && !event.ctrlKey && special !== "meta" ) {
                modif += "meta+";
            }

            if ( event.shiftKey && special !== "shift" ) {
                modif += "shift+";
            }

            // Under Chrome and Safari, meta's keycode == '['s charcode
            // Even if they did type this key combo we could not use it because it is browser back in Chrome/Safari on OS X
            if (event.metaKey && character === '[') {
                character = null;
            }

            if (special) {
                possible[ modif + special ] = true;
            }
            if (character) {
                possible[ modif + character ] = true;
            }
            
            // "$" can be specified as "shift+4" or "$"
            if ( /shift+/.test(modif) ) {
                possible [ modif.replace('shift+', '') + jQuery.hotkeys.shiftNums[ (special || character) ] ] = true;
            }

            var index = handleObj.index,
                combo = options.combo;

            if ( pressed(combo[index.val()], possible) ) {
                if ( index.val() === combo.length - 1 ) {
                    index.reset();
                    return origHandler.apply(this, arguments);
                } else {
                    index.inc();
                }
            } else {
                index.reset();
                // For mutli-key combinations, we might have restarted the key sequence.
                if ( pressed(combo[0], possible) ) {
                    index.inc();
                }
            }
        };
    }

    function pressed(key, possible) {
        var keys = key.split(' ');
        for (var i = 0, len = keys.length; i < len; i++) {
            if ( possible[keys[i]] ) {
                return true;
            }
        }
        return false;
    }

    jQuery.each([ "keydown", "keyup", "keypress" ], function() {
        jQuery.event.special[ this ] = { add: keyHandler };
    });

})( jQuery );


/**
 * A collection of common controls
 *
 * @module Controls
 * @requires AJS, jQuery
 */

/**
 * Keyboard commands with syntactic sugar.
 *
 * <strong>Usage:</strong>
 * <pre>
 * AJS.whenIType("gh").or("gd").goTo("/secure/Dashboard.jspa");
 * AJS.whenIType("c").click("#create_link");
 * </pre>
 *
 * @class whenIType
 * @constuctor whenIType
 * @namespace AJS
 * @param keys - Key combinations, modifier keys are "+" deliminated. e.g "ctrl+b"
 */

(function(exports, $) {
    'use strict';

    var isMac = navigator.platform.indexOf('Mac') !== -1;

    //see jquery.hotkeys.js for accepted names.
    var multiCharRegex = /^(backspace|tab|r(ight|eturn)|s(hift|pace|croll)|c(trl|apslock)|alt|pa(use|ge(up|down))|e(sc|nd)|home|left|up|d(el|own)|insert|f\d\d?|numlock|meta)/i;


    exports.whenIType = function (keys) {

        var boundKeyCombos = [],
            executor = $.Callbacks();

        function keypressHandler(e) {
            if (!AJS.popup.current  && executor) {
                executor.fire(e);
            }
        }
        function defaultPreventionHandler(e) {
            e.preventDefault();
        }

        // Bind an arbitrary set of keys by calling bindKeyCombo on each triggering key combo.
        // A string like "abc 123" means (a then b then c) OR (1 then 2 then 3). abc is one key combo, 123 is another.
        function bindKeys(keys) {
            var keyCombos = keys && keys.split ? $.trim(keys).split(' ') : [ keys ];

            keyCombos.forEach(function(keyCombo) {
                bindKeyCombo(keyCombo);
            });
        }

        function hasUnprintables(keysArr) {
            // a bit of a heuristic, but works for everything we have. Only the unprintable characters are represented with > 1-character names.
            var i = keysArr.length;
            while(i--) {
                if (keysArr[i].length > 1 && keysArr[i] !== 'space') {
                    return true;
                }
            }
            return false;
        }

        // bind a single key combo to this handler
        // A string like "abc 123" means (a then b then c) OR (1 then 2 then 3). abc is one key combo, 123 is another.
        function bindKeyCombo(keyCombo) {
            var keysArr = keyCombo instanceof Array ?
                      keyCombo :
                      keyComboArrayFromString(keyCombo.toString());

            var eventType = hasUnprintables(keysArr) ? 'keydown' : 'keypress';

            boundKeyCombos.push(keysArr);

            $(document).bind(eventType, keysArr, keypressHandler);

            // Override browser/plugins
            $(document).bind(eventType + ' keyup', keysArr, defaultPreventionHandler);
        }

        // parse out an array of (modifier+key) presses from a single string
        // e.g. "12ctrl+3" becomes [ "1", "2", "ctrl+3" ]
        function keyComboArrayFromString(keyString) {

            var keysArr = [],
                currModifiers = '';

            while(keyString.length) {
                var modifierMatch = keyString.match(/^(ctrl|meta|shift|alt)\+/i);
                var multiCharMatch = keyString.match(multiCharRegex);

                if (modifierMatch) {
                    currModifiers += modifierMatch[0];
                    keyString = keyString.substring(modifierMatch[0].length);

                } else if (multiCharMatch) {
                    keysArr.push(currModifiers + multiCharMatch[0]);
                    keyString = keyString.substring(multiCharMatch[0].length);
                    currModifiers = '';

                } else {
                    keysArr.push(currModifiers + keyString[0]);
                    keyString = keyString.substring(1);
                    currModifiers = '';
                }
            }

            return keysArr;
        }

        function addShortcutsToTitle(selector) {
            var elem = $(selector),
                title = elem.attr('title') || '',
                keyCombos = boundKeyCombos.slice();

            var shortcutInstructions = elem.data('kbShortcutAppended') || '';

            var isFirst = !shortcutInstructions;
            var originalTitle = isFirst? title : title.substring(0, title.length - shortcutInstructions.length);

            while(keyCombos.length) {
                shortcutInstructions = appendKeyComboInstructions(keyCombos.shift().slice(), shortcutInstructions, isFirst);
                isFirst = false;
            }

            if (isMac) {
                shortcutInstructions = shortcutInstructions
                    .replace(/Meta/ig, '\u2318') //Apple cmd key
                    .replace(/Shift/ig, '\u21E7'); //Apple Shift symbol
            }

            elem.attr('title', originalTitle + shortcutInstructions);
            elem.data('kbShortcutAppended', shortcutInstructions);
        }

        function removeShortcutsFromTitle(selector) {
            var elem = $(selector);
            var shortcuts = elem.data('kbShortcutAppended');

            if (!shortcuts) {
                return;
            }

            var title = elem.attr('title');
            elem.attr('title', title.replace(shortcuts, ''));
            elem.removeData('kbShortcutAppended');
        }

        //
        function appendKeyComboInstructions(keyCombo, title, isFirst) {
            if (isFirst) {
                title += ' (' + AJS.I18n.getText('aui.keyboard.shortcut.type.x', keyCombo.shift());
            } else {
                title = title.replace(/\)$/, '');
                title += AJS.I18n.getText('aui.keyboard.shortcut.or.x', keyCombo.shift());
            }

            keyCombo.forEach(function(key) {
                title += " " + AJS.I18n.getText("aui.keyboard.shortcut.then.x", key);
            });
            title += ')';

            return title;
        }

        bindKeys(keys);

        return exports.whenIType.makeShortcut({
            executor : executor,
            bindKeys : bindKeys,
            addShortcutsToTitle : addShortcutsToTitle,
            removeShortcutsFromTitle : removeShortcutsFromTitle,
            keypressHandler : keypressHandler,
            defaultPreventionHandler : defaultPreventionHandler
        });
    };

    exports.whenIType.makeShortcut = function(options) {

        var executor = options.executor;
        var bindKeys = options.bindKeys;
        var addShortcutsToTitle = options.addShortcutsToTitle;
        var removeShortcutsFromTitle = options.removeShortcutsFromTitle;
        var keypressHandler = options.keypressHandler;
        var defaultPreventionHandler = options.defaultPreventionHandler;

        var selectorsWithTitlesModified = [];

        function makeMoveToFunction(getNewFocus) {
            return function (selector, options) {
                options = options || {};
                var focusedClass = options.focusedClass || 'focused';
                var wrapAround = options.hasOwnProperty('wrapAround') ? options.wrapAround : true;
                var escToCancel = options.hasOwnProperty('escToCancel') ? options.escToCancel : true;

                executor.add(function () {

                    var $items = $(selector),
                        $focusedElem = $items.filter('.' + focusedClass),
                        moveToOptions = $focusedElem.length === 0 ? undefined : { transition : true };

                    if (escToCancel) {
                        $(document).one('keydown', function (e) {
                            if (e.keyCode === AJS.keyCode.ESCAPE && $focusedElem) {
                                $focusedElem.removeClass(focusedClass);
                            }
                        });
                    }

                    if ($focusedElem.length) {
                        $focusedElem.removeClass(focusedClass);
                    }

                    $focusedElem = getNewFocus($focusedElem, $items, wrapAround);

                    if ($focusedElem && $focusedElem.length > 0) {
                        $focusedElem.addClass(focusedClass);
                        $focusedElem.moveTo(moveToOptions);
                        if ($focusedElem.is('a')) {
                            $focusedElem.focus();
                        } else {
                            $focusedElem.find('a:first').focus();
                        }
                    }
                });
                return this;
            };
        }

        return {

            /**
             * Scrolls to and adds <em>focused</em> class to the next item in the jQuery collection
             *
             * @method moveToNextItem
             * @param selector
             * @param options
             * @return {Object}
             */
            moveToNextItem: makeMoveToFunction(function($focusedElem, $items, wrapAround) {
                var index;

                if (wrapAround && $focusedElem.length === 0) {
                    return $items.eq(0);

                } else {
                    index = $.inArray($focusedElem.get(0), $items);
                    if (index < $items.length-1) {
                        index = index +1;
                        return $items.eq(index);
                    } else if (wrapAround) {
                        return $items.eq(0);
                    }
                }

                return $focusedElem;
            }),
            /**
             * Scrolls to and adds <em>focused</em> class to the previous item in the jQuery collection
             *
             * @method moveToPrevItem
             * @param selector
             * @param focusedClass
             * @return {Object}
             */
            moveToPrevItem: makeMoveToFunction(function ($focusedElem, $items, wrapAround) {
                var index;
                if (wrapAround && $focusedElem.length === 0) {
                    return $items.filter(':last');

                } else {
                    index = $.inArray($focusedElem.get(0), $items);
                    if (index > 0) {
                        index = index -1;
                        return $items.eq(index);
                    } else if (wrapAround) {
                        return $items.filter(':last');
                    }
                }

                return $focusedElem;
            }),

            /**
             * Clicks the element specified by the <em>selector</em> argument.
             *
             * @method click
             * @param selector - jQuery selector for element
             * @return {Object}
             */
            click: function (selector) {
                selectorsWithTitlesModified.push(selector);
                addShortcutsToTitle(selector);

                executor.add(function () {
                    var elem = $(selector);
                    if (elem.length > 0) {
                        elem.click();
                    }
                });
                return this;
            },

            /**
             * Navigates to specified <em>location</em>
             *
             * @method goTo
             * @param {String} location - http location
             * @return {Object}
             */
            goTo: function (location) {
                executor.add(function () {
                    window.location.href = location;
                });
                return this;
            },

            /**
             * navigates browser window to link href
             *
             * @method followLink
             * @param selector - jQuery selector for element
             * @return {Object}
             */
            followLink: function (selector) {
                selectorsWithTitlesModified.push(selector);
                addShortcutsToTitle(selector);

                executor.add(function () {
                    var elem = $(selector)[0];
                    if (elem && { 'a' : true, 'link' : true }[ elem.nodeName.toLowerCase() ]) {
                        window.location.href = elem.href;
                    }
                });
                return this;
            },

            /**
             * Executes function
             *
             * @method execute
             * @param {function} func
             * @return {Object}
             */
            execute: function (func) {
                var self = this;
                executor.add(function () {
                    func.apply(self, arguments);
                });
                return this;
            },

            /**
             * @deprecated This implementation is uncool. Kept around to satisfy Confluence plugin devs in the short term.
             *
             * Executes the javascript provided by the shortcut plugin point _immediately_.
             *
             * @method evaluate
             * @param {Function} command - the function provided by the shortcut key plugin point
             */
            evaluate: function(command) {
                command.call(this);
            },

            /**
             * Scrolls to element if out of view, then clicks it.
             *
             * @method moveToAndClick
             * @param selector - jQuery selector for element
             * @return {Object}
             */
            moveToAndClick: function (selector) {
                selectorsWithTitlesModified.push(selector);
                addShortcutsToTitle(selector);

                executor.add(function () {
                    var elem = $(selector);
                    if (elem.length > 0) {
                        elem.click();
                        elem.moveTo();
                    }
                });
                return this;
            },

            /**
             * Scrolls to element if out of view, then focuses it
             *
             * @method moveToAndFocus
             * @param selector - jQuery selector for element
             * @return {Object}
             */
            moveToAndFocus: function (selector) {
                selectorsWithTitlesModified.push(selector);
                addShortcutsToTitle(selector);

                executor.add(function (e) {
                    var $elem = AJS.$(selector);
                    if ($elem.length > 0) {
                        $elem.focus();
                        if ($elem.moveTo) {
                            $elem.moveTo();
                        }
                        if ($elem.is(':input')) {
                            e.preventDefault();
                        }
                    }
                });
                return this;
            },

            /**
             * Binds additional keyboard controls
             *
             * @method or
             * @param {String} keys - keys to bind
             * @return {Object}
             */
            or: function (keys) {
                bindKeys(keys);
                return this;
            },

            /**
             * Unbinds shortcut keys
             *
             * @method unbind
             */
            unbind: function () {
                $(document)
                    .unbind('keydown keypress', keypressHandler)
                    .unbind('keydown keypress keyup', defaultPreventionHandler);

                for(var i = 0, len = selectorsWithTitlesModified.length; i < len; i++) {
                    removeShortcutsFromTitle(selectorsWithTitlesModified[i]);
                }
                selectorsWithTitlesModified = [];
            }
        };
    };

    /**
     * Creates keyboard commands and their actions from json data. Format looks like:
     *
     * <pre>
     * [
     *   {
     *        "keys":[["g", "d"]],
     *        "context":"global",
     *        "op":"followLink",
     *        "param":"#home_link"
     *    },
     *    {
     *        "keys":[["g", "i"]],
     *        "context":"global",
     *        "op":"followLink",
     *        "param":"#find_link"
     *    },
     *    {
     *        "keys":[["/"]],
     *        "context":"global",
     *        "op":"moveToAndFocus",
     *        "param":"#quickSearchInput"
     *    },
     *    {
     *        "keys":[["c"]],
     *        "context":"global",
     *        "op":"moveToAndClick",
     *        "param":"#create_link"
     *    }
     * ]
     * </pre>
     *
     * @method fromJSON
     * @static
     * @param json
     */
    exports.whenIType.fromJSON = function (json, switchCtrlToMetaOnMac) {
        var shortcuts = [];

        //AJS.keys is defined by the keyboard-shortcut plugin.
        if (json) {
            $.each(json, function (i,item) {
                var operation = item.op,
                    param = item.param,
                    params;

                if(operation === 'execute' || operation === 'evaluate') {
                    // need to turn function string into function object
                    params = [ new Function(param) ];

                } else if (/^\[[^\]\[]*,[^\]\[]*\]$/.test(param)) {
                    // pass in an array to send multiple params
                    try {
                        params = JSON.parse(param);
                    } catch(e) {
                        AJS.error('When using a parameter array, array must be in strict JSON format: ' + param);
                    }

                    if (!$.isArray(params)) {
                        AJS.error('Badly formatted shortcut parameter. String or JSON Array of parameters required: ' + param);
                    }

                } else {
                    params = [ param ];
                }

                $.each(item.keys, function () {

                    var shortcutList = this;
                    if (switchCtrlToMetaOnMac && isMac) {
                        shortcutList = $.map(shortcutList, function(shortcutString) {
                            return shortcutString.replace(/ctrl/i, "meta");
                        });
                    }

                    var newShortcut = AJS.whenIType(shortcutList);
                    newShortcut[operation].apply(newShortcut, params);
                    shortcuts.push(newShortcut);
                });
                
            });
        }

        return shortcuts;
    };

    // Trigger this event on an iframe if you want its keypress events to be propagated (Events to work in iframes).
    $(document).bind('iframeAppended', function (e, iframe) {
        $(iframe).load(function () {

            var target = $(iframe).contents();

            target.bind('keyup keydown keypress', function (e) {
                // safari propagates keypress events from iframes
                if ($.browser.safari && e.type === 'keypress') {
                    return;
                }
                if (!$(e.target).is(':input')) {

                    $.event.trigger(
                        e,
                        arguments, // Preserve original event data.
                        document,  // Bubble this event from the iframe's document to its parent document.
                        true       // Use the capturing phase to preserve original event.target.
                    );
                }
            });
        });
    });

})(AJS, AJS.$);
// Self executing function so we can pass in jquery.
(function ($, skate, template, debounce) {
    'use strict';

    var $window = $(window);

    function Header (element) {
        var that = this;

        this.element = element;
        this.$element = $(element);
        this.index = $('aui-header, .aui-header').index(element);
        this.$secondaryNav = this.$element.find('.aui-header-secondary .aui-nav').first();
        this.menuItems = [];
        this.totalWidth = 0;
        this.$moreMenu = undefined;
        this.previousIndex = undefined;
        this.$applicationLogo = this.$element.find('#logo');
        this.moreMenuWidth = 0;
        this.primaryButtonsWidth = 0;

        // to cache the selector and give .find convenience
        this.$headerFind = (function () {
            var $header = that.$element.find('.aui-header-primary').first();

            return function (selector) {
                return $header.find(selector);
            };
        })();
    }

    Header.prototype = {
        init: function () {
            var that = this;

            this.element.setAttribute('data-aui-responsive', 'true');
            this.$headerFind('.aui-button').parent().each(function () {
                that.primaryButtonsWidth += $(this).outerWidth(true);
            });

            // remember the widths of all the menu items
            this.$headerFind('.aui-nav > li > a:not(.aui-button)').each(function () {
                var $this = $(this).parent();
                var outerWidth = $this.outerWidth(true);

                that.totalWidth += outerWidth;
                that.menuItems.push({
                    $element: $this,
                    outerWidth: outerWidth
                });
            });

            this.previousIndex = this.menuItems.length;

            // attach resize handler
            $window.resize(debounce(function () {
                that.previousIndex = that.constructResponsiveDropdown();
            }, 100));

            // create the elements for the show more menu
            this.createResponsiveDropdownTrigger();

            // So that the header logo doesn't mess things up. (size is unknown before the image loads)
            var $logoImg = this.$applicationLogo.find('img');

            if ($logoImg.length !== 0) {
                $logoImg.attr('data-aui-responsive-header-index', this.index);
                $logoImg.load(function () {
                    that.previousIndex = that.constructResponsiveDropdown();
                });
            }

            // construct the show more dropdown
            this.previousIndex = this.constructResponsiveDropdown();

            // show the aui nav (hidden via css on load)
            this.$headerFind('.aui-nav').css('width', 'auto');
        },

        // calculate widths based on the current state of the page
        calculateAvailableWidth: function () {
            // if there is no secondary nav, use the right of the screen as the boundary instead
            var rightMostBoundary = this.$secondaryNav.length !== 0 ? this.$secondaryNav.offset().left : this.$element.outerWidth();

            // the right most side of the primary nav, this is assumed to exists if this code is running
            var primaryNavRight = this.$applicationLogo.offset().left + this.$applicationLogo.outerWidth(true) + this.primaryButtonsWidth;

            return rightMostBoundary - primaryNavRight;
        },

        constructResponsiveDropdown: function () {
            var remaining;
            var availableWidth = this.calculateAvailableWidth(this.$element, this.primaryButtonsWidth);

            if (availableWidth > this.totalWidth) {
                this.showAll();
            } else {
                this.$moreMenu.show();
                remaining = availableWidth - this.moreMenuWidth;

                // loop through menu items until no more remaining space
                // i represents the index of the last item in the header
                for (var i = 0; remaining >= 0; i++) {
                    remaining -= this.menuItems[i].outerWidth;
                }

                // Subtract one for fencepost
                --i;

                // move everything after the last index into the show more dropdown
                this.moveToResponsiveDropdown(i);

                // move everything between the previous index and the current index out of the dropdown
                this.moveOutOfResponsiveDropdown(i);

                // return the index of the last last item in the header so we can remember it for next time
                return i;
            }
        },

        // creates the trigger and content elements for the show more dropdown
        createResponsiveDropdownTrigger: function () {
            var item = document.createElement('li');
            var dropdown = document.createElement('aui-dropdown');

            dropdown.id = 'aui-responsive-header-dropdown-' + this.index;
            template.wrap(dropdown).innerHTML = '<ul id="aui-responsive-header-dropdown-list-' + this.index + '"></ul>';
            dropdown.setAttribute('label', AJS.I18n.getText('aui.words.more'));
            item.appendChild(dropdown);

            // detect if buttons exist
            if (this.primaryButtonsWidth === 0) {
                this.$headerFind('.aui-nav').append(item);
            } else {
                this.$headerFind('.aui-nav > li > .aui-button').first().parent().before(item);
            }

            this.$moreMenu = $(item);
            this.moreMenuWidth = this.$moreMenu.outerWidth(true);
        },

        // function that handles moving items out of the show more menu into the app header
        moveOutOfResponsiveDropdown: function (index) {
            if (index < 0 || this.previousIndex < 0 || index === this.previousIndex) {
                return;
            }

            var $responsiveTrigger = $('#aui-responsive-header-dropdown-' + this.index);
            var $responsiveTriggerItem = $responsiveTrigger.parent();
            var current;
            var $currentItem;

            if ($responsiveTrigger.hasClass('active')) {
                $responsiveTrigger.trigger('aui-button-invoke');
            }

            var menuItemElementsLength = this.$headerFind('.aui-nav > li > aui-dropdown').not($responsiveTrigger).length;

            while (index > this.previousIndex) {
                current = this.menuItems[this.previousIndex];

                // Make sure things exist before accessing them.
                if (current && current.$element) {
                    $currentItem = current.$element;

                    if (menuItemElementsLength === 0) {
                        // this path should only run once when there are no menu items left in the header
                        $currentItem.prependTo(this.$headerFind('.aui-nav'));
                    } else {
                        $currentItem.insertBefore($responsiveTriggerItem);
                    }

                    var $itemTrigger = $currentItem.children('a');
                    $itemTrigger.removeClass('aui-dropdown2-sub-trigger active');
                    $('#' + $itemTrigger.attr('aria-controls')).removeClass('aui-dropdown2-sub-menu');

                    this.previousIndex = this.previousIndex + 1;
                    menuItemElementsLength = menuItemElementsLength + 1;
                }
            }
        },

        // function that handles moving itesm into the show more menu
        moveToResponsiveDropdown: function (index) {
            if (index < 0) {
                return;
            }

            var $dropdownContainer = $('#aui-responsive-header-dropdown-list-' + this.index);

            for (var i = index; i < this.menuItems.length; i++) {
                this.menuItems[i].$element.appendTo($dropdownContainer);

                var $itemTrigger = this.menuItems[i].$element.children('a');

                if ($itemTrigger.hasClass('aui-dropdown2-trigger')) {
                    $itemTrigger.addClass('aui-dropdown2-sub-trigger');
                    $('#' + $itemTrigger.attr('aria-controls')).addClass('aui-dropdown2-sub-menu');
                }
            }
        },

        // function that handles show everything
        showAll: function () {
            this.$moreMenu.hide();
            this.moveOutOfResponsiveDropdown(this.menuItems.length, this.previousIndex);
        }
    };

    function createHeader (element) {
        var header = new Header(element);
        header.init();
    }

    function findAndCreateHeaders () {
        $('.aui-header').each(function () {
            createHeader(this);
        });
    }

    $(findAndCreateHeaders);

    AJS.responsiveheader = {};
    AJS.responsiveheader.setup = AJS.deprecate.fn(findAndCreateHeaders, 'AJS.responsiveheader.setup', {
        removeInVersion: '6.0.0',
        sinceVersion: '5.8.0',
        extraInfo: 'No need to manually initialise anymore as this is now a web component.'
    });

    skate('aui-header', {
        type: skate.types.TAG,

        created: function (element) {
            $(element).find('.aui-banner').addClass('aui-banner-error');
        },

        attached: function (element) {
            createHeader(element);
        },

        attributes: {
            link: function (element, data) {
                element.querySelector('#logo > a').setAttribute('href', data.newValue);
            },

            responsive: function (element, data) {
                element.querySelector('.aui-header').setAttribute('data-aui-responsive', data.newValue);
            }
        },

        template: template(
            '<content select="aui-banner"></content>',
            '<nav class="aui-header aui-dropdown2-trigger-group" role="navigation">',
                '<content select=".aui-header-before"></content>',
                '<div class="aui-header-primary">',
                    '<h1 id="logo" class="aui-header-logo">',
                        '<a href="/">',
                            '<content select=".aui-header-logo, .aui-header-logo-device, .aui-header-logo-text"></content>',
                        '</a>',
                    '</h1>',
                    '<content select=".aui-header-content"></content>',
                '</div>',
                '<content select=".aui-header-secondary"></content>',
                '<content select=".aui-header-after"></content>',
            '</nav>'
        )
    });
})(AJS.$, window.skate, window.skateTemplateHtml, AJS.debounce);

/*! jQuery Fancy File Input plugin - v1.0.0 - 2014-10-22
* http://seancurtis.com/experiments/fancy-file-input/
* Copyright (c) 2014 Sean Curtis <scurtis@atlassian.com>; Licensed http://www.apache.org/licenses/LICENSE-2.0 */
;(function (root, factory) {
    root.FancyFileInput = factory(jQuery);

    if (typeof define === 'function') {
        // AMD. Register as an anonymous module.
        define('aui/internal/fancy-file-input',[],function() {
            return root.FancyFileInput;
        });
    }
}(this, function ($) {
    'use strict';

    var fakePathRegex = /^.*[\\\/]/;
    var multipleFileTextRegex = /\{0\}/gi;
    var ie = (function() {
        var v = 3;
        var div = document.createElement( 'div' );
        var all = div.getElementsByTagName( 'i' );

        do {
            div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->';
        } while (all[0]);

        return v > 4 ? v : document.documentMode;
    }());

    $.fn.fancyFileInput = function (options) {
        return this.each(function () {
            var ffi = new FancyFileInput(this, options);
            $(this).data('FancyFileInput', ffi);
        });
    };

    function FancyFileInput(el, options) {
        var instance = $(el).data('FancyFileInput');
        if (instance) {
            return instance;
        }
        options = $.extend({}, FancyFileInput.defaults, options);
        this.el = el;
        this.$el = $(el);
        this.$label = this.createLabel(options.buttonText);
        this._addLabelText();
        this.$clearButton = $('<button>', {
            text: (this.$label.attr('data-ffi-clearButtonText') || options.clearButtonText),
            'class': 'ffi-clear',
            type: 'button',
            'tabindex': '-1'
        });
        this.multipleFileTextPattern = this.$label.attr('data-ffi-multipleFileTextPattern') || options.multipleFileTextPattern;
        this._eventNamespace = '.ffi';
        this.CLASSES = {
            disabled: 'is-disabled',
            focused: 'is-focused',
            active: 'is-active',
            valid: 'is-valid',
            invalid: 'is-invalid'
        };
        this[this.isDisabled() ? 'disable' : 'enable']();
        this.isFocused = false;
    }

    FancyFileInput.defaults = {
        buttonText: 'Browse\u2026',
        clearButtonText: 'Clear',
        multipleFileTextPattern: '{0} files'
    };

    FancyFileInput.prototype._addLabelText = function attLabelText() {
        var $associatedLabel = $('label[for="' + this.el.id + '"]');
        if ($associatedLabel.length) {
            this.$el.attr('aria-label', $associatedLabel.text());
        }
    };

    FancyFileInput.prototype.createLabel = function (buttonText) {
        var $label = this.$el.parent('.ffi[data-ffi-button-text]');
        if (!$label.length) {
            $label = this.$el.wrap($('<label>', { 'class': 'ffi', 'data-ffi-button-text': buttonText })).parent();
        }
        return $label;
    };

    FancyFileInput.prototype.isDisabled = function () {
        return this.$el.is(':disabled');
    };

    FancyFileInput.prototype.formatMultipleFileText = function (numFiles) {
        return this.multipleFileTextPattern.replace(multipleFileTextRegex, numFiles);
    };

    FancyFileInput.prototype.bindEvents = function () {
        this.$el
            .on('invalid'   + this._eventNamespace, $.proxy(this.checkValidity, this))
            .on('change'    + this._eventNamespace, $.proxy(this.change, this))
            .on('keydown'   + this._eventNamespace, $.proxy(this.keydown, this))
            .on('mousedown' + this._eventNamespace, $.proxy(this.mousedown, this))
            .on('mouseup'   + this._eventNamespace, $.proxy(this.mouseup, this))
            .on('focus'     + this._eventNamespace, $.proxy(this.focus, this))
            .on('blur'      + this._eventNamespace, $.proxy(this.blur, this));
        this.$clearButton.on('click' + this._eventNamespace, $.proxy(this.clear, this));
    };

    FancyFileInput.prototype.unbindEvents = function () {
        this.$el.off(this._eventNamespace);
        this.$clearButton.off(this._eventNamespace);
    };

    FancyFileInput.prototype.fireEvent = function (event) {
        this.$el.trigger(event + this._eventNamespace);
    };

    FancyFileInput.prototype.enable = function () {
        this.bindEvents();
        this.$el.prop('disabled', false);
        this.$label.removeClass(this.CLASSES.disabled);
    };

    FancyFileInput.prototype.disable = function () {
        this.unbindEvents();
        this.$el.prop('disabled', true);
        this.$label.addClass(this.CLASSES.disabled);
    };

    FancyFileInput.prototype.clear = function () {
        this.$el.wrap('<form>').closest('form').get(0).reset();
        this.$el.unwrap();
        this.el.value = '';
        this.change();
        return false;
    };

    FancyFileInput.prototype.focus = function () {
        var instance = this;

        this.$label.addClass(this.CLASSES.focused);

        // toggle focus so that the cursor appears back in the field instead of on the button
        if (ie && !this.isFocused) {
            this.isFocused = true;

            setTimeout(function() {
                instance.$el.blur();
                instance.$el.focus();
            }, 0);
        }
    };

    FancyFileInput.prototype.blur = function () {
        if (!ie || !this.isFocused) {
            this.$label.removeClass(this.CLASSES.focused);
            this.isFocused = false;
        }
    };

    FancyFileInput.prototype.mousedown = function () {
        this.$label.addClass(this.CLASSES.active);
    };

    FancyFileInput.prototype.mouseup = function () {
        this.$label.removeClass(this.CLASSES.active);
    };

    FancyFileInput.prototype.keydown = function (e) {
        var keyCode = e.which;
        var BACKSPACE = 8;
        var TAB = 9;
        var DELETE = 46;

        // Add clear behaviour for all browsers
        if (keyCode === BACKSPACE || keyCode === DELETE) {
            this.clear();
            e.preventDefault();
        }

        // This works around the IE double tab-stop - no events or blur/change occur when moving between
        //  the field part of the input and the button part. This is dirty, but it works.
        if (ie && keyCode === TAB) {
            var instance = this;

            this.isFocused = false;
            this.$el.prop('disabled',true);

            setTimeout(function(){
                instance.$el.prop('disabled', false).blur();
            }, 0);
        }
    };

    FancyFileInput.prototype.checkValidity = function () {
        if (!this.el.required) {
            return;
        }
        var isInvalid = this.$el.is(':invalid');

        this.$label.toggleClass(this.CLASSES.invalid, isInvalid).toggleClass(this.CLASSES.valid, !isInvalid);
    };

    FancyFileInput.prototype.change = function () {
        var files;
        var val = '';

        this.checkValidity();

        // multiple file selection
        if (this.el.multiple && this.el.files.length > 1) {
            files = this.formatMultipleFileText(this.el.files.length); // '5 files'
        } else {
            files = this.el.value; // 'README.txt'
        }

        if (files.length) {
            val = files.replace(fakePathRegex, ''); // Strips off the C:\fakepath nonsense
            this.$clearButton.appendTo(this.$label);
        } else {
            this.$clearButton.detach();
        }

        this.$el.focus();
        this.setFieldText(val);
        this.fireEvent('value-changed');
    };

    FancyFileInput.prototype.setFieldText = function (text) {
        var dataAttribute = 'data-ffi-value';
        if (text.length) {
            this.$label.attr(dataAttribute, text);
            this.fireEvent('value-added');
        } else {
            this.$label.removeAttr(dataAttribute);
            this.fireEvent('value-cleared');
        }
    };

    return FancyFileInput;
}));
