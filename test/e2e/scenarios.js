/*global */
(function () {
    'use strict';

    function scenarios(repeatUntil, scenario, scene, find, options, wait) {
        console.log("scenarios");
        //        injector.invoke(selectAccount);

        scenario("Datagrid Tests", function () {
            scene("should test this", function () {
                wait(500);
                find("a:eq(0)", options.timeouts.short).sendMouse().html('I got clicked');
                find("a:eq(0)").text();
            });

            scenario("nest description", function () {
                scene("should test nested it", function () {
                    find("a:eq(1)").text();
                });

                repeatUntil(function(done, count) {
                    if (count > 2) {
                        done();
                        return;
                    }
                    find("input").focus().select().sendKeys('test', 'test');
                });
            });

            scenario("test until", function () {
                scene("should run until and increment count to 10", function () {
                    find("input").val("").until("add letter 'a'", function () {
                        this.element.val(this.element.val() + 'a');
                        this.value = this.element.val();
                        return this.value && this.value.length >= 10;
                    }, options.timeouts.medium);
                });
            });
        });
    }

    ux.runner.addScenario('scenario1', scenarios);
    ux.runner.addScenario('scenario2', scenarios); // add it twice so we can test that tings are running.

}());