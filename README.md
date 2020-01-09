# rdf2hk
This library contains classes and functions to convert RDF model to the Hyperknowledge model

## Install

```
npm install rdf2hk
```

## Usage

```js
const RDF2HK = require("rdf2hk");
```

## RDF to Hyperknowledge 

Example: 
```js

const GraphFactory = RDF2HK.GraphFactory;

const mimeType = "application/turtle" // application/json | application/n-triples | application/n-quads | application/trig | application/turtle | application/rdf+xml
GraphFactory.parseGraph(inputData, mimeType, (err, graph) =>
{
	if(err)
	{
		console.error(err);
		return;
	}

	let hkentities = RDF2HK.Parser.parseGraph(graph);

	console.log(hkentities); // print the converted entities

	// <...>
}); 

```

## Hyperknowledge to RDF

Example: 
```js
const GraphFactory = RDF2HK.GraphFactory;

const mimeType = "application/turtle" // application/json | application/n-triples | application/n-quads | application/trig | application/turtle | application/rdf+xml

let graph = GraphFactory.createGraph(mimeType);
    
Serializer.serialize(hkentities, {}, graph); // options: see api reference

GraphFactory.serializeGraph(graph, (err, data) =>
{
	if(!err)
	{
		// Print the rdf serialized data
		console.log(data);

		// <...>
	}
	else
	{
		console.error(err);
	}

});
```