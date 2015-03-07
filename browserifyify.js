var fs = require('fs-extra');
var path = require('path');
var astsDependencies = require('./asts-dependencies');
var calculateDependenciesAndASTs = astsDependencies.calculateDependenciesAndASTs;
var prependRequires = require('./generate-requires').prependRequires;
var threeVariables = require('./three-variables');
var replaceNonGlobalThreeObjects = threeVariables.replaceNonGlobalThreeObjects;
var changeNonGlobalsToLocals = threeVariables.changeNonGlobalsToLocals;
var appendExports = require('./generate-exports').appendExports;
var writeFiles = require('./write-files').writeFiles;
var mrdoobify = require('./mrdoobify');

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
mrdoobify(working_path);
