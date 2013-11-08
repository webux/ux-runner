/*global angular*/
(function () {
    'use strict';

    try {
        angular.module('ux');
    } catch (e) {
        angular.module('ux', []);
    }

    angular.module("ux").run(function () {
        runner.getInjector = function () {
            if (runner.options.window) {
                return runner.options.window.angular.element(runner.options.rootElement).injector();
            }
            return angular.element(runner.options.window.document).injector();
        };
    }).factory('runner', function () {
        if (ux.runner.options.autoStart && typeof ux.runner.options.autoStart === "boolean") {
            ux.runner.run();
        }
        return ux.runner;
    });

}());