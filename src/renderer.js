function renderer() {
    var exports = {},
        overlay,
        content,
        isMouseDown = false,
        highlighter,
        lastStep;

    function killEvent(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
    }

    function start(event) {
        close();
        overlay = $('<div class="runner-overlay"><div class="runner-title">Type "runner.stop()" in the console to close the tests. <a href="javascript:void(0)" class="runner-close">X</a></div><div class="runner-content"></div></div>');
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
        $('body').append(overlay);
        $('body').append(highlighter);
        addBinds();
    }

    function updateHighlight(el) {
        if (el && el.length) {
            var pos = el.offset();
            highlighter.removeClass('runner-highlighter-empty');
            highlighter.css({top: pos.top, left: pos.left, width: el.width(), height: el.height()});
        } else {
            highlighter.addClass('runner-highlighter-empty');
        }
    }

    function isChainStep(step) {
        return step.type === ux.runner.types.SUB_STEP;//!!(step.parent && step.parent.element);
    }

    function writeLabel(step, paused) {
        var isChain = isChainStep(step.parent) && isChainStep(step),
           el = $('#' + step.id);
       el.html(
           (isChain && ' - ' || '') +
           '<span class="runner-step-label">' + step.label + '</span>' +
           (step.count > 1 ? ' <span class="runner-step-count" title="repeat count">' + step.count + '</span>' : '') +
           (step.timedOut ? ' <span class="runner-timed-out" title="timeout">timeout</span>' : '') +
           (paused ? ' <span class="runner-step-paused" title="paused">paused' + (runner.pauseOnFail ? ' on fail' : '') + '</span>' : '')
       );
    }

    function stepStart(event, step) {
        updateHighlight(step.element);
        if (!$('#' + step.id).length) {
            var parentIsChain = isChainStep(step.parent),
                indent = parentIsChain ? 4 : step.depth * 20,
                isChain = isChainStep(step);
            if (isChain && lastStep && lastStep.depth >= step.depth) {
                content.append('<br/>');
            }
            content.append('<div id="' + step.id + '" class="runner-pending runner-' + step.type + (isChain ? '-chain' : '') + '" style="text-indent: ' + indent + 'px;"></div>');
            writeLabel(step);
        }
    }

    function stepPause(event, step) {
        writeLabel(step, true);
        updateHighlight(step.element);
    }

    function stepUpdate(event, step) {
        if (step.count > 1) {
            writeLabel(step);
        }
        updateHighlight(step.element);
    }

    function stepEnd(event, step) {
        var el = $('#' + step.id);
        el.addClass('runner-' + (step.pass ? 'pass' : 'fail'));
        writeLabel(step);
        updateHighlight(step.element);
        scrollToBottom();
        lastStep = step;
    }

    function scrollToBottom() {
        overlay.scrollTop(content.height());
    }

    function done() {
        scrollToBottom();
    }

    function close() {
        if (overlay) {
            ux.runner.pause();
            overlay.remove();
            highlighter.remove();
            content = null;
            overlay = null;
            highlighter = null;
            lastStep = null;
            removeBinds();
        }
    }

    function addBinds() {
        var body = $('body');
        body.bind(runner.events.STEP_START, stepStart);
        body.bind(runner.events.STEP_UPDATE, stepUpdate);
        body.bind(runner.events.STEP_END, stepEnd);
        body.bind(runner.events.STEP_PAUSE, stepPause);
        body.bind(runner.events.DONE, done);
        $('.runner-close').click(runner.stop);
    }

    function removeBinds() {
        var body = $('body');
        body.unbind(runner.events.STEP_START, stepStart);
        body.unbind(runner.events.STEP_UPDATE, stepUpdate);
        body.unbind(runner.events.STEP_END, stepEnd);
        body.unbind(runner.events.STEP_PAUSE, stepPause);
        body.unbind(runner.events.DONE, done);
        $('.runner-close').unbind('click', runner.stop);
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
        });
    }

    waitForScope();

    return exports;
}

renderer();