/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

const Utils = require("./utils");

const ESCAPE_SEQUENCE = /\\u([a-fA-F0-9]{4})|\\U([a-fA-F0-9]{8})|\\([^])/g;
const ESCAPE_REPLACEMENTS = {
	'\\': '\\',
	"'": "'",
	'"': '"',
	'n': '\n',
	'r': '\r',
	't': '\t',
	'f': '\f',
	'b': '\b',
	'_': '_',
	'~': '~',
	'.': '.',
	'-': '-',
	'!': '!',
	'$': '$',
	'&': '&',
	'(': '(',
	')': ')',
	'*': '*',
	'+': '+',
	',': ',',
	';': ';',
	'=': '=',
	'/': '/',
	'?': '?',
	'#': '#',
	'@': '@',
	'%': '%'
};

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
		let object = t[2];
		object = object && object.startsWith(`"`) ? this.parseLiteral(object) : object;
		t[2] = object;
		callback(t[0], t[1], object, t[3]);
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
				let object = t[2];
				object = object.startsWith(`"`) ? this.parseLiteral(object) : object;
				t[2] = object;
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

// This method was based on the _parseLiteral function of the N3Lexer.js file from https://github.com/rdfjs/N3.js
JSONGraph.prototype.parseLiteral = function (literal) 
{
	
	const xsdBegin = literal.indexOf("^^<");
	const xsdEnd = literal.lastIndexOf(">");
	const literalHasXSD = xsdBegin > 0 && xsdEnd == literal.length - 1;
	const literalHasCustomMetaProperty = !literalHasXSD && literal.indexOf(`"^^`) < literal.length - 1;
	// Ensure we have enough lookahead to identify triple-quoted strings
	// literals with XSD or Custom MetaProperties should not be unescaped
	if (literal.length >= 3 && !(literalHasXSD || literalHasCustomMetaProperty)) 
	{
		const literalStr = literalHasXSD ? literal.substring(0, xsdBegin) : literal;	

		// Identify the opening quote(s)
		const openingQuote = literalStr.match(/^(?:"""|"|'''|'|)/)[0];
		const openingLength = openingQuote.length
		let closingIndex = openingLength;
		while ((closingIndex = literalStr.indexOf(openingQuote, closingIndex)) > 0) 
		{
			// Count backslashes right before the closing quotes
			let backslashCount = 0;
			while (literalStr[closingIndex - backslashCount - 1] === '\\') backslashCount++;
			// An even number of backslashes (in particular 0)
			// means these are actual, non-escaped closing quotes
			if (backslashCount % 2 === 0) 
			{
				// Extract and unescape the value
				const escapedLiteralStr = literalStr.substring(openingLength, closingIndex);
				const literalLines = escapedLiteralStr.split(/\r\n|\r|\n/).length - 1;
				if (openingLength === 1 && literalLines !== 0 || openingLength === 3) break;
				return this.unescapeLiteral(escapedLiteralStr);
			}
			closingIndex++;
		}
	}
	return literal;
}

// This method was based on the _unescape function of the N3Lexer.js file from https://github.com/rdfjs/N3.js
JSONGraph.prototype.unescapeLiteral = function (literal) {
	let invalidEscaping = false;

	let unescapedLiteral = literal;
	while(unescapedLiteral.match(ESCAPE_SEQUENCE) !== null)
	{
		unescapedLiteral = unescapedLiteral.replace(ESCAPE_SEQUENCE, (sequence, unicode4, unicode8, escapedChar) => {
			// 4-digit unicode character
			if (typeof unicode4 === 'string') return String.fromCharCode(Number.parseInt(unicode4, 16)); // 8-digit unicode character
			if (typeof unicode8 === 'string') {
				let charCode = Number.parseInt(unicode8, 16);
				return charCode <= 0xFFFF ? String.fromCharCode(Number.parseInt(unicode8, 16)) : String.fromCharCode(0xD800 + ((charCode -= 0x10000) >> 10), 0xDC00 + (charCode & 0x3FF));
			} // fixed escape sequence
			if (escapedChar in ESCAPE_REPLACEMENTS) return ESCAPE_REPLACEMENTS[escapedChar]; // invalid escape sequence
			invalidEscaping = true;
			return '';
		});
	}
	return invalidEscaping ? literal : unescapedLiteral;
}

module.exports = JSONGraph;