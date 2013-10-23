/*global angular, runner*/
(function () {
    'use strict';

    runner.elementMethods.push(function (target) {
        target.toBe = function (value) {
            var s = {
                label: "toBe " + value,
                value: undefined,
                timeout: runner.locals.options.interval,
                method: function () {
                },
                validate: function () {
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

}());