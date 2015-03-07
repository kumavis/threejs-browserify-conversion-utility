var fs = require('fs-extra');
var path = require('path');
var esprima = require('esprima');
var estraverse = require('estraverse');
var threeUtils = require('./three-utils');
var isThreeObject = threeUtils.isThreeObject;
var isThreeAssignment = threeUtils.isThreeAssignment;

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

module.exports.calcJSDependenciesAndASTs = calcJSDependenciesAndASTs;
module.exports.calculateDependenciesAndASTs = calculateDependenciesAndASTs;
