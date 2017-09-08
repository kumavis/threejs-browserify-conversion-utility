# threejs-browserify-conversion-utility

[![Greenkeeper badge](https://badges.greenkeeper.io/kumavis/threejs-browserify-conversion-utility.svg)](https://greenkeeper.io/)
A utility that takes a three.js development directory, and generates a source tree and build script for building three.js using browserify.

# Usage
Clone the repo, then
```
cd threejs-browerify-conversion-utility
npm install
node browserifyify relative-path-to-threejs-dev-directory
```

The script WILL NOT modify your copy of three.js.
It will copy the src and examples directory from your working copy
into the conversion utility directory, and run the transforms
on the source code from there. You should have browserify/commonjs
code in the src directory.

# Building THREE.js
To build do:
gulp build

Load the examples in the browser to check if they work (they probably won't at this point)

LICENSE: MIT
