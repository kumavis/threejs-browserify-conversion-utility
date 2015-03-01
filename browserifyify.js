var esprima = require('esprima');
var estraverse = require('estraverse');
var fs = require('fs');
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
}

// determine if an expression is a member of THREE.js
var isThreeObject = function(node){
  if(node.type == "MemberExpression" && node.object.name=="THREE")
    return true;
  else
    return false;
};

// Determine if a statement is of the form THREE.*** = some_stuff
var isThreeAssignment = function(node){
  if(node.type == "AssignmentExpression"){
    if(isThreeObject(node.left))
      return true;
  }
  return false;
};

// write browserify sourcefile/directory from three.js file path
var addCorrespondingFile = function(file){
  if(fs.lstatSync(file).isDirectory()){

  }
};

var processFilesRecursive = function(file, dependencies){
  addCorrespondingFile(file);
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

if(process.argv.length < 2)
  throw new Error("You must supply a path for the three.js directory.");


var dependencies = {};
// An object that will hold the following information:
// The path & name of each file
// What library specific objects/constants (THREE.** stuff) are defined in what file
// What constants/objects are mentioned in the file, which can also include defined things

// This structure will be used to calculate/infer dependencies and determine
// the require statements and exports statements to insert into each file.


var three_path = path.normalize(process.argv[2]);
// self explanatory (I hope)

var src_path = path.join(three_path, 'src');
// the path we will read source files from

var browserify_src = path.join(__dirname, 'src');
fs.mkdirSync(browserify_src);
// the path we will write the new browserify compatible source files to

processFilesRecursive(src_path, dependencies);
console.log(dependencies)
