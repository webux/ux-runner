function renderer() {
    var exports = {},
        overlay,
        content,
        isMouseDown = false,
        highlighter,
        highlightContainer,
        toolTip,
        lastStep,
        passed,
        failed,
        plusMinusIncrement = 10;

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
                '<div class="runner-title">RUNNER ' +
                    '<div class="runner-button-bar">' +
                        '<a href="javascript:void(0)" class="runner-close runner-button" title="Close Runner">X</a> ' +
                        '<a href="javascript:void(0)" class="runner-restart runner-button" title="Restart last run">&#x21bb;</a> ' +
                        '<a href="javascript:void(0)" class="runner-pause runner-button" title="Pause Runner">||</a> ' +
                        '<a href="javascript:void(0)" class="runner-next runner-button" title="Step Forward">&#x25B6;|</a> ' +
                        '<a href="javascript:void(0)" class="runner-resume runner-button" title="Resume">&#x25B6;</a> ' +
                        '<span class="runner-interval-label">Speed:</span><input type="text" class="runner-interval" disabled> ' +
                        '<a href="javascript:void(0)" class="runner-plus runner-button" title="Increase Speed">+</a> ' +
                        '<a href="javascript:void(0)" class="runner-minus runner-button" title="Decrease Speed">-</a> ' +
                        '<a href="javascript:void(0)" class="runner-details runner-button" title="Click to show or hide details.">?</a> ' +
                    '</div>' +
                    ' <a href="javascript:void(0)" class="runner-complete"></a> ' +
                '</div>' +
                '<div class="runner-clear"></div>' +
                '<div class="runner-scroller">' +
                    '<div class="runner-content' + (runner.compact ? ' compact' : '') + '">' +
                        '<div class="runner-content-title-spacer"></div>' +
                    '</div>' +
                '</div>' +
                '<div class="runner-highlight-container"></div>' +
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
        toolTip = $('<div class="runner-tooltip"><div class="runner-tooltip-arrow"></div><div class="runner-tooltip-content"></div></div>');
        $('body').append(overlay);
        highlightContainer = $('.runner-highlight-container');
        highlightContainer.append(highlighter);
        highlightContainer.append(toolTip);
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

    function updateSpeed() {
        $('.runner-interval').val(ux.runner.options.interval);
    }

    function updateHighlightContainer() {
        var frame = $('#targetFrame'), data;
        if (frame.length) {
            if (runner.options.frame) {
                frame.css(runner.options.frame);
            }
            data = frame.offset();
            data.position = "absolute";
            data.width = frame.width();
            data.height = frame.height();
            highlightContainer.css(data);
        } else {
            highlightContainer.css({position: "absolute", top: 0, left: 0, width: "100%", height: "100%"});
        }
    }

    function updateHighlight(step) {
        var el = step.element;
        updateResume();
        updateSpeed();
        updateHighlightContainer();
        writeLabel(step, false, toolTip.find('.runner-tooltip-content'));
        if (el && el.length && el.offset()) {
            var pos = el.offset();
            highlighter.removeClass('runner-highlighter-empty');
            highlighter.css({top: pos.top, left: pos.left, width: el.width(), height: el.height()});
            toolTip.css({top: pos.top + el.height(), left: pos.left + el.width() - toolTip.width()});
        } else {
            highlighter.addClass('runner-highlighter-empty');
        }
    }

    function isChainStep(step) {
        return step.type === ux.runner.types.STEP;//!!(step.parent && step.parent.element);
    }

    function writeLabel(step, paused, el) {
        var isChain = isChainStep(step.parent) && isChainStep(step);
       el.html(
           (isChain && ' - ' || '') +
           '<span class="runner-step-label">' + step.label + '</span>' +
           (step.count > 1 ? ' <span class="runner-step-count" title="repeat count">' + step.count + '</span>' : '') +
           (step.timedOut ? ' <span class="runner-timed-out" title="timeout">timeout</span>' : '') +
           (paused ? ' <span class="runner-step-paused runner-step-paused-' + (step.pass ? 'pass' : 'fail') + '" title="paused">paused' + (runner.pauseOnFail && !step.pass ? ' on fail' : '') + '</span>' : '')
       );
    }

    function stepStart(event, step) {
        updateHighlight(step);
        if (!$('#' + step.id).length) {
            var parentIsChain = isChainStep(step.parent),
                indent = parentIsChain ? 4 : step.depth * 20,
                isChain = isChainStep(step);
            if (isChain && lastStep && lastStep.depth >= step.depth && step !== step.parent.steps[0]) {
                content.append('<div class="runner-break"></div>');
            }
            content.append('<div id="' + step.id + '" class="runner-pending runner-' + step.type + (isChain ? '-chain' : '') + '" style="margin-left: ' + indent + 'px;margin-right: 0px;"></div>');
            writeLabel(step, false, $('#' + step.id));
        }
    }

    function stepPause(event, step) {
        showDetails();
        writeLabel(step, true, $('#' + step.id));
        updateHighlight(step);
    }

    function stepUpdate(event, step) {
        if (step.count > 1) {
            writeLabel(step, false, $('#' + step.id));
        }
        updateHighlight(step);
        updateComplete();
    }

    function stepEnd(event, step) {
        var el = $('#' + step.id);
        el.addClass('runner-' + (step.pass ? 'pass' : 'fail'));
        el.attr('title', step.label);
        writeLabel(step, false, $('#' + step.id));
        updateHighlight(step);
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
        complete.removeClass('passed');
        complete.removeClass('failed');
        complete.removeClass('passed');
        if (runner.walking) {
            complete.addClass('paused');
        } else if (failed) {
            complete.addClass('failed');
        } else {
            complete.addClass('passed');
        }
        if (done) {
            complete.addClass('done');
        }
        complete.html(passed + ' steps passed, ' + failed + ' failed.' + (done ? ' complete' : (runner.walking ? ' paused' : ' running')));
    }

    function scrollToBottom() {
        overlay.find('.runner-scroller').scrollTop(content.height());
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
            highlightContainer = null;
            toolTip = null;
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

    function showDetails() {
        content.removeClass('compact');
    }

    function hideDetails() {
        content.addClass('compact');
    }

    function toggleDetails() {
        return content.hasClass('compact') ? showDetails() : hideDetails();
    }

    function plus() {
        ux.runner.options.interval += plusMinusIncrement;
    }

    function minus() {
        ux.runner.options.interval -= plusMinusIncrement;
        if (ux.runner.options.interval < plusMinusIncrement) {
            ux.runner.options.interval = plusMinusIncrement;
        }
    }

    function restart() {
        stop();
        ux.runner.pause();
        ux.runner.restart();
    }

    function addBinds() {
        runner.on(runner.events.START, start);
        runner.on(runner.events.STEP_START, stepStart);
        runner.on(runner.events.STEP_UPDATE, stepUpdate);
        runner.on(runner.events.STEP_END, stepEnd);
        runner.on(runner.events.STEP_PAUSE, stepPause);
        runner.on(runner.events.DONE, done);
        $('.runner-close').click(runner.stop);
        $('.runner-restart').click(restart);
        $('.runner-pause').click(runner.pause);
        $('.runner-next').click(runner.next);
        $('.runner-resume').click(runner.resume);
        $('.runner-details').click(toggleDetails);
        $('.runner-plus').click(plus);
        $('.runner-minus').click(minus);
    }

    function removeBinds() {
        runner.off(runner.events.START, start);
        runner.off(runner.events.STEP_START, stepStart);
        runner.off(runner.events.STEP_UPDATE, stepUpdate);
        runner.off(runner.events.STEP_END, stepEnd);
        runner.off(runner.events.STEP_PAUSE, stepPause);
        runner.off(runner.events.DONE, done);
        $('.runner-close').unbind('click', runner.stop);
        $('.runner-restart').unbind('click', restart);
        $('.runner-pause').unbind('click', runner.pause);
        $('.runner-next').unbind('click', runner.next);
        $('.runner-resume').unbind('click', runner.resume);
        $('.runner-details').unbind('click', toggleDetails);
        $('.runner-plus').unbind('click', plus);
        $('.runner-minus').unbind('click', minus);
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