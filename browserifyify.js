var esprima = require('esprima');
var estraverse = require('estraverse');
var fs = require('fs');
var path = require('path');

var dependencies = {};

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


var processFilesRecursive = function(file, dependencies){
  if(fs.lstatSync(file).isDirectory()){
    var file_list = fs.readdirSync(file);
    for(var i = 0; i < file_list.length; i++){
      processFilesRecursive(path.join(file, file_list[i]), dependencies);
    }
  }else if(path.extname(file)=='.js'){
    dependencies[file] = {
      definedObjects: [],
      usedObjects: []
    };

    var tree = esprima.parse(fs.readFileSync(file));
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
      });
  }
}

processFilesRecursive('src', dependencies);
console.log(dependencies)
