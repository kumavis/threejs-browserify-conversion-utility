var esprima = require('esprima');
var estraverse = require('estraverse');
var fs = require('fs-extra');
var path = require('path');
var escodegen = require('escodegen');

Array.prototype.getUnique = function(){
   var u = {}, a = [];
   for(var i = 0, l = this.length; i < l; ++i){
      if(u.hasOwnProperty(this[i])) {
         continue;
      }
      a.push(this[i]);
      u[this[i]] = 1;
   }
   return a;
}

var isThreeObject = function(node){
  if(node.type == "MemberExpression" && node.object.name=="THREE")
    return true;
  else
    return false;
};

var isThreeAssignment = function(node){
  if(node.type == "AssignmentExpression"){
    if(isThreeObject(node.left))
      return true;
  }
  return false;
};

// Calculate the dependencies and abstract syntax trees of a particular javascript file
var calcJSDependenciesAndASTs = function(file, dependencies, asts){
  if(path.extname(file) != '.js')
    return;

  dependencies[file] = {
    definedObjects: [],
    usedObjects: []
  };

  var tree = esprima.parse(fs.readFileSync(file));
  asts[file] = tree; // save tree for future use
  estraverse.traverse(tree, {
    enter: function(node, parent){
      if(isThreeAssignment(node)){
        dependencies[file].definedObjects.push(
           node.left.property.name
        );
        dependencies[file].definedObjects = dependencies[file].definedObjects.getUnique();
      } else if(isThreeObject(node)){
          dependencies[file].usedObjects.push(
            node.property.name
          );
          dependencies[file].usedObjects = dependencies[file].usedObjects.getUnique();
        }
      }
    }
  );
};

var calculateDependenciesAndASTs = function(file, dependencies, asts){
  if(fs.lstatSync(file).isDirectory()){

    var file_list = fs.readdirSync(file);
    for(var i = 0; i < file_list.length; i++)
      calculateDependenciesAndASTs(path.join(file, file_list[i]), dependencies, asts);

  }else
    calcJSDependenciesAndASTs(file, dependencies, asts);
};

var writeJSFile = function(file, dependencies, asts){
  if(path.extname(file) != '.js')
    return;

  var code = escodegen.generate(asts[file]);
  fs.writeFileSync(file, code);
};

var writeFiles = function(file, dependencies, asts){
  if(fs.lstatSync(file).isDirectory()){
    var file_list = fs.readdirSync(file);
    for(var i = 0; i < file_list.length; i++)
      writeFiles(path.join(file, file_list[i]), dependencies, asts);
  }else
    writeJSFile(file, dependencies, asts);
};

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

var isNonGlobalThreeObject = function(node, dependencies){
  if(isGlobalThreeObject(node, dependencies))
    return false;

  for(var k in dependencies){
    if(dependencies[k].definedObjects.indexOf(node.name) != -1)
      return true;
  }

  return false;
};

var isNonGlobalAssignmentExpression = function(node, dependencies){
  if(node.type == "ExpressionStatement"
  && node.expression.type == "AssignmentExpression"
  && node.expression.left.type == "Identifier"
  && isNonGlobalThreeObject(node.expression.left, dependencies))
    return true;
  else
    return false;
};

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

var getUndefinedUsedObjects = function(dependencies){
  var result = [];
  var definedObjects = dependencies.definedObjects;
  var usedObjects = dependencies.usedObjects;
  for(var i = 0; i < usedObjects.length; i++){
    if(definedObjects.indexOf(usedObjects[i]) == -1)
      result.push(usedObjects[i]);
  }
  return result;
};

// get the file that a given object was defined in
var getFileFromObject = function(object, dependencies){
  for(file in dependencies){
    if(dependencies[file].definedObjects.indexOf(object) != -1)
      return file;
  }
  console.log(object);
  return null;
};

var gatherRequiredFiles = function(file, dependencies){
  var undefinedUsedObjects = getUndefinedUsedObjects(dependencies[file])
  return undefinedUsedObjects.map(function(value){
    return getFileFromObject(value, dependencies)
  }).getUnique();
};

// Take dependencies, calculate requires, then prepend them
var prependRequires = function(dependencies, asts){
  for(var file in asts){
    if(path.basename(file) != "Three.js"){
      var required_files = gatherRequiredFiles(file, dependencies).map(function(value){
        if(value != null)
          return path.relative(file, value);
      });
    }
  }
};

// Take declared objects and export them
var appendExports = function(dependencies, asts){

};

var transformASTs = function(dependencies, asts){
  replaceNonGlobalThreeObjects(dependencies, asts);
  changeNonGlobalsToLocals(dependencies, asts);
  prependRequires(dependencies, asts);
  appendExports(dependencies, asts);
};

var clean = function(){
  fs.removeSync(path.join(__dirname, 'src'));
  fs.removeSync(path.join(__dirname, 'examples'));
};


if(process.argv.length < 2)
  throw new Error("You must supply a path for the three.js directory.");

clean();
var three_path = path.normalize(process.argv[2]);

var src_path = path.join(three_path, 'src');
var examples_path = path.join(three_path, 'examples');
var working_path = path.join(__dirname, 'src');

fs.copySync(src_path, working_path);
fs.copySync(examples_path, path.join(__dirname, 'examples'));
var dependencies = {},
asts = {};

calculateDependenciesAndASTs(working_path, dependencies, asts);
console.log(dependencies);
transformASTs(dependencies, asts);
writeFiles(working_path, dependencies, asts);
