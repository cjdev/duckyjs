define(['protocop'], function(protocop){
    
    var types = protocop.createTypeSystem();
    
    function load(name, parentRequire, onload, config){
        function handleLoadError(err){
            onload.error(err);
        }
        
        var preLoadedType = types[name];
        if(preLoadedType){
            onload(type);
        }else{
            
            getProtocolText(name, parentRequire, function(text){
                var namedSpec = parseProtocol(text);
                var spec = namedSpec.spec;
                if(spec.type==="function"){
                    var fnType = types.registerFn(spec.params, spec.returns);
                    onload(fnType);
                }else{
                    var type = registerProtocol(name, namedSpec);
                    var protocolNames = getDependentProtocolsForProtocolSpec(spec);
                    getProtocols(protocolNames, function(){
                        onload(type);
                    });
                }
            }, handleLoadError);
        }
    }
    
    function getProtocols(protocolNames, onSuccess, handleError){
        if(protocolNames.length===0) {
            onSuccess();
        }else{
            var resolved = [];
            
            each(protocolNames, function(idx, protocolName){
                
                function successHandler(name, spec, dependentType){
                    resolved.push(name);
                    
                    if(resolved.length === protocolNames.length){
                        onSuccess();
                    }
                }
                
                getProtocol(protocolName, successHandler, handleError);
            });
        }
    }
    function getProtocolText(name, parentRequire, callback, errorHandler){
        get(parentRequire.toUrl(name + ".protocol"), callback, errorHandler);
    }
    
    function parseProtocol(text){
        var lines = text.split("\n");
        if(lines === undefined) throw "there is nothing in " + filename;
        var namedSpec = protocop.parse.apply(null,lines);
        return namedSpec;
    }
    
    function registerProtocol(name, namedSpec){
        var type = types.register(name, namedSpec.spec);
        return type;
    }
    
    function getProtocol(name, callback, errorHandler){
        
        function onSuccess(responseText){
            var namedSpec = parseProtocol(responseText);
            var type = registerProtocol(name, namedSpec);
            
            callback(name, namedSpec.spec, type);
        }
        
        get(name + ".protocol", onSuccess, errorHandler);
    }
    
    function get(uri, onSuccess, onError){
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function(){
            if (xhr.readyState === 4) {
                if(xhr.status===200){
                    onSuccess(xhr.responseText);
                }else{
                    onError("server returned " + xhr.status + " for " + uri);
                }
            }
          };
        xhr.open("GET", uri, true);
        xhr.send();
    }
    
    function getDependentProtocolsForProtocolSpec(spec){
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
    
    function runTestWithAlternateHttpGet(httpGetFn, test){
        var realGet = get;
        get = httpGetFn;
        try{
            test();
        }finally{
            get = realGet;
        }
    }
    
    return {load:load, runTestWithAlternateHttpGet:runTestWithAlternateHttpGet};
});