// Convert all js files in output directory to
// Mr. Doob's Code Style(TM)


var fs = require('fs-extra');
var path = require('path');
var esformatter = require('esformatter');

var mrdoobifyFile = function(file){
  if(path.extname(file) != '.js')
    return;
  else{
    var input = fs.readFileSync(file);
    var mdcs = JSON.parse(fs.readFileSync('./mdcs.json'));
    var output = esformatter.format(input, mdcs);
    fs.writeFileSync(file, output);
  }
};

var mrdoobify = function(file){
  if(fs.lstatSync(file).isDirectory()){

    var file_list = fs.readdirSync(file);
    for(var i = 0; i < file_list.length; i++)
      mrdoobify(path.join(file, file_list[i]));

  }else
    mrdoobifyFile(file);
};

module.exports = mrdoobify;
