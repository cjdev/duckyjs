/*jshint smarttabs:true */
define(["types", "types!foo", "types!FooMaker"], function(testSubject, foo, FooMaker){
    
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
    
    
    test("plugin obeys require baseurl config", function(){
        // given
        var mockParentRequire = {
                toUrl:function(moduleNamePlusExtension){
                    return "nestedDir/" + moduleNamePlusExtension;
                }
        };
        
        var name = "baz";
        var result;
        var onload = function(r){
            result = r;
        };
        onload.error = function(e){
            console.log(e);
        };
        
        var fakeHttpResources = {
            "nestedDir/baz.protocol" : "translateString:function(string)->string"
        };
        var httpGetMock = function(uri, onSuccess, onError){
            var responseBody = fakeHttpResources[uri];
            if(responseBody){
                onSuccess(responseBody);
            }else{
                onError("not found: " + uri);
            }
        };
        var config = {};
        
        // when
        testSubject.runTestWithAlternateHttpGet(httpGetMock, function(){
            testSubject.load(name, mockParentRequire, onload, config);
        });
        
        //then
        ok(result);
        equal(result.name, "baz");
        ok(result.stub({}).translateString);

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