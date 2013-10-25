runner.elementMethods.push(function (target) {
    target.scrollUp = function (amount) {
        return target.custom('scrollUp', function () {
            target.element.scrollTop(target.element.scrollTop() - amount);
            return this;// should always return this unless returning the value. Or it cannot be chained.
        });
    };
    target.scrollDown = function (amount) {
        return target.custom('scrollDown', function () {
            target.element.scrollTop(target.element.scrollTop() + amount);
            return this;// should always return this unless returning the value. Or it cannot be chained.
        });
    };
});