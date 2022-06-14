/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

const owl 				= require("./owl");
const rdfs				= require("./rdfs");
const xml				= require("./xmlschema")

const Utils = require("./utils");

let owlVocabulary = new Set(Object.values(owl));
owlVocabulary.add(rdfs.DOMAIN_URI);
owlVocabulary.add(rdfs.RANGE_URI);
owlVocabulary.add(rdfs.SUBPROPERTYOF_URI);
owlVocabulary.add(owl.EQUIVALENT_PROPERTY_URI);


class SimpleOwlSerializer
{
	constructor(sharedGraph, options)
	{
		this.graph = sharedGraph;
	}

	shouldConvertProperty (id, property, value)
	{
		// console.log("*****", id, property, value);
		if(owlVocabulary.has(property) || owlVocabulary.has(value))
		{
			return true;
		}
		if(Array.isArray(value))
		{
			for(let i = 0; i < value.length; i++)
            {
				let v = value[i];
				if(owlVocabulary.has(v))
				{
					return true;
				}
			}
		}
		return false;
	}

	convertProperty(id, property, value, metaProperty, graphName)
	{
		if(Array.isArray(value))
		{
			for(let i = 0; i < value.length; i++)
            {
				let v = value[i];
				this._convert(id, property, v, metaProperty, graphName);
			}
		}
		else
		{
			this._convert(id, property, value, metaProperty, graphName);
		}

	}

	_convert(id, property, value, metaProperty, graphName)
	{
		let graph = this.graph;

		// console.log(process)
		if(Utils.isUriOrBlankNode(value))
		{
			graph.add(id, property, value, graphName);
		}
		else
		{
			graph.add(id, property, Utils.createLiteralObject(value, null, metaProperty), graphName);
		}

	}


}

module.exports = SimpleOwlSerializer;