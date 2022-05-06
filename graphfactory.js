/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

const TriGGraph = require("./triggraph");
const RDFGraph = require("./rdfgraph");
const JSONGraph = require("./jsongraph"); 
const Constants = require("./constants");

let RDFSParser = require("rdfxml-streaming-parser");
let N3 = require("n3");

function createGraph(mimeType, store = false)
{
	let out = null;
	switch(mimeType)
	{
		case "application/json":
			return new JSONGraph();
		case "application/n-triples":
		case "application/n-quads":
		case "application/trig":
		case "application/turtle":
		case "text/turtle":
			return new TriGGraph(undefined, undefined, mimeType, store);
		case "application/rdf+xml":
			return new RDFGraph(undefined, undefined, mimeType);
	}
	return out;
}

function parseGraph(inputData, mimeType, callback)
{
	let out = null;
	switch(mimeType)
	{
		case "application/json":
			if(typeof inputData === "object")
			{
				callback(null, new JSONGraph(inputData));
			}
			else if(typeof inputData === "string")
			{
				try
				{
					let json = JSON.parse(inputData);
					callback(null, new JSONGraph(json));
				}
				catch(exp)
				{
					callback(exp);
				}
			}
			else
			{
				callback(`Invalid input data ${typeof inputData}`)
			}
			break;

		case "application/n-triples":
		case "application/n-quads":
		case "application/trig":
		case "application/turtle":
		case "text/turtle":
			n3Parse(inputData, mimeType, callback);
			break;
		case "application/rdf+xml":
			rdfStreamParse(inputData, mimeType, callback);
			break;
	}
	return out;
}

function serializeGraph(aGraph, callback)
{
	let out = null;
	let mimeType = aGraph.mimeType;
	switch(mimeType)
	{
		case "application/json":
			callback(null, JSON.stringify(aGraph.triples, null, " "));
			break;
		case "application/n-triples":
		case "application/n-quads":
		case "application/trig":
		case "application/turtle":
		case "text/turtle":
			n3Serialize(aGraph, callback);
			break;
		case "application/rdf+xml":
			rdfXmlSerialize(aGraph, callback);
			break;
		default:
			callback(`The mimeType ${mimeType} is not currently supported for serialization.`);
	}
	return out;
}

function rdfStreamParse(inputData, mimeType, callback)
{
	const parser = new RDFSParser.RdfXmlParser(
		{
			baseIRI: Constants.HK_NULL
		}
	);

	parser.write(inputData);
	parser.end();

	let graph = [];

	parser
	.on('data', (data) => graph.push(data))
	.on('error', console.error)
	.on('end', () => {
		callback(null, new RDFGraph(graph, `${Constants.HK_NULL}`, mimeType));
	});
}

function n3Parse(inputData, mimeType, callback)
{
	const parser = new N3.Parser();
	let store = new N3.Store();

	try 
	{
		parser.parse(inputData, (err, quad) =>
		{
			if(quad)
			{
				store.addQuad(quad);
			}
			else if(!err)
			{
				let triggraph = new TriGGraph(store, `${Constants.HK_NULL}`, mimeType, true);
				callback(null, triggraph);
			}
			else
			{
				callback(err);
			}
		});
	}
	catch(exp)
	{
		callback(exp);
	}
}

function n3Serialize(aGraph, callback)
{
	let graph = aGraph.graph
	if (aGraph.store)
	{
		const writer = new N3.Writer({format: aGraph.mimeType});
	

		writer.addQuads(aGraph.graph.getQuads(null, null,null,null))

		graph = writer;
	}

	_end(graph, callback);
	
}

function _end(graphOrWriter, callback)
{
	graphOrWriter.end((err, data) =>
	{
		if(!err)
		{
			callback(null, data);
		}
		else
		{
			callback(err);
		}
	});
}

function rdfXmlSerialize(aGraph, callback)
{
	if (aGraph.store || Array.isArray(aGraph.graph))
	{
		const writer = new N3.Writer({format: aGraph.mimeType});
	
		aGraph.graph.forEach ((statement) =>
		{
			if(statement)
			{
				writer.addQuad(statement);
			}

		});

		writer.end((err, data) =>
		{
			if(!err)
			{
				callback(null, data);
			}
			else
			{
				callback(err);
			}
			
		});
	}
	else
	{
		// Graph is already a writer
		aGraph.graph.end((err, data) =>
		{
			if(!err)
			{
				callback(null, data);
			}
			else
			{
				callback(err);
			}
		});

	}
	
}

exports.createGraph = createGraph;
exports.parseGraph = parseGraph;
exports.serializeGraph = serializeGraph;