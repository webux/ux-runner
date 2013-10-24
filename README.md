# ux-runner.js #
----------
Runner is a scenario runner. While it can also be used as an e2e tester, it is used to perform scenarios within an application. It will not navigate to different urls because it runs within the current app.

## Advantages over protractor or karma ##
**Protractor and karma both work directly off of angular digests.** While this initially sounds like it has some advantages it ends up being more of a crutch than helpful. Because of any digests get out of sync then the test are stuck even though the application is working fine. 

**Live adding of steps allows for conditions.** This allows you to do something that you cannot do in the other applications, conditions. Conditions make a scenario runner smart. There is a need for this. Unit tests are meant to be dumb, but end to end tests are meant to be smart because your application has modes and conditions. Let's say for example that have to have a user select an account of theirs to work with before the can get to another portion of their app. Well with live steps you can wrap your condition within a step to check for the account selection and if selected run the scenarios you had planned, but if not then select the account first, then run the scenarios you had planned.

**Injection** We all love Angular and one of my favorite features of it is injection. So runner leverages Angular's injection to make your tests easier. Scenarios can inject methods that you need from runners as well as from your app. See "using injections" below.

**jQuery selectors** yes I know you shouldn't use jQuery with Angular. But it is so much easier than trying to find which model property something is binding to. And because we look for selectors it is easy to wait for them. Runner is built on the concept of waiting. So for "find" it will keep trying to select that item until it times out. This means that if your application is running slow, multiple service calls, or misc other things before it is ready that is not a problem. You just increase the timeout time so it will keep trying as long as there is time.

## Getting Started ##
The following files are included in the application.

- ux-runner.js (the core of the runner)
- config.js (config options for the runner)
- sendKeys.js (used to simulate keys in input fields with keydown, keyup, enterkey, etc).
- renderer.js (the visual display)

Since runner needs scenarios to run you must first have scenarios loaded into your application. To add a scenario to your application the code looks like this. This code snippet is an example of file scenario1.js. 

    angular.module("runner").run(function () {
        runner.addScenario('scenario1', function(scenario, step, find) {
	        scenario("Datagrid Tests", function () {
	            step("should test this", function () {
	                find("a:eq(0)").mouseClick(); // please note that mouseClick will fire moudown, focus, mouseup, and click.
	            });
	        });
	    });
    });

With the snippet above we first attach to the module namespace for "runner" and then because we want it to run as soon as "runner" is ready we add our next function into the run method for the module.
	
This then will add a new scenario with the name "scenario1" to the runner. You can see all of the scenario names that are registered by running "runner.getScenarioNames()" in the console.

When adding a scenario you will see above that it passes a name and also a method that is injecting methods for the scenario. It is injecting "scenario", "step", and "find". You will need these methods in order to run your tests. You can access all of the injectable methods by inspecting "runner.locals". This is also how you add methods to be injected which we will cover later.

## How a test should be written ##
A scenario should follow this structure, a scenario has steps, steps have finds. When you register a scenario it can have more than one scenario in it as sibling on the main timeline of the scenario function. However because you can run individual scenarios and not just the all of them every time it is recommended that you only have one scenario per "addScenario" method call so the tests can be run individually.

## Running ##
You can run a single, multiple, or all scenarios. Runner uses the console to start. Because it runs in your app you need to start up your app before running runner. When you are ready, you run.

**Run all scenarios.**

	ux.runner.run()

**Run a scenario** (notice the name matches the first example. registered scenario names are passed to run them individually)

	ux.runner.run('scenario1')

**Run multiple scenarios**. You probably already guessed this one by now.

	ux.runner.run('scenario1', 'addItemsToCart', 'submitCart')

