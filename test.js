var Metrix = require("./index.js");
var assert = require('assert');

// Constructor
assert.equal(typeof new Metrix(),"object","default constructor");
assert.throws(()=>{new Metrix("udp")},Error);
assert.throws(()=>{new Metrix("udp4")},Error);
assert.throws(()=>{new Metrix("http")},Error);
assert.equal(typeof new Metrix("udp://"),"object");
assert.equal(typeof new Metrix("udp://127.0.0.1"),"object");
assert.equal(typeof new Metrix("udp://127.0.0.1:8094"),"object");

var metrix = new Metrix();

// Test Measurement
assert.equal(metrix.line("M"),"M");
assert.equal(metrix.line("M "),"M\\ ");
assert.equal(metrix.line("M ,"),"M\\ \\,");
assert.equal(metrix.line("M$"),false); // $ is not allowed
assert.equal(metrix.line("M!"),false); // ! is not allowed
assert.equal(metrix.line("M["),false); // [] is not allowed
assert.equal(metrix.line("M]"),false); // [] is not allowed
assert.equal(metrix.line("M\"\""),false); // " is not allowed
assert.equal(metrix.line("Memory Failure"),"Memory\\ Failure");

// Test Tags
// Tag keys and tag values must escape commas, spaces, and equal signs. Use a backslash (\) to escape characters, for example: \ and \,. All tag values are stored as strings and should not be surrounded in quotes.
assert.equal(metrix.line("M",null),"M");
assert.equal(metrix.line("M",null,null),"M");
assert.equal(metrix.line("M",{},null),"M");
assert.equal(metrix.line("M",{domain:'domain1'},null),"M,domain=domain1");
assert.equal(metrix.line("M",{domain:'domain1',cpu:123},null),"M,domain=domain1,cpu=123");
assert.equal(metrix.line("M",{domain:'domain1',cpu:123,rack:'first'},null),"M,domain=domain1,cpu=123,rack=first");
assert.equal(metrix.line("M",{domain:'domain1',cpu:123,"rack nr":'first'},null),"M,domain=domain1,cpu=123,rack\\ nr=first");
assert.equal(metrix.line("M",{domain:'domain1',cpu:123,"rack nr & values":'first'},null),false); // not allowed char inside tag key
assert.equal(metrix.line("M",{domain:'domain1',cpu:123,"rack nr , values":'first'},null),"M,domain=domain1,cpu=123,rack\\ nr\\ \\,\\ values=first");
assert.equal(metrix.line("M",{"domain=1":'domain1'},null),"M,domain\\=1=domain1");
assert.equal(metrix.line("M",{"domain=, 1":'domain1'},null),"M,domain\\=\\,\\ 1=domain1");
assert.equal(metrix.line("M",{"domain$":'domain1'},null),false);
assert.equal(metrix.line("M",{"$domain":'domain1'},null),false);
assert.equal(metrix.line("M",{" domain":'domain1'},null),"M,\\ domain=domain1");


// Fields are key-value metrics associated with the measurement. Every line must have at least one field. Multiple fields must be separated with commas and not spaces.
// Field keys are always strings and follow the same syntactical rules as described above for tag keys and values. Field values can be one of four types. The first value written for a given field on a given measurement defines the type of that field for all series under that measurement.
// Integers are numeric values that do not include a decimal and are followed by a trailing i when inserted (e.g. 1i, 345i, 2015i, -10i). Note that all values must have a trailing i. If they do not they will be written as floats.
// Floats are numeric values that are not followed by a trailing i. (e.g. 1, 1.0, -3.14, 6.0e5, 10).
// Boolean values indicate true or false. Valid boolean strings are (t, T, true, True, TRUE, f, F, false, False and FALSE).
// Strings are text values. All string values must be surrounded in double-quotes ". If the string contains a double-quote, it must be escaped with a backslash, e.g. \".

// Field tests with single value without key
assert.equal(metrix.line("M",{},{}),"M");
assert.equal(metrix.line("M",{},null),"M");
assert.equal(metrix.line("M",{},1),"M value=1");
assert.equal(metrix.line("M",{},3.2),"M value=3.2");
assert.equal(metrix.line("M",{},"a"),"M value=\"a\"");
assert.equal(metrix.line("M",{},"this is a long value"),"M value=\"this is a long value\"");
// Field tests
assert.equal(metrix.line("M",{},{cpu:1,memory:2}),"M cpu=1,memory=2");
assert.equal(metrix.line("M",{},{cpu:1,memory:2}),"M cpu=1,memory=2");
assert.equal(metrix.line("M",{},{cpu:"1",memory:"2"}),"M cpu=\"1\",memory=\"2\"");
assert.equal(metrix.line("M",{},{cpu:1,memory:2}),"M cpu=1,memory=2");
assert.equal(metrix.line("M",{},{cpu:1}),"M cpu=1");
assert.equal(metrix.line("M",{},{"cpu name":1}),"M cpu\\ name=1");
assert.equal(metrix.line("M",{},{"cpu name is very long":1}),"M cpu\\ name\\ is\\ very\\ long=1");
assert.equal(metrix.line("M",{},{"cpu $":1}),false);
assert.equal(metrix.line("M",{},{"cpu.last":1}),"M cpu.last=1");
assert.equal(metrix.line("M",{},{"cpu.last.portion":1}),"M cpu.last.portion=1");
assert.equal(metrix.line("M",{},{"cpu=last":1}),"M cpu\\=last=1");
assert.equal(metrix.line("M",{},{name:"john doe"}),"M name=\"john doe\"");
assert.equal(metrix.line("M",{},{name:"\"good\" job"}),"M name=\"\\\"good\\\" job\"");

console.log("good job!");
