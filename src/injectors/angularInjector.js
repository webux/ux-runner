/*global angular, runner, document*/
(function () {
    'use strict';

    angular.module('runner').run(function () {
        runner.getInjector = function () {
            return angular.element(document).injector();
        };
    });

}());