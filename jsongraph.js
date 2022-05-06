/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

const Utils = require("./utils");

function JSONGraph(triples, mimeType = "application/json")
{
	this.triples = triples || [];
	this.mimeType = mimeType;
	this.statementCounter = 0;
}

JSONGraph.prototype.add = function (s, p, o, g) 
{
	if(!Utils.isUriOrBlankNode(s))
	{
		s = `<${Utils.generateResourceFromId(s)}>`;
	}

	if(!Utils.isUriOrBlankNode(p))
	{
		p = `<${Utils.generateResourceFromId(p)}>`;
	}

	if(!Utils.isUriOrBlankNode(g))
	{
		g = `<${Utils.generateResourceFromId(g)}>`;
	}

	if(typeof o === "object")
	{
		o = Utils.createLiteral(o);
	}
	else if(!Utils.isUriOrBlankNode(o))
	{
		o = `<${Utils.generateResourceFromId(o)}>`;
	}

	this.triples.push([s, p, o, g]);
	this.statementCounter++;
}

JSONGraph.prototype.forEachStatement = function (callback)
{

	for(let i = 0; i < this.triples.length; i++)
	{
		let t = this.triples[i];
		
		callback(t[0], t[1], t[2], t[3]);
	}
}

JSONGraph.prototype.fromBGP = function (s = null, p = null, o = null, g = null) 
{
	let out = [];

	if(s || p || o || g)
	{
		for(let i = 0; i < this.triples.length; i++)
		{
			let t = this.triples[i];

			if(s === t[0])
			{
				out.push(t);
			}
			else if(p === t[1])
			{
				out.push(t);
			}
			else if(o === t[2])
			{
				out.push(t);
			}
			else if(g === t[3])
			{
				out.push(t);
			}
		}
	}
	else
	{
		out = this.triples.slice(0);
	}


	return new JSONGraph(out, this.mimeType);
}

JSONGraph.prototype.graphSize = function ()
{
	return this.statementCounter;	
}

module.exports = JSONGraph;