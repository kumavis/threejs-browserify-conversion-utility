var fs = require('fs-extra');
var path = require('path');

// rename function to avoid confusion
var getExportedObjects = require('./generate-requires').getRequiredVariables;

// generate export statements for a particular file
var generateExports = function(dependencies, file){
  var export_vars = getExportedObjects(file, dependencies);


  if(export_vars.length == 1){
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
            name: "module"
          },
          property: {
            type: "Identifier",
            name: "exports"
          }
        },
        right:  {
          type: "Identifier",
          name: export_vars[0]
        }
      }
    new_node.expression = expression;
    return [new_node];
  }else{
    var export_statements = [];
    for(var i = 0; i < export_vars.length; i++){
      var new_node = {};
      new_node.type = "ExpressionStatement";
      var expression = {
        type: "AssignmentExpression",
        operator: "=",
        left: {
          type: "MemberExpression",
          computed: false,
          object: {
            type: "MemberExpression",
            computed: false,
            object: {
              type: "Identifier",
              name: "module"
            },
            property: {
              type: "Identifier",
              name: "exports"
            }
          },
          property: {
            type: "Identifier",
            name: export_vars[i]
          }
        },
        right: {
          type: "Identifier",
          name: export_vars[i]
        }
      };
      new_node.expression = expression;
      export_statements.push(new_node);
    }
    return export_statements;
  }
};

// Take declared objects and export them
var appendExports = function(dependencies, asts){
  for(var file in asts){
    var exports_statements = generateExports(dependencies, file);
    asts[file].body = asts[file].body.concat(exports_statements);
  }
};

module.exports.appendExports = appendExports;
