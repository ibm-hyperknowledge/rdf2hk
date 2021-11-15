/*
 * copyright: IBM Confidential
 * copyright: OCO Source Materials
 * copyright: © IBM Corp. All Rights Reserved
 * date: 2020
 *
 * IBM Certificate of Originality
 */
"use strict";


const { NamedNode } = require("n3");
const SparqlJS = require("sparqljs");

const BOOLEAN_XSD_URI = "http://www.w3.org/2001/XMLSchema#boolean";

const HKUris = require("./hk");

/**
 * @deprecated after https://github.com/RubenVerborgh/SPARQL.js/issues/92 get fixed. 
 */
function traverseValues(values, out)
{
	for(let k in values)
	{
		let entry = values[k]

		for(let j in entry)
		{
			let v = entry[j];

			if(v.termType === "Literal") // Workaround to this bug: https://github.com/RubenVerborgh/SPARQL.js/issues/92
			{
				if(v.datatypeString === BOOLEAN_XSD_URI)
				{
					entry[j] = new v.constructor(`"${v.value.toLowerCase()}"^^${v.datatypeString}`);
				}
			}
		}
	}
}

function traverseBGP(triples, out, state)
{
	for(let i = 0; i < triples.length; i++)
	{
		let t = triples[i];

		if(!state.skipBgp)
		{
			if(t.subject.termType === "Variable")
			{
				out.subjects.add(t.subject.value)
			}
			if(t.predicate.termType === "Variable")
			{
				out.predicates.add(t.predicate.value)
			}
			if(t.object.termType === "Variable")
			{
				out.objects.add(t.object.value);
			}
		}

		// if(t.object.termType === "Literal") // Workaround to this bug: https://github.com/RubenVerborgh/SPARQL.js/issues/92
		// {
		// 	if(t.object.datatypeString === BOOLEAN_XSD_URI)
		// 	{
		// 		t.object = new t.object.constructor(`"${t.object.value.toLowerCase()}"^^${t.object.datatypeString}`);
		// 	}
		// }

	}

}

function traverseOperation(operation, out)
{
	for(let i = 0; i < operation.args.length; i++)
	{
		let o = operation.args[i];

		// if(o.termType)
		// {
		// 	if(o.termType === "Literal")
		// 	{
		// 		if(o.datatypeString === BOOLEAN_XSD_URI)
		// 		{
		// 			operation.args[i] = new o.constructor(`"${o.value.toLowerCase()}"^^${o.datatypeString}`);
		// 		}
		// 	}
		// }
		// else 
		if(o.type === "expression")
		{
			traverseExpression(o, out);
		}
		else if(o.type === "operation")
		{
			traverseOperation(o, out);
		}
	}
}

function traverseExpression(expression, out)
{
	if(expression.type === "operation")
	{
		traverseOperation(expression, out)
	}
}

function traverseFilter(filter, out)
{
	if(filter.expression)
	{
		traverseExpression(filter.expression, out);
	}
}

function traverseGraph(graph, out)
{
	if(graph.name)
	{
		out.graphs.add(graph.name.value);
	}
}

function generalTraverse(parts, out, state)
{
	for(let i = 0; i < parts.length; i++)
	{
		let n = parts[i];

		switch(n.type)
		{
			case "bgp":
				traverseBGP(n.triples, out, state);
				break;
			case "graph":
				traverseGraph(n, out, state);
			case "group":
				generalTraverse(n.patterns, out, state);
				break;
			case "query":
				traverseQuery(n, out, state)
				break;
			case "filter":
				traverseFilter(n, out, state);
				break;
			case "optional":
				generalTraverse(n.patterns, out, {skipBgp: true});
				break;
			case "bind":
				break;
			case "union":
				generalTraverse(n.patterns, out, state)
				break;
			case "values":
				//traverseValues(n.values, out, state);
				break;
			default:
				console.log("Unknown term?", n.type);
				break;
		}
	}
}

function traverseQuery(query, out, state)
{
	state = state || {skipBgp: false};
	out.queries.push(query);
	let parts = query.where;

	generalTraverse(parts, out, state);
}

