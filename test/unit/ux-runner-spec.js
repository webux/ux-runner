describe("ux-runner", function () {

    var events, scenario, console, body, logged;

    beforeEach(function () {
        ux.runner.clearScenarios();
        logged = false;
        window.tmp = {
            log: function () {
                logged = true;
            }
        };
        body = $('<div>' +
            '<a href="" onclick="javascript:window.tmp.log(\'click happened\')">Test 1</a>' +
            '<a href="">Test 2</a>' +
            '<input type="text" ng-model="testNgValue">' +
            '</div>'
        );
        ux.runner.config({async: false, rootElement: body}); // rootElement determines runner's scope.
        ux.runner.dispatcher = {
            events: [],
            dispatch: function (event, step) {
                this.events.push({event: event, type: step && step.type || undefined});
            }
        };
        events = ux.runner.events;
        scenario = ux.runner.addScenario('test1', function (step, find) {
            step("test1 scenario", function () {
                find("a:eq(0)").click();
            });
        });
    });

    it("scenario should create a step", function () {
        ux.runner.run();
        expect(ux.runner.dispatcher.events.length).toBe(17);
    });

    it("runner should fire events in the correct sequence", function () {
        ux.runner.run();
        expect(ux.runner.dispatcher.events).toEqual([
            {event: events.START, type: undefined},
                // root wrapper.
                {event: events.STEP_START, type: ux.runner.types.ROOT},
                {event: events.STEP_UPDATE, type: ux.runner.types.ROOT},
                    // scenario
                    {event: events.STEP_START, type: ux.runner.types.SCENARIO},
                    {event: events.STEP_UPDATE, type: ux.runner.types.SCENARIO},
                        // step
                        {event: events.STEP_START, type: ux.runner.types.STEP},
                        {event: events.STEP_UPDATE, type: ux.runner.types.STEP},
                            // find
                            {event: events.STEP_START, type: ux.runner.types.SUB_STEP},
                            {event: events.STEP_UPDATE, type: ux.runner.types.SUB_STEP},
                            {event: events.STEP_END, type: ux.runner.types.SUB_STEP},
                            // click
                            {event: events.STEP_START, type: ux.runner.types.SUB_STEP},
                            {event: events.STEP_UPDATE, type: ux.runner.types.SUB_STEP},
                            {event: events.STEP_END, type: ux.runner.types.SUB_STEP},
                        {event: events.STEP_END, type: ux.runner.types.STEP},
                    {event: events.STEP_END, type: ux.runner.types.SCENARIO},
                {event: events.STEP_END, type: ux.runner.types.ROOT},
            {event: events.DONE, type: undefined}
        ]);
    });

    it("should execute tests against the dom.", function () {
        logged = false;
        ux.runner.run();
        // logged is set when the html element is clicked on.
        expect(logged).toBe(true);
    });

    it("should exit if scenario does not have at least one step.", function () {
        ux.runner.clearScenarios();
        scenario = ux.runner.addScenario('test1', function (step, find) {
            // Note this is missing step on purpose.
            find("a:eq(0)").click();
        });
        ux.runner.run();
        expect(ux.runner.exit).toBe(true);
    });

    describe("sendKeys", function () {
        it("should fire the following sequence of events", function () {
            ux.runner.clearScenarios();
            scenario = ux.runner.addScenario("test 1", function (step, find) {
                step("step 1", function () {
                    find("input").sendKeys("'abc' enter");
                });
            });
            ux.runner.run();
            expect(ux.runner.dispatcher.events).toEqual([
                {event: events.START, type: undefined},
                    // root wrapper.
                    {event: events.STEP_START, type: ux.runner.types.ROOT},
                    {event: events.STEP_UPDATE, type: ux.runner.types.ROOT},
                        // scenario
                        {event: events.STEP_START, type: ux.runner.types.SCENARIO},
                        {event: events.STEP_UPDATE, type: ux.runner.types.SCENARIO},
                            // step
                            {event: events.STEP_START, type: ux.runner.types.STEP},
                            {event: events.STEP_UPDATE, type: ux.runner.types.STEP},
                                // find
                                {event: events.STEP_START, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_UPDATE, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_END, type: ux.runner.types.SUB_STEP},
                                // sendKeys
                                {event: events.STEP_START, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_UPDATE, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_END, type: ux.runner.types.SUB_STEP},
                            {event: events.STEP_END, type: ux.runner.types.STEP},
                        {event: events.STEP_END, type: ux.runner.types.SCENARIO},
                    {event: events.STEP_END, type: ux.runner.types.ROOT},
                {event: events.DONE, type: undefined}
            ]);
        });
    });

    describe("sendMouse", function () {

        it("should fire the correct sequence of events", function () {
            ux.runner.clearScenarios();
            scenario = ux.runner.addScenario("test 1", function (step, find) {
                step("step 1", function () {
                    find("a:eq(1)").sendMouse();
                });
            });
            ux.runner.run();
            expect(ux.runner.dispatcher.events).toEqual([
                {event: events.START, type: undefined},
                    // root wrapper.
                    {event: events.STEP_START, type: ux.runner.types.ROOT},
                    {event: events.STEP_UPDATE, type: ux.runner.types.ROOT},
                        // scenario
                        {event: events.STEP_START, type: ux.runner.types.SCENARIO},
                        {event: events.STEP_UPDATE, type: ux.runner.types.SCENARIO},
                            // step
                            {event: events.STEP_START, type: ux.runner.types.STEP},
                            {event: events.STEP_UPDATE, type: ux.runner.types.STEP},
                                // find
                                {event: events.STEP_START, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_UPDATE, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_END, type: ux.runner.types.SUB_STEP},
                                // mouseDown
                                {event: events.STEP_START, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_UPDATE, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_END, type: ux.runner.types.SUB_STEP},
                                // mouseUp
                                {event: events.STEP_START, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_UPDATE, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_END, type: ux.runner.types.SUB_STEP},
                                // click
                                {event: events.STEP_START, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_UPDATE, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_END, type: ux.runner.types.SUB_STEP},
                            {event: events.STEP_END, type: ux.runner.types.STEP},
                        {event: events.STEP_END, type: ux.runner.types.SCENARIO},
                    {event: events.STEP_END, type: ux.runner.types.ROOT},
                {event: events.DONE, type: undefined}
            ]);
        });

        it("should fire the correct sequence of events if focus is passed", function () {
            ux.runner.clearScenarios();
            scenario = ux.runner.addScenario("test 1", function (step, find) {
                step("step 1", function () {
                    find("a:eq(1)").sendMouse(true);
                });
            });
            ux.runner.run();
            expect(ux.runner.dispatcher.events).toEqual([
                {event: events.START, type: undefined},
                    // root wrapper.
                    {event: events.STEP_START, type: ux.runner.types.ROOT},
                    {event: events.STEP_UPDATE, type: ux.runner.types.ROOT},
                        // scenario
                        {event: events.STEP_START, type: ux.runner.types.SCENARIO},
                        {event: events.STEP_UPDATE, type: ux.runner.types.SCENARIO},
                            // step
                            {event: events.STEP_START, type: ux.runner.types.STEP},
                            {event: events.STEP_UPDATE, type: ux.runner.types.STEP},
                                // find
                                {event: events.STEP_START, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_UPDATE, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_END, type: ux.runner.types.SUB_STEP},
                                // mouseDown
                                {event: events.STEP_START, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_UPDATE, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_END, type: ux.runner.types.SUB_STEP},
                                // focus
                                {event: events.STEP_START, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_UPDATE, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_END, type: ux.runner.types.SUB_STEP},
                                // mouseUp
                                {event: events.STEP_START, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_UPDATE, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_END, type: ux.runner.types.SUB_STEP},
                                // click
                                {event: events.STEP_START, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_UPDATE, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_END, type: ux.runner.types.SUB_STEP},
                            {event: events.STEP_END, type: ux.runner.types.STEP},
                        {event: events.STEP_END, type: ux.runner.types.SCENARIO},
                    {event: events.STEP_END, type: ux.runner.types.ROOT},
                {event: events.DONE, type: undefined}
            ]);
        });
    });

    describe("sendTap", function () {

        it("should fire the correct sequence of events", function () {
            ux.runner.clearScenarios();
            scenario = ux.runner.addScenario("test 1", function (step, find) {
                step("step 1", function () {
                    find("a:eq(1)").sendTap();
                });
            });
            ux.runner.run();
            expect(ux.runner.dispatcher.events).toEqual([
                {event: events.START, type: undefined},
                    // root wrapper.
                    {event: events.STEP_START, type: ux.runner.types.ROOT},
                    {event: events.STEP_UPDATE, type: ux.runner.types.ROOT},
                        // scenario
                        {event: events.STEP_START, type: ux.runner.types.SCENARIO},
                        {event: events.STEP_UPDATE, type: ux.runner.types.SCENARIO},
                            // step
                            {event: events.STEP_START, type: ux.runner.types.STEP},
                            {event: events.STEP_UPDATE, type: ux.runner.types.STEP},
                                // find
                                {event: events.STEP_START, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_UPDATE, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_END, type: ux.runner.types.SUB_STEP},
                                // touchStart
                                {event: events.STEP_START, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_UPDATE, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_END, type: ux.runner.types.SUB_STEP},
                                // touchEnd
                                {event: events.STEP_START, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_UPDATE, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_END, type: ux.runner.types.SUB_STEP},
                                // click
                                {event: events.STEP_START, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_UPDATE, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_END, type: ux.runner.types.SUB_STEP},
                            {event: events.STEP_END, type: ux.runner.types.STEP},
                        {event: events.STEP_END, type: ux.runner.types.SCENARIO},
                    {event: events.STEP_END, type: ux.runner.types.ROOT},
                {event: events.DONE, type: undefined}
            ]);
        });

        it("should fire the correct sequence of events if focus is passed", function () {
            ux.runner.clearScenarios();
            scenario = ux.runner.addScenario("test 1", function (step, find) {
                step("step 1", function () {
                    find("a:eq(1)").sendTap(true);
                });
            });
            ux.runner.run();
            expect(ux.runner.dispatcher.events).toEqual([
                {event: events.START, type: undefined},
                    // root wrapper.
                    {event: events.STEP_START, type: ux.runner.types.ROOT},
                    {event: events.STEP_UPDATE, type: ux.runner.types.ROOT},
                        // scenario
                        {event: events.STEP_START, type: ux.runner.types.SCENARIO},
                        {event: events.STEP_UPDATE, type: ux.runner.types.SCENARIO},
                            // step
                            {event: events.STEP_START, type: ux.runner.types.STEP},
                            {event: events.STEP_UPDATE, type: ux.runner.types.STEP},
                                // find
                                {event: events.STEP_START, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_UPDATE, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_END, type: ux.runner.types.SUB_STEP},
                                // touchStart
                                {event: events.STEP_START, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_UPDATE, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_END, type: ux.runner.types.SUB_STEP},
                                // focus
                                {event: events.STEP_START, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_UPDATE, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_END, type: ux.runner.types.SUB_STEP},
                                // touchEnd
                                {event: events.STEP_START, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_UPDATE, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_END, type: ux.runner.types.SUB_STEP},
                                // click
                                {event: events.STEP_START, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_UPDATE, type: ux.runner.types.SUB_STEP},
                                {event: events.STEP_END, type: ux.runner.types.SUB_STEP},
                            {event: events.STEP_END, type: ux.runner.types.STEP},
                        {event: events.STEP_END, type: ux.runner.types.SCENARIO},
                    {event: events.STEP_END, type: ux.runner.types.ROOT},
                {event: events.DONE, type: undefined}
            ]);
        });
    });
});