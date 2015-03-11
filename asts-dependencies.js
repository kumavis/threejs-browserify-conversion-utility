var fs = require('fs-extra');
var path = require('path');
var esprima = require('esprima');
var estraverse = require('estraverse');
var threeUtils = require('./three-utils');
var isThreeObject = threeUtils.isThreeObject;
var isThreeAssignment = threeUtils.isThreeAssignment;
var replaceNonGlobalThreeObjects = require('./three-variables').replaceNonGlobalThreeObjects;
var unique = require('uniq');


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
        if(node.left.property.name == 'Math')
          dependencies[file].definedObjects.push(
            'ThreeMath'
          );
        else
        dependencies[file].definedObjects.push(
          node.left.property.name
        );
        dependencies[file].definedObjects = unique(dependencies[file].definedObjects);
      } else if(isThreeObject(node)){
          if(node.property.name == 'Math')
            dependencies[file].usedObjects.push(
              'ThreeMath'
            );
          else
            dependencies[file].usedObjects.push(
              node.property.name
            );
          dependencies[file].usedObjects = unique(dependencies[file].usedObjects);
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

module.exports.calculateDependenciesAndASTs = calculateDependenciesAndASTs;
