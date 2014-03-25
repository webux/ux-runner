runner.elementMethods.push(function (target) {

    function anchorClick(anchorObj) {
        if (anchorObj.click) {
            anchorObj.click();
        } else if (document.createEvent) {
            var evt = document.createEvent("MouseEvents");
            evt.initMouseEvent("click", true, true, window,
                0, 0, 0, 0, 0, false, false, false, false, 0, null);
            var allowDefault = anchorObj.dispatchEvent(evt);
            // you can check allowDefault for false to see if
            // any handler called evt.preventDefault().
            // Firefox will *not* redirect to anchorObj.href
            // for you. However every other browser will.
        }
    }

    target.sendTap = function (focus, namespace) {
        var step,
            s = runner.createElementStep({
            label: "sendTap",
            method: function () {
                if (this.element[0].href && this.element[0].href.length) {
                    anchorClick(this.element[0]);
                }
                return s;
            }
        }, this);
        namespace = namespace ? '.' + namespace : '';
        step = s.trigger('touchstart' + namespace);
        if (focus) {
            step = step.focus();
        }
        return step.trigger('touchend' + namespace).trigger('touchcancel' + namespace).trigger('click' + namespace);
    };
});

