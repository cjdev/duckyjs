function errorHandler(error){
    var message = 
               "Sorry, I could not start qunit because require.js couldn't load parser.qunit: " + error.message + "\n" + 
               "Here are some details about the require.js error:\n" + 
               "     type:" + error.requireType + "\n" + 
               "  modules:" + error.requireModules;
    if(error.stack) {
        message += "\n" + 
           "Stacktrace:\n" + error.stack;   
    }
    
    console.log(message);
    
    test("Require.js load failure", function(){
        ok(false, message);
    });
    QUnit.start();
}
require(["main"], QUnit.start, errorHandler);