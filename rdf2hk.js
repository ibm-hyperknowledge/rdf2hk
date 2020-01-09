/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";


let parser = require("./parser");
let GraphFactory = require("./graphfactory");

const Timer = require("ninja-util/timer");

let fs = require("fs");

let outFile = null;

let mimeType = "text/turtle";

if(process.argv.length > 2)
{
    let inputPath = process.argv[2];

    if(process.argv.length > 3)
    {
        outFile = process.argv[3];
    }

    if(process.argv.length > 4)
    {
        mimeType = process.argv[4];
        console.log("Mime type", mimeType);
    }

    let inputData = fs.readFileSync(inputPath, "utf-8");

	let t = new Timer();
	GraphFactory.parseGraph(inputData, mimeType, (err, graph) =>
	{
        if(err)
        {
			console.log(err);
            console.log("Could not load input data");
            return;
        }

		t.tick("Parsing rdf time");

		let options = {};

        let hkentities = parser.parseGraph(graph, options);

		t.tick("Conversion done");

        if(!outFile)
        {
            console.log(JSON.stringify(Object.values(hkentities), null, " "));
        }
        else
        {
            fs.writeFileSync(outFile, JSON.stringify(Object.values(hkentities), null, " "), {encoding: "utf-8"})    
            console.log("Written");
        }
	});    
    
}



// console.log(out);
// console.log(JSON.stringify(Object.values(triples), null, " "));
