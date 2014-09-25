/*jshint smarttabs:true */
define(["protocop"], function(protocop){

    function fail(message){
        ok(false, message);
    }

    test("joe creates a typesystem", function(){
        // when
        var types = protocop.createTypeSystem();
        // then
        ok(types);
    });


    test("a standalone function", function(){
        // given
        var types = protocop.createTypeSystem();
        // when
        var signature = types.registerFn([{type:"string"}],{type:"string"});

        // then
        ok(signature);
        deepEqual(signature.check(function(){}), {matches:true, problems:[]});
        deepEqual(signature.check({}), 
                {
            matches:false,
            problems:["expected type function but was object"]
                });
        deepEqual(signature.check(9), {
            "matches": false,
            "problems": [
                         "expected type function but was number"
                         ]
        });
        deepEqual(signature.check(""), {
            "matches": false,
            "problems": [
                         "expected type function but was string"
                         ]
        });
    });

    function assertThrows(expected, fn){
        try{
            fn();
            fail("Expected " + expected);
        }catch(e){
            equal(e, expected);
        }
    }

    test("you can refer to named types", function(){
        // given
        var types = protocop.createTypeSystem();

        // when
        var type = types.register({
            name:"Foo"
        });

        // then
        deepEqual(types.Foo, type);
    });

    test("wrapping a standalone function", function(){
        // given
        var types = protocop.createTypeSystem();

        // when
        var signature = types.registerFn([{type:"string"}],{type:"string"});

        // then
        assertThrows("arity problem: expected 1 but was 0", function(){
            var wrapper= signature.dynamic(function(){});
            wrapper();
        });
        assertThrows("(): invalid argument #1: expected type string but was number", function(){
            var wrapper= signature.dynamic(function(){});
            wrapper(1);
        });
        assertThrows("(): invalid return type: expected type string but was number", function(){
            var wrapper= signature.dynamic(function(){return 1;});
            wrapper("input");
        });
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

    test("arguments are rejected when they fail instanceof checks", function(){

        // given
        var types = protocop.createTypeSystem();
        var type = types.register({
            foo:{
                type:"function",
                params:[{isa:"Foo"}]}
        });
        window.Foo = function(){};
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
        deepEqual(exception, 'foo(): invalid argument #1: expected something with "Foo" in its prototype chain');
    });


    test("arguments are accepted when they pass instanceof checks", function(){

        // given
        var types = protocop.createTypeSystem();
        var type = types.register({
            foo:{
                type:"function",
                params:[{isa:"Foo"}]}
        });
        window.Foo = function(){};

        var o = type.dynamic({
            foo:function(a){}
        });

        // when
        var exception;
        try{
            o.foo(new Foo());
        }catch(e){
            exception = e;
        }

        // then
        deepEqual(exception, undefined);
    });



    test("dynamic() leaves other properties alone", function(){

        // given
        var types = protocop.createTypeSystem();
        var type = types.register({
            a:{type:"string"}
        });

        var o = type.dynamic({
            a:"some text",
            foo:function(){
                return 33;
            }
        });

        // when
        var result = o.foo("give me a string");

        // then
        equal(33, result);
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

        // Now, for a little "unprotected" code execution... 
        types.disable();
        try{
            animal.respond();
            animal.respond("hi");
            mockAnimal.respond("hi");
        }catch(err){
            fail("Shouldn't get there, since all checks were disabled (" + err + ")");
        }

    });


});
