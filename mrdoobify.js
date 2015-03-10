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
    var output = esformatter.format(input, {
      preset : 'default',
      indent: {
        value: '\t'
      },
      lineBreak: {
        after: {
          "CatchOpeningBrace" : 2,
          "IfStatementOpeningBrace" : 2,
          "DoWhileStatementOpeningBrace" : 2,
          "FinallyOpeningBrace" : 2,
          "ForInStatementOpeningBrace" : 2,
          "ForStatementOpeningBrace" : 2,
          "FunctionDeclarationOpeningBrace" : 2,
          "FunctionExpressionOpeningBrace" : 2,
          "IfStatementOpeningBrace" : 2,
          "ElseStatementOpeningBrace" : 2,
          "ElseIfStatementOpeningBrace" : 2,
          "TryOpeningBrace" : 2,
          "WhileStatementOpeningBrace" : 2
        },
        before: {
          "CatchClosingBrace" : 2,
          "IfStatementClosingBrace" : 2,
          "DoWhileStatementClosingBrace" : 2,
          "FinallyClosingBrace" : 2,
          "ForInStatementClosingBrace" : 2,
          "ForStatementClosingBrace" : 2,
          "FunctionDeclarationClosingBrace" : 2,
          "FunctionExpressionClosingBrace" : 2,
          "IfStatementClosingBrace" : 2,
          "ElseStatementClosingBrace" : 2,
          "ElseIfStatementClosingBrace" : 2,
          "TryClosingBrace" : 2,
          "WhileStatementClosingBrace" : 2
        }
      }
    });
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
