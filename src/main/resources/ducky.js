var ducky = (function(){

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


	function makeType(spec){

		function typeCheck(value, propSpec){
			var valueType = typeof value;
			if(valueType !== propSpec.type){
				return 'expected type ' + propSpec.type + " but was " + valueType;
			}else{
				return false;
			}

		}

		function check(o){
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
			var problemDescriptions = map(check(o).problems, function(idx, problem){
				var num = idx + 1;
				return "    " + num + ": " + problem;
			});

			if(problemDescriptions.length > 0){
				throw "Found " + problemDescriptions.length + " duck-typing problems:\n" + mkstring(problemDescriptions, "\n");
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
						if(problems.length>0){
							throw mkstring(problems, "\n");
						}else{
							return undecorated.apply(this, arguments);
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
		
		function compile(){
			return makeType(parse.apply(null, arguments));
		}
		
		return {
			register:makeType,
			compile:compile
		};
	}	

	function parse(){
		
		function compileTypeString(typeSpec){
			var argSpec;
			var i = typeSpec.indexOf('(');
			if(i>0){
				var type = typeSpec.substring(0, i);
				var argsSpec = typeSpec.substring(i+1, typeSpec.length-1);
				var params = map(argsSpec.split(','), function(idx, arg){
					return {type:arg};
				});
				argSpec = {type: type, params:params};
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
	define([], ducky);
}