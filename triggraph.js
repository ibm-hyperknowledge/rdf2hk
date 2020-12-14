/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

const N3 = require("n3");
const Constants = require("./constants");
const Utils = require("./utils");

const { DataFactory } = N3;
const { namedNode, literal, blankNode } = DataFactory;

function TriGGraph( storedGraph, baseUri, mimetype, store = false) 
{
	this.mimeType = mimetype || "application/trig";
	this.store = store;
	this.graph = storedGraph || (this.store? new N3.Store() : new N3.Writer({format: this.mimeType}));
	this.baseUri = baseUri || Constants.HK_NULL;
	
}

TriGGraph.prototype.add = function(s, p, o, g) {
	s = createResource(s);
	p = createResource(p);	

	if(typeof o === "object")
	{
		if(o.type)
		{
			o = literal(o.value, createResource(o.type));
		}
		else 
		{
			o = literal(o.value, o.lang);
		}
	}
	else
	{
		o = createResource(o);
	}
	if(this.mimeType !== Constants.MIMETYPE_APPLICATION_NTRIPLE && this.mimeType !== Constants.MIMETYPE_APPLICATION_TURTLE && this.mimeType !== Constants.MIMETYPE_TEXT_TURTLE)
	{
		g = createResource(g);
		this.graph.addQuad(s, p, o, g);
	}
	else
	{
		this.graph.addQuad(s, p, o);
	}
};

TriGGraph.prototype.forEachStatement = function(callback) {

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

TriGGraph.prototype.fromBGP = function(s = null, p = null, o = null, g = null) {

	s = s ? createResource(s) : undefined;
	p = p ? createResource(p) : undefined;
	o = o ? createResource(o) : undefined;
	g = g ? createResource(g) : undefined;

	let quads = this.graph.getQuads(s, p, o, g);

	let newGraph = new N3.Store();
	newGraph.addQuads(quads);

	return new TriGGraph(newGraph, this.baseUri, this.mimeType);
};

TriGGraph.prototype.getEntitiesId = function ()
{
	let entitiesSubjects = this.graph.getSubjects().map(e => e.id);
	let entitiesObjects = this.graph.getObjects().filter(e => e.constructor.name !== "Literal");
	entitiesObjects = entitiesObjects.map(e => e.id);
	let entitiesGraphs = this.graph.getGraphs().map(e => e.id);

	let result = [...new Set([...entitiesObjects, ...entitiesSubjects, ...entitiesGraphs])];

	return result;
}

function getValue (term, baseUri) {
	if (term.termType === "NamedNode") {
		return `<${term.id}>`;
	} else if (term.termType === "DefaultGraph") {
		return `<${baseUri}>`;
	} else if (term.termType === "Literal") {
		if (term.language) {
			return `"${term.value}"@${term.language}`;
		} else if (term.datatype) {
			let type = getValue(term.datatype);
			return `"${term.value}"^^${type}`;
		} else {
			return term.id;
		}
	} else if (term.termType === "BlankNode") {
			return term.id;
	} 
	return null;
};

function createResource (id, forceUri = true) {
	if (Utils.isUri(id)) {
		return namedNode(id.substr(1, id.length - 2));
	} else if (Utils.isBlankNode(id)) {
		return blankNode(id.substr(2, id.length - 2));
	} else if (Utils.isLiteral(id)) {
		return literal(id);
	} else if (forceUri) {
		return namedNode(Utils.generateResourceFromId(id));
	} else {
		return namedNode(id);
	}
};

module.exports = TriGGraph;
