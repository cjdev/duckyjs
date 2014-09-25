/*jshint smarttabs:true */
define(["types!foo", "types!MakeFoo"], function(foo, MakeFoo_protocol){
    
    test("require plugin works", function(){
        //then
        ok(foo);
        var problems = foo.check({});
        equal(foo.name, "Foo");
        deepEqual(problems, {matches:false, problems:[
                                'expected a property named "name"',
                                'expected a property named "  sayHi"']});
        
        var makeFoo = MakeFoo_protocol.dynamic(function(){});
        
//        makeFoo("");
    });
    
});