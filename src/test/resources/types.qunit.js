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
});