var fs = require('fs-extra');
var path = require('path');
var escodegen = require('escodegen');

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

module.exports.writeFiles = writeFiles;
