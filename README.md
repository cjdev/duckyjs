duckyjs
=======

A lightweight tool for ad-hoc, runtime, "duck type" contract enforcement in javascript.  See http://en.wikipedia.org/wiki/Duck_typing.

user stories
=======

As an engineer who TDDs javascript code, I want a way to enforce contracts when components are shared, so that I can refactor with confidence that my code is working when the tests are green.

example
=======

		var types =  ducky.createTypeSystem();

		var animalType = types.compile(
			"name:string",
			"jump:function",
		    "respond:function(string)"
		);

		var goodAnimal = {
		    specialProperty:"foobar",
		    name:"ralph",
			jump:function(){},
			respond:function(name){}
		};
		
		var badAnimal = {
			
		};

		equal(animalType.check(badAnimal).matches, false);
		console.log(animalType.check(badAnimal));
		var animal = animalType.dynamic(goodAnimal);
		
		try{
			animal.respond();
			fail("shouldn't get here because we passed an invalid number of arguments");
		}catch(e){
			equal(e, "arity problem: expected 1 but was 0");
		}
		
		var mockAnimal = animalType.stub({
			respond:function(message){return message + " ... I see .... interesting ...";}
		});

		
		try{
			mockAnimal.respond(33);
			fail("shouldn't get here because we passed an invalid argument type");
		}catch(e){
			equal(e, "respond(): invalid argument #1: expected type string but was number");
		}
