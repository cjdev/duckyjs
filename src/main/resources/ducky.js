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
			
			function assert(o){
				var problemDescriptions = map(check(o).problems, function(idx, problem){
					var num = idx + 1;
					return "    " + num + ": " + problem;
				});
				
				if(problemDescriptions.length > 0){
					throw "Found " + problemDescriptions.length + " duck-typing problems:\n" + mkstring(problemDescriptions, "\n");
				}
			}

			function dynamic(o){
				check(o);
				each(spec, function(name, propSpec){

					if(o.hasOwnProperty(name) && propSpec.params){
						var undecorated, problems = [];
						
						undecorated = o[name];
						o[name] = function(){
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
				dynamic:dynamic
			};
		}

		function createTypeSystem(){
			return {
				register:makeType
			};
		}	

		return {
			createTypeSystem:createTypeSystem
		};
	}());

if(define && typeof define === "function"){
	define([], ducky);
}