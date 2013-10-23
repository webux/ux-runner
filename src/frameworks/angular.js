/*global angular*/
(function () {
    'use strict';

    try {
        angular.module('ux');
    } catch (e) {
        angular.module('ux', []);
    }

    angular.module("runner").run(function () {
        runner.getInjector = function () {
            return angular.element(document).injector();
        };
    });

}());