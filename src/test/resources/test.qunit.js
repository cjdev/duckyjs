/*jshint smarttabs:true */
define(["protocop"], function(protocop){

	test("joe creates a typesystem", function(){
		// when
		var types = protocop.createTypeSystem();
		// then
		ok(types);
	});

	test("a blank type", function(){
		// given
		var types = protocop.createTypeSystem();
		// when
		var anyType = types.register({});

		// then
		ok(anyType);
		equal(anyType.check({}).matches, true);
		equal(anyType.check({foo:"bar", baz:function(){}}).matches, true);
	});

	test("spec with a property", function(){

		// given
		var types = protocop.createTypeSystem();
		var spec = {
				foo:"*"
		};

		// when
		var anyType = types.register(spec);

		// then
		ok(anyType);
		var missing = anyType.check({});
		equal(missing.matches, false, 
				"Fails when there is no attribute with the specified name");
		deepEqual(missing.problems, ['expected a property named "foo"']);
		equal(anyType.check({foo:null}).matches, true, 
		"Passes when there is an attribute with the specified name");
	});


	test("spec with a string property", function(){

		// given
		var types = protocop.createTypeSystem();
		var spec = {
				foo:{type:"string"}
		};

		// when
		var anyType = types.register(spec);

		// then
		ok(anyType);
		var withNumber = anyType.check({foo:33});
		equal(withNumber.matches, false, 
				"Fails when the attribute is not of the specified type");

		deepEqual(['"foo": expected type string but was number'], withNumber.problems);
		equal(anyType.check({foo:"bar"}).matches, true, 
		"Passes when there is an attribute with the specified name");
	});

	test("spec with a method", function(){

		// given
		var types = protocop.createTypeSystem();
		var spec = {
				foo:{type:"function"}
		};

		// when
		var anyType = types.register(spec);

		// then
		ok(anyType);
		var withNumber = anyType.check({foo:33});
		equal(withNumber.matches, false, 
				"Fails when the attribute is not of the specified type");
		equal(anyType.check({foo:function(){}}).matches, true, 
		"Passes when there is an attribute with the specified name");
	});

	test("dynamic() checks method arity", function(){

		// given
		var types = protocop.createTypeSystem();
		var type = types.register({
			foo:{
				type:"function",
				params:[{type:"string"}]}
		});

		var o = type.dynamic({foo:function(){}});

		// when
		var exception;
		try{
			o.foo();
		}catch(e){
			exception = e;
		}

		// then
		deepEqual(exception, "arity problem: expected 1 but was 0");
	});
	
	test("dynamic() checks argument types", function(){

		// given
		var types = protocop.createTypeSystem();
		var type = types.register({
			foo:{
				type:"function",
				params:[{type:"string"}]}
		});

		var o = type.dynamic({foo:function(){}});

		// when
		var exception;
		try{
			o.foo(33);
		}catch(e){
			exception = e;
		}

		// then
		deepEqual(exception, 'foo(): invalid argument #1: expected type string but was number');
	});
	
	
	test("dynamic() checks return types", function(){

		// given
		var types = protocop.createTypeSystem();
		var type = types.register({
			foo:{
				type:"function",
				params:[{type:"string"}],
				returns:{type:"string"}}
		});

		var o = type.dynamic({foo:function(){
			return 33;
		}});

		// when
		var exception;
		try{
			o.foo("give me a string");
		}catch(e){
			exception = e;
		}
		
		// then
		deepEqual(exception, 'foo(): invalid return type: expected type string but was number');
	});
	
	test("dynamic() handles 'this' properly", function(){

		// given
		var types = protocop.createTypeSystem();
		var type = types.register({
			foo:{
				type:"function",
				params:[{type:"number"}, {type:"boolean"}]}
		});

		var o = type.dynamic({
					bar:"baz", 
					foo:function(arg1, arg2, arg3){
						return this.bar + ", " + arg1 + ", " + arg2 + ", " + arg3;
					}
				});
		
		// when
		var result = o.foo(33, false);

		// then
		equal(result, "baz, 33, false, undefined");
	});

	test("assert", function(){

		// given
		var types = protocop.createTypeSystem();
		var type = types.register({
			foo:{type:"function"},
			bar:"*"
		});

		// when
		var exception;
		try{
			type.assert({});
		}catch(e){
			exception = e;
		}

		// then
		deepEqual(exception, "Found 2 interface violations:\n" + 
							 '    1: expected a property named "foo"\n' + 
							 '    2: expected a property named "bar"');
	});
	
	test("parse", function(){

		// when
		var result = protocop.parse(
				"crawl",
				"walk:function",
				"jump:function(string)"
		);
		
		// then
		deepEqual(result, {
							crawl:"*",
							walk:{type:"function"},
							jump:{type:"function", params:[{type:"string"}]}
						   });
	});
	
	test("compile", function(){
		// given
		var types = protocop.createTypeSystem();


		// when
		var type = types.compile(
				"crawl",
				"walk:function",
				"jump:function(string)"
		);
		
		// then
		var problems = type.check({});

		deepEqual(problems, {
			  "matches": false,
			  "problems": [
			    'expected a property named "crawl"',
			    'expected a property named "walk"',
			    'expected a property named "jump"'
			  ]
			});
	});
	
	test("compile works with return types", function(){
		// given
		var types = protocop.createTypeSystem();


		// when
		var type = types.compile(
				"talk:function(string)->string"
		);
		
		// then
		var wrapped = type.dynamic({
			talk:function(){
				return 33;
			}
		});

		try{
			wrapped.talk("hi");
			fail("should have failed due to the invalid return type");
		}catch(err){
			equal(err, "talk(): invalid return type: expected type string but was number");
		}
		
	});
	
	test("stub()", function(){
		// given
		var types = protocop.createTypeSystem();
		var type = types.compile(
				"crawl",
				"walk:function",
				"jump:function"
		);
		
		// when
		var stub = type.stub({
			jump:function(){return "how high?";}
		});
		
		// then
		var exception;
		try{
			stub.walk();
		}catch(e){
			exception = e;
		}
		equal(exception, "stub method not implemented: walk()");
		equal(stub.crawl, "stub property not implemented: crawl");
		equal(stub.jump(), "how high?");
	});
	
	test("demo", function(){
		
		// Suppose you have 2 animals
		
		var goodAnimal = {
		    specialProperty:"foobar",
		    name:"ralph",
			jump:function(){},
			respond:function(name){}
		};
		
		var badAnimal = {};
		
		
		// Define your interface/protocol		
		var types =  protocop.createTypeSystem();
		
		var animalType = types.compile(
			"name:string",
			"jump:function",
		    "respond:function(string)->string"
		);
		
		// We can do static checks against the interfaces
		equal(animalType.check(goodAnimal).matches, true);
		equal(animalType.check(badAnimal).matches, false);
		
		// We can use assert() to do static checks too
		try{
			animalType.assert(badAnimal);
			fail("shouldn't get here because assert will throw an exception");
		}catch(e){
			equal(e, 'Found 3 interface violations:\n' +
				    '    1: expected a property named "name"\n' +
				    '    2: expected a property named "jump"\n' +
				    '    3: expected a property named "respond"');
		}
		
		
		// Now let's add dynamic protocol enforcement.
		var animal = animalType.dynamic(goodAnimal);
		
		try{
			animal.respond();
			fail("shouldn't get here because we passed an invalid number of arguments");
		}catch(e){
			equal(e, "arity problem: expected 1 but was 0");
		}
		
		try{
			animal.respond("hi");
			fail("we didn't return anything ... contract violation!");
		}catch(e){
			equal(e, "respond(): invalid return type: expected type string but was undefined");
		}
		
		
		// Meanwhile, in test land, let's mock-out the interesting parts of the contract ...
		var mockAnimal = animalType.stub({
			respond:function(message){return 2323;}
		});
		
		
		// Oops, we violated our contract!
		try{
			mockAnimal.respond(33);
			fail("shouldn't get here because we passed an invalid argument type");
		}catch(e){
			equal(e, "respond(): invalid argument #1: expected type string but was number");
		}
		
		try{
			mockAnimal.respond("hi");
			fail("shouldn't get here because our mock returned the wrong result type");
		}catch(e){
			equal(e, "respond(): invalid return type: expected type string but was number");
		}
		
		// Unimplemented stub methods throw a timely exception
		try{
			mockAnimal.jump();
			fail("shouldn't get here because we haven't mocked out this method");
		}catch(e){
			equal(e, "stub method not implemented: jump()");
		}
		
	});


});
