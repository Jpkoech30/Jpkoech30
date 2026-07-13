#!/usr/bin/env node
const{execSync}=require("child_process");
var args=process.argv.slice(2).map(function(a){return a.includes(" ")?'"'+a+'"':a}).join(" ");
try{execSync("npx tsx \""+__dirname+"/recap.ts\" "+args,{stdio:"inherit"})}catch(e){process.exit(1)}
