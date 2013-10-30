runner.elementMethods.push(function (target) {
    target.scrollUp = function (amount) {
        return target.custom('scrollUp', function () {
            return target.element.scrollTop(target.element.scrollTop() - amount);
        });
    };
    target.scrollDown = function (amount) {
        return target.custom('scrollDown', function () {
            return target.element.scrollTop(target.element.scrollTop() + amount);
        });
    };
});