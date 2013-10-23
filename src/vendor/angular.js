/*global */
(function () {
    'use strict';

    try {
        module = angular.module("runner");
    } catch (e) {
        module = angular.module("runner", []);
    }

    module.run(function () {
        window.runner = runner;
    });

}());