function setHKFiltered(query)
{
	/**
	 * Prefixes that Triplestores recognize although not passed in a query.
	 */
	const prefixes = { owl: 'http://www.w3.org/2002/07/owl#' };
	
	try
	{
		let sparqlParser = new SparqlJS.Parser({prefixes});
		let sparqlGenerator = new SparqlJS.Generator();

		let sparqlObj = sparqlParser.parse(query);

		let filteredSparqlParser = new SparqlJS.Parser();

		let out = {subjects: new Set(),
				  predicates: new Set(),
				  objects: new Set(),
				  graphs: new Set(),
				  queries: []};

		traverseQuery(sparqlObj, out);

		for(let i = 0; i < out.queries.length; i++)
		{
			let query = out.queries[i];

			let queryTraversal = out;

			let temp = {filters: ""}

			let subjects = Array.from(queryTraversal.subjects);

			let predicates = Array.from(queryTraversal.predicates);

			let objects = Array.from(queryTraversal.objects);

			let graphs = Array.from(queryTraversal.graphs);

			if((subjects.length +  predicates.length + objects.length + graphs.length) === 0)
			{
				continue;
			}

			let first = false;

			let variables = new Set();

			for(let i = 0; i < subjects.length; i++)
			{
				let v = subjects[i];
				variables.add(`?${v}`);

				if( first )
				{
					temp.filters += " && ";
				}
				filterSubjectsForHK(v, temp);
				first = true;
			}

			// add filters for predicate variables
			for(let i = 0; i < predicates.length; i++)
			{
				let v = predicates[i];
				variables.add(`?${v}`);

				if( first )
				{
					temp.filters += " && ";
				}
				filterPredicatesForHK(v, temp);
				first = true;
			}

			// add filters for object variables
			for(let i = 0; i < objects.length; i++)
			{
				let v = objects[i];
				variables.add(`?${v}`);

				if( first )
				{
					temp.filters += " && ";
				}
				filterObjectsForHK(v, temp);
				first = true;
			}


			let filteredQuery = `select ${[...variables].join(' ')} where { filter(${temp.filters}) }`;

			let filteredQueryObject = filteredSparqlParser.parse(filteredQuery);

			if (query.where.length == 1 && query.where[0].type == 'query') {
				// should create a group that contains the current where...
				let newGroup = {
					type: 'group', 
					patterns: [query.where[0]]
				};
				query.where[0] = newGroup;
			}
			
			query.where = query.where.concat(filteredQueryObject.where);
		}

		return sparqlGenerator.stringify(sparqlObj);

	}
	catch(err)
	{
		throw err;
	}

}


function setFilterFrom(query, namedGraph)
{
  try
  {
    let sparqlParser = new SparqlJS.Parser();
    let sparqlGenerator = new SparqlJS.Generator();

    let sparqlObj = sparqlParser.parse(query);

    if (sparqlObj.from === undefined)
    {
      sparqlObj.from = { 'default': [new NamedNode(namedGraph)] };
    }
    else
    {
      if (sparqlObj.from.default)
      {
        sparqlObj.from.default.push(new NamedNode(namedGraph));
      }
      else
      {
        sparqlObj.from.default = [new NamedNode(namedGraph)];
      }
    }

    return sparqlGenerator.stringify(sparqlObj);
  }
  catch (err)
  {
    throw err;
  }
}


function filterPredicatesForHK (variable, filters)
{
	if(!variable.startsWith("?"))
	{
		variable = "?" + variable;
	}
	filters.filters += `(
		!BOUND(${variable}) || 
		(
			${variable} != ${HKUris.ISA_URI} &&
			${variable} != ${HKUris.USES_CONNECTOR_URI}  &&
			${variable} != ${HKUris.CLASSNAME_URI} &&
			${variable} != ${HKUris.REFERENCES_URI} &&
			${variable} != ${HKUris.HAS_PARENT_URI} &&
			${variable} != ${HKUris.DATA_LITERAL_URI} &&
			!STRSTARTS(STR(${variable}), "hk://role") &&
			!STRSTARTS(STR(${variable}), "hk://b/") &&
			!STRSTARTS(STR(${variable}), "hk://link")
		)
	)`;
}

function filterSubjectsForHK (variable, filters)
{
	filterObjectsForHK (variable, filters);
}

