/*jshint smarttabs:true */
define(["protocop"], function(protocop){
	
	function fail(message){
		ok(false, message);
	}
	

	
    function assertThrows(expected, fn){
        try{
            fn();
            fail("Expected " + expected);
        }catch(e){
            equal(e, expected);
        }
    }
    

    test("fails fast when the expected constructor function doesn't exist", function(){

        // given
        var types = protocop.createTypeSystem();
        var type = types.register({
            foo:{
                type:"function",
                params:[{isa:"Foo"}]}
        });
        window.Foo = undefined;
        function Bar(){}
        
        var o = type.stub({});

        // when
        var exception;
        try{
            o.foo(new Bar());
        }catch(e){
            exception = e;
        }
        
        // then
        deepEqual(exception, 'foo(): invalid argument #1: I was expecting something constructed by "Foo" but there is no function by that name.');
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
	
	
   test("compile standalone function", function(){
        // given
        var types = protocop.createTypeSystem();


        // when
        var signature = types.compile(
                "function(string)->number"
        );
        
        // then
        var problems = signature.check(function(){});

        deepEqual(problems, {
              "matches": true,
              "problems": []
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
	
	test("compile works with instanceof checks", function(){
        // given
        var types = protocop.createTypeSystem();


        // when
        var type = types.compile(
                "when: instanceof(Date)"
        );
        
        // then
        var problems = type.check({
            when:{}
        });

        deepEqual(problems, {
              "matches": false,
              "problems": [
                '"when": expected something with "Date" in its prototype chain'
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
	
	test("you can name types", function(){
	    // given
	    var types = protocop.createTypeSystem();
	    
	    // when
        var type = types.compile(
                          '[CJComponent]',
                          '    render');
	    
	    // then
	    equal(type.name, "CJComponent");
	    deepEqual(types.typeNamed("CJComponent"), type);
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
	
	test("kill switch disables checks on new and existing items", function(){
		// given
		var types = protocop.createTypeSystem();
		var type = types.compile(
				"respond:function(string)->string"
		);
		var badImplementation = {
			respond:function(){return 33;}
		};
		var existingDynamic = type.dynamic(badImplementation);
		var existingStub = type.stub(badImplementation);
		
		// when
		types.disable();
		
		// then
		
		
		var error;
		try{
			type.assert({});
			deepEqual(type.check({}), {matches:true, problems:[]});
			var items = [
			             existingDynamic, 
			             existingStub, 
			             type.dynamic(badImplementation), 
			             type.stub(badImplementation)];
			
			for(var i=0;i<items.length;i++){
				var item = items[i];
				item.respond();
				item.respond("boo!");
			}
		}catch(e){
			error = e;
		}
		equal(error, undefined, "All checks should be disabled");
	});
	

});
