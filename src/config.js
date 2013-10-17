/*global */
(function () {
    'use strict';

    angular.module("runner").run(function () {
        runner.config({
            interval: 100,
            defaultTimeout: 1000,
            timeouts: {
                short: 1000,
                medium: 10000,
                long: 30000,
                forever: 60000
            }
        });
    });
}());