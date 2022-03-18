/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

const Utils = require("./utils");
const DataFactory = require("@rdfjs/data-model");
const Constants = require("./constants");


function RDFGraph(storedGraph, baseUri, mimeType) {
	this.graph = storedGraph || [];
	this.baseUri = baseUri || Constants.HK_NULL;
	this.mimeType = mimeType || "application/rdf+xml";
}

RDFGraph.prototype.add = function (s, p, o, g) {
	s = createResource(s);
	p = createResource(p);
	o = createResource(o);

	if (g) {
		g = createResource(g);
		this.graph.push(DataFactory.quad(s, p, o, g));
	}
	else {
		this.graph.push(DataFactory.quad(s, p, o));
	}

};

RDFGraph.prototype.forEachStatement = function (callback) {

	this.graph.forEach(spo => {
		let obj = spo.object;
		if (obj.termType === "Collection") {
			let elements = obj.elements;
			for (let e = 0; e < elements.length; e++) {
				let elem = elements[e];
				callback(
					getValue(spo.subject, this.baseUri),
					getValue(spo.predicate, this.baseUri),
					getValue(elem, this.baseUri),
					getValue(spo.graph, this.baseUri)
				);
			}
		} else {
			callback(
				getValue(spo.subject, this.baseUri),
				getValue(spo.predicate, this.baseUri),
				getValue(spo.object, this.baseUri),
				getValue(spo.graph, this.baseUri)
			);
		}
	});
};

function getValue (term, baseUri) {
	if (term.termType === "NamedNode") {
		return `<${term.value}>`;
	} else if (term.termType === "DefaultGraph") {
		return `<${baseUri}>`;
	} else if (term.termType === "Literal") {
		if (term.language) {
			return `"${term.value}"@${term.language}`;
		} else if (term.datatype) {
			let type = getValue(term.datatype, baseUri);
			return `"${term.value}"^^${type}`;
		} else {
			return term.value;
		}
	} else if (term.termType === "BlankNode") {
		return `_:${term.value}`;
	} 
};

function createResource(id, forceUri = true) 
{
	if (id === null) {
		return DataFactory.namedNode(Utils.generateResourceFromId(null));
	}
	if (typeof id === "object") {
		if (id.type) {
			return DataFactory.literal(id.value, id.type.slice(1, -1));
		}
		else {
			return DataFactory.literal(id.value, id.lang);
		}
	}
	else {
		if (Utils.isUri(id)) {
			return DataFactory.namedNode(id.substr(1, id.length - 2));
		} else if (Utils.isBlankNode(id)) {
			return DataFactory.blankNode(id.substr(2, id.length - 2));
		} else if(Utils.isLiteral(id)){
			let t = {};
			let v = Utils.getValueFromLiteral(id, t);
			if(t.lang)
			{
				return DataFactory.literal(v, t.lang);
			}
			else if(t.type)
			{
				return DataFactory.literal(v, DataFactory.namedNode(id.substr(1, t.type.length - 2)));
			}
			else
			{
				return DataFactory.literal(v);
			}
		} else if (forceUri) {
			return DataFactory.namedNode(Utils.generateResourceFromId(id));
		} else {
			return DataFactory.namedNode(id);
		}

	}
};

RDFGraph.prototype.fromBGP = function (s = null, p = null, o = null, g = null) {

	s = s ? createResource(s) : undefined;
	p = p ? createResource(p) : undefined;
	o = o ? createResource(o) : undefined;
	g = g ? createResource(g) : undefined;

	let newGraph = [];

	if(s || p || o || g)
	{
		for(let i = 0; i < this.graph.length; i++)
		{
			let t = this.graph[i];

			if(s === t[0])
			{
				newGraph.push(t);
			}
			else if(p === t[1])
			{
				newGraph.push(t);
			}
			else if(o === t[2])
			{
				newGraph.push(t);
			}
			else if(g === t[3])
			{
				newGraph.push(t);
			}
		}
	}
	else
	{
		newGraph = this.graph.slice(0);
	}
	return new RDFGraph(newGraph, this.mimeType);
};

RDFGraph.prototype.getEntitiesId = function ()
{	
	let entitiesSubjects = this.graph.map(e => e.subject.value);
	let entitiesObjects = this.graph.filter(e => e.object.constructor.name !== "Literal");
	entitiesObjects = entitiesObjects.map(e => e.object.value);
	let entitiesGraphs = this.graph.map(e => e.graph.value);

	let result = [...new Set([...entitiesObjects, ...entitiesSubjects, ...entitiesGraphs])];

	return result;
}

RDFGraph.prototype.suppressDuplicates = function()
{
	this.graph = this.graph.reduce((output, quad) =>
	{
		const key = JSON.stringify(quad);
		if (output.keys.indexOf(key) === -1) {
			output.values.push(quad);
			output.keys.push(key);
		}
		return output;
	}, 
	{
		keys: [],
		values: []
	}).values;
}

module.exports = RDFGraph;
