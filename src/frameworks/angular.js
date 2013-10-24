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
            return angular.element(document).injector();
        };
    }).factory('runner', function () {
        return ux.runner;
    });

}());