function filterObjectsForHK (variable, filters)
{
	if(!variable.startsWith("?"))
	{
		variable = "?" + variable;
	}
	const stringBasedFilters =  `!( ISIRI(${variable}) && ( STRSTARTS(STR(${variable}), "hk://role") || STRSTARTS(STR(${variable}), "hk://link") || STRSTARTS(STR(${variable}), "hk://b/") || STRSTARTS(STR(${variable}), "hk://node/") || ${variable} = ${HKUris.DATA_LITERAL_URI} ) )`;
	const functionBasedFilters = `( isIRI(${variable}) || isBlank(${variable}) ||  datatype(${variable}) != ${HKUris.DATA_LIST_URI} )`;
	filters.filters += `(
		!BOUND(${variable}) ||
		( 
			${stringBasedFilters} && ${functionBasedFilters} 
		)
	)`;
}

function optimizeFilter (filters)
{
	let out = [];

	let clusters = {};

	let addPairToCluster = (key)=>
	{
		if(!clusters.hasOwnProperty(key))
		{
			clusters[key] = 1;
		}
		else
		{
			clusters[key] = clusters[key] + 1;;	
		}
	}

	let getHashes = (andFilters) =>
	{
		let hashes = [];

		for(let j = 0; j < andFilters.length; j++)
		{
			let constraint = andFilters[j];

			for(let k in constraint)
			{
				let v = constraint[k];

				if(typeof v === "object")
				{
					for(let i in v)
					{
						let pair = `${k}.${i}=${v[i]}`;
						hashes.push(pair);
					}
				}
				else
				{
					let pair = `${k}=${v}`;
					hashes.push(pair);
				}
			}

		}

		return hashes;
	}

	for(let i = 0; i < filters.length; i++)
	{
		let andFilters = filters[i];

		let hashes = getHashes(andFilters);
		for(let h of hashes)
		{
			addPairToCluster(h);
		}
		out.push(andFilters);
	}


	filters.sort((a, b) =>
	{
		let hashesA = getHashes(a);
		let hashesB = getHashes(b);

		if(hashesA.length < hashesB.length)
		{
			return -1;
		}
		else if(hashesA.length > hashesB.length)
		{
			return 1;
		}
		else
		{
			let aCounts = [];
			for(let i = 0; i < hashesA.length; i++)
			{
				aCounts.push(clusters[hashesA[i]]);
			}
			let bCounts = [];
			for(let i = 0; i < hashesB.length; i++)
			{
				bCounts.push(clusters[hashesA[i]]);
			}

			aCounts.sort();
			bCounts.sort();

			let ka = aCounts.join("_");
			let kb = bCounts.join("_");

			if(ka < kb)
			{
				return -1;
			}
			else if(kb < ka)
			{
				return -1;
			}
			else 
			{	
				hashesA.sort();
				hashesB.sort();

				let ha = hashesA.join(";");
				let hb = hashesB.join(";");

				if(ha < hb)
				{
					return -1;
				}
				else if(ha > hb)
				{
					return 1;
				}
				return 0;
			}


		}

	});

	let optimized = [];

	let last = filters[0];

	let willBreak = false;
	for(let i = 1; i < filters.length; i++)
	{
		let item = filters[i];


		let pendingValue = null;
		let pendingKey = null;
		let pendingProperty = null;
		let foundWildcard = false;
		for(let i = 0 ; i < item.length; i++)
		{
			let c1 = item[i];

			for(let k in c1)
			{
				for(let j = 0; j < last.length; j++)
				{
					let c2 = last[j];


					if(c2.hasOwnProperty(k))
					{
						if(Array.isArray(c2[k]))
						{
							if(!foundWildcard)
							{
								foundWildcard = true;
								pendingValue = c1[k];
								pendingKey = k;
								pendingProperty = c2;
							}
							else
							{
								optimized.push(last);
								last = item;
								willBreak = true;
								break;
							}
						}
						else if(typeof c2[k] === "object" && typeof c1[k] === "object")
						{
							let v1 = c1[k];
							let v2 = c2[k];

							for(let x in v1)
							{
								if(Array.isArray(v2[x]))
								{
									if(!foundWildcard)
									{
										foundWildcard = true;
										pendingValue = v1[x];
										pendingKey = x;
										pendingProperty = v2;
									}
									else
									{
										optimized.push(last);
										last = item;
										willBreak = true;
										break;
									}
								}
								else if(v2.hasOwnProperty(x))
								{
									if(v1[x] !== v2[x])
									{
										if(!foundWildcard)
										{
											foundWildcard = true;
											pendingValue = v1[x];
											pendingKey = x;
											pendingProperty = v2;
										}
										else
										{
											optimized.push(last);
											last = item;
											willBreak = true;
											break;
										}
									}
									
								}
								else
								{
									optimized.push(last);
									last = item;
									willBreak = true;
									break;
								}
							}
						}
						else
						{
							if(c1[k] !== c2[k])
							{
								if(foundWildcard)
								{
									optimized.push(last);
									last = item;
									willBreak = true;
									break;
								}
								else
								{
									pendingValue = c1[k];
									pendingKey = k;
									pendingProperty = c2;
									foundWildcard = true;
								}
							}
						}
					}
					else
					{
						optimized.push(last);
						last = item;
						willBreak = true;
						break;
					}
				}

				if(willBreak)
				{
					break;
				}
			}
			if(willBreak)
			{
				break;
			}
		}

		if(!willBreak && pendingValue && pendingProperty && pendingKey)
		{
			if(!Array.isArray(pendingProperty[pendingKey]))
			{
				pendingProperty[pendingKey] = [pendingProperty[pendingKey]];
			}

			pendingProperty[pendingKey].push(pendingValue);
		}
		willBreak = false;

	}
	optimized.push(last);

	return optimized;
}

