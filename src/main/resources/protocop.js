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


	function makeType(spec, checkIsDisabled){

		function typeCheck(value, propSpec){
			var valueType = typeof value;
			if(valueType !== propSpec.type){
				return 'expected type ' + propSpec.type + " but was " + valueType;
			}else{
				return false;
			}

		}

		function check(o){
			if(checkIsDisabled()) return {matches:true, problems:[]};
			var matches = true, problems=[];

			each(spec, function(name, propSpec){

				if(!o.hasOwnProperty(name)){
					problems.push('expected a property named "' + name + '"');
				}else{
					if(propSpec.type){
						var problem = typeCheck(o[name], propSpec);
						if(problem){
							problems.push('"' + name + '": ' + problem);
						}
					}
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
			assert(o);
			each(spec, function(name, propSpec){

				if(o.hasOwnProperty(name) && propSpec.params){
					var undecorated;
					
					undecorated = o[name];
					o[name] = function(){
						var problems = [];
						if(arguments.length!=propSpec.params.length){
							problems.push("arity problem: expected " + propSpec.params.length + " but was " + arguments.length);
						}

						each(arguments, function(idx, value){
							var num = idx + 1;
							var paramSpec = propSpec.params[idx];
							if(paramSpec){
								var problem = typeCheck(value, propSpec.params[idx]);
								if(problem){
									problems.push(name + "(): invalid argument #" + num + ": " + problem);
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
								throw (name + "(): invalid return type: " + returnProblem);
							}else{
								return result;
							}
						}
					};
				}
			});
			return o;
		}

		return {
			check:check,
			assert:assert,
			dynamic:dynamic,
			stub:makeStub
		};
	}

	function createTypeSystem(){
		
		var disabled = false;
		
		function isDisabled(){
			return disabled;
		}
		
		function disable(){
			disabled = true;
		}
		
		function compile(){
			return makeType(parse.apply(null, arguments), isDisabled);
		}
		
		function register(spec){
			return makeType(spec, isDisabled);
		}
		
		return {
			register:register,
			compile:compile,
			disable:disable
		};
	}	

	function parse(){
		
		function compileTypeString(typeSpec){
			var argSpec;
			var i = typeSpec.indexOf('(');
			if(i>0){
				var type = typeSpec.substring(0, i);
				var returnType;
				var argsSpec;
				
				var parts = typeSpec.split("->");
				
				var beforeReturnPart = parts[0];
				
				argsSpec = beforeReturnPart.substring(i+1, beforeReturnPart.length-1);
				
				var params = map(argsSpec.split(','), function(idx, arg){
					return {type:arg};
				});
				
				argSpec = {type: type, params:params};
				
				if(parts.length>1){
					argSpec.returns = {type:parts[1]};
				}
			}else{
				argSpec = {type: typeSpec};
			}
			return argSpec;
		}
		
		var spec = {};
		each(arguments, function(idx, line){
			var parts = line.split(":");
			var propertyName;
			
			if(parts.length>1){
				propertyName = parts[0];
				propertySpec = compileTypeString(parts[1]);
			}else{
				propertyName = line;
				propertySpec = "*";
			}
			
			spec[propertyName] = propertySpec;
		});
		
		return spec;
	}
	
	return {
		createTypeSystem:createTypeSystem,
		parse:parse
	};
}());

if(define && typeof define === "function"){
	define([], protocop);
}