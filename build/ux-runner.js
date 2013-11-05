/*
* uxRunner v.0.1.0
* (c) 2013, WebUX
* License: MIT.
*/
(function(exports, global){
var module = {}, runner, locals = {}, events = {
    START: "runner:start",
    STEP_START: "runner:stepStart",
    STEP_UPDATE: "runner:stepUpdate",
    STEP_END: "runner:stepEnd",
    STEP_PAUSE: "runner:stepPause",
    DONE: "runner:done"
}, options = {
    async: true,
    interval: 100,
    defaultTimeout: 1e3,
    timeouts: {
        mini: 100,
        "short": 1e3,
        medium: 1e4,
        "long": 3e4,
        forever: 6e4
    }
}, states = {
    DORMANT: "dormant",
    RUNNING: "running",
    COMPLETE: "complete"
}, types = {
    ROOT: "root",
    SCENARIO: "scenario",
    STEP: "step",
    SUB_STEP: "subStep"
}, injector, all, activeStep, intv, scenarios = [], debug = false, walkStep = null, jqMethods = [ "focus", "blur", "click", "mousedown", "mouseover", "mouseup", "select", "touchstart", "touchend", "trigger" ], jqAccessors = [ "val", "text", "html", "scrollTop" ];

if (!Math.uuid) {
    var c = 0;
    Math.uuid = function uuid() {
        c += 1;
        var str = c.toString(36).toUpperCase();
        while (str.length < 6) {
            str = "0" + str;
        }
        return str;
    };
}

function log(message) {
    if (debug) {
        console.log.apply(console, arguments);
    }
}

function dispatch(event) {
    if (runner.dispatcher) {
        runner.dispatcher.dispatch.apply(runner.dispatcher, arguments);
    } else {
        options.rootElement = options.rootElement || $("body");
        options.rootElement.trigger.apply(options.rootElement, arguments);
    }
}

function init() {
    injector = runner.getInjector ? runner.getInjector() : {
        invoke: invoke
    };
    runner.locals.injector = injector;
    runner.walking = false;
    runner.exit = false;
}

function setup() {
    var config = {
        name: "all",
        type: types.ROOT,
        label: "E2E Tests",
        parent: {
            type: types.ROOT,
            depth: 0,
            next: function() {
                log("All Complete");
                dispatch(events.DONE);
            }
        }
    };
    runner.steps = all = step(config);
    config.depth = 0;
    activeStep = all;
}

function charPack(char, len) {
    var str = "";
    while (str.length < len) {
        str += char;
    }
    return str;
}

function each(list, method, data) {
    var i = 0, len, result;
    if (list.length) {
        len = list.length;
        while (i < len) {
            result = method(list[i], i, list, data);
            if (result !== undefined) {
                return result;
            }
            i += 1;
        }
    } else {
        for (i in list) {
            if (list.hasOwnProperty(i)) {
                result = method(list[i], i, list, data);
                if (result !== undefined) {
                    return result;
                }
            }
        }
    }
    return list;
}

function step(exports) {
    var steps = [], index = 0, childStep, exit = false, exitMessage = "", targetParentTypes = [ types.SCENARIO, types.ROOT ];
    if (exports.type === types.ROOT) {
        targetParentTypes = [ types.ROOT ];
    } else if (exports.type === types.SUB_STEP) {
        targetParentTypes = [ types.STEP, types.SUB_STEP ];
    }
    while (exports.parent && targetParentTypes.indexOf(exports.parent.type) === -1) {
        exports.parent = exports.parent.parent;
    }
    if (!exports.parent && exports.type !== types.ROOT) {
        runner.exit = exports.exit = exit = true;
        exitMessage = "Unable find step parent. Most likely caused by improper organization. Such as adding a find inside a scenario instead of inside a step.";
    }
    function add(step) {
        steps.push(step);
    }
    function run() {
        exports.state = states.RUNNING;
        activeStep = exports;
        exports.startTime = Date.now();
        if (exports.parent) {
            exports.exit = exit = exports.parent.exit;
            exitMessage = "(EXIT: exit inherited.)";
        }
        if (exports.parent && exports.parent.element) {
            exports.element = exports.parent.element;
        }
        dispatch(events.STEP_START, exports);
        log("%sRUN:%s: %s", charPack("	", exports.depth), exports.type, exports.label);
        finalize();
        return exports;
    }
    function next() {
        if (runner.walking) {
            dispatch(events.STEP_UPDATE, exports);
        }
        childStep = steps[index];
        if (childStep) {
            index += 1;
            childStep.run();
            return;
        }
        complete();
    }
    function complete() {
        if (exports.state !== states.COMPLETE) {
            exports.state = states.COMPLETE;
            log("%sCOMPLETE:%s: %s", charPack("	", exports.depth), exports.type, exports.label);
            dispatch(events.STEP_END, exports);
        }
        exports.parent.next();
    }
    function exec(method) {
        return injector.invoke(method, exports, locals);
    }
    function validate(method) {
        if (method) {
            return !!exec(method);
        }
        return true;
    }
    function finalize() {
        if (exit) {
            exports.label += "(EXIT: " + exitMessage + ")";
            exports.pass = false;
            exports.repeat = 0;
        } else {
            exec(exports.method);
            exports.pass = validate(exports.validate);
        }
        exports.count += 1;
        exports.timedOut = !hasTimeLeft(exports);
        if (exports.repeat > exports.count && !exports.pass && !exports.timedOut) {
            log("%s%s: checking %s", charPack("	", exports.depth), exports.type, exports.label);
            clearTimeout(intv);
            dispatch(events.STEP_UPDATE, exports);
            intv = options.async ? setTimeout(finalize, options.interval) : finalize();
        } else {
            log('%s%s: %s, value:"%s" (%s)', charPack("	", exports.depth), exports.type, exports.label, exports.value, exports.pass ? "pass" : "fail");
            walkStep = exports;
            if (runner.pauseOnFail && !exports.pass) {
                pause();
                dispatch(events.STEP_UPDATE, exports);
            }
            if (runner.walking) {
                dispatch(events.STEP_PAUSE, exports);
                return;
            } else {
                clearTimeout(intv);
                dispatch(events.STEP_UPDATE, exports);
                intv = options.async ? setTimeout(next, options.interval) : next();
            }
        }
    }
    function custom(label, method, validate, timeout) {
        method = method || function() {};
        var s = {
            type: types.SUB_STEP,
            parentType: types.SUB_STEP,
            repeat: 1,
            label: label || "CUSTOM",
            value: undefined,
            method: function() {
                s.element = exports.element;
                s.value = s.exec(method);
                return s;
            },
            validate: function() {
                if (typeof validate === "boolean") {
                    return validate;
                }
                return validate ? s.exec(validate) : true;
            },
            timeout: timeout || options.interval
        };
        createElementStep(s, s.parent);
        return s;
    }
    function until(label, validate, timeout) {
        var s = {
            type: types.SUB_STEP,
            parentType: types.SUB_STEP,
            repeat: 1,
            label: label || "UNTIL",
            value: undefined,
            method: function() {
                s.element = exports.element;
                return s;
            },
            validate: function() {
                var result = validate ? s.exec(validate) : true;
                if (hasTimeLeft(s) && !result) {
                    s.repeat += 1;
                }
                return result;
            },
            timeout: timeout || options.interval
        };
        createElementStep(s, s.parent);
        return s;
    }
    function done() {
        exports.isDone = true;
        exports.repeat = 0;
    }
    exports.id = Math.uuid();
    exports.state = states.DORMANT;
    exports.type = exports.type || types.SUB_STEP;
    exports.label = exports.label || "no label";
    exports.timeout = exports.timeout || options.defaultTimeout;
    exports.method = exports.method || function() {};
    exports.validate = exports.validate || function() {
        return true;
    };
    exports.repeat = exports.repeat || 1;
    exports.count = 0;
    exports.add = add;
    exports.run = run;
    exports.next = next;
    exports.custom = custom;
    exports.until = until;
    exports.done = done;
    exports.exec = exec;
    exports.steps = steps;
    exports.depth = exports.parent ? exports.parent.depth + 1 : 0;
    return exports;
}

step.DORMANT = 0;

step.RUNNING = 1;

step.COMPLETE = 2;

function create(params) {
    params.type = params.type || types.SUB_STEP;
    params.parent = params.parent || activeStep;
    activeStep.add(step(params));
    return params;
}

function createElementStep(params, parent) {
    params.type = types.SUB_STEP;
    params.parent = parent || activeStep;
    create(params);
    addJQ(params);
    return params;
}

function describe(label, method) {
    create({
        type: types.SCENARIO,
        parentType: types.SCENARIO,
        label: label,
        method: method
    });
}

function it(label, method, validate, timeout) {
    create({
        type: types.STEP,
        parentType: types.SCENARIO,
        label: label,
        method: method,
        validate: validate,
        timeout: timeout
    });
}

function wait(timeout) {
    timeout = timeout || options.interval;
    create({
        type: types.SUB_STEP,
        parentType: types.STEP,
        label: "wait " + timeout + "ms",
        method: null,
        repeat: 1e4,
        validate: function() {
            return !hasTimeLeft(this, true);
        },
        timeout: timeout
    });
}

function waitFor(label, fn, timeout) {
    create({
        type: types.SUB_STEP,
        parentType: types.STEP,
        label: "wait for " + label,
        method: null,
        repeat: 1e4,
        validate: fn,
        timeout: timeout
    });
}

function waitForNgEvent(event, timeout) {
    var s = {
        type: types.SUB_STEP,
        parentType: types.STEP,
        label: 'wait for "' + event + '" event.',
        repeat: 1e4,
        scope: null,
        method: function() {
            if (!s.scope) {
                s.element = s.parent.element || options.rootElement;
                s.scope = s.element.scope();
                s.scope.$on(event, function() {
                    s.ngEvent = true;
                });
            }
        },
        validate: function() {
            return !!s.ngEvent;
        },
        timeout: timeout || options.timeouts.short
    };
    create(s);
}

function hasTimeLeft(s, stepBefore) {
    return s.timeout + s.startTime - (stepBefore ? options.interval : 0) > Date.now();
}

function chainMethodPreExec(step, el, name, args) {
    if (name === "trigger") {
        step.label = 'trigger "' + args[0].toUpperCase() + '"';
    }
}

function jqMethod(target, name, validate) {
    return function() {
        var args = arguments, s = {
            label: name.toUpperCase(),
            value: undefined,
            timeout: options.interval,
            method: function() {
                var el = s.element;
                if (el) {
                    if (!el[name]) {
                        throw new Error('Method "' + name + '" is not supported yet.');
                    }
                    chainMethodPreExec(s, el, name, args);
                    el[name].apply(el, args);
                    if (validate) {
                        s.value = el[name].apply(el, []);
                    }
                }
                return s;
            },
            validate: function() {
                if (!s.element || !s.element.length) {
                    return false;
                }
                if (validate && args.length) {
                    return s.value === args[0];
                }
                return true;
            }
        };
        createElementStep(s, target);
        return s;
    };
}

function addJQ(target) {
    createJqMethods(target);
    createJqAccessors(target);
    each(runner.elementMethods, addElementMethods, target);
}

function createJqMethods(target) {
    var i = 0, len = jqMethods.length;
    while (i < len) {
        target[jqMethods[i]] = jqMethod(target, jqMethods[i]);
        i += 1;
    }
}

function createJqAccessors(target) {
    var i = 0, len = jqMethods.length;
    while (i < len) {
        target[jqAccessors[i]] = jqMethod(target, jqAccessors[i], true);
        i += 1;
    }
}

function addElementMethods(stepData, index, list, target) {
    if (typeof stepData === "function") {
        stepData(target);
    } else {
        target[stepData.name] = stepData.method(target);
    }
}

function find(selector, timeout, label) {
    var selectorLabel = typeof selector === "function" ? "(custom method)" : selector;
    var s = {
        type: types.SUB_STEP,
        parentType: types.STEP,
        repeat: 1e4,
        label: label || 'find: "' + selectorLabel + '"',
        value: undefined,
        method: function() {
            s.value = s.element = options.rootElement.find(typeof selector === "function" ? s.exec(selector) : selector);
            return s;
        },
        validate: function() {
            var result = !!s.value.length;
            s.label = result ? s.label : "could not find" + ' "' + selectorLabel + '"';
            return result;
        },
        timeout: timeout
    };
    createElementStep(s);
    return s;
}

function invoke(fn, scope, locals) {
    var injectables = getInjectables(fn, locals);
    return fn.apply(scope, injectables.args);
}

function getInjectables(fn, locals) {
    var str = fn.toString(), result = {
        map: {},
        args: [],
        locals: locals
    }, list, params = str.match(/\(.*\)/)[0].match(/([\$\w])+/gm);
    if (params && params.length) {
        each(params, addInjection, result);
    }
    return result;
}

function addInjection(name, index, list, data) {
    data.map[name] = data.locals[name] || window[name];
    data.args.push(data.map[name]);
}

function addScenario(name, scenario) {
    scenarios.push({
        name: name,
        scenario: scenario
    });
    return scenario;
}

function clearScenarios() {
    scenarios.length = 0;
    runner.scenarios = {};
}

function applyConfig(config) {
    runner.options = angular.extend(options, config);
}

function getScenarioNames() {
    var ary = [];
    each(scenarios, function(sc) {
        ary.push(sc.name);
    });
    return ary;
}

function getScenario(name) {
    name = name.toLowerCase();
    return each(scenarios, function(sc) {
        if (sc.name.toLowerCase() === name) {
            return sc;
        }
    });
}

function runScenario(scenario) {
    scenario = typeof scenario !== "string" ? scenario : getScenario(scenario);
    create({
        type: types.SCENARIO,
        parentType: types.ROOT,
        label: "SCENARIO: " + scenario.name,
        method: scenario.scenario
    });
}

function runAll() {
    var i = 0, len = scenarios.length;
    while (i < len) {
        runScenario(scenarios[i]);
        i += 1;
    }
}

function run(scenarioName) {
    init();
    dispatch(events.START);
    log("run");
    setup();
    if (scenarioName) {
        each(arguments, runScenario);
    } else {
        runAll();
    }
    activeStep.run();
}

function walk(scenarioName) {
    run.apply(runner, arguments);
    pause();
}

function forceStep() {
    walkStep.next();
}

function pause() {
    runner.walking = true;
}

function resume() {
    runner.walking = false;
    forceStep();
}

function repeat(method, times) {
    var i = 0, args = exports.util.array.toArray(arguments);
    args.shift();
    args.shift();
    while (i < times) {
        method.apply({}, [ i ].concat(args));
        i += 1;
    }
}

runner = {
    getInjector: null,
    config: applyConfig,
    exit: false,
    run: run,
    walk: walk,
    walking: false,
    pauseOnFail: true,
    next: forceStep,
    pause: pause,
    resume: resume,
    addScenario: addScenario,
    clearScenarios: clearScenarios,
    getScenarioNames: getScenarioNames,
    types: types,
    events: events,
    states: states,
    createStep: create,
    createElementStep: createElementStep,
    args: [],
    elementMethods: [],
    scenarios: {},
    locals: locals,
    dispatcher: null,
    each: each,
    repeat: repeat,
    steps: null
};

locals.scenario = describe;

locals.step = it;

locals.find = find;

locals.options = options;

locals.wait = wait;

locals.waitFor = waitFor;

locals.waitForNgEvent = waitForNgEvent;

exports.runner = runner;

$("body").ready(function() {
    if (runner.options && runner.options.autoStart) {
        if (typeof runner.options.autoStart === "function") {
            runner.options.autoStart.apply(runner, []);
        } else {
            setTimeout(runner.run, 1e3);
        }
    }
});

function renderer() {
    var exports = {}, overlay, content, isMouseDown = false, highlighter, lastStep;
    function killEvent(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
    }
    function start(event) {
        close();
        overlay = $('<div class="runner-overlay"><div class="runner-title">Type "runner.stop()" in the console to close the tests. <a href="javascript:void(0)" class="runner-close">X</a></div><div class="runner-content"></div></div>');
        content = overlay.find(".runner-content");
        overlay.click(killEvent);
        overlay.mousedown(function() {
            isMouseDown = true;
        });
        overlay.mouseup(function() {
            isMouseDown = false;
        });
        $(document).blur(function(event) {
            if (isMouseDown) {
                killEvent(event);
            }
        });
        highlighter = $('<div class="runner-highlighter"></div>');
        $("body").append(overlay);
        $("body").append(highlighter);
        addBinds();
    }
    function updateHighlight(el) {
        if (el && el.length) {
            var pos = el.offset();
            highlighter.removeClass("runner-highlighter-empty");
            highlighter.css({
                top: pos.top,
                left: pos.left,
                width: el.width(),
                height: el.height()
            });
        } else {
            highlighter.addClass("runner-highlighter-empty");
        }
    }
    function isChainStep(step) {
        return step.type === ux.runner.types.SUB_STEP;
    }
    function writeLabel(step, paused) {
        var isChain = isChainStep(step.parent) && isChainStep(step), el = $("#" + step.id);
        el.html((isChain && " - " || "") + '<span class="runner-step-label">' + step.label + "</span>" + (step.count > 1 ? ' <span class="runner-step-count" title="repeat count">' + step.count + "</span>" : "") + (step.timedOut ? ' <span class="runner-timed-out" title="timeout">timeout</span>' : "") + (paused ? ' <span class="runner-step-paused" title="paused">paused' + (runner.pauseOnFail ? " on fail" : "") + "</span>" : ""));
    }
    function stepStart(event, step) {
        updateHighlight(step.element);
        if (!$("#" + step.id).length) {
            var parentIsChain = isChainStep(step.parent), indent = parentIsChain ? 4 : step.depth * 20, isChain = isChainStep(step);
            if (isChain && lastStep && lastStep.depth >= step.depth) {
                content.append("<br/>");
            }
            content.append('<div id="' + step.id + '" class="runner-pending runner-' + step.type + (isChain ? "-chain" : "") + '" style="text-indent: ' + indent + 'px;"></div>');
            writeLabel(step);
        }
    }
    function stepPause(event, step) {
        writeLabel(step, true);
        updateHighlight(step.element);
    }
    function stepUpdate(event, step) {
        if (step.count > 1) {
            writeLabel(step);
        }
        updateHighlight(step.element);
    }
    function stepEnd(event, step) {
        var el = $("#" + step.id);
        el.addClass("runner-" + (step.pass ? "pass" : "fail"));
        writeLabel(step);
        updateHighlight(step.element);
        scrollToBottom();
        lastStep = step;
    }
    function scrollToBottom() {
        overlay.scrollTop(content.height());
    }
    function done() {
        scrollToBottom();
    }
    function close() {
        if (overlay) {
            ux.runner.pause();
            overlay.remove();
            highlighter.remove();
            content = null;
            overlay = null;
            highlighter = null;
            lastStep = null;
            removeBinds();
        }
    }
    function addBinds() {
        var body = $("body");
        body.bind(runner.events.STEP_START, stepStart);
        body.bind(runner.events.STEP_UPDATE, stepUpdate);
        body.bind(runner.events.STEP_END, stepEnd);
        body.bind(runner.events.STEP_PAUSE, stepPause);
        body.bind(runner.events.DONE, done);
        $(".runner-close").click(runner.stop);
    }
    function removeBinds() {
        var body = $("body");
        body.unbind(runner.events.STEP_START, stepStart);
        body.unbind(runner.events.STEP_UPDATE, stepUpdate);
        body.unbind(runner.events.STEP_END, stepEnd);
        body.unbind(runner.events.STEP_PAUSE, stepPause);
        body.unbind(runner.events.DONE, done);
        $(".runner-close").unbind("click", runner.stop);
    }
    exports.start = start;
    exports.stepStart = stepStart;
    exports.stepEnd = stepEnd;
    exports.done = done;
    runner.stop = close;
    function waitForScope() {
        var body = $("body");
        body.ready(function() {
            var body = $("body");
            body.bind(runner.events.START, start);
        });
    }
    waitForScope();
    return exports;
}

renderer();

runner.elementMethods.push(function(target) {
    target.scrollUp = function(amount) {
        return target.custom("scrollUp", function() {
            return target.element.scrollTop(target.element.scrollTop() - amount);
        });
    };
    target.scrollDown = function(amount) {
        return target.custom("scrollDown", function() {
            return target.element.scrollTop(target.element.scrollTop() + amount);
        });
    };
});

function Keyboard(el, lock) {
    this.el = el;
    if (el.scope) {
        this.scope = el.scope();
    }
    var editableTypes = "text password number email url search tel";
    this.isEditable = /textarea|select/i.test(el[0].nodeName) || el[0].type && editableTypes.indexOf(el[0].type.toLowerCase()) > -1;
    if (this.isEditable) {
        this.selStart = el.getSelectionStart() || 0;
        this.selEnd = el.getSelectionEnd() || el.val().length;
        el.setSelection(this.selStart, this.selEnd);
        this.cursorPosition = this.selEnd;
    }
    this.capsLocked = false;
    if (lock) {
        this.lock();
    }
}

Keyboard.exec = function(el, actions, options) {
    var kbd = new Keyboard(el), acl = actions.match(/"[^"]+"|\w+/gim), action, val, i = 0, len = acl.length;
    kbd.lock();
    while (i < len) {
        val = acl[i];
        action = val.match(/[^"]+/gim)[0];
        if (action === "delete") {
            action = "del";
        }
        if (typeof kbd[action] === "function") {
            kbd[action]();
        } else {
            kbd.type(action);
        }
        kbd.release();
        i += 1;
    }
};

var proto = Keyboard.prototype;

proto.checkShiftKey = function(letter) {
    var alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+{}|:"<>?~;', testLetter = letter.toUpperCase();
    if (testLetter === letter) {
        return true;
    }
    return false;
};

proto.key = {
    backspace: 8,
    tab: 9,
    enter: 13,
    shift: 16,
    ctrl: 17,
    alt: 18,
    pause: 19,
    capslock: 20,
    esc: 27,
    space: 32,
    pageup: 33,
    pagedown: 34,
    end: 35,
    home: 36,
    left: 37,
    up: 38,
    right: 39,
    down: 40,
    insert: 45,
    "delete": 46,
    "0": 48,
    "1": 49,
    "2": 50,
    "3": 51,
    "4": 52,
    "5": 53,
    "6": 54,
    "7": 55,
    "8": 56,
    "9": 57,
    a: 65,
    b: 66,
    c: 67,
    d: 68,
    e: 69,
    f: 70,
    g: 71,
    h: 72,
    i: 73,
    j: 74,
    k: 75,
    l: 76,
    m: 77,
    n: 78,
    o: 79,
    p: 80,
    q: 81,
    r: 82,
    s: 83,
    t: 84,
    u: 85,
    v: 86,
    w: 87,
    x: 88,
    y: 89,
    z: 90,
    numpad0: 96,
    numpad1: 97,
    numpad2: 98,
    numpad3: 99,
    numpad4: 100,
    numpad5: 101,
    numpad6: 102,
    numpad7: 103,
    numpad8: 104,
    numpad9: 105,
    "*": 106,
    "+": 107,
    "-": 109,
    ".": 110,
    f1: 112,
    f2: 113,
    f3: 114,
    f4: 115,
    f5: 116,
    f6: 117,
    f7: 118,
    f8: 119,
    f9: 120,
    f10: 121,
    f11: 122,
    f12: 123,
    "=": 187,
    ",": 188,
    "/": 191,
    "\\": 220
};

proto.type = function(phrase, options) {
    var str, i, len;
    if (this.selStart !== this.selEnd) {
        str = this.el.val();
        str = str.substr(0, this.selStart) + str.substr(this.selEnd);
        this.el.val(str);
        this.selStart = this.selEnd = null;
    }
    phrase = phrase || "";
    i = 0;
    len = phrase.length;
    while (i < len) {
        this.punch(phrase.charAt(i), options);
        i += 1;
    }
    return this;
};

proto.punch = function(char, options) {
    var el = this.el, scope = this.scope, evt, keyCode, shiftKey, lchar = char.toLowerCase(), curPos, val, attr = this.attr("ng-model"), ngModel;
    options = options || {};
    if (this.attr("disabled") !== "disabled") {
        keyCode = this.key[lchar];
        shiftKey = this.checkShiftKey(char);
        evt = this.createEvent("keydown", {
            shiftKey: shiftKey,
            keyCode: keyCode
        });
        this.dispatchEvent(el[0], "keydown", evt);
        if (this.isEditable && char.length === 1) {
            curPos = this.cursorPosition;
            val = el.val();
            val = val.substr(0, curPos) + char + val.substr(curPos);
            if (attr && scope) {
                scope.$eval(attr + ' = "' + val + '"');
            }
            el.val(val);
            this.cursorPosition += 1;
        }
        evt = this.createEvent("keyup", {
            shiftKey: shiftKey,
            keyCode: keyCode
        });
        this.dispatchEvent(el[0], "keyup", evt);
        if (scope) {
            if (ngModel = el.data("$ngModelController")) {
                ngModel.$setViewValue(el.val());
            }
            if (!scope.$$phase) {
                scope.$apply();
            }
        }
    }
    return this;
};

proto.attr = function(attr) {
    return this.el.attr(attr) || this.el.attr("data-" + attr);
};

proto.enter = function(options) {
    this.punch("enter", options);
    return this;
};

proto.left = function(options) {
    var el = this.el;
    if (this.isEditable) {
        this.cursorPosition -= 1;
    } else {
        this.punch("left", options);
    }
    return this;
};

proto.up = function(options) {
    this.punch("up", options);
    return this;
};

proto.right = function(options) {
    var el = this.el;
    if (this.isEditable) {
        this.cursorPosition += 1;
    } else {
        this.punch("right", options);
    }
    return this;
};

proto.down = function(options) {
    this.punch("down", options);
    return this;
};

proto.home = function(options) {
    var el = this.el;
    if (this.isEditable) {
        this.cursorPosition = 0;
    } else {
        this.punch("home", options);
    }
    return this;
};

proto.end = function(options) {
    var el = this.el;
    if (this.isEditable) {
        this.cursorPosition = el.val().length;
    } else {
        this.punch("home", options);
    }
    return this;
};

proto.pageUp = function(options) {
    this.punch("pageup", options);
    return this;
};

proto.pageDown = function(options) {
    this.punch("pagedown", options);
    return this;
};

proto.del = function(options) {
    if (this.isEditable) {
        var val = this.el.val(), curPos = this.cursorPosition;
        this.el.val(val.substr(0, curPos) + val.substr(curPos + 1));
    } else {
        this.punch("delete", options);
    }
    return this;
};

proto.tab = function(options) {
    this.punch("tab", options);
    return this;
};

proto.backspace = function(options) {
    if (this.isEditable) {
        var val = this.el.val(), curPos = this.cursorPosition;
        this.el.val(val.substr(0, curPos - 1) + val.substr(curPos));
        this.cursorPosition = curPos - 1;
    } else {
        this.punch("backspace", options);
    }
    return this;
};

proto.capsLock = function() {
    this.capsLocked = !this.capsLocked;
};

proto.lock = function() {
    var doc = $(document);
    doc.bind("mousedown", this.killEvent);
    doc.bind("keydown", this.killEvent);
    doc.bind("focus", this.killEvent);
    doc.bind("blur", this.killEvent);
    return this;
};

proto.release = function() {
    var doc = $(document);
    doc.unbind("mousedown", this.killEvent);
    doc.unbind("keydown", this.killEvent);
    doc.unbind("focus", this.killEvent);
    doc.unbind("blur", this.killEvent);
    return this;
};

proto.killEvent = function(evt) {
    evt.preventDefault();
    evt.stopImmediatePropagation();
};

proto.dispatchEvent = function(el, type, evt) {
    if (el.dispatchEvent) {
        el.dispatchEvent(evt);
    } else if (el.fireEvent) {
        el.fireEvent("on" + type, evt);
    }
    return evt;
};

proto.createEvent = function(type, options) {
    var evt, e;
    e = $.extend({
        bubbles: true,
        cancelable: true,
        view: window,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        keyCode: 0,
        charCode: 0
    }, options);
    if ($.isFunction(document.createEvent)) {
        try {
            evt = document.createEvent("KeyEvents");
            evt.initKeyEvent(type, e.bubbles, e.cancelable, e.view, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.keyCode, e.charCode);
        } catch (err) {
            evt = document.createEvent("Events");
            evt.initEvent(type, e.bubbles, e.cancelable);
            $.extend(evt, {
                view: e.view,
                ctrlKey: e.ctrlKey,
                altKey: e.altKey,
                shiftKey: e.shiftKey,
                metaKey: e.metaKey,
                keyCode: e.keyCode,
                charCode: e.charCode
            });
        }
    } else if (document.createEventObject) {
        evt = document.createEventObject();
        $.extend(evt, e);
    }
    if ($.browser !== undefined && ($.browser.msie || $.browser.opera)) {
        evt.keyCode = e.charCode > 0 ? e.charCode : e.keyCode;
        evt.charCode = undefined;
    }
    return evt;
};

function sendKeys(str, assertValue) {
    var s = {
        label: "sendKeys " + str,
        method: function() {
            if (s.element.length) {
                Keyboard.exec(s.element, str);
            }
        },
        validate: function() {
            if (!s.element.length) {
                s.label = "sendKeys failed because there is no element selected.";
                return false;
            }
            if (assertValue) {
                var attr = "ng-model", attrVal = s.element.attr(attr) || s.element.attr("data-" + attr);
                if (attrVal) {
                    s.value = s.element.scope().$eval(attrVal);
                } else {
                    s.value = s.element.val();
                }
                return s.value + "" === assertValue + "";
            }
            return true;
        }
    };
    return s;
}

runner.elementMethods.push({
    name: "sendKeys",
    method: function(target) {
        return function(str, strToCompare) {
            var s = sendKeys.apply(null, arguments);
            runner.createElementStep(s, target);
            return s;
        };
    }
});

(function($) {
    "use strict";
    var $fn = jQuery.fn, input;
    $fn.getCursorPosition = function() {
        if (this.length === 0) {
            return -1;
        }
        return $(this).getSelectionStart();
    };
    $fn.setCursorPosition = function(position) {
        if (this.length === 0) {
            return this;
        }
        return $(this).setSelection(position, position);
    };
    $fn.getSelection = function() {
        if (this.length === 0) {
            return -1;
        }
        var s = $(this).getSelectionStart(), e = $(this).getSelectionEnd();
        return this[0].value.substring(s, e);
    };
    $fn.getSelectionStart = function() {
        if (this.length === 0) {
            return -1;
        }
        input = this[0];
        var pos = input.value.length, r;
        if (input.createTextRange) {
            r = document.selection.createRange().duplicate();
            r.moveEnd("character", input.value.length);
            if (r.text === "") {
                pos = input.value.length;
            }
            pos = input.value.lastIndexOf(r.text);
        } else if (input.selectionStart !== undefined) {
            pos = input.selectionStart;
        }
        return pos;
    };
    $fn.getSelectionEnd = function() {
        if (this.length === 0) {
            return -1;
        }
        input = this[0];
        var pos = input.value.length, r;
        if (input.createTextRange) {
            r = document.selection.createRange().duplicate();
            r.moveStart("character", -input.value.length);
            if (r.text === "") {
                pos = input.value.length;
            }
            pos = input.value.lastIndexOf(r.text);
        } else if (input.selectionEnd !== undefined) {
            pos = input.selectionEnd;
        }
        return pos;
    };
    $fn.setSelection = function(selectionStart, selectionEnd) {
        if (this.length === 0) {
            return this;
        }
        input = this[0];
        if (input.createTextRange) {
            var range = input.createTextRange();
            range.collapse(true);
            range.moveEnd("character", selectionEnd);
            range.moveStart("character", selectionStart);
            range.select();
        } else if (input.setSelectionRange) {
            input.focus();
            input.setSelectionRange(selectionStart, selectionEnd);
        }
        return this;
    };
})(jQuery);

runner.elementMethods.push(function(target) {
    target.sendMouse = function(focus, namespace) {
        namespace = namespace ? "." + namespace : "";
        var step = target.trigger("mousedown" + namespace);
        if (focus) {
            step.focus();
        }
        return step.trigger("mouseup" + namespace).trigger("click" + namespace);
    };
});

runner.elementMethods.push(function(target) {
    target.sendTap = function(focus, namespace) {
        namespace = namespace ? "." + namespace : "";
        var step = target.trigger("touchstart" + namespace);
        if (focus) {
            step.focus();
        }
        return step.trigger("touchend" + namespace).trigger("click" + namespace);
    };
});

runner.elementMethods.push(function(target) {
    target.toBe = function(value) {
        var s = {
            label: "toBe " + value,
            value: undefined,
            timeout: runner.locals.options.interval,
            method: function() {},
            validate: function() {
                var result = target.value === value;
                if (!result) {
                    s.label = "expected " + target.value + " to be " + value;
                } else {
                    s.label = "toBe " + value;
                }
                return result;
            }
        };
        return runner.createElementStep(s, target);
    };
});

function toArray(obj) {
    var result = [], i = 0, len = obj.length;
    while (i < len) {
        result.push(obj[i]);
        i += 1;
    }
    return result;
}

exports.util = exports.util || {};

exports.util.array = ux.util.array || {};

exports.util.array.toArray = toArray;
}(this.ux = this.ux || {}, function() {return this;}()));
