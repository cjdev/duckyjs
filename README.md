protocop
=======

A lightweight tool for ad-hoc, runtime, protocol/interface contract enforcement in javascript .  See http://en.wikipedia.org/wiki/Protocol_(object-oriented_programming).

user stories
=======

As an engineer who TDDs javascript code, I want a way to enforce contracts when components are shared, so that I can refactor with confidence that my code is working when the tests are green.

example
=======
```javascript
// Suppose you have 2 animals

var goodAnimal = {
    specialProperty:"foobar",
    name:"ralph",
	jump:function(){},
	respond:function(name){}
};

var badAnimal = {};


// Define your interface/protocol		
var types =  protocop.createTypeSystem();

var animalType = types.compile(
	"name:string",
	"jump:function",
    "respond:function(string)->string"
);

// We can do static checks against the interfaces
equal(animalType.check(goodAnimal).matches, true);
equal(animalType.check(badAnimal).matches, false);

// We can use assert() to do static checks too
try{
	animalType.assert(badAnimal);
	fail("shouldn't get here because assert will throw an exception");
}catch(e){
	equal(e, 'Found 3 interface violations:\n' +
		    '    1: expected a property named "name"\n' +
		    '    2: expected a property named "jump"\n' +
		    '    3: expected a property named "respond"');
}


// Now let's add dynamic protocol enforcement.
var animal = animalType.dynamic(goodAnimal);

try{
	animal.respond();
	fail("shouldn't get here because we passed an invalid number of arguments");
}catch(e){
	equal(e, "arity problem: expected 1 but was 0");
}

try{
	animal.respond("hi");
	fail("we didn't return anything ... contract violation!");
}catch(e){
	equal(e, "respond(): invalid return type: expected type string but was undefined");
}


// Meanwhile, in test land, let's mock-out the interesting parts of the contract ...
var mockAnimal = animalType.stub({
	respond:function(message){return 2323;}
});


// Oops, we violated our contract!
try{
	mockAnimal.respond(33);
	fail("shouldn't get here because we passed an invalid argument type");
}catch(e){
	equal(e, "respond(): invalid argument #1: expected type string but was number");
}

try{
	mockAnimal.respond("hi");
	fail("shouldn't get here because our mock returned the wrong result type");
}catch(e){
	equal(e, "respond(): invalid return type: expected type string but was number");
}

// Unimplemented stub methods throw a timely exception
try{
	mockAnimal.jump();
	fail("shouldn't get here because we haven't mocked out this method");
}catch(e){
	equal(e, "stub method not implemented: jump()");
}

// Now, for a little "unprotected" code execution... 
types.disable();
try{
	animal.respond();
	animal.respond("hi");
	mockAnimal.respond("hi");
}catch(err){
	fail("Shouldn't get there, since all checks were disabled (" + err + ")");
}

```


see also
=======
 * http://jeditoolkit.com/2012/03/21/protocol-based-polymorphism.html
 * https://github.com/Gozala/protocol
 * https://github.com/codeparty/protocoljs
 * https://code.google.com/p/toryt/
