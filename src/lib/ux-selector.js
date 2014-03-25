/*
* uxSelector v.0.1.0
* (c) 2014, WebUX
* https://github.com/webux/ux-angularjs-datagrid
* License: MIT.
*/
(function(exports, global){
/**
 * ##ux.each##
 * Like angular.forEach except that you can pass additional arguments to it that will be available
 * in the iteration function. It is optimized to use while loops where possible instead of for loops for speed.
 * Like Lo-Dash.
 * @param {Array\Object} list
 * @param {Function} method
 * @param {..rest} data _additional arguments passes are available in the iteration function_
 * @returns {*}
 */
//_example:_
//
//      function myMethod(item, index, list, arg1, arg2, arg3) {
//          console.log(arg1, arg2, arg3);
//      }
//      ux.each(myList, myMethod, arg1, arg2, arg3);
function each(list, method, data) {
    var i = 0, len, result, extraArgs;
    if (arguments.length > 2) {
        extraArgs = exports.util.array.toArray(arguments);
        extraArgs.splice(0, 2);
    }
    if (list && list.length) {
        len = list.length;
        while (i < len) {
            result = method.apply(null, [ list[i], i, list ].concat(extraArgs));
            if (result !== undefined) {
                return result;
            }
            i += 1;
        }
    } else if (!(list instanceof Array)) {
        for (i in list) {
            if (list.hasOwnProperty(i)) {
                result = method.apply(null, [ list[i], i, list ].concat(extraArgs));
                if (result !== undefined) {
                    return result;
                }
            }
        }
    }
    return list;
}

exports.each = each;

/**
 * **filter** built on the same concepts as each. So that you can pass additional arguments.
 * @param list
 * @param method
 * @param data
 * @returns {Array}
 */
function filter(list, method, data) {
    var i = 0, len, result = [], extraArgs, response;
    if (arguments.length > 2) {
        extraArgs = exports.util.array.toArray(arguments);
        extraArgs.splice(0, 2);
    }
    if (list && list.length) {
        len = list.length;
        while (i < len) {
            response = method.apply(null, [ list[i], i, list ].concat(extraArgs));
            if (response) {
                result.push(list[i]);
            }
            i += 1;
        }
    } else {
        for (i in list) {
            if (list.hasOwnProperty(i)) {
                response = method.apply(null, [ list[i], i, list ].concat(extraArgs));
                if (response) {
                    result.push(list[i]);
                }
            }
        }
    }
    return result;
}

exports.filter = filter;

/**
 * ####file.getContents####
 * Get the contents of a file. If an asyncCallback is provided it will be async. Otherwise it is synchronous.
 * @param {String} url
 * @param {Function=} asyncCallback
 * @param {String=} method
 */
exports.file = exports.file || {};

exports.file.getContents = function(url, asyncCallback, method, win) {
    var xmlhttp;
    win = win || window;
    if (win.XMLHttpRequest) {
        // code for IE7+, Firefox, Chrome, Opera, Safari
        xmlhttp = new XMLHttpRequest();
    }
    xmlhttp.open(method || "GET", url, !!asyncCallback);
    xmlhttp.send();
    if (!asyncCallback) {
        return xmlhttp.responseText;
    } else {
        //TODO: complete async.
        throw new Error("Incomplete");
    }
};

/**
 * **toArray** Convert arguments or objects to an array.
 * @param {Object|Arguments} obj
 * @returns {Array}
 */
function toArray(obj) {
    var result = [], i = 0, len = obj.length;
    if (obj.length !== undefined) {
        while (i < len) {
            result.push(obj[i]);
            i += 1;
        }
    } else {
        for (i in obj) {
            if (obj.hasOwnProperty(i)) {
                result.push(obj[i]);
            }
        }
    }
    return result;
}

/**
 * **sort** apply array sort with a custom compare function.
 * > The ECMAScript standard does not guarantee Array.sort is a stable sort.
 * > According to the ECMA spec, when two objects are determined to be equal in a custom sort,
 * > JavaScript is not required to leave those two objects in the same order.
 * > replace sort from ECMAScript with this bubble sort to make it accurate
 */
function sort(ary, compareFn) {
    var c, len, v, rlen, holder;
    if (!compareFn) {
        // default compare function.
        compareFn = function(a, b) {
            return a > b ? 1 : a < b ? -1 : 0;
        };
    }
    len = ary.length;
    rlen = len - 1;
    for (c = 0; c < len; c += 1) {
        for (v = 0; v < rlen; v += 1) {
            if (compareFn(ary[v], ary[v + 1]) > 0) {
                holder = ary[v + 1];
                ary[v + 1] = ary[v];
                ary[v] = holder;
            }
        }
    }
    return ary;
}

exports.util = exports.util || {};

exports.util.array = exports.util.array || {};

exports.util.array.toArray = toArray;

exports.util.array.sort = sort;

/*global exports */
exports.selector = function() {
    //TODO: Needs unit tests. This needs jquery to run unit tests for selections since it uses filters.
    var omitAttrs, uniqueAttrs, classFilters, classFiltersFctn, api;
    function query(selectorStr, el) {
        el = el || api.config.doc.body;
        var rx = /:eq\((\d+)\)$/, match = selectorStr.match(rx), result, count;
        // filter out eq.
        if (match && match.length) {
            selectorStr = selectorStr.replace(rx, "");
            count = match[1];
        }
        result = el.querySelectorAll(selectorStr);
        if (result && count !== undefined) {
            return result[count];
        }
        return result;
    }
    /**
     * ##getCleanSelector##
     * Generate a clean readable selector. This is accurate, but NOT performant.
     * The reason this one takes longer is because it takes many queries as it goes to determine when it has
     * built a query that is unique enough trying to do this as early on as possible to keep it short.
     * @param {DOMElement} el
     * @param {Array} ignoreClasses - an array of strings or regExp
     */
    function getCleanSelector(el, ignoreClass) {
        if (validateEl(el)) {
            var ignore = buildIgnoreFunction(ignoreClass), matches, index, str, maxParent = api.config.doc.body, selector = getSelectorData(el, maxParent, ignore, null, true);
            while (selector.count > selector.totalCount) {
                selector = selector.parent;
            }
            selector = selector.parent || selector;
            // once we find the top level. we need to move up one.
            str = selector.str || selectorToString(selector);
            if (selector.str) {
                var child = selector.child;
                while (child) {
                    str += " " + child.str;
                    child = child.child;
                }
            }
            if (selector.count > 1 || selector.child && selector.child.count) {
                matches = exports.util.array.toArray(query(str, maxParent));
                index = matches.indexOf(el);
                str += ":eq(" + index + ")";
            }
            str += getVisible();
            return str;
        }
        return "";
    }
    /**
     * ##<a name="quickSelector">quickSelector</a>##
     * build the string selector for the element. This is more performant, but hardly readable.
     * It is faster because it doesn't check to determine how unique it is. It just keeps building until
     * it gets to the maxParent.
     * @param {DomElement} element
     * @param {DomElement=} maxParent
     * @param {Function=} ignoreClass
     * @returns {string}
     */
    function quickSelector(element, maxParent, ignoreClass) {
        if (validateEl(element)) {
            var ignore = buildIgnoreFunction(ignoreClass), selector = getSelectorData(element, maxParent, ignore);
            return selectorToString(selector) + getVisible();
        }
        return "";
    }
    function validateEl(el) {
        if (!el) {
            return "";
        }
        if (el && el.length) {
            throw new Error("selector can only build a selection to a single DOMElement. A list was passed.");
        }
        return true;
    }
    function getVisible() {
        return api.config.addVisible ? ":visible" : "";
    }
    function matchesClass(item, matcher) {
        if (typeof matcher === "string" && matcher === item) {
            return true;
        }
        if (typeof matcher === "object" && item.match(matcher)) {
            return true;
        }
        return false;
    }
    function getSelectorData(element, maxParent, ignoreClass, child, smartSelector) {
        var result;
        if (!element) {
            return "";
        }
        maxParent = maxParent || api.config.doc;
        result = {
            element: element,
            ignoreClass: ignoreClass,
            maxParent: maxParent,
            classes: getClasses(element, ignoreClass),
            attributes: getAttributes(element, child),
            type: element.nodeName && element.nodeName.toLowerCase() || "",
            child: child
        };
        if (!result.attributes.$unique || child) {
            if (smartSelector) {
                result.str = selectorToString(result, 0, null, true);
                result.count = maxParent.querySelectorAll(result.str).length;
                if (result.count > 1) {
                    result.parent = getParentSelector(element, maxParent, ignoreClass, result, smartSelector);
                }
            } else {
                // dumb selector. keeps building it. Not checking to see if it is unique.
                result.parent = getParentSelector(element, maxParent, ignoreClass, result, smartSelector);
            }
        }
        return result;
    }
    function filterNumbers(item) {
        return typeof item !== "number";
    }
    function buildIgnoreFunction(ignoreClasses) {
        ignoreClasses = ignoreClasses || [];
        if (typeof ignoreClasses === "function") {
            return ignoreClasses;
        }
        return function(cls) {
            if (ignoreClasses instanceof Array) {
                var i = 0, iLen = ignoreClasses.length;
                while (i < iLen) {
                    if (matchesClass(cls, ignoreClasses[i])) {
                        return false;
                    }
                    i += 1;
                }
            } else if (matchesClass(cls, ignoreClasses)) {
                return false;
            }
            return true;
        };
    }
    function getClasses(element, ignoreClass) {
        var classes = ux.filter(element.classList, filterNumbers);
        classes = ux.filter(classes, classFiltersFctn);
        return ux.filter(classes, ignoreClass);
    }
    function getAttributes(element, child) {
        var i = 0, len = element.attributes ? element.attributes.length : 0, attr, attributes = [], uniqueAttr = getUniqueAttribute(element.attributes);
        // first see if it has a unique attribute.
        if (uniqueAttr) {
            if (uniqueAttr.name === "id" && api.config.allowId) {
                attributes.push("#" + uniqueAttr.value);
            } else if (uniqueAttr.name !== "id") {
                attributes.push(createAttrStr(uniqueAttr));
            }
            if (attributes.length) {
                attributes.$unique = true;
                return attributes;
            }
        }
        if (api.config.allowAttributes) {
            while (i < len) {
                attr = element.attributes[i];
                if (!omitAttrs[attr.name] && !uniqueAttrs[attr.name]) {
                    attributes.push(createAttrStr(attr));
                }
                i += 1;
            }
        }
        return attributes;
    }
    function createAttrStr(attr) {
        return "[" + attr.name + "='" + escapeQuotes(attr.value) + "']";
    }
    function getUniqueAttribute(attributes) {
        var attr, i = 0, len = attributes ? attributes.length : 0;
        while (i < len) {
            attr = attributes[i];
            if (uniqueAttrs[attr.name]) {
                return attr;
            }
            i += 1;
        }
        return null;
    }
    // May want to use this later. Do not delete.
    function camelCase(name) {
        var ary, i = 1, len;
        if (name.indexOf("-")) {
            ary = name.split("-");
            len = ary.length;
            while (i < len) {
                ary[i] = ary[i].charAt(0).toUpperCase() + ary[i].substr(1);
                i += 1;
            }
            name = ary.join("");
        }
        return name;
    }
    function escapeQuotes(str) {
        return str.replace(/"/g, "&quot;").replace(/'/g, "&apos;");
    }
    function selectorToString(selector, depth, overrideMaxParent, skipCount) {
        var matches, str, parent;
        depth = depth || 0;
        str = selector && !selector.attributes.$unique ? selectorToString(selector.parent, depth + 1) : "";
        if (selector) {
            str += (str.length ? " " : "") + getSelectorString(selector);
        }
        if (!depth && !skipCount) {
            parent = overrideMaxParent || selector.maxParent;
            matches = parent.querySelectorAll && parent.querySelectorAll(str) || [];
            if (matches.length > 1) {
                str += ":eq(" + getIndexOfTarget(matches, selector.element) + ")";
            }
        }
        return str;
    }
    function getSelectorString(selector) {
        if (selector.attributes.$unique) {
            return selector.attributes[0];
        }
        return selector.type + selector.attributes.join("") + (selector.classes.length ? "." + selector.classes.join(".") : "");
    }
    function getParentSelector(element, maxParent, ignoreClass, child, detailed) {
        var parent = element.parentNode;
        if (parent && parent !== maxParent) {
            return getSelectorData(element.parentNode, maxParent, ignoreClass, child, detailed);
        }
        return null;
    }
    function getIndexOfTarget(list, element) {
        var i, iLen = list.length;
        for (i = 0; i < iLen; i += 1) {
            if (element === list[i]) {
                return i;
            }
        }
        return -1;
    }
    function getList(obj) {
        var ary = [], i;
        for (i in obj) {
            if (obj.hasOwnProperty(i)) {
                ary.push(obj[i]);
            }
        }
        return ary;
    }
    api = {
        config: {
            doc: window.document,
            allowId: true,
            allowAttributes: true,
            addVisible: false
        },
        query: query,
        // OMIT
        addOmitAttrs: function(name) {
            exports.each(arguments, function(name) {
                omitAttrs[name] = true;
            });
            return this;
        },
        removeOmitAttrs: function(name) {
            exports.each(arguments, function(name) {
                delete omitAttrs[name];
            });
            return this;
        },
        getOmitAttrs: function() {
            return getList(omitAttrs);
        },
        resetOmitAttrs: function() {
            omitAttrs = {
                "class": true,
                style: true
            };
        },
        // UNIQUE
        addUniqueAttrs: function(name) {
            exports.each(arguments, function(name) {
                uniqueAttrs[name] = true;
            });
            return this;
        },
        removeUniqueAttrs: function(name) {
            exports.each(arguments, function(name) {
                delete uniqueAttrs[name];
            });
            return this;
        },
        getUniqueAttrs: function() {
            return getList(uniqueAttrs);
        },
        resetUniqueAttrs: function() {
            uniqueAttrs = {
                id: true,
                uid: true
            };
        },
        // CLASS OMIT OMIT FILTERS
        addClassOmitFilters: function() {
            exports.each(arguments, function(filter) {
                classFilters.push(filter);
            });
            classFiltersFctn = buildIgnoreFunction(classFilters);
            return this;
        },
        removeClassOmitFilters: function() {
            exports.each(arguments, function(filter) {
                var index = classFilters.indexOf(filter);
                if (index !== -1) {
                    classFilters.splice(index, 1);
                }
            });
            classFiltersFctn = buildIgnoreFunction(classFilters);
            return this;
        },
        getClassOmitFilters: function() {
            return classFilters.slice(0);
        },
        resetClassOmitFilters: function() {
            classFilters = [];
            classFiltersFctn = buildIgnoreFunction(classFilters);
        },
        get: getCleanSelector,
        getCleanSelector: getCleanSelector,
        quickSelector: quickSelector,
        reset: function() {
            api.resetOmitAttrs();
            api.resetUniqueAttrs();
            api.resetClassOmitFilters();
        }
    };
    api.reset();
    return api;
}();
}(this.ux = this.ux || {}, function() {return this;}()));
