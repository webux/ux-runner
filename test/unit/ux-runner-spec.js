describe("ux-runner", function () {

    var events, scenario, doc, logged;

    function charPac(char, len) {
        var str = '';
        while (str.length < len) { str += char; }
        return str;
    }

    function logEvents(events) {
        var depth = 0, e, i = 0, len = events.length, str = '';
        while(i < len) {
            e = events[i];
            if (e.event.match(/start/i)) {
                depth += 1;
            }
            str += charPac("-", depth) + e.event + ":" + e.type + "\n";
            if (e.event.match(/end/i) || e.event.match(/done/i)) {
                depth -= 1;
            }
            i += 1;
        }
        return str;
    }

    function compareStrings(str1, str2) {
        var s1 = str1.split("\n"), s2 = str2.split("\n"), i = 0, len = s1.length;
        while (i < len) {
            if (s1[i] !== s2[i]) {
                s1[i] = '*' + s1[i];
                s2[i] = '*' + s2[i];
            }
            i += 1;
        }
        return {s1:s1.join("\n"), s2:s2.join("\n")};
    }

    beforeEach(function () {
        ux.runner.clearScenarios();
        logged = false;
        window.tmp = {
            log: function () {
                logged = true;
            }
        };
        doc = $('<body><div>' +
            '<a href="javascript:void(0)" onclick="javascript:window.tmp.log(\'click happened\')">Test 1</a>' +
            '<a href="javascript:void(0)">Test 2</a>' +
            '<input type="text" ng-model="testNgValue">' +
            '</div></body>'
        );
        ux.runner.config({
            async: false,
            window: {
                $: $,
                jQuery: jQuery,
                angular: angular,
                document: doc
            },
            rootElement: doc// rootElement determines runner's scope.
        });
        ux.runner.onStart = null, // this keeps the renderer from starting.
        ux.runner.dispatcher = {
            events: [],
            dispatch: function (event, step) {
                this.events.push({event: event, type: step && step.type || undefined});
            }
        };
        events = ux.runner.events;
        scenario = ux.runner.addScenario('test1', function (scene, find) {
            scene("test1 scenario", function () {
                find("a:eq(0)").click();
            });
        });
    });

    it("scenario should create a scene", function () {
        ux.runner.run();
        expect(ux.runner.dispatcher.events.length).toBe(17);
    });

    it("runner should fire events in the correct sequence", function () {
        ux.runner.run();
        var str = logEvents(ux.runner.dispatcher.events),
            strings = compareStrings(str,
                "-runner:start:undefined\n" +
                "--runner:stepStart:root\n" +
                "--runner:stepUpdate:root\n" +
                "---runner:stepStart:scenario\n" +
                "---runner:stepUpdate:scenario\n" +
                "----runner:stepStart:scene\n" +
                "----runner:stepUpdate:scene\n" +
                "-----runner:stepStart:step\n" +
                "-----runner:stepUpdate:step\n" +
                "------runner:stepStart:step\n" +
                "------runner:stepUpdate:step\n" +
                "------runner:stepEnd:step\n" +
                "-----runner:stepEnd:step\n" +
                "----runner:stepEnd:scene\n" +
                "---runner:stepEnd:scenario\n" +
                "--runner:stepEnd:root\n" +
                "-runner:done:undefined\n");
        expect(strings.s1).toEqual(strings.s2);
    });

    it("should execute tests against the dom.", function () {
        logged = false;
        ux.runner.run();
        // logged is set when the html element is clicked on.
        expect(logged).toBe(true);
    });

    it("should exit if scenario does not have at least one scene.", function () {
        ux.runner.clearScenarios();
        scenario = ux.runner.addScenario('test1', function (scene, find) {
            // Note this is missing scene on purpose.
            find("a:eq(0)").click();
        });
        ux.runner.run();
        expect(ux.runner.exit).toBe(true);
    });

    describe("sendKeys", function () {
        it("should fire the following sequence of events", function () {
            ux.runner.clearScenarios();
            scenario = ux.runner.addScenario("test 1", function (scene, find) {
                scene("scene 1", function () {
                    find("input").sendKeys("'abc' enter");
                });
            });
            ux.runner.run();
            var str = logEvents(ux.runner.dispatcher.events),
                strings = compareStrings(str,
                    "-runner:start:undefined\n" +
                    "--runner:stepStart:root\n" +
                    "--runner:stepUpdate:root\n" +
                    "---runner:stepStart:scenario\n" +
                    "---runner:stepUpdate:scenario\n" +
                    "----runner:stepStart:scene\n" +
                    "----runner:stepUpdate:scene\n" +
                    "-----runner:stepStart:step\n" +
                    "-----runner:stepUpdate:step\n" +
                    "------runner:stepStart:step\n" +
                    "------runner:stepUpdate:step\n" +
                    "------runner:stepEnd:step\n" +
                    "-----runner:stepEnd:step\n" +
                    "----runner:stepEnd:scene\n" +
                    "---runner:stepEnd:scenario\n" +
                    "--runner:stepEnd:root\n" +
                    "-runner:done:undefined\n");
            expect(strings.s1).toEqual(strings.s2);
        });
    });

    describe("sendMouse", function () {

        it("should fire the correct sequence of events", function () {
            ux.runner.clearScenarios();
            scenario = ux.runner.addScenario("test 1", function (scene, find) {
                scene("scene 1", function () {
                    find("a:eq(1)").sendMouse();
                });
            });
            ux.runner.run();
            var str = logEvents(ux.runner.dispatcher.events),
                strings = compareStrings(str,
                    "-runner:start:undefined\n" +
                    "--runner:stepStart:root\n" +
                    "--runner:stepUpdate:root\n" +
                    "---runner:stepStart:scenario\n" +
                    "---runner:stepUpdate:scenario\n" +
                    "----runner:stepStart:scene\n" +
                    "----runner:stepUpdate:scene\n" +
                    "-----runner:stepStart:step\n" +//find
                    "-----runner:stepUpdate:step\n" +
                    "------runner:stepStart:step\n" +//sendMouse
                    "------runner:stepUpdate:step\n" +
                    "-------runner:stepStart:step\n" +//mouseDown
                    "-------runner:stepUpdate:step\n" +
                    "--------runner:stepStart:step\n" +//mouseUp
                    "--------runner:stepUpdate:step\n" +
                    "---------runner:stepStart:step\n" +//click
                    "---------runner:stepUpdate:step\n" +
                    "---------runner:stepEnd:step\n" +
                    "--------runner:stepEnd:step\n" +
                    "-------runner:stepEnd:step\n" +
                    "------runner:stepEnd:step\n" +
                    "-----runner:stepEnd:step\n" +
                    "----runner:stepEnd:scene\n" +
                    "---runner:stepEnd:scenario\n" +
                    "--runner:stepEnd:root\n" +
                    "-runner:done:undefined\n");
            expect(strings.s1).toEqual(strings.s2);
        });

        it("should fire the correct sequence of events if focus is passed", function () {
            ux.runner.clearScenarios();
            scenario = ux.runner.addScenario("test 1", function (scene, find) {
                scene("scene 1", function () {
                    find("a:eq(1)").sendMouse(true);
                });
            });
            ux.runner.run();

            var str = logEvents(ux.runner.dispatcher.events),
                strings = compareStrings(str,
                    "-runner:start:undefined\n" +
                    "--runner:stepStart:root\n" +
                    "--runner:stepUpdate:root\n" +
                    "---runner:stepStart:scenario\n" +
                    "---runner:stepUpdate:scenario\n" +
                    "----runner:stepStart:scene\n" +
                    "----runner:stepUpdate:scene\n" +
                    "-----runner:stepStart:step\n" +//find
                    "-----runner:stepUpdate:step\n" +
                    "------runner:stepStart:step\n" +//sendMouse
                    "------runner:stepUpdate:step\n" +
                    "-------runner:stepStart:step\n" +//mouseDown
                    "-------runner:stepUpdate:step\n" +
                    "--------runner:stepStart:step\n" +//focus
                    "--------runner:stepUpdate:step\n" +
                    "---------runner:stepStart:step\n" +//mouseUp
                    "---------runner:stepUpdate:step\n" +
                    "----------runner:stepStart:step\n" +//click
                    "----------runner:stepUpdate:step\n" +
                    "----------runner:stepEnd:step\n" +
                    "---------runner:stepEnd:step\n" +
                    "--------runner:stepEnd:step\n" +
                    "-------runner:stepEnd:step\n" +
                    "------runner:stepEnd:step\n" +
                    "-----runner:stepEnd:step\n" +
                    "----runner:stepEnd:scene\n" +
                    "---runner:stepEnd:scenario\n" +
                    "--runner:stepEnd:root\n" +
                    "-runner:done:undefined\n");
            expect(strings.s1).toEqual(strings.s2);
        });
    });

    describe("sendTap", function () {

        it("should fire the correct sequence of events", function () {
            ux.runner.clearScenarios();
            scenario = ux.runner.addScenario("test 1", function (scene, find) {
                scene("scene 1", function () {
                    find("a:eq(1)").sendTap();
                });
            });
            ux.runner.run();
            var str = logEvents(ux.runner.dispatcher.events),
                strings = compareStrings(str,
                    "-runner:start:undefined\n" +
                    "--runner:stepStart:root\n" +
                    "--runner:stepUpdate:root\n" +
                    "---runner:stepStart:scenario\n" +
                    "---runner:stepUpdate:scenario\n" +
                    "----runner:stepStart:scene\n" +
                    "----runner:stepUpdate:scene\n" +
                    "-----runner:stepStart:step\n" +//find
                    "-----runner:stepUpdate:step\n" +
                    "------runner:stepStart:step\n" +//touchStart
                    "------runner:stepUpdate:step\n" +
                    "-------runner:stepStart:step\n" +//touchEnd
                    "-------runner:stepUpdate:step\n" +
                    "--------runner:stepStart:step\n" +//touchCancel
                    "--------runner:stepUpdate:step\n" +
                    "---------runner:stepStart:step\n" +//click
                    "---------runner:stepUpdate:step\n" +
                    "----------runner:stepStart:step\n" +//?
                    "----------runner:stepUpdate:step\n" +
                    "----------runner:stepEnd:step\n" +
                    "---------runner:stepEnd:step\n" +
                    "--------runner:stepEnd:step\n" +
                    "-------runner:stepEnd:step\n" +
                    "------runner:stepEnd:step\n" +
                    "-----runner:stepEnd:step\n" +
                    "----runner:stepEnd:scene\n" +
                    "---runner:stepEnd:scenario\n" +
                    "--runner:stepEnd:root\n" +
                    "-runner:done:undefined\n");
            expect(strings.s1).toEqual(strings.s2);
        });

        it("should fire the correct sequence of events if focus is passed", function () {
            ux.runner.clearScenarios();
            scenario = ux.runner.addScenario("test 1", function (scene, find) {
                scene("scene 1", function () {
                    find("a:eq(1)").sendTap(true);
                });
            });
            ux.runner.run();
            var str = logEvents(ux.runner.dispatcher.events),
                strings = compareStrings(str,
                    "-runner:start:undefined\n" +
                    "--runner:stepStart:root\n" +
                    "--runner:stepUpdate:root\n" +
                    "---runner:stepStart:scenario\n" +
                    "---runner:stepUpdate:scenario\n" +
                    "----runner:stepStart:scene\n" +
                    "----runner:stepUpdate:scene\n" +
                    "-----runner:stepStart:step\n" +//find
                    "-----runner:stepUpdate:step\n" +
                    "------runner:stepStart:step\n" +//touchStart
                    "------runner:stepUpdate:step\n" +
                    "-------runner:stepStart:step\n" +//focus
                    "-------runner:stepUpdate:step\n" +
                    "--------runner:stepStart:step\n" +//touchEnd
                    "--------runner:stepUpdate:step\n" +
                    "---------runner:stepStart:step\n" +//touchCancel
                    "---------runner:stepUpdate:step\n" +
                    "----------runner:stepStart:step\n" +//click
                    "----------runner:stepUpdate:step\n" +
                    "-----------runner:stepStart:step\n" +//?
                    "-----------runner:stepUpdate:step\n" +
                    "-----------runner:stepEnd:step\n" +
                    "----------runner:stepEnd:step\n" +
                    "---------runner:stepEnd:step\n" +
                    "--------runner:stepEnd:step\n" +
                    "-------runner:stepEnd:step\n" +
                    "------runner:stepEnd:step\n" +
                    "-----runner:stepEnd:step\n" +
                    "----runner:stepEnd:scene\n" +
                    "---runner:stepEnd:scenario\n" +
                    "--runner:stepEnd:root\n" +
                    "-runner:done:undefined\n");
            expect(strings.s1).toEqual(strings.s2);
        });
    });
});