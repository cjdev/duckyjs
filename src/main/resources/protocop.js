var protocop = (function(){

    function isArray(obj) {
        return (typeof obj !== 'undefined' &&
                obj && obj.constructor === Array);
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


    function map(items, fn){
        var results = [];
        each(items, function(idx, item){
            results.push(fn(idx, item));
        });
        return results;
    }

    function mkstring(items, separator){
        var str = "";
        each(items, function(num, item){
            if(num>0) str += separator;
            str += item;
        });
        return str;
    }

    function createTypeSystem(){
        var typesByName = {};
        var disabled = false;

        function isDisabled(){
            return disabled;
        }

        function disable(){
            disabled = true;
        }

        
        function typeCheck(value, propSpec){
            var protocolName = propSpec.protocol;
            if(protocolName){
                var existingType = typesByName[protocolName];
                var result = existingType.check(value);
                if(!result.matches){
                    return "Doesn't comply with \"" + protocolName + "\" protocol: " + result.problems;
                }
            }
            
            if(propSpec.type){
                // check by typeof
                var valueType = typeof value;
                if(valueType !== propSpec.type){
                  return 'expected type ' + propSpec.type + " but was " + valueType;
                }
            }

            if(propSpec.isa){
                var expectedInstanceOf = window[propSpec.isa];
                if(!expectedInstanceOf){
                    return 'I was expecting something constructed by "' + propSpec.isa + '" but there is no function by that name.';
                }
                if(!(value instanceof expectedInstanceOf)){
                    return 'expected something with "' + propSpec.isa + '" in its prototype chain';
                }
            }


            return false;

        }

        function dynamicFnWrapper(protocolName, name, undecorated, propSpec, checkIsDisabled){
            var prefix = "";
            if(protocolName){
                prefix = '"' + protocolName + '" protocol violation: ';
            }
            
            if(name){
                prefix = prefix + name + "(): ";
            }else{
                prefix = prefix + "anonymous function: ";
            }
            return function(){
                
                var problems = [];
                if(arguments.length!=propSpec.params.length){
                    problems.push(prefix +  "arity problem: expected " + propSpec.params.length + " but was " + arguments.length);
                }

                each(arguments, function(idx, value){
                    var num = idx + 1;
                    var paramSpec = propSpec.params[idx];
                    if(paramSpec){
                        var problem = typeCheck(value, propSpec.params[idx]);
                        if(problem){
                            problems.push(prefix + "invalid argument #" + num + ": " + problem);
                        }
                    }
                });
                if((!checkIsDisabled()) && problems.length>0){
                    throw mkstring(problems, "\n");
                }else{
                    var result = undecorated.apply(this, arguments);
                    var returnProblem;

                    if(propSpec.returns){
                        returnProblem = typeCheck(result, propSpec.returns);
                    }

                    if((!checkIsDisabled()) && returnProblem){
                        throw (prefix + "invalid return type: " + returnProblem);
                    }else{
                        var protocolName = (propSpec.returns && propSpec.returns.protocol) ? propSpec.returns.protocol : undefined;
                        var returnType = protocolName ? typesByName[protocolName] : undefined;
                        
                        if(returnType){
                            return returnType.dynamic(result);
                        }else{
                            return result;
                        }
                    }
                }
            };
        }

        function makeType(name, spec, checkIsDisabled){

            function check(o){
                if(checkIsDisabled()) return {matches:true, problems:[]};
                var matches = true, problems=[];
                var prefix = "";
                if(name){
                    prefix = '"' + name + '" protocol violation: ';
                }
                each(spec, function(name, propSpec){
                    if(!o.hasOwnProperty(name)){
                        problems.push(prefix + 'expected a property named "' + name + '"');
                    }else{
                        //if(propSpec.type){
                        var problem = typeCheck(o[name], propSpec);
                        if(problem){
                            problems.push(prefix + '"' + name + '": ' + problem);
                        }
                        //}
                    }
                }); 

                return {
                    matches:problems.length === 0,
                    problems:problems
                };
            }

            function assert(o){
                if(checkIsDisabled()) return o;

                var problemDescriptions = map(check(o).problems, function(idx, problem){
                    var num = idx + 1;
                    return "    " + num + ": " + problem;
                });

                if(problemDescriptions.length > 0){
                    throw "Found " + problemDescriptions.length + " interface violations:\n" + mkstring(problemDescriptions, "\n");
                }

                return o;
            }

            function makeStub(o){
                var stub = {};

                stub.prototype = o.prototype;
                each(o, function(name, value){
                    stub[name] = value;
                });

                each(spec, function(name, propSpec){
                    if(stub.hasOwnProperty(name)) return;

                    var stubValue;
                    if(propSpec === "*" || propSpec.type !== "function"){
                        stubValue = ("stub property not implemented: " + name);
                    }else {
                        stubValue = function(){
                            throw "stub method not implemented: " + name + "()";
                        };
                    }
                    stub[name] = stubValue;
                });
                return dynamic(stub);
            }



            function dynamic(o){
                var protocolName = name;
                assert(o);
                each(spec, function(name, propSpec){

                    if(o.hasOwnProperty(name) && propSpec.params){
                        var undecorated;

                        undecorated = o[name];
                        o[name] = dynamicFnWrapper(protocolName, name, undecorated, propSpec, checkIsDisabled);
                    }
                });
                return o;
            }

            return {
                check:check,
                assert:assert,
                dynamic:dynamic,
                stub:makeStub,
                name:name
            };
        }

        
        
        function compile(){
            if(arguments.length==1 && arguments[0].toString().indexOf("function(") === 0){
                var str = arguments[0];
                var fnSpec = compileTypeString(str);
                return makeSignature(fnSpec);
            }else{
                var namedSpec = parse.apply(null, arguments);
                return register(namedSpec.name, namedSpec.spec);
            }
        }

        function register(){
            var name, spec;
            if(arguments.length==2){
                name = arguments[0];
                spec = arguments[1];
            }else{
                spec = arguments[0];
            }
            
            var type = makeType(name, spec, isDisabled);
            if(name){
                typesByName[name] = type;
                if(publicInterface[name]){
                    throw ("there's already something named \"" + name + "\"");
                }else{
                    publicInterface[name] = type;
                }
            }
            return type;
        }

        function makeSignature(spec){
            return {
                check:function(candidate){
                    var problemDescription = typeCheck(candidate, spec, typesByName);
                    if(problemDescription){
                        return {matches:false, problems:[problemDescription]};
                    }else{
                        return {matches:true, problems:[]};
                    }
                },
                dynamic:function(fn){
                    return dynamicFnWrapper(undefined, "", fn, spec, isDisabled);
                }
            };
        }

        function typeNamed(name){
            return typesByName[name];
        }

        var publicInterface = {
                register:register,
                registerFn:function(params, returns){
                    var spec = {
                            type:"function",
                            params:params,
                            returns:returns
                    };
                    return makeSignature(spec);
                },
                compile:compile,
                disable:disable,
                typeNamed:typeNamed
        };

        return publicInterface;
    }	

    var instanceofPattern = 'instanceof\\((.*)\\)';
    var protocolReferencePattern = '\\{(.*)\\}';

    function compileTypeString(typeSpec){
        var argSpec;
        var i = typeSpec.indexOf('(');
        if(i>0){
            var type = typeSpec.substring(0, i);
            
            var instanceofMatch = new RegExp(instanceofPattern).exec(typeSpec.trim());
            if(instanceofMatch){
                argSpec = {isa:instanceofMatch[1]};
            }else {
                var returnType;
                var argsSpec;

                var parts = typeSpec.split("->");

                var beforeReturnPart = parts[0];

                argsSpec = beforeReturnPart.substring(i+1, beforeReturnPart.length-1);

                var params = map(argsSpec.split(','), function(idx, arg){
                    if(arg.trim()!==""){
                        var t = compileTypeString(arg);
                        return t;
                    }else{
                        return undefined;
                    }
                }).filter(function(i){
                    return typeof i === "object";
                });

                argSpec = {type: type, params:params};

                if(parts.length>1){
                    argSpec.returns = compileTypeString(parts[1]);
                }
            }
        }else{

            var protocolReferencePatternMatch = new RegExp(protocolReferencePattern).exec(typeSpec.trim());
            if(protocolReferencePatternMatch){
                argSpec = {protocol:protocolReferencePatternMatch[1]};
            }else{
                argSpec = {type: typeSpec};
            }
        }
        return argSpec;
    }
    var classLinePattern = '\\[([a-zA-Z][a-zA-Z0-9]*)\\]';

    function parse(){
        
        var spec = {};
        
        var maybeName = new RegExp(classLinePattern).exec(arguments[0].trim());
        
        if(maybeName){
            lines = Array.prototype.slice.apply(arguments, [1] );
        }else{
            lines = arguments;
        }
        
        each(lines, function(idx, line){
            var parts = line.split(":");
            var propertyName;
            var propertySpec;

            if(parts.length>1){
                propertyName = parts[0].trim();
                propertySpec = compileTypeString(parts[1]);
            }else{
                propertyName = line.trim();
                propertySpec = "*";
            }

            spec[propertyName] = propertySpec;
        });
        
        var name;
        if(maybeName===null){
            name = undefined;
        }else{
            name = maybeName[1];
        }
        return {name:name,
                spec:spec};
    }

    return {
        createTypeSystem:createTypeSystem,
        parse:parse
    };
}());

if(define && typeof define === "function"){
    define([], protocop);
}