/*global angular, runner*/
(function () {
    'use strict';

    runner.elementMethods.push(function (target) {
        target.sendTap = function (focus, namespace) {
            namespace = namespace ? '.' + namespace : '';
            var step = target.trigger('touchstart' + namespace);
            if (focus) {
                step.focus();
            }
            return step.trigger('touchend' + namespace).trigger('click' + namespace);
        };
    });

}());