function renderer() {
    var exports = {},
        overlay,
        content,
        isMouseDown = false,
        highlighter,
        lastStep,
        passed,
        failed;

    function killEvent(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
    }

    function start(event) {
        if ($('.runner-overlay').length) {
            stop();
        }
        passed = 0;
        failed = 0;
        overlay = $('<div class="runner-overlay">' +
                '<div class="runner-highlight-container"></div>' +
                '<div class="runner-title">RUNNER ( ' +
                    '<a href="javascript:void(0)" class="runner-close">X</a> ' +
                    '<a href="javascript:void(0)" class="runner-pause">||</a> ' +
                    '<a href="javascript:void(0)" class="runner-next">&#x25B6;|</a> ' +
                    '<a href="javascript:void(0)" class="runner-resume">&#x25B6;</a> ' +
                    ')' +
                    ' <a href="javascript:void(0)" class="runner-complete"></a> ' +
                '</div>' +
                '<div class="runner-clear"></div>' +
                '<div class="runner-content"></div>' +
            '</div>');
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
        $('.runner-highlight-container').append(highlighter);
        updateHighlightContainer();
        addBinds();
    }

    function updateResume() {
        if (ux.runner.walking) {
            $('.runner-resume').removeClass('unpaused').addClass('paused');
        } else {
            $('.runner-resume').removeClass('paused').addClass('unpaused');
        }
    }

    function updateHighlightContainer() {
        var container = $('.runner-highlight-container'), frame = $('#targetFrame'), data;
        if (frame.length) {
            if (runner.options.frame) {
                frame.css(runner.options.frame);
            }
            data = frame.offset();
            data.position = "absolute";
            data.width = frame.width();
            data.height = frame.height();
            container.css(data);
        } else {
            container.css({position: "absolute", top: 0, left: 0, width: "100%", height: "100%"});
        }
    }

    function updateHighlight(el) {
        updateResume();
        updateHighlightContainer();
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
            if (isChain && lastStep && lastStep.depth >= step.depth && step !== step.parent.steps[0]) {
                content.append('<br/>');
            }
            content.append('<div id="' + step.id + '" class="runner-pending runner-' + step.type + (isChain ? '-chain' : '') + '" style="margin-left: ' + indent + 'px;margin-right: 0px;"></div>');
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
        updateComplete();
    }

    function stepEnd(event, step) {
        var el = $('#' + step.id);
        el.addClass('runner-' + (step.pass ? 'pass' : 'fail'));
        writeLabel(step);
        updateHighlight(step.element);
        scrollToBottom();
        lastStep = step;
        updateCounters(step);
    }

    function updateCounters(step) {
        if (step.pass) {
            passed += 1;
        } else {
            failed += 1;
        }
        updateComplete();
    }

    function updateComplete(done) {
        var complete = $('.runner-complete');
        complete.removeClass('paused');
        complete.removeClass('passed');
        complete.removeClass('failed');
        if (runner.walking) {
            complete.addClass('paused');
        } else if (failed) {
            complete.addClass('failed');
        } else {
            complete.addClass('passed');
        }
        complete.html(passed + ' steps passed, ' + failed + ' failed.' + (done ? ' COMPLETE' : ''));
    }

    function scrollToBottom() {
        overlay.scrollTop(content.height());
    }

    function done() {
        scrollToBottom();
        updateComplete(true);
    }

    function stop() {
        if (overlay) {
            $('.runner-overlay').remove();
            content = null;
            overlay = null;
            highlighter = null;
            lastStep = null;
            removeBinds();
        }
    }

    function close() {
        if (overlay) {
            stop();
            ux.runner.pause();
        }
    }

    function addBinds() {
        var re = runner.options.rootElement;
        re.bind(runner.events.START, start);
        re.bind(runner.events.STEP_START, stepStart);
        re.bind(runner.events.STEP_UPDATE, stepUpdate);
        re.bind(runner.events.STEP_END, stepEnd);
        re.bind(runner.events.STEP_PAUSE, stepPause);
        re.bind(runner.events.DONE, done);
        $('.runner-close').click(runner.stop);
        $('.runner-pause').click(runner.pause);
        $('.runner-next').click(runner.next);
        $('.runner-resume').click(runner.resume);
    }

    function removeBinds() {
        var re = runner.options.rootElement;
        re.unbind(runner.events.START, start);
        re.unbind(runner.events.STEP_START, stepStart);
        re.unbind(runner.events.STEP_UPDATE, stepUpdate);
        re.unbind(runner.events.STEP_END, stepEnd);
        re.unbind(runner.events.STEP_PAUSE, stepPause);
        re.unbind(runner.events.DONE, done);
        $('.runner-close').unbind('click', runner.stop);
        $('.runner-pause').unbind('click', runner.pause);
        $('.runner-next').unbind('click', runner.next);
        $('.runner-resume').unbind('click', runner.resume);
    }

    exports.start = start;
    exports.stepStart = stepStart;
    exports.stepEnd = stepEnd;
    exports.done = done;
    runner.stop = close;
    runner.onStart = start;

    return exports;
}

renderer();