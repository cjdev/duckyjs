/*jshint smarttabs:true */
define(["protocop"], function(protocop){

	test("ducky creates a typesystem", function(){
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
		deepEqual(exception, "Found 2 duck-typing problems:\n" + 
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

		// DUCKYJS -> "Duck" Typing for Javascript

		var types =  protocop.createTypeSystem();

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
		
	});


});
