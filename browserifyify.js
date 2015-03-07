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

// Calculate the dependencies and abstract syntax trees of a particular javascript file
var calcJSDependenciesAndASTs = function(file, dependencies, asts){
  // Silently do nothing and return if it isn't javascript
  // Needed for glsl shaders and possibly some other stuff
  if(path.extname(file) != '.js')
    return;

  dependencies[file] = {
    definedObjects: [],
    usedObjects: []
  };

  var tree = esprima.parse(fs.readFileSync(file), {attachComment: true});
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

// Take a root directory with javascript files in it (src/ in this case)
// a dependency structure, and an ast structure,
// and recursively traverse the directory populating the
// two structures with ast and dependency information
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

  var code = escodegen.generate(asts[file], {comment: true});
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

// Given a dependency entry for a particular file of the form
// {definedObjects: ..., usedObjects: ...}
// locate and return objects that are used in the file, but
// are not also declared in the file. In other word,
// what things that are part of the library and need
// to be included are used in this file?
var getUndeclaredUsedObjects = function(dependencies){
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
  return null;
};

// Get a list of files that need to be
// required by a particular file
var gatherRequiredFiles = function(file, dependencies){
  var undeclaredUsedObjects = getUndeclaredUsedObjects(dependencies[file]);
  console.log(undeclaredUsedObjects);
  var required_files = undeclaredUsedObjects.map(function(value){
    return getFileFromObject(value, dependencies)
  }).getUnique();
  console.log(required_files);
  return required_files;
};

// Get a list of variables that can be exported from a
// particular file
var getRequiredVariables = function(file, dependencies){
  if(path.basename(file) == "Three.js")
    return ["THREE"];
  else if(file != null){
    return dependencies[file].definedObjects;
  }else
    return [];
};

// Take a path, and a list of variables that need
// to be included from the exports object and generate
// ast node(s) for a require statement from it.
var generateRequires = function(path, required_variables){
  if(required_variables.length == 1){
    var new_node = {};
    new_node.type = "VariableDeclaration";
    var declarations = [{
      type: "VariableDeclarator",
      id: {
        type: 'Identifier',
        name: required_variables[0]
      },
      init: {
        type: "CallExpression",
        callee: {
          type: "Identifier",
          name: "require"
        },
        "arguments": [
          {
            type: "Literal",
            value: path,
            raw: "'"+path+"'"
          }
        ]
      }
    }];
    new_node.declarations = declarations;
    new_node.kind = "var";
    return [new_node];
  }else if(required_variables.length > 1){
    var result = [];
    for(var i = 0; i < required_variables.length; i++){
      var new_node = {};
      new_node.type = "VariableDeclaration";
      var declarations = [{
        type: "VariableDeclarator",
        id: {
          type: 'Identifier',
          name: required_variables[i]
        },
        init: {
          type: "MemberExpression",
          computed: false,
          object: {
            type: "CallExpression",
            callee: {
              type: "Identifier",
              name: "require"
            },
            "arguments": [
              {
                type: "Literal",
                value: path,
                raw: "'"+path+"'"
              }
            ]
          },
          property: {
            type: "Identifier",
            name: required_variables[i]
          }
        }
      }];
      new_node.declarations = declarations;
      new_node.kind = "var";
      result.push(new_node);
    }

    return result;
  }else
    return [];
};

// Given our source file, a list of files to require, and
// a dependency structure, generate relative require statements
var generateRequireNodes = function(file, file_list, dependencies){
  var require_paths = file_list.map(function(value){
    if(value != null)
      return path.relative(file, value);
  });

  var required_variables = file_list.map(function(value){
    return getRequiredVariables(value, dependencies);
  });

  var require_nodes = [];

  for(var i = 0; i < file_list.length; i++){
    require_nodes = require_nodes.concat(generateRequires(require_paths[i], required_variables[i]));
  }

  return require_nodes;
}

// Take dependencies, calculate requires, then prepend them
var prependRequires = function(dependencies, asts){
  for(var file in asts){
    if(path.basename(file) != "Three.js"){
      var required_files = gatherRequiredFiles(file, dependencies);
      var require_nodes = generateRequireNodes(file, required_files, dependencies);

      asts[file].body = require_nodes.concat(asts[file].body);
    } else{
      // The root Three.js file needs to be handled specially, we
      // will APPEND require statements at the end, and require
      // every declared variable available in the library.
      // We need to append them at the bottom due to the fact
      // that some objects we require into THREE depend on things defined in
      // THREE itself, which is a cyclic dependency.
      // Common.js has a special mechanism to resolve this issue
      // that we are taking advantage of.
      // See https://nodejs.org/api/modules.html#modules_cycles

      var required_files = [];
      for(var i in asts){
        if(path.basename(i) != "Three.js")
          required_files.push(i);
      }

      var require_nodes = generateRequireNodes(file, required_files, dependencies);
      asts[file].body = asts[file].body.concat(require_nodes);
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
transformASTs(dependencies, asts);
writeFiles(working_path, dependencies, asts);
