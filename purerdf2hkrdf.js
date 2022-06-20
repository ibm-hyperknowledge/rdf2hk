/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

const { promisify } = require("util");
const Parser = require("./parser");
const Serializer = require("./serializer");
const GraphFactory = require("./graphfactory");
const {HK_NULL} = require("./constants");

const Timer = require("ninja-util/timer");

let fs = require("fs");

let outFile = null;

let mimeType = "application/trig";

const DefaultConversionOptions = {
    createContext: true,
    setNodeContext: true,
    convertHK: true,
    convertOwl: false,
    convertNumber: true,
    compressReification: true,
    skipRefNodes: true,
    inverseRefNode: true,
    reifyArray: false,
    textLiteralAsNode: false,
    textLiteralAsNodeEncoding: 'property',
    defaultGraph: `<${HK_NULL}>`
};

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
    const serializeGraph = promisify(GraphFactory.serializeGraph);

	GraphFactory.parseGraph(inputData, mimeType, async (err, graph) =>
	{
        if(err)
        {
			console.log(err);
            console.log("Could not load input data");
            return;
        }

		t.tick("Parsing rdf time");

		let options = Object.assign({}, DefaultConversionOptions);

        let hkentities = Parser.parseGraph(graph, options);

        let graphToImport = GraphFactory.createGraph("application/trig");
        Serializer.serialize(hkentities, options, graphToImport)

        const serializedData = await serializeGraph(graphToImport);

		t.tick("Conversion done");

        if(!outFile)
        {
            console.log(serializedData);
        }
        else
        {
            fs.writeFileSync(outFile, serializedData, {encoding: "utf-8"})    
            console.log("Written");
        }
	});    
    
}



// console.log(out);
// console.log(JSON.stringify(Object.values(triples), null, " "));