## Using Injections ##
Scenarios and steps have the ability to use injection both from runner and from the *app you are testing. As you can see in the example below "userModel" is injected into scenario while "loginModel" is injected into step.
*(if you are using angular-runner.js)

	scenario("Test my page", function (userModel) {
		if (!user.username) {
			step("login user", function (loginModel) {
				loginModel.login('user1', 'angularRocks');
			});
		}
	}

If you want to inject using angular. You need to use the angular-runner.js. Then it will automatically use the angular injector instead of the build in one.

You can also use this to link other functions from runner. This example injects waitFor as well as options. Both of which are defined on runner. (see runner.locals for all possible injections from runner).

	scenario("Test my page", function() {
		step("wait for page to load", function (waitFor, options) {
			waitFor("accounts", function () {
				return accounts.isLoaded();
			}, options.timeouts.medium);
		} 
	}

Options you will notice is the same as your configs. So the items you define in your configs show up on options.

## Custom functions ##
We had talked before about having the need to login to an account first as a condition. But it would be annoying to have to do that every time in your scenarios, and we want them all to be able to run on their own, so we need the ability to add in some easy methods to handle repeated steps that we can add to any scenario.

In this example we have created the method "selectAccount". This method defines a new step "should select an account". This step will select the account for a user if they do not have one selected yet.
	
    ux.runner.locals.selectAccount = function() {
		// if any injection isn't working. Here is how you cheat to get methods you need. Remember, they are all on locals.
        var step = ux.runner.locals.step, find = ux.runner.locals.find, options = ux.runner.locals.options;
        step("should select an account", function (user) {
            if (!user.accounts.getSelectedAccount()) {
                find(".accountSelectGridRow:eq(0)").click();
                find(".blue", options.timeouts.long, "wait for home page button");
            }
        });
    };

So the real trick here is that it adds this method to the locals. So now just like any other methods, you can now get this one injected into your scenario. Let's show an example of "selectAccount" being injected and used.

    ux.runner.addScenario('searchCatalog', function scenarios(scenario, step, find, options, selectAccount) {
        scenario("Select button", function () {

            selectAccount(); // here we use the custom function. Since it creates a step it needs executed inside of a scenario.

            step("select button", function () {
                find(".myButton").click();
            }, function () {
                return $('myButton').hasClass('selected');
            });
        });
    });

## API ##
The methods that are already defined fall into a couple of categories. There are methods that are part of the runner api, and then the are also jQuery methods that are added as part of the find and any of it's chain methods.

- **scenario** (label:String, method:function): create a new scenario
- **step**(label:String, method:function, validate:function, timeout:Milliseconds): creates a new step. Validate is a second method that you can pass that will check a condition. If the condition returns true it passes, if it returns false it fails, if you fail to pass it then it passes.
- **find**(selector:String, timeout:Milliseconds, label:String): does a jquery seletion and waits for it to be ready. This will keep trying until it times out of the selection is not successful.
- **options**: the configs. options.timeouts.short gives you milliseconds. It has short, medium, long, and forever.
- **waitFor**(label:String, method:function, timeout:Milliseconds): wait for the function to return true
- **waitForNgEvent**(event:String, timeout:Milliseconds): wait for an event... (not complete).
- **waitForJQEvent**: wait for a jquery event. (not complete).

For the find API it is like jQuery methods except one additional few that are quite note worthy. So you have your standard, click, focus, blur, etc.

- mouseClick(): this does a series of other methods to simulate a more realistic event. This will do a mousedown, focus, mouseup, click. This simulates the actual event pattern when a user clicks. It can be handy if you have directives on inputs that are listening for something particular in the sequence.
- sendKeys(): uh,... this one is a topic all of it's own. So check the heading below.

Info events can be chained. So you can do one selection and then do multiple chained events.

	find(".button").focus().select().click();

**[TODO]** There is a bug with sendKeys()... that it won't chain after it. It will chain up to it.

## sendKeys ##
Send keys simulates user input. It takes patterns from a string to enter those values into input fields. Here is an example string.

	find("input").sendKeys('"Yo! What's Up!" enter');

So what this does is find the input. Then it sends the keys into the input for the string in the quotes then it will do an enter key event when done. Pretty slick eh?

