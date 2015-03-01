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

// Calculate the dependencies and abstract syntax trees of a particular javascript file
var calcJSDependenciesAndASTs = function(file, dependencies, asts){

  // if it is not a javascript file, return without processing
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
    // If what we have is a directory, then we want to go through
    // each file in the directory and calculate the dependencies of each one.
    var file_list = fs.readdirSync(file);
    for(var i = 0; i < file_list.length; i++){
      calculateDependenciesAndASTs(path.join(file, file_list[i]), dependencies, asts);
    }
  }else calcJSDependenciesAndASTs(file, dependencies, asts);
};

if(process.argv.length < 2)
  throw new Error("You must supply a path for the three.js directory.");

var three_path = path.normalize(process.argv[2]);
// self explanatory (I hope)

var src_path = path.join(three_path, 'src');
// the path we will read source files from

var browserify_src = path.join(__dirname, 'src');
if(fs.lstatSync(browserify_src).isDirectory())
  fs.rmdir(browserify_src);
fs.mkdirSync(browserify_src);
// the path we will write the new browserify compatible source files to

var dependencies = {},
// An object that will hold the following information:
// The path & name of each file
// What library specific objects/constants (THREE.** stuff) are defined in what file
// What constants/objects are mentioned in the file, which can also include defined things

// This structure will be used to calculate/infer dependencies and determine
// the require statements and exports statements to insert into each file.

asts = {};
// An object that holds the abstract syntax tree of each javascript file encountered.
// Used as a cache to avoid unecessary processing and file reads in the future.
calculateDependenciesAndASTs(src_path, dependencies, asts);
// calculate initial dependencies, first pass
console.log(dependencies)
