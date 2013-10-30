/*global $*/

// TODO: make a link from the new.html page that will auto start the tests.
// TODO: console above all dom to show current status
// TODO: state machine to run the tests
// TODO: be able to start from a debug page.
// TODO: run test from test script example. (cliff script page).

// TODO: make so that params are passed as an object. So they can easily see what each one does.
// TODO: make pull from default config. what the defaultTimeout is. set wait's in there.
// TODO: waitForEvent(eventName)
// TODO: it needs to take a params object.


var module = {},
    runner,
    locals = {},
    events = {
        START: "runner:start",
        STEP_START: "runner:stepStart",
        STEP_UPDATE: "runner:stepUpdate",
        STEP_END: "runner:stepEnd",
        STEP_PAUSE: "runner:stepPause",
        DONE: 'runner:done'
    },
    options = {
        interval: 100,
        defaultTimeout: 1000,
        timeouts: {
            mini: 100,
            short: 1000,
            medium: 10000,
            long: 30000,
            forever: 60000
        }
    },
    states = {
        DORMANT: 'dormant',
        RUNNING: 'running',
        COMPLETE: 'complete'
    },
    types = {
        ROOT: 'root',
        SCENARIO: 'scenario',
        DESCRIBE: 'describe',
        IT: 'it',
        STEP: 'step'
    },
    injector,
    all,
    activeStep,
    intv,
    scenarios = [],
    debug = false,
    walkStep = null,
//TODO: make jqMethods and jqAccessors public so that they can be added to for new jquery methods. jqMethods resturn the element, jqAccessors return the value.
    jqMethods = ['focus', 'blur', 'click', 'mousedown', 'mouseover', 'mouseup', 'select', 'touchstart', 'touchend', 'trigger'],
    jqAccessors = ['val', 'text', 'html', 'scrollTop'];

if (!Math.uuid) {
    var c = 0;
    Math.uuid = function uuid() {
        c += 1;
        var str = c.toString(36).toUpperCase();
        while (str.length < 6) {
            str = '0' + str;
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
    var body = $('body');
    body.trigger.apply(body, arguments);
}

function init() {
    injector = runner.getInjector ? runner.getInjector() : {invoke: invoke};
    runner.locals.injector = injector;
    runner.walking = false;
}

function setup() {
    var config = {name: "all", type: types.ROOT, label: "E2E Tests", parent: {
        type: types.ROOT,
        depth: 0,
        next: function () {
            log("All Complete");
            dispatch(events.DONE);
        }
    }};
    all = step(config);
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
            if (result !== undefined) { // if they return a result. Escape.
                return result;
            }
            i += 1;
        }
    } else {
        for (i in list) {
            if (list.hasOwnProperty(i)) {
                result = method(list[i], i, list, data);
                if (result !== undefined) { // if they return a result. Escape.
                    return result;
                }
            }
        }
    }
    return list;
}

