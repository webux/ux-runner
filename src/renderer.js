function renderer() {
    var exports = {},
        overlay,
        content,
        isMouseDown = false,
        highlighter,
        injector;

    function killEvent(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
    }

    function start(event) {
        close();
        overlay = $('<div class="runner-overlay"><div class="runner-title">Type "runner.stop()" in the console to close the tests.</div><div class="runner-content"></div></div>');
        content = overlay.find('.runner-content');
        overlay.click(killEvent);
        overlay.mousedown(function () {
            isMouseDown = true;
        });
        overlay.mouseup(function () {
            isMouseDown = false;
        });
        $(document).blur(function (event) {
            if (isMouseDown) {
                killEvent(event);
            }
        });

        highlighter = $('<div class="runner-highlighter"></div>');
        overlay.append(highlighter);

        $('body').append(overlay);
    }

    function updateHighlight(event, el) {
        if (el && el.length) {
            var pos = el.offset();
            highlighter.css({top: pos.top, left: pos.left, width: el.width(), height: el.height()});
        } else {
            highlighter.css({width: 0, height: 0});
        }
    }

    function stepStart(event, step) {
        updateHighlight(step.element);
        if (!$('#' + step.id).length) {
            content.append('<div id="' + step.id + '" class="runner-pending runner-' + step.type + '" style="text-indent: ' + (step.depth * 20) + 'px;">' + step.label + '</div>');
        }
    }

    function stepEnd(event, step) {
        $('#' + step.id).addClass('runner-' + (step.pass ? 'pass' : 'fail')).text(step.label);
        updateHighlight(step.element);
    }

    function done() {
        if (confirm("Tests are complete. Would you like to close them?")) {
            runner.stop();
        }
    }

    function close() {
        if (overlay) {
            overlay.remove();
            content = null;
            overlay = null;
            highlighter = null;
        }
    }

    exports.start = start;
    exports.stepStart = stepStart;
    exports.stepEnd = stepEnd;
    exports.done = done;
    runner.stop = close;

    function waitForScope() {
        var body = $('body');
        body.ready(function () {
            var body = $('body');
            body.bind(runner.events.START, start);
            body.bind(runner.events.STEP_START, stepStart);
            body.bind(runner.events.STEP_END, stepEnd);
            body.bind(runner.events.DONE, done);
        });
    }

    waitForScope();

    return exports;
}

renderer();