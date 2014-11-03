define(['protocop'], function(protocop){
    
    var types = protocop.createTypeSystem();
    var specsByName = {};
    
    function load(name, parentRequire, onload, config){
        
        function handleLoadError(err){
            onload.error(err);
        }
        
        var preLoadedType = types[name];
        if(preLoadedType){
            onload(type);
        }else{
            
            getProtocolText(name, parentRequire, function(text){
                
                try{

                    var namedSpec = parseProtocol(text);
                    var spec = namedSpec.spec;
                    specsByName[name] = spec;
                    if(spec.type==="function"){
                        var fnType = types.registerFn(spec.params, spec.returns);
                        onload(fnType);
                    }else{
                        var type = registerProtocol(name, namedSpec);
                        var protocolNames = type.dependencies();
                        getProtocols(protocolNames, parentRequire, function(){
                            onload(type);
                        });
                    }
                }catch(err){
                    handleLoadError(err);
                }
            }, handleLoadError);
        }
    }
    
    function jsEscape (content) {
        return content.replace(/(['\\])/g, '\\$1')
            .replace(/[\f]/g, "\\f")
            .replace(/[\b]/g, "\\b")
            .replace(/[\n]/g, "\\n")
            .replace(/[\t]/g, "\\t")
            .replace(/[\r]/g, "\\r")
            .replace(/[\u2028]/g, "\\u2028")
            .replace(/[\u2029]/g, "\\u2029");
    }
    
    function writeForOptimizer(pluginName, moduleName, write) {
        var name = pluginName + "!" + moduleName;
        
        var specjson = JSON.stringify(specsByName);
        var constructorFn = 'function(types){' + 
                            '    return types.optimizerRegister("' + moduleName +'", ' + specjson + ');' + 
                            '}';
        write("define('" + name + "', ['types'], " + constructorFn + ");");
    }
    
    
    function getProtocols(protocolNames, parentRequire, onSuccess, handleError){
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
                parentRequire(["types!" + protocolName], successHandler);
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
        specsByName[name] = namedSpec.spec;
        var type = types.register(name, namedSpec.spec);
        return type;
    }
    
    function getProtocol(name, parentRequire, callback, errorHandler){
        
        function onSuccess(responseText){
            var namedSpec = parseProtocol(responseText);
            var type = registerProtocol(name, namedSpec);
            
            callback(name, namedSpec.spec, type);
        }
        
        get(parentRequire.toUrl(name + ".protocol"), onSuccess, errorHandler);
    }
    

    function nodeGet(url, callback, errback) {
        try {
            var fs = require.nodeRequire('fs');
            var file = fs.readFileSync(url, 'utf8');
            //Remove BOM (Byte Mark Order) from utf8 files if it is there.
            if (file.indexOf('\uFEFF') === 0) {
                file = file.substring(1);
            }
            callback(file);

        } catch (e) {
            if (errback) {
                errback(e);
            }
        }
    }
    
    function get(uri, onSuccess, onError){
        var fn;
        if(require.nodeRequire){
            fn = nodeGet;
        }else{
            fn = xHRGet;
        }
        
        fn(uri, onSuccess, onError);
    }
    
    function xHRGet(uri, onSuccess, onError){
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
    
    function optimizerRegister(name, specs){
        each(specs, function(name, spec){
            if(spec.type==="function"){
                types.registerFn(spec.params, spec.returns);
            }else{
                registerProtocol(name, {spec:spec});
            }
        });
        return types[name];
    }
    
    return {load:load, 
            runTestWithAlternateHttpGet:runTestWithAlternateHttpGet,
            write:writeForOptimizer,
            optimizerRegister:optimizerRegister,
            globalTypeSystem:types
            };
});