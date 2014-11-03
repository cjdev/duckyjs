define(["types", "types!Apple"], function(types, AppleProt) {
    test("protocol exists", function(){
        ok(AppleProt);
        ok(types.globalTypeSystem.Apple);
    });
    
    test("first-level transitive dependency was loaded", function(){
        ok(types.globalTypeSystem.Pear);
    });

    test("second-level transitive dependency was loaded", function(){
        ok(types.globalTypeSystem.Orange);
    });

});