function optimizeFilter2 (filters)
{
	const clusters          = {};
	const bindClusters      = {};
	const bindConnClusters  = {};

	let out = [];

	let map = {};

	let bindsArray = [];

	for(let i = 0; i < filters.length; i++)
	{
		let andFilters = filters[i];

		let currentConstraint = [];
		

		if(andFilters.length === 1)
		{
			for(let j = 0; j < andFilters.length; j++)
			{
				let constraint = andFilters[j];

				let keys = Object.keys(constraint);

				if(keys.length === 2)
				{
					if(constraint.binds && constraint.connector && Object.keys(constraint.binds).length === 1)
					{
						if(!bindConnClusters.hasOwnProperty(constraint.connector))
						{
							bindConnClusters[constraint.connector] = {};
						}

						let role = Object.keys(constraint.binds)[0];
						let binds = bindConnClusters[constraint.connector];
						
						if(!binds.hasOwnProperty(role))
						{
							binds[role] = new Set();
						}
						binds[role].add(constraint.binds[role]);
					}
					else
					{
						currentConstraint.push(constraint);	
					}
				}
				else 
				if(keys.length === 1)
				{
					let k = keys[0];
					let v = constraint[k];
					switch(k)
					{
						case "parent":
						case "ref":
						case "id":
						case "connector":
							if(!clusters.hasOwnProperty(k))
							{
								clusters[k] = new Set();
							}
							clusters[k].add(v);
						break;
						case "binds":
							let role = Object.keys(constraint[k])[0];
							if(!bindClusters.hasOwnProperty(role))
							{
								bindClusters[role] = new Set();
							}
							bindClusters[role].add(v[role]);

							break;
						default:
							// out.push([constraint]);
							currentConstraint.push(constraint);
						break;

					}
				}
				else
				{
					// out.push([constraint]);
					currentConstraint.push(constraint);
				}
			}
			if(currentConstraint.length > 0)
			{
				out.push(currentConstraint);
			}
		}
		else
		{
			out.push(andFilters);
		}
	}

	if(Object.keys(clusters).length > 0)
	{
		for(let k in clusters)
		{
			let optimized = {}
			optimized[k] = Array.from(clusters[k]);
			out.push([optimized]);
		}
	}

	if(Object.keys(bindClusters).length > 0)
	{
		for(let k in bindClusters)
		{
			let optimized = {binds: {}};
			optimized.binds[k] = Array.from(bindClusters[k]);
			out.push([optimized]);
		}
	}

	if(Object.keys(bindConnClusters).length > 0)
	{
		for(let k in bindConnClusters)
		{
			let binds = bindConnClusters[k];

			for(let role in binds)
			{
				let optimized = {connector: k, binds: {}};
				optimized.binds[role] = Array.from(binds[role]);
				out.push([optimized]);
			}
		}
	}

	return out;
}

exports.optimizeFilter  = optimizeFilter;
exports.filterForHK = filterPredicatesForHK;
exports.setHKFiltered = setHKFiltered;
exports.setFilterFrom = setFilterFrom;