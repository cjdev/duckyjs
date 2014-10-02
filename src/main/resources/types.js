define(['protocop'], function(protocop){
    
    var types = protocop.createTypeSystem();
    
    function load(name, parentRequire, onload, config){
        var preLoadedType = types[name];
        if(preLoadedType){
            onload(type);
        }else{
            getProtocol(name, function(name, spec, type){
                var protocolNames = getDependentProtocols(spec);
                if(protocolNames.length===0) {
                    onload(type);
                }else{
                    var resolved = [];
                    
                    each(protocolNames, function(idx, protocolName){
                        getProtocol(protocolName, function(name, spec, dependentType){
                            resolved.push(name);
                            
                            if(resolved.length === protocolNames.length){
                                onload(type);            
                            }
                        });
                    });
                }
                
            });
        }
    }
    
    function getProtocol(name, callback){
        get(name + ".protocol", function(responseText){
            var lines = responseText.split("\n");
            if(lines === undefined) throw "there is nothing in " + filename;
            var namedSpec = protocop.parse.apply(null,lines);
            var type = types.register(name, namedSpec.spec);
            
            callback(name, namedSpec.spec, type);
        });
    }
    
    function get(uri, onSuccess){
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function(){
            if (xhr.readyState === 4) {
                onSuccess(xhr.responseText);
            }
          };
        xhr.open("GET", uri, true);
        xhr.send();
    }
    
    function getDependentProtocols(spec){
        var results = [];
        
        each(spec, function(name, propSpec){
            if(propSpec.type==="function"){
                
                each(propSpec.params, function(idx, param){
                    if(param.protocol){
                        results.push(protocol);
                    }
                });
                
                var returnType = propSpec.returns ? propSpec.returns.protocol : undefined;
                if(returnType){
                    results.push(returnType);
                }
            }
        });
        
        
        return results;
    }
    
    
    function each(items, fn){
        if(items.length){
            for(var x=0;x<items.length;x++){
                fn(x, items[x]);
            }
        }else{
            for (var key in items) {      
                if (items.hasOwnProperty(key)) fn(key, items[key]);
            }
        }
    }
    return {load:load};
});