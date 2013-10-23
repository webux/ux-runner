runner.elementMethods.push(function (target) {
    target.sendMouse = function (focus, namespace) {
        namespace = namespace ? '.' + namespace : '';
        var step = target.trigger('mousedown' + namespace);
        if (focus) {
            step.focus();
        }
        return step.trigger('mouseup' + namespace).trigger('click' + namespace);
    };
});