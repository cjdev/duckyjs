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
        var type = types.register("Foo", {});

        // then
        deepEqual(types.Foo, type);
    });
    
    
    test("type names appear in static type errors", function(){
        // given
        var types = protocop.createTypeSystem();

        var type = types.register("Foo", {
            name:{type:"string"},
            age:{type:"number"}
        });
        
        var invalidObject = {
            age:"yes"
        };
        
        // when
        var result = type.check(invalidObject);

        // then
        deepEqual(result, {
            "matches": false,
            "problems": [
              "\"Foo\" protocol violation: expected a property named \"name\"",
              "\"Foo\" protocol violation: \"age\": expected type number but was string"
            ]
          });
    });
    
    test("type names appear in dynamic errors", function(){
        // given
        var types = protocop.createTypeSystem();

        var type = types.register("Foo", {
            sayHi:{
                type:"function",
                params:[{type:"string"}],
                returns:{type:"string"}}
        });
        
        var wrapped = type.dynamic({
            sayHi:function(){return 33;}
        });
        
        // when
        var error1 = captureError(function(){
            wrapped.sayHi();
        });
        
        var error2 = captureError(function(){
            wrapped.sayHi(2);
        });
        
        var error3 = captureError(function(){
            wrapped.sayHi("stu");
        });

        // then
        deepEqual(error1, "\"Foo\" protocol violation: sayHi(): arity problem: expected 1 but was 0");
        deepEqual(error2, "\"Foo\" protocol violation: sayHi(): invalid argument #1: expected type string but was number");
        deepEqual(error3, "\"Foo\" protocol violation: sayHi(): invalid return type: expected type string but was number");
    });
    
    
    function captureError(fn){
        try{
            fn();
        }catch(e){
            return e;
        }
    }
    
    test("function signatures can be named", function(){
        // given
        var types = protocop.createTypeSystem();
        
        // when
        var signature = types.registerFn("stringHashFunction", [{type:"string"}], {type:"number"});
        
        // then
        ok(types.stringHashFunction);
        deepEqual(signature.name, "stringHashFunction");
        
    });
    
    test("dynamically checks named input function signatures", function(){
        // given
        var types = protocop.createTypeSystem();
        var printerType = types.registerFn("printer", [{type:"object"}], {type:"string"});
        types.registerFn("stringifier", 
                         [{type:"object"},
                          {type:"function", signature:"printer"}], 
                         {type:"function"});
        
        
        
        var checkedStringifier = types.stringifier.dynamic(function(object, printer){
            return printer(object);
        });
        
        // when
        var error = captureError(function(){
            var itemToPrint = {};
            var printer = function(){
                return 33;
            };
            
            checkedStringifier(itemToPrint, printer);
        });
        
        deepEqual(error, "printer(): invalid return type: expected type string but was number");
    });
    
    test("you can refer to named protocols from other protocols", function(){
        // given
        var types = protocop.createTypeSystem();
        var barType = types.register("Bar", {
            sayHi:{
                type:"function",
                params:[],
                returns:{type:"string"}}
        });
        var fooType = types.register("Foo", {
            makeBar:{
                type:"function",
                params:[],
                returns:{protocol:"Bar"}}
        });
        
        var foo = fooType.dynamic({
            makeBar:function(){
                return {
                    sayHi:function(){
                        return "Hello World";
                    }
                };
            }
        });
        // when
        var message = foo.makeBar().sayHi();

        // then
        deepEqual(message, "Hello World");
    });
    
    
    test("dynamic wrappers follow recursively", function(){
        // given
        var types = protocop.createTypeSystem();
        var barType = types.register("Bar", {
            sayHi:{
                type:"function",
                params:[],
                returns:{type:"string"}}
        });
        var fooType = types.register("Foo", {
            makeBar:{
                type:"function",
                params:[],
                returns:{protocol:"Bar"}},
            takeBar:{
                type:"function",
                params:[{protocol:"Bar"}]}
        });
        
        var foo = fooType.dynamic({
            makeBar:function(){
                return {
                    sayHi:function(){
                        return "Hello World";
                    }
                };
            },
            takeBar:function(){}
        });
        var bar = foo.makeBar();
        // when
        var error1 = captureError(function(){
            bar.sayHi("invalid argument");
        });
        var error2 = captureError(function(){
            foo.takeBar({});
        });

        // then
        deepEqual(error1, "\"Bar\" protocol violation: sayHi(): arity problem: expected 0 but was 1");
        deepEqual(error2, "\"Foo\" protocol violation: takeBar(): invalid argument #1: Doesn't comply with \"Bar\" protocol: \"Bar\" protocol violation: expected a property named \"sayHi\"");
    });
    
    
    test("wrapping a standalone function", function(){
        // given
        var types = protocop.createTypeSystem();

        // when
        var signature = types.registerFn([{type:"string"}],{type:"string"});

        // then
        assertThrows("anonymous function: arity problem: expected 1 but was 0", function(){
            var wrapper= signature.dynamic(function(){});
            wrapper();
        });
        assertThrows("anonymous function: invalid argument #1: expected type string but was number", function(){
            var wrapper= signature.dynamic(function(){});
            wrapper(1);
        });
        assertThrows("anonymous function: invalid return type: expected type string but was number", function(){
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
    
    test("protocols can have optional properties", function(){
        // given
        var types = protocop.createTypeSystem();
        
        
        // when
        var type = types.register("Foo", {
            maybeName:{type:"string", optional:true}
        });
        
        // then
        deepEqual(type.check({}).problems, []);
        deepEqual(type.check({maybeName:"bar", baz:function(){}}).problems, []);
        deepEqual(type.check({maybeName:1, baz:function(){}}).problems, ["\"Foo\" protocol violation: \"maybeName\": expected type string but was number"]);
    });
    
    test("protocols know about their protocol dependencies", function(){
        // given
        var types = protocop.createTypeSystem();
        types.register("Bar", {});
        types.register("Baz", {});
        var fooType = types.register("Foo", {
            bar2Baz:{
                type:"function",
                params:[{protocol:"Bar"}],
                returns:{protocol:"Baz"}}
        });
        
        // when
        var dependencies = fooType.dependencies();

        // then
        deepEqual(dependencies, ["Bar", "Baz"]);
    });
    
    test("signatures know about their protocol dependencies", function(){
        // given
        var types = protocop.createTypeSystem();
        types.register("Bar", {});
        types.register("Baz", {});
        var signature = types.registerFn("bar2Baz", [{protocol:"Bar"}], {protocol:"Baz"});
        
        // when
        var dependencies = signature.dependencies();

        // then
        deepEqual(dependencies, ["Bar", "Baz"]);
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
        deepEqual(exception, "foo(): arity problem: expected 1 but was 0");
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
    
    test("dynamic() doesn't mess with the prototype chain", function(){
        // given
        var types = protocop.createTypeSystem();
        var t = types.compile("[date]",
                            "getDate:function()->number");
        var orig = new Date();
        
        // when
        var wrapped = t.dynamic(orig);
        
        // then
        ok(wrapped instanceof Date, 'proxies are still an instanceof');
        ok(orig.constructor === wrapped.constructor, 'same constructor');
        equal(orig.getDate(), wrapped.getDate(), 'just a paranoid check to make sure they work in this context too');
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
            equal(e, "respond(): arity problem: expected 1 but was 0");
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
