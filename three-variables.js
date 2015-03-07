var estraverse = require('estraverse');
var threeUtils = require('./three-utils');
var isThreeObject = threeUtils.isThreeObject;
var isGlobalThreeObject = threeUtils.isGlobalThreeObject;
var isNonGlobalAssignmentExpression = threeUtils.isNonGlobalAssignmentExpression;
// If an object/constant/whatever was not declared in the top level Three.js file,
// then we want to remove the leading THREE object from it, since it will
// ultimately be declared as a local variable and then exported and loaded from
// the three object.
var replaceNonGlobalThreeObjects = function(dependencies, asts){
  for(var file in asts){
    estraverse.replace(asts[file], {
      enter: function(node, parent){
        if(isThreeObject(node) && !isGlobalThreeObject(node.property, dependencies))
          return node.property;
        else
          return node;
      }
    });
  }
};

// Assumes the node that is passed in is an expression statement
var replaceWithVariableDeclaration = function(node){
  var new_node = {};
  new_node.type = "VariableDeclaration";
  var declarations = [{
    type: "VariableDeclarator",
    id: node.expression.left,
    init: node.expression.right
  }];
  new_node.declarations = declarations;
  new_node.kind = "var";
  return new_node;
};

// Change statements of the form "NonGlobalThreeObject ="
// to "var NonGlobalThreeObject ="
var changeNonGlobalsToLocals = function(dependencies, asts){
  for(var file in asts){
    estraverse.replace(asts[file], {
      enter: function(node, parent){
        if(isNonGlobalAssignmentExpression(node, dependencies)){
          return replaceWithVariableDeclaration(node);
        }else
          return node;
      }
    });
  }
};

module.exports.replaceNonGlobalThreeObjects = replaceNonGlobalThreeObjects;
module.exports.replaceWithVariableDeclaration = replaceWithVariableDeclaration;
module.exports.changeNonGlobalsToLocals = changeNonGlobalsToLocals;
