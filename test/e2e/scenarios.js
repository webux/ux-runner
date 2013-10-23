/*global */
(function () {
    'use strict';

    function scenarios(scenario, step, find, options, waitFor, waitForNgEvent) {
        console.log("scenarios");
        //        injector.invoke(selectAccount);

        scenario("Datagrid Tests", function () {
            step("should test this", function () {
                find("a:eq(0)", options.timeouts.short).sendMouse().html('I got clicked');
//                find("a:eq(0)", options.timeouts.short).html('I got clicked');
                find("a:eq(0)").text();
//                waitFor("waiting for something", function() {
//                    return true;
//                }, timeouts.long);
//                waitForScopeEvent('eventName', timeouts.medium, function () {
//                    return $('.datagrid').scope();
//                });
//                waitForJQEvent('eventName', timeouts.medium);
            });

            scenario("nest description", function () {
                step("should test nested it", function () {
                    find("a:eq(1)").text();
                });

                step("should set the text", function () {
                    find("input").focus().select().sendKeys('test', 'test');
//                    find("input").enter();
                });
            })
        });
    }

    runner.addScenario('scenario1', scenarios);
    runner.addScenario('scenario2', scenarios); // add it twice so we can test that tings are running.

}());