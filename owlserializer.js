/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";


const owl = require("./owl");
const rdfs = require("./rdfs");
const rdf = require("./rdf");

const Utils = require("./utils");

const PredicateSet = new Set([rdf.TYPE_URI,
							  rdfs.RANGE_URI,
							  rdfs.DOMAIN_URI]);



class OwlSerializer
{
	constructor (sharedGraph, options)
	{
		this.graph = sharedGraph;
	}

	serialize (entity)
	{

	}

	shouldConvertProperty(id, property, value)
	{
		return PredicateSet.has(property);
	}

	convertProperty(id, graph, predicate, value, metaProperty, graphName)
	{
		// console.log(id, predicate, value);

		if(Utils.isUriOrBlankNode(value))
		{
			graph.add(id, predicate, value, graphName);
		}
		else
		{
			graph.add(id, predicate, `${value}`, graphName);
		}

	}



}

module.exports = OwlSerializer;