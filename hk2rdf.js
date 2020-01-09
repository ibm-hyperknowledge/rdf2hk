/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

let Serializer = require("./serializer");
let GraphFactory = require("./graphfactory");

let fs = require("fs");

let mimeType = "application/rdf+xml";

const Timer = require("ninja-util/timer");

let outFile = null;

let SUPPORTED_MIME_TYPES = new Set();
SUPPORTED_MIME_TYPES.add("application/n-quads");
SUPPORTED_MIME_TYPES.add("application/json");
SUPPORTED_MIME_TYPES.add("text/turtle");
SUPPORTED_MIME_TYPES.add("application/turtle");
SUPPORTED_MIME_TYPES.add("application/trig");
SUPPORTED_MIME_TYPES.add("application/n-triples");


// const Timer = require("ninja-util/timer");


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
    }

    if(!SUPPORTED_MIME_TYPES.has(mimeType))
    {
        console.log(`Mimetype "${mimeType}" not supported`);
        return;
    }

    let inputData = fs.readFileSync(inputPath, "utf-8");


	// let options = {convertHK: false,
	// 				convertNumber: true,
	// 				compressReification: true,};
	// let options = {convertHK: true};
	let options = {};
    
    let entities = JSON.parse(inputData);

	let t = new Timer();

	let graph = GraphFactory.createGraph(mimeType);
    
	Serializer.serialize(entities, options, graph);

	t.tick("Conversion done");

	GraphFactory.serializeGraph(graph, (err, data) =>
	{
		if(!err)
		{
			if(outFile)
			{
				
				fs.writeFileSync(outFile, data, {encoding: "utf-8"});
			}
			else
			{
				console.log(JSON.stringify(triples, null, " "));
			}
		}
		else
		{
			console.error(err);
		}

	});

	
}