// TODO: need to make a warn that will let you know on the output of condition changes.
function step(exports) {
    var steps = [],
        index = 0,
        childStep,
        targetParentTypes = [types.DESCRIBE, types.SCENARIO, types.ROOT];

    if (exports.type === types.ROOT || exports.type === types.SCENARIO) {
        targetParentTypes = [types.ROOT];
    } else if (exports.type === types.STEP) {
        targetParentTypes = [types.IT, types.STEP];
    }
    while (exports.parent && targetParentTypes.indexOf(exports.parent.type) === -1) {
        exports.parent = exports.parent.parent;
    }

    function add(step) {
        steps.push(step);
    }

    function run() {
        exports.state = states.RUNNING;
        activeStep = exports;
        exports.startTime = Date.now();
        if (exports.parent.element) {
            exports.element = exports.parent.element;
        }
        dispatch(events.STEP_START, exports);
        log("%sRUN:%s: %s", charPack("\t", exports.depth), exports.type, exports.label);
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

    function getPercent() {
        var total = 0, len = steps.length;
        each(steps, function (s) {
            if (s.state === states.COMPLETE) {
                total += 1;
            }
        });
        return len ? total / len : 1;
    }

    function complete() {
        // if they are not all complete. then we need to wait for the next complete.
        var percent = getPercent();
        if (percent === 1) { // only care if is complete.
            exports.state = states.COMPLETE;
            log("%sCOMPLETE:%s: %s", charPack("\t", exports.depth), exports.type, exports.label);
            dispatch(events.STEP_END, exports);
            exports.parent.next();
        }
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
        exec(exports.method);
        exports.pass = validate(exports.validate);
        exports.count += 1;
        exports.timedOut = !hasTimeLeft(exports);
        if (exports.repeat > exports.count && !exports.pass && !exports.timedOut) {
            log("%s%s: checking %s", charPack("\t", exports.depth), exports.type, exports.label);
            clearTimeout(intv);
            intv = setTimeout(finalize, options.interval);
        } else {
            log("%s%s: %s, value:\"%s\" (%s)", charPack("\t", exports.depth), exports.type, exports.label, exports.value, exports.pass ? "pass" : "fail");
            walkStep = exports;
            if (runner.pauseOnFail && !exports.pass) {
                // auto pause when debugging.
                pause();
            }
            if (runner.walking) {
                dispatch(events.STEP_PAUSE, exports);
                return;
            } else {
                clearTimeout(intv);
                intv = setTimeout(next, options.interval);
            }
        }
        dispatch(events.STEP_UPDATE, exports);
    }

    function custom(label, method, validate, timeout) {
        method = method || function () {};
        var s = {
            type: types.STEP,
            parentType: types.STEP,
            repeat: 1,
            label: label || 'CUSTOM',
            value: undefined,
            method: function() {
                s.element = exports.element;
                s.value = s.exec(method);
                return s;
            },
            validate: function() {
                if (typeof validate === 'boolean') {
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
            type: types.STEP,
            parentType: types.STEP,
            repeat: 1,
            label: label || 'UNTIL',
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
        exports.repeat = 0; // force exit.
    }

    exports.id = Math.uuid();
    exports.state = states.DORMANT;
    exports.type = exports.type || types.STEP;
    exports.label = exports.label || "no label";
    exports.timeout = exports.timeout || options.defaultTimeout;
    exports.method = exports.method || function () {};
    exports.validate = exports.validate || function () {
        return true;
    };
    exports.repeat = exports.repeat || 1;
    exports.count = 0;
    exports.add = add;
    exports.run = run;
    exports.next = next;
    exports.custom = custom; // use to create a custom chain method.
    exports.until = until;
    exports.done = done;
    exports.exec = exec;
    exports.depth = exports.parent.depth + 1;
    return exports;
}

step.DORMANT = 0;
step.RUNNING = 1;
step.COMPLETE = 2;

function create(params) {
    params.type = params.type || types.STEP;
    params.parent = params.parent || activeStep;
    activeStep.add(step(params));
    return params;
}

function createElementStep(params, parent) {
    params.type = types.STEP;
    params.parent = parent || activeStep;
    create(params);
    addJQ(params);
    return params;
}

function describe(label, method) {
    create({
        type: types.DESCRIBE,
        parentType: types.DESCRIBE,
        label: label,
        method: method
    });
}

function it(label, method, validate, timeout) {
    create({
        type: types.IT,
        parentType: types.DESCRIBE,
        label: label,
        method: method,
        validate: validate,
        timeout: timeout
    });
}

function wait(timeout) {
    timeout = timeout || options.interval;
    create({
        type: types.STEP,
        parentType: types.IT,
        label: "wait " + timeout + "ms",
        method: null,
        repeat: 10000,
        validate: function () {
            return !hasTimeLeft(this, true);
        },
        timeout: timeout
    });
}

function waitFor(label, fn, timeout) {
    create({
        type: types.STEP,
        parentType: types.IT,
        label: "wait for " + label,
        method: null,
        repeat: 10000,
        validate: fn,
        timeout: timeout
    });
}

function waitForNgEvent(event, timeout) {
    var s = {
        type: types.STEP,
        parentType: types.IT,
        label: "wait for \"" + event + "\" event.",
        repeat: 10000,
        scope: null,
        method: function () {
            if (!s.scope) {
                s.element = s.parent.element || $('body');
                s.scope = s.element.scope();
                s.scope.$on(event, function () {
                    s.ngEvent = true;
                });
            }
        },
        validate: function () {
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
    if (name === 'trigger') {
        step.label = 'trigger "' + args[0].toUpperCase() + '"';
    }
}

function jqMethod(target, name, validate) {
    return function () {
        var args = arguments,
            s = {
                label: name.toUpperCase(),
                value: undefined,
                timeout: options.interval,
                method: function () {
                    var el = s.element;
                    if (el) {
                        if (!el[name]) {
                            throw new Error("Method \"" + name + "\" is not supported yet.");
                        }
                        chainMethodPreExec(s, el, name, args);
                        el[name].apply(el, args);
                        if (validate) {
                            s.value = el[name].apply(el, []);
                        }
                    }
                    return s;
                },
                validate: function () {
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
    var selectorLabel = (typeof selector === "function" ? "(custom method)" : selector);
    var s = {
        type: types.STEP,
        parentType: types.IT,
        repeat: 1e4,
        label: label || 'find: "' + selectorLabel + '"',
        value: undefined,
        method: function() {
            s.value = s.element = $(typeof selector === "function" ? s.exec(selector) : selector);
            return s;
        },
        validate: function() {
            var result = !!s.value.length;
            s.label = (result ? s.label : "could not find") + ' "' + selectorLabel + '"';
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
    var str = fn.toString(), result = {map: {}, args: [], locals: locals}, list,
        params = str.match(/\(.*\)/)[0].match(/([\$\w])+/gm);
    if (params && params.length > 1) {
        each(params, addInjection, result);
    }
    return result;
}

function addInjection(name, index, list, data) {
    data.map[name] = data.locals[name] || window[name];
    data.args.push(data.map[name]);
}

function addScenario(name, scenario) {
    scenarios.push({name: name, scenario: scenario});
}

function applyConfig(config) {
    runner.options = angular.extend(options, config);
}

function getScenarioNames() {
    var ary = [];
    each(scenarios, function (sc) {
        ary.push(sc.name);
    });
    return ary;
}

function getScenario(name) {
    name = name.toLowerCase();
    return each(scenarios, function (sc) {
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
        method.apply({}, [i].concat(args));
        i += 1;
    }
}

runner = {
    getInjector: null,
    config: applyConfig,
    run: run,
    walk: walk,
    walking: false,
    pauseOnFail: true,
    next: forceStep,
    pause: pause,
    resume: resume,
    addScenario: addScenario,
    getScenarioNames: getScenarioNames,
    types: types,
    events: events,
    states: states,
    createStep: create,
    createElementStep: createElementStep,
    args: [],
    elementMethods: [],
    scenarios: {}, // external stub for constants.
    locals: locals,
    each: each,
    repeat: repeat
};
locals.scenario = describe;
locals.step = it;
locals.find = find;
locals.options = options;
locals.wait = wait;
locals.waitFor = waitFor;
locals.waitForNgEvent = waitForNgEvent;

exports.runner = runner;

$('body').ready(function () {
    if (runner.options && runner.options.autoStart) {
        if (typeof runner.options.autoStart === "function") {
            runner.options.autoStart.apply(runner, []);
        } else {
            // give it a little time before starting.
            setTimeout(runner.run, 1000);
        }
    }
});
