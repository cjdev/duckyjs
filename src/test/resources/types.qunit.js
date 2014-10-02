/*jshint smarttabs:true */
define(["types!foo", "types!FooMaker"], function(foo, FooMaker){
    
    test("require plugin works", function(){
        //then
        ok(foo);
        var problems = foo.check({});
        equal(foo.name, "foo");
        deepEqual(problems, {matches:false, problems:[
                                '"foo" protocol violation: expected a property named "sayHi"',
                                "\"foo\" protocol violation: expected a property named \"makeBar\""]});

    });
    
    test("require plugin loads functions too", function(){
        //then
        ok(FooMaker);
        var problems = FooMaker.check({});
//        equal(FooMaker.name, "FooMaker");
        deepEqual(problems, {matches:false, problems:[
                                "expected type function but was object"]});

    });
    
    test("require plugin loads transitive dependencies", function(){
        //given
        var myFoo = foo.dynamic({
            sayHi:function(){},
            makeBar:function(){return {};}
        });
        
        // when
        var error;
        try{
            myFoo.makeBar(1);
        }catch(e){
            error = e;
        }
        
        // then
        equal(error, "\"foo\" protocol violation: makeBar(): invalid return type: Doesn't comply with \"bar\" protocol: \"bar\" protocol violation: expected a property named \"secretMessage\"");
    });
    
    
//    asyncTest("require plugin relays loading errors", function(){
//        
//        function then(){
//            // then
//            equal(error, "server returned 404 for nonexistent.protocol");
//            equal(result, undefined);
//            QUnit.start();
//        }
//        
//        // when
//        var error;
//        var result;
//        try{
//            require(["types!nonexistent"], function(nonexistentType){
//                result = nonexistentType;
//                then();
//            }, function(e){
//                error = e;
//                then();
//            });
//        }catch(e){
//            error = e;
//            then();
//        }
//        
//        
//    });
});