/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";


let parser = require("./parser");

let triples = null; 

if(process.argv.length > 2)
{
    let inputPath = process.argv[2];

    let fs = require("fs")

    let inputData= fs.readFileSync(inputPath);

    triples = JSON.parse(inputData);
}

if(!triples)
{
    console.log("Could not load input data");
    return;
}

let out = parser.parseTriples(triples, {createContext: true});

// console.log(out);
console.log(JSON.stringify(Object.values(out), null, " "));