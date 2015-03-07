var path = require('path');

// various utility functions for checking information about nodes.

// Check if a given node is part of the THREE.js library
// i.e. does the given node represent an expression
// like "THREE.foo" ?
var isThreeObject = function(node){
  if(node.type == "MemberExpression" && node.object.name=="THREE")
    return true;
  else
    return false;
};

// Check if a given node is an expression assigning
// a property of THREE to some value.
// i.e. does the given node describe an expression
// of the form "THREE.foo = bar" ?
var isThreeAssignment = function(node){
  if(node.type == "AssignmentExpression"){
    if(isThreeObject(node.left))
      return true;
  }
  return false;
};

// Check if an object was defined in the top level
// Three.js file. Such objects need to be treated
// with special priority.
var isGlobalThreeObject = function(node, dependencies){
  var three;
  for(var k in dependencies){
    if(path.basename(k)=="Three.js")
      three = k;
  }

  if(dependencies[three].definedObjects.indexOf(node.name) != -1)
    return true;

  return false;
};

// Check if an object was not defined in the top level Three.js
// file AND is in fact part of the library.
var isNonGlobalThreeObject = function(node, dependencies){
  if(isGlobalThreeObject(node, dependencies))
    return false;

  for(var k in dependencies){
    if(dependencies[k].definedObjects.indexOf(node.name) != -1)
      return true;
  }

  return false;
};

// Should be self explanatory at this point.
// I need this for some reason, I can't remember what for
var isNonGlobalAssignmentExpression = function(node, dependencies){
  if(node.type == "ExpressionStatement"
  && node.expression.type == "AssignmentExpression"
  && node.expression.left.type == "Identifier"
  && isNonGlobalThreeObject(node.expression.left, dependencies))
    return true;
  else
    return false;
};

module.exports.isThreeObject = isThreeObject;
module.exports.isThreeAssignment = isThreeAssignment;
module.exports.isGlobalThreeObject = isGlobalThreeObject;
module.exports.isNonGlobalThreeObject = isNonGlobalThreeObject;
module.exports.isNonGlobalAssignmentExpression = isNonGlobalAssignmentExpression;
