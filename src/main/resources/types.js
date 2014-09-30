define(['protocop'], function(protocop){
    
    var types = protocop.createTypeSystem();
    
    function load(name, parentRequire, onload, config){
        var filename = name + ".protocol";
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function(){
            if (xhr.readyState === 4) {
                var lines = xhr.responseText.split("\n");
                if(lines === undefined) throw "there is nothing in " + filename;
                var namedSpec = protocop.parse.apply(null,lines);
                
                var type = types.register(name, namedSpec.spec);
                onload(type);
            }
          };
        xhr.open("GET", filename, true);
        xhr.send();
        
    }
    
    return {load:load};
});