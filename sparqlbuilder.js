/*
 * copyright: IBM Confidential
 * copyright: OCO Source Materials
 * copyright: © IBM Corp. All Rights Reserved
 * date: 2020
 *
 * IBM Certificate of Originality
 */
"use strict";

const Utils             = require("./utils");
const Constants         = require("./constants");

function SparqlBuilder()
{
	this.query = "";

	this.identation = "";
}


SparqlBuilder.prototype.construct = function(input = null)
{
	if(!input)
	{
		this.query += " CONSTRUCT { GRAPH ?g { ?s ?p ?o } . GRAPH ?g { ?a ?b ?c } }" // default construct
		return;
	}

	this.query  += "CONSTRUCT \n{\n"

	this.addIdentation();

	let chunk = "";
	if(typeof input === "function")
	{
		input();
	}
	else if(typeof input === "string")
	{
		this.query += this.identation + input;
	}
	else if(Array.isArray(input))
	{
		for(let i = 0; i < input.length; i++)
		{
			let v = input[i];
			chunk += this.identation + `GRAPH ?${v[3] } { ?${v[0]} ?${v[1]} ?${v[2]} } . `
		}
	}

	this.subIdentation();

	chunk += "\n}\n";

	// return chunk;
	this.query += chunk;

}

SparqlBuilder.prototype.select = function(variables = null, isDistinct = false)
{
	if(!variables)
	{
		this.query += ` SELECT ${isDistinct ? "DISTINCT " : ""} ?s ?p ?o ?g`;
		return;
	}

	let chunk = `SELECT ${isDistinct ? "DISTINCT " : ""}`;

	for(let i = 0; i < variables.length; i++)
	{
		let v = variables[i];
		chunk += v.startsWith("?") ? `${v} ` : `?${v} `;
	}

	this.query += chunk;
}

SparqlBuilder.prototype.describe = function(variables = null)
{
	let chunk = "DESCRIBE ";
	if(variables)
	{
		for(let i = 0; i < variables.length; i++)
		{
			let v = variables[i];
			chunk += v.startsWith("?") ? `${v} ` : `?${v} `;
		}
	}
	else
	{
		chunk+= "?s";
	}

	this.query += chunk;
}

SparqlBuilder.prototype.delete = function(input = null)
{
	this.query += "DELETE ";

	if(typeof input === "function")
	{
		this.closure(input);
	}
	else if(Array.isArray(input))
	{
		this.query += _createPattern(input);
	}
	else
	{
		this.append(input, true);
	}
}

SparqlBuilder.prototype.insertData = function(input = null)
{
	this.query += "INSERT DATA ";

	if(typeof input === "function")
	{
		this.closure(input);
	}
	else if(Array.isArray(input))
	{
		this.query += _createPattern(input);
	}
	else
	{
		this.append(input, true);
	}
}

SparqlBuilder.prototype.insert = function(input = null)
{
	this.query += "INSERT ";

	if(typeof input === "function")
	{
		this.closure(input);
	}
	else if(Array.isArray(input))
	{
		this.query += _createPattern(input);
	}
	else
	{
		this.append(input, true);
	}
}

SparqlBuilder.prototype.orderBy = function(comparator, offset=0, limit=null)
{
	this.query += `\nORDER BY ${comparator}`;
	
	if (offset>0) 
	{
		this.query += `\nOFFSET ${offset}`;
	}
	if (limit && limit>0) 
	{
		this.query += `\nLIMIT ${limit}\n`;
	}
}

SparqlBuilder.prototype.where = function(callback)
{
	this.query += this.identation + "\nWHERE {\n";

	this.addIdentation();
	callback();
	this.subIdentation();

	this.query += "\n}\n";
}

SparqlBuilder.prototype.addIdentation = function()
{
	this.identation += " ";
}

SparqlBuilder.prototype.subIdentation = function()
{
	this.identation = this.identation.substr(0, this.identation.length-1);
}

SparqlBuilder.prototype.appendComment = function(comment)
{
	this.append(`# ${comment}`);
}

SparqlBuilder.prototype.addNewLine = function(comment)
{
	this.query += "\n";
}

SparqlBuilder.prototype.closure = function(callback)
{
	this.query += `\n${this.identation}{\n`;

	this.addIdentation();

	callback();

	this.subIdentation();

	this.query += `\n${this.identation}}\n`;

}

SparqlBuilder.prototype.addValues = function(variable, values, isUri = true)
{
	let chunk = `VALUES ${variable.startsWith("?") ? variable: `?${variable}`} {`;

	for(let i = 0;	i < values.length; i++)
	{
		if(isUri)
		{
			chunk += `${_convertToUri(values[i])} `;
		}
		else
		{
			chunk += `"${values[i]}"`;
		}
	}
	chunk += "} . ";

	this.append(chunk);

	// this.query += chunk;
}

SparqlBuilder.prototype.getQuery = function()
{
	return this.query;
}

SparqlBuilder.prototype.appendUnion = function()
{
	this.query += this.identation +  "UNION";
}

SparqlBuilder.prototype.append = function(chunk, enclosured = false)
{
	if(!chunk)
	{
		throw Error("Invalid filter.");
	}
	if(enclosured)
	{
		this.query += this.identation + `{ ${chunk} }\n`;
	}
	else
	{
		this.query += this.identation + `${chunk} \n`;
	}
}

SparqlBuilder.prototype.optional = function(chunk)
{
	if(typeof chunk === "string")
	{
		this.query += this.identation +  `OPTIONAL { ${chunk} } \n`;
	}
	else if(typeof chunk === "function" )
	{
		this.query += this.identation +  "OPTIONAL { "
		chunk();
		this.query += "} ";
	}
}

SparqlBuilder.prototype.bindVar = function(value, variable, enclosured = false)
{
	if(enclosured)
	{
		this.query += this.identation +  "{"
		this.addIdentation();
	}

	if(!variable.startsWith("?"))
	{
		variable = "?" + variable;
	}

	if(value.startsWith("?"))
	{
		this.query += this.identation + `BIND (${value} AS ${variable}) . `;
	}
	else if(!Utils.isUri(value))
	{
		if(Utils.isLiteral(value))
		{
			this.query += this.identation + `BIND (${value} AS ${variable}) . `;
		}
		else
		{
			this.query += this.identation + `BIND ("${value}" AS ${variable}) . `;
		}
	}
	else
	{
		this.query += this.identation + `BIND (${_convertToUri(value)} AS ${variable}) . `;
	}
	if(enclosured)
	{
		this.query += this.identation + "} \n"
		this.subIdentation();
	}
	else
	{
		this.query += "\n"
	}
}

SparqlBuilder.prototype.filter = function(value)
{
	this.append(` FILTER (${value}) . `);
}

function _createPattern(variables)
{

	let chunk = "";
	if(variables)
	{
		for(let i = 0; i < variables.length; i++)
		{
			let v = variables[i];
			chunk += `GRAPH ${v[3]} { ${v[0]} ${v[1]} ${v[2]} } . `
		}
	}
	else
	{
		chunk = " GRAPH ?g { ?s ?p ?o } . GRAPH ?g { ?o ?a ?b } "
	}
	return chunk;
}

function _convertToUri(id)
{
	if(!id)
	{
		return `<${Constants.HK_NULL}>`;
	}
	else if(Utils.isUri(id))
	{
		return id;
	}
	else if(Utils.isBlankNode(id))
	{
		return Utils.createBlankNodeUri(id.substr(2));
	}
	else
	{
		return `<${Utils.generateResourceFromId(id)}>`;
	}
}

module.exports = SparqlBuilder;
