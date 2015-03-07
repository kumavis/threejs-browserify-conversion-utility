var path = require('path');

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
  var required_files = undeclaredUsedObjects.map(function(value){
    return getFileFromObject(value, dependencies)
  }).getUnique();
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


var generateRequiresNonGlobal = function(path, required_variables){
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

var generateRequiresGlobal = function(path, required_variables){
  if(required_variables.length == 1){
    var new_node = {};
    new_node.type = "ExpressionStatement";
    var expression = {
      type: "AssignmentExpression",
        operator: "=",
        left: {
          type: "MemberExpression",
          computed: false,
          object: {
            type: "Identifier",
            name: "THREE"
          },
          property: {
            type: "Identifier",
            name: required_variables[0]
          }
        },
        right: {
          type: "CallExpression",
          callee: {
            type: "Identifier",
            name: "require"
          },
          arguments: [{
            type: "Literal",
            value: path,
            raw: "'"+path+"'"
          }]
        }
      }
    new_node.expression = expression;
    return [new_node];
  }else if(required_variables.length > 1){
    var result = [];
    for(var i = 0; i < required_variables.length; i++){
      var new_node = {};
      new_node.type = "ExpressionStatement";
      var expression = {
        type: "AssignmentExpression",
          operator: "=",
          left: {
            type: "MemberExpression",
            computed: false,
            object: {
              type: "Identifier",
              name: "THREE"
            },
            property: {
              type: "Identifier",
              name: required_variables[i]
            }
          },
          right: {
            type: "MemberExpression",
            computed: false,
            object: {
              type: "CallExpression",
              callee: {
                type: "Identifier",
                name: "require"
              },
              arguments: [{
                type: "Literal",
                value: path,
                raw: "'"+path+"'"
              }]
            },
            property: {
              type: "Identifier",
              name: required_variables[i]
            }
          }
        };
      new_node.expression = expression;
      result.push(new_node);
    }

    return result;
  }else
    return [];
};

// Take a path, and a list of variables that need
// to be included from the exports object and generate
// ast node(s) for a require statement from it.
var generateRequires = function(file, the_path, required_variables){
  if(path.basename(file) != "Three.js")
    return generateRequiresNonGlobal(the_path, required_variables);
  else
    return generateRequiresGlobal(the_path, required_variables);
};

// Given our source file, a list of files to require, and
// a dependency structure, generate relative require statements
var generateRequireNodes = function(file, file_list, dependencies){
  var require_paths = file_list.map(function(value){
    if(value != null){
      var src_dir = path.dirname(file);
      var dest_dir = path.dirname(value);
      var dest_file = path.basename(value);
      var relative_path = path.relative(src_dir, dest_dir);
      var relative_file = path.join(relative_path, dest_file);
      if(relative_file.split(path.sep)[0] != '..')
        relative_file = '.' + path.sep + relative_file;
      return relative_file;
    }
  });

  var required_variables = file_list.map(function(value){
    return getRequiredVariables(value, dependencies);
  });

  var require_nodes = [];

  for(var i = 0; i < file_list.length; i++){
    require_nodes = require_nodes.concat(generateRequires(file, require_paths[i], required_variables[i]));
  }

  return require_nodes;
};

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

module.exports.prependRequires = prependRequires;
module.exports.getRequiredVariables = getRequiredVariables;
