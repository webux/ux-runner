/**
 * Simulates keyboard actions on DOM elements
 */
/*global jQuery*/
(function () {
    'use strict';
    function Keyboard(el, lock) {
        this.el = el;
        // TODO: Break out AngularJS
        this.scope = el.scope();

        var editableTypes = "text password number email url search tel";
        this.isEditable = (/textarea|select/i.test(el[0].nodeName) || editableTypes.indexOf(el[0].type.toLowerCase()) > -1);

        if (this.isEditable) {
            this.selStart = el.getSelectionStart() || 0;
            this.selEnd = el.getSelectionEnd() || el.val().length;
            el.setSelection(this.selStart, this.selEnd);
            this.cursorPosition = this.selEnd;
        }

        this.capsLocked = false;

        if (lock) {
            this.lock();
        }
    }

    /**
     * Executes a series of actions on Keyboard
     * @param el jQuery
     * @param actions String
     * @example "This is a test" left left left delete -> This is a tst
     */
    Keyboard.exec = function (el/*:jQuery*/, actions/*:String*/) {
        var kbd = new Keyboard(el),
            acl = actions.match(/"[^"]+"|\w+/gim),
            action, val, i = 0, len = acl.length;
        kbd.lock();

        while (i < len) {
            val = acl[i];
            action = val.match(/[^"]+/gim)[0];
            if (typeof kdb[action] === 'function') {
                kbd[action]();
            } else {
                kbd.type(action);
            }
            kbd.release();
            i += 1;
        }
    };

    var proto = Keyboard.prototype;

    proto.checkShiftKey = function (letter) {
        var alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+{}|:\"<>?~;",
            testLetter = letter.toUpperCase();
        if (testLetter === letter) {
            return true;
        }
        return false;
    };

    proto.key = {
        'backspace': 8, 'tab': 9, 'enter': 13, 'shift': 16, 'ctrl': 17, 'alt': 18, 'pause': 19,
        'capslock': 20, 'esc': 27, 'space': 32, 'pageup': 33, 'pagedown': 34, 'end': 35, 'home': 36,
        'left': 37, 'up': 38, 'right': 39, 'down': 40, 'insert': 45, 'delete': 46,
        '0': 48, '1': 49, '2': 50, '3': 51, '4': 52, '5': 53, '6': 54, '7': 55, '8': 56, '9': 57,
        'a': 65, 'b': 66, 'c': 67, 'd': 68, 'e': 69, 'f': 70, 'g': 71, 'h': 72, 'i': 73, 'j': 74,
        'k': 75, 'l': 76, 'm': 77, 'n': 78, 'o': 79, 'p': 80, 'q': 81, 'r': 82, 's': 83, 't': 84,
        'u': 85, 'v': 86, 'w': 87, 'x': 88, 'y': 89, 'z': 90,
        'numpad0': 96, 'numpad1': 97, 'numpad2': 98, 'numpad3': 99, 'numpad4': 100, 'numpad5': 101,
        'numpad6': 102, 'numpad7': 103, 'numpad8': 104, 'numpad9': 105,
        '*': 106, '+': 107, '-': 109, '.': 110,
        'f1': 112, 'f2': 113, 'f3': 114, 'f4': 115, 'f5': 116, 'f6': 117, 'f7': 118, 'f8': 119,
        'f9': 120, 'f10': 121, 'f11': 122, 'f12': 123,
        '=': 187, ',': 188, '/': 191, '\\': 220
    };

    proto.type = function (phrase, options) {
        var str, i, len;
        if (this.selStart !== this.selEnd) {
            str = this.el.val();
            str = str.substr(0, this.selStart) + str.substr(this.selEnd);
            this.el.val(str);
            this.selStart = this.selEnd = null;
        }
        phrase = phrase || '';
        i = 0;
        len = phrase.length;
        while (i < len) {
            this.punch(phrase.charAt(i), options);
            i += 1;
        }
        return this;
    };

    proto.punch = function (char, options) {
        var el = this.el,
            scope = this.scope,
            evt, keyCode, shiftKey, lchar = char.toLowerCase(), curPos, val,
            attr = this.attr('ng-model');
        options = options || {};
        if (this.attr('disabled') !== 'disabled') {
            keyCode = this.key[lchar];
            shiftKey = this.checkShiftKey(char);
            evt = this.createEvent('keydown', {shiftKey: shiftKey, keyCode: keyCode});
            this.dispatchEvent(el[0], 'keydown', evt);
            // if item is editable and enabled then add to it

            if (this.isEditable && char.length === 1) {
                curPos = this.cursorPosition;
                val = el.val();
                val = val.substr(0, curPos) + char + val.substr(curPos);
                if (attr) {
                    // TODO: Break out AngularJS
                    scope.$eval(attr + ' = "' + val + '"');
                }
                el.val(val);
                this.cursorPosition += 1;
            }
            // invoke angular change event
            // TODO: Break out AngularJS
            scope.$eval(this.attr('ng-change'));
            // invoke browser change event
            el.change();

            // invoke keyup event
            evt = this.createEvent('keyup', {shiftKey: shiftKey, keyCode: keyCode});
            this.dispatchEvent(el[0], 'keyup', evt);

            // TODO: Break out AngularJS
            if (!scope.$$phase) {
                scope.$apply();
            }
        }
        return this;
    };

    proto.attr = function (attr) {
        return this.el.attr(attr) || this.el.attr('data-' + attr);
    };

    proto.enter = function (options) {
        this.punch('enter', options);
        return this;
    };

    proto.left = function (options) {
        var el = this.el;
        if (this.isEditable) {
            this.cursorPosition -= 1;
        } else {
            this.punch('left', options);
        }
        return this;
    };

    proto.up = function (options) {
        this.punch('up', options);
        return this;
    };

    proto.right = function (options) {
        var el = this.el;
        if (this.isEditable) {
            this.cursorPosition += 1;
        } else {
            this.punch('right', options);
        }
        return this;
    };

    proto.down = function (options) {
        this.punch('down', options);
        return this;
    };

    proto.home = function (options) {
        var el = this.el;
        if (this.isEditable) {
            this.cursorPosition = 0;
        } else {
            this.punch('home', options);
        }
        return this;
    };
    proto.end = function (options) {
        var el = this.el;
        if (this.isEditable) {
            this.cursorPosition = el.val().length;
        } else {
            this.punch('home', options);
        }
        return this;
    };

    proto.pageUp = function (options) {
        this.punch('pageup', options);
        return this;
    };

    proto.pageDown = function (options) {
        this.punch('pagedown', options);
        return this;
    };

    // TODO: Fix delete, backspace to invoke save key events
    proto.del = function (options) {
        if (this.isEditable) {
            var val = this.el.val(),
                curPos = this.cursorPosition;
            this.el.val(val.substr(0, curPos) + val.substr(curPos + 1));
        } else {
            this.punch('delete', options);
        }
        return this;
    };

    proto.tab = function (options) {
        this.punch('tab', options);
        return this;
    };

    proto.backspace = function (options) {
        if (this.isEditable) {
            var val = this.el.val(),
                curPos = this.cursorPosition;
            this.el.val(val.substr(0, curPos - 1) + val.substr(curPos));
            this.cursorPosition = curPos - 1;
        } else {
            this.punch('backspace', options);
        }
        return this;
    };

    proto.capsLock = function () {
        this.capsLocked = !this.capsLocked;
    };

    proto.lock = function () {
        var doc = $(document);
        doc.bind('mousedown', this.killEvent);
        doc.bind('keydown', this.killEvent);
        doc.bind('focus', this.killEvent);
        doc.bind('blur', this.killEvent);
        return this;
    };

    proto.release = function () {
        var doc = $(document);
        doc.unbind('mousedown', this.killEvent);
        doc.unbind('keydown', this.killEvent);
        doc.unbind('focus', this.killEvent);
        doc.unbind('blur', this.killEvent);
        return this;
    };

    proto.killEvent = function (evt) {
        evt.preventDefault();
        evt.stopImmediatePropagation();
    };

    proto.dispatchEvent = function (el, type, evt) {
        if (el.dispatchEvent) {
            el.dispatchEvent(evt);
        } else if (el.fireEvent) {
            el.fireEvent('on' + type, evt);
        }
        return evt;
    };

    proto.createEvent = function (type, options) {
        var evt, e;

        e = $.extend({ bubbles: true, cancelable: true, view: window,
            ctrlKey: false, altKey: false, shiftKey: false, metaKey: false,
            keyCode: 0, charCode: 0
        }, options);

        if ($.isFunction(document.createEvent)) {
            try {
                evt = document.createEvent("KeyEvents");
                evt.initKeyEvent(type, e.bubbles, e.cancelable, e.view,
                    e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
                    e.keyCode, e.charCode);
            } catch (err) {
                evt = document.createEvent("Events");
                evt.initEvent(type, e.bubbles, e.cancelable);
                $.extend(evt, { view: e.view,
                    ctrlKey: e.ctrlKey, altKey: e.altKey, shiftKey: e.shiftKey, metaKey: e.metaKey,
                    keyCode: e.keyCode, charCode: e.charCode
                });
            }
        } else if (document.createEventObject) {
            evt = document.createEventObject();
            $.extend(evt, e);
        }

        if (($.browser !== undefined) && ($.browser.msie || $.browser.opera)) {
            evt.keyCode = (e.charCode > 0) ? e.charCode : e.keyCode;
            evt.charCode = undefined;
        }

        return evt;
    };

    function sendKeys(str, assertValue) {
        var s = {
            label: "sendKeys " + str,
            method: function () {
                Keyboard.exec(s.element, str);
            },
            validate: function () {
                if (assertValue) {
                    var attr = 'ng-model',
                        attrVal = s.element.attr(attr) || s.element.attr('data-' + attr);
                    if (attrVal) {
                        s.value = s.element.scope().$eval(attrVal);
                    } else {
                        s.value = s.element.val();
                    }
                    return (s.value + '') === (assertValue + '');
                }
                return true;
            }
        };
        return s;
    }

    runner.elementMethods.push({
        name: 'sendKeys',
        method: function (target) {
            return function (str, strToCompare) {
                var s = sendKeys.apply(null, arguments);
                runner.createElementStep(s, target);
                return s;
            };
        }});

}());

/**
 * Cursor Functions
 *
 * Used for setting and getting text cursor position within an input
 * and textarea field. Also used to get and set selection range.
 *
 * @author Branden Cash
 * @email brandencash@crutzdesigns.com
 */

(function ($) {
    'use strict';
    var $fn = jQuery.fn, input;
    $fn.getCursorPosition = function () {
        if (this.length === 0) {
            return -1;
        }
        return $(this).getSelectionStart();
    };

    $fn.setCursorPosition = function (position) {
        if (this.length === 0) {
            return this;
        }
        return $(this).setSelection(position, position);
    };

    $fn.getSelection = function () {
        if (this.length === 0) {
            return -1;
        }
        var s = $(this).getSelectionStart(),
            e = $(this).getSelectionEnd();
        return this[0].value.substring(s, e);
    };

    $fn.getSelectionStart = function () {
        if (this.length === 0) {
            return -1;
        }
        input = this[0];

        var pos = input.value.length,
            r;

        if (input.createTextRange) {
            r = document.selection.createRange().duplicate();
            r.moveEnd('character', input.value.length);
            if (r.text === '') {
                pos = input.value.length;
            }
            pos = input.value.lastIndexOf(r.text);
        } else if (input.selectionStart !== undefined) {
            pos = input.selectionStart;
        }

        return pos;
    };

    $fn.getSelectionEnd = function () {
        if (this.length === 0) {
            return -1;
        }
        input = this[0];

        var pos = input.value.length,
            r;

        if (input.createTextRange) {
            r = document.selection.createRange().duplicate();
            r.moveStart('character', -input.value.length);
            if (r.text === '') {
                pos = input.value.length;
            }
            pos = input.value.lastIndexOf(r.text);
        } else if (input.selectionEnd !== undefined) {
            pos = input.selectionEnd;
        }

        return pos;
    };

    $fn.setSelection = function (selectionStart, selectionEnd) {
        if (this.length === 0) {
            return this;
        }
        input = this[0];

        if (input.createTextRange) {
            var range = input.createTextRange();
            range.collapse(true);
            range.moveEnd('character', selectionEnd);
            range.moveStart('character', selectionStart);
            range.select();
        } else if (input.setSelectionRange) {
            input.focus();
            input.setSelectionRange(selectionStart, selectionEnd);
        }

        return this;
    };
}(jQuery));