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
const HKUris           = require("./hk");
const HKSerializer     = require("./hkserializer");

const HKTypes          = require("hklib").Types;

const SparqlBuilder    = require("./sparqlbuilder");
const { HIERARCHY } = require("hklib/connectorclass");

const ENTITY_ANCHORS        = ` ?s ${HKUris.HAS_ANCHOR_URI} ?a . GRAPH ?g {?a ?b ?c} `;
const REFERENCES_FILTERS    = ` ?g = ?g1 || !bound(?g1) `;

const DEFAULT_GRAPH_PATTERN = `GRAPH ?g { ?s ?p ?o } .`;

const FILTER_HK = `FILTER ( ?p != ${HKUris.ISA_URI} &&
		 ?p != ${HKUris.USES_CONNECTOR_URI} &&
		 ?p != ${HKUris.CLASSNAME_URI} &&
		 ?p != ${HKUris.REFERENCES_URI} &&
		 ?p != ${HKUris.HAS_PARENT_URI} &&
		 !STRSTARTS(STR(?p), "hkrole") &&
		 ( isIRI(?o) || isBlank(?o) ||  datatype(?o) != ${HKUris.DATA_LIST_URI}))`

const HKTypeUriMap = {};
HKTypeUriMap[HKTypes.NODE] = HKUris.NODE_URI;
HKTypeUriMap[HKTypes.CONNECTOR] = HKUris.CONNECTOR_URI;
HKTypeUriMap[HKTypes.LINK] = HKUris.LINK_URI;
HKTypeUriMap[HKTypes.CONTEXT] = HKUris.CONTEXT_URI;
HKTypeUriMap[HKTypes.REFERENCE] = HKUris.REF_URI;
HKTypeUriMap[HKTypes.TRAIL] = HKUris.TRAIL_URI;

function getAllEntitiesUncompressed ()
{
	let query= `SELECT ?s ?p ?o ?g
				where
				{
					{ GRAPH ?g { ?s ?p ?o . }  } .
					?s ?hk ?x.
					values ?hk
					{
						${HKUris.ISA_URI}
						${HKUris.BOUND_COMPONENT_URI}
					}
				}
	`;
	// console.log(query);
	return query;
}

function getAllEntities (sparqlType = "construct")
{
	let builder = new SparqlBuilder();

	if(sparqlType === "describe")
	{
		return "describe ?s ?o where {?s ?p ?o}"
	}
	builder.construct();

	builder.where(() =>
	{

		builder.closure(() =>
		{
			builder.append("?s ?hk ?x .");
			builder.addValues("?hk", [HKUris.ISA_URI, HKUris.USES_CONNECTOR_URI]);
			builder.append(DEFAULT_GRAPH_PATTERN);
		});

		builder.appendUnion();

		builder.closure(() =>
		{
			// builder.append(DEFAULT_GRAPH_PATTERN);
			builder.addValues("?hk", [HKUris.ISA_URI, HKUris.USES_CONNECTOR_URI]);
			builder.append("?s ?hk ?x .");
			builder.append(ENTITY_ANCHORS);
		});

		builder.filter(REFERENCES_FILTERS);

	});

	let sparql = builder.getQuery();


	return sparql;
}

function getAllEntitiesLazy (sparqlType = "construct")
{
	let builder = new SparqlBuilder();

	builder[sparqlType]();

	builder.where(() =>
	{

		builder.closure(() =>
		{
			builder.append("?s ?hk ?x .");
			builder.addValues("?hk", [HKUris.ISA_URI, HKUris.USES_CONNECTOR_URI]);
		});

	});

	let sparql = builder.getQuery();


	return sparql;
}

function getEntities (ids)
{
	if(!ids)
	{
		throw "Ids can not be null";
	}

	let builder = new SparqlBuilder();

	builder.construct();

	builder.where(() =>
	{
		builder.closure(() =>
		{
			builder.addValues("?s", ids);
			builder.append("GRAPH ?g { ?s ?p ?o	 } .");
		})

		builder.appendUnion();

		builder.closure(() =>
		{
			builder.addValues("?s", ids);
			builder.append(ENTITY_ANCHORS);
		});

		builder.filter(REFERENCES_FILTERS);
	});

	let sparql = builder.getQuery();

	return sparql;
}

function filterEntities (filters)
{
	if(!filters)
	{
		throw "Filters can not be null";
	}

	let builder = new SparqlBuilder();

	builder.construct(" GRAPH ?g { ?s ?p ?o } . GRAPH ?g { ?a ?b ?c } . GRAPH ?g1 {?a1 ?b1 ?c1} ");

	builder.where(() =>
	{
		for(let i = 0; i < filters.length; i++)
		{
			let andFilters = filters[i];

			let hasNode = _checkIfHasNodeInConstraint(andFilters);

			if(i > 0)
			{
				builder.appendUnion();
			}

			builder.closure(() =>
			{
				builder.closure(() =>
				{
					appendUnionFilters(builder, andFilters);	
					builder.append(" GRAPH ?g {?s ?p ?o} .");	
				});

				if(hasNode)
				{
					builder.appendUnion();

					builder.closure(() =>
					{
						appendUnionFilters(builder, andFilters);	
						builder.append(`?s ${HKUris.HAS_ANCHOR_URI} ?a . GRAPH ?g {?a ?b ?c}`, true);
					});
					
					builder.appendUnion();

					builder.closure(() =>
					{
						appendUnionFilters(builder, andFilters);	
					});
				}


			})
		}
	});

	let query = builder.getQuery();

	return query;
}

function filterEntitiesLazy (filters, sparqlType = "construct")
{
	if(!filters)
	{
		throw "Filters can not be null";
	}

	let builder = new SparqlBuilder();

	switch(sparqlType)
	{
		case "describe":
			builder.describe();
			break;
		default :
			builder.construct("GRAPH ?g { ?s ?hk ?x }");
			break;
	}

	builder.where(() =>
	{
		for(let i = 0; i < filters.length; i++)
		{
			let andFilters = filters[i];

			if(i > 0)
			{
				builder.appendUnion();
			}

			builder.closure(() =>
			{
				builder.closure(() =>
				{
					appendUnionFilters(builder, andFilters);	
					builder.append("GRAPH ?g { ?s ?hk ?x . }");
					builder.addValues("?hk", [HKUris.ISA_URI, HKUris.USES_CONNECTOR_URI]);
				});
			})
		}
	});

	let query = builder.getQuery();

	return query;
}

function filterEntitiesSelect (filters)
{
	if(!filters)
	{
		throw "Filters can not be null";
	}

	let builder = new SparqlBuilder();

	builder.select(null, true);

	builder.where(() =>
	{
		for(let i = 0; i < filters.length; i++)
		{
			let andFilters = filters[i];

			let hasNode = _checkIfHasNodeInConstraint(andFilters);

			if(i > 0)
			{
				builder.appendUnion();
			}

			builder.closure(() =>
			{
				builder.closure(() =>
				{
					appendUnionFilters(builder, andFilters);	
					builder.append(" GRAPH ?g {?s ?p ?o} .");	
				});

				if(hasNode)
				{
					builder.appendUnion();

					builder.closure(() =>
					{
						appendUnionFilters(builder, andFilters, "n");	
						builder.append(`?n ${HKUris.HAS_ANCHOR_URI} ?s .`);
						builder.append("GRAPH ?g { ?s ?p ?o } .");	
					});

					let filteredAndFilters = andFilters.filter(filter => {
						if (filter.hasOwnProperty("id") || (filter.hasOwnProperty("parent") && !(filter.parent instanceof Object)) ) return false;
						return true;
					})

					if (filteredAndFilters.length > 0) {
						builder.appendUnion();

						builder.closure(() =>
						{
							appendUnionFilters(builder, filteredAndFilters);	
						});       
					}
					
				}
			});
		}
	});

	let query = builder.getQuery();

	return query;
}

function fromUris (uris, className, level, full)
{
	if(!uris)
	{
		throw "Uri can not be null";
	}

	if(uris.constructor !== Array)
	{
		uris = [uris];
	}

	let sparql = "";

	if(level === undefined || level === null)
	{
		level = 1;
	}

	if(level === 0)
	{
		sparql = "describe ?s where { ";
	}
	else
	{
		sparql = "describe ?s ?o where { ";
	}
	if(className)
	{
		sparql += ` ?s  ${RDFS_TYPE_URI}  ${className} . `;
	}

	sparql += "{values ?s {";

	for(let i = 0;  i < uris.length; i++)
	{
		sparql += `${_convertToUri(uris[i])} `;
	}

	sparql += "}";
	sparql += " . ?s ?p ?o }" ;

	if(full)
	{
		sparql += "union {values ?o {";

		for(let i = 0;  i < uris.length; i++)
		{
			sparql += `${_convertToUri(uris[i])} `;
		}

		sparql += "}";
		sparql += " . ?s ?p ?o }" ;

	}

	sparql += "}";
	
	return sparql;
}

function getEntitiesFromUris(ids)
{
	let builder = new SparqlBuilder();

	builder.select(null, true);

	builder.where(() =>
	{
		builder.closure(() =>
		{
			builder.addValues("?s", ids);
			builder.append("GRAPH ?g { ?s ?p ?o	 } .");
		})

		builder.appendUnion();

		builder.closure(() =>
		{
			builder.addValues("?n", ids);
			builder.append("?n <http://research.ibm.com/ontologies/graph#hasAnchor> ?s .");
			builder.append("GRAPH ?g { ?s ?p ?o } .");
		});

	});

	let sparql = builder.getQuery();

	return sparql;

}

// This query update the delete and insert triples
// to update entities properties.
// There are some scenarios:
// I. Update properties
// II. Update parents
// III. Update properties and parents
//
//
function updateTriples (changedEntities, changedParents)
{
	let builder = new SparqlBuilder();

	let changedEntitiesKeys = Object.keys(changedEntities);
	let changedParentKeys = Object.keys(changedParents);

	// If there a no changes, just go away
	if(changedEntitiesKeys.length === 0 && changedParentKeys.length === 0)
	{
		return null;
	}

	if(changedEntitiesKeys.length > 0)
	{
		// Delete previous properties
		builder.delete(() =>
		{
			// Delete old properties
			builder.append(`GRAPH ?g {?s ?p ?o} .`);
			builder.append(`GRAPH ?g {?a ?b ?c} .`);
		});
		// Here we have to collect all properties that should be removed
		// and be replaced to the new ones
		builder.where(() =>
		{
			let first = true;

			for(let e in changedEntities)
			{
				let entityUpdates = changedEntities[e];

				let properties = entityUpdates.properties;

				let interfacesToRemove = entityUpdates.interfacesToRemove;

				let interfaceProperties = entityUpdates.interfacesPropertites;

				if(!first) 
				{
					if (properties.length > 0 || interfacesToRemove.length > 0 || Object.keys(interfaceProperties).length > 0) 
					{
						builder.appendUnion();
						first = true;
					} 
					else 
					{
						console.log(`STRANGE ENTITY: ${JSON.stringify(entityUpdates)}`);
					}
				} 

				// Remove properties to be updated
				if(properties.length > 0)
				{
					first = false;
					builder.closure(() =>
					{
						builder.bindVar(_convertToUri(e), "?s");
						builder.addValues("?p", properties);
						builder.append(`GRAPH ?g {?s ?p ?o}`);
					});
				}

				// Remove interfaces to be deleted
				if(interfacesToRemove.length > 0)
				{
					if(!first)
					{
						builder.appendUnion();
					}
					first = false;
					builder.closure(() =>
					{
						builder.bindVar(_convertToUri(e), "?s");
						builder.append(`GRAPH ?g {?s ?p ?o} .`); 
						builder.append(`bind (?o as ?a)`); // Trick
						builder.append(`GRAPH ?g {?a ?b ?c} .`);

						builder.addValues("?x", interfacesToRemove, false);
						builder.append(`?a ${HKUris.ANCHOR_KEY_URI} ?x .`);
						builder.append(`?s ${HKUris.HAS_ANCHOR_URI} ?a .`);
					});
				}

				// Remove interfaces properties to be updated
				if(Object.keys(interfaceProperties).length > 0)
				{
					for(let k in interfaceProperties)
					{
						if(!first)
						{
							builder.appendUnion();
						}
						first = false;

						let properties = interfaceProperties[k];
						builder.closure(() =>
						{
							builder.bindVar(_convertToUri(e), "?s");
							builder.append(`GRAPH ?g {?a ?b ?c} .`);

							builder.addValues("?b", properties);
							builder.bindVar(k, "?x");
							builder.append(`?a ${HKUris.ANCHOR_KEY_URI} ?x .`);
							builder.append(`?s ${HKUris.HAS_ANCHOR_URI} ?a .`);
						});
					}
				}
			}
		});

		builder.append(";");

		// Add new properties
		for(let e = 0; e < changedEntitiesKeys.length; e++)
		{
			let entityId = changedEntitiesKeys[e];
			let entity = changedEntities[entityId];
			let newTriples = entity.triples || [];

			const hasChangedParent = changedParents.hasOwnProperty(entityId);


			// If the entity did not changed its parent
			// then add again getting its previous parent
			if(hasChangedParent)
			{
				// The triple are plenty, just add them
				builder.insertData(() =>
				{
					for(let i = 0; i < newTriples.length; i++)
					{
						let t = newTriples[i];

						builder.append(`GRAPH ${t[3]} { ${t[0]} ${t[1]} ${t[2]} } . `);
					}
				});
			}
			else
			{
				builder.insert(() =>
				{
					for(let i = 0; i < newTriples.length; i++)
					{
						let t = newTriples[i];

						builder.append(`GRAPH ?g { ${t[0]} ${t[1]} ${t[2]} } . `);
					}
				});
				builder.where(() =>
				{
					builder.append(` bind(${_convertToUri(entityId)} as ?s) . `);
					builder.addValues("?p", [HKUris.USES_CONNECTOR_URI, HKUris.ISA_URI]);
					builder.append(`GRAPH ?g { ?s ?p ?o } . `);
				});

			}
			builder.append(";");
		}
	}

	// Move triples to new parent
	if(changedParentKeys.length > 0)
	{

		// Add all the previous entities to the new parent
		for(let i = 0; i < changedParentKeys.length; i++)
		{
			let id = changedParentKeys[i];
			let entityUri = _convertToUri(id);
			let parentUri = _convertToUri(changedParents[id]);

			builder.delete(() =>
			{
				// Delete old properties
				builder.append(`GRAPH ?g {?s ?p ?o} .`);
				builder.append(`GRAPH ?gOld  { ?s ${HKUris.HAS_PARENT_URI} ?gOld. } `);
			});

			builder.insert(() =>
			{
				// Insert new properties
				// builder.append(`GRAPH ?g {?s ?p ?o} .`);
				builder.append(`GRAPH ${parentUri}  { ?s ?p ?o . } `);
				builder.append(`GRAPH ${parentUri}  { ?s ${HKUris.HAS_PARENT_URI} ${parentUri}. } `);
			});

			builder.where(() =>
			{
				builder.append(` bind(${entityUri} as ?s) . `);
				builder.addValues("?isa", [HKUris.ISA_URI, HKUris.USES_CONNECTOR_URI]);
				builder.append(` ?s ?isa ?x . `);
				builder.append(` GRAPH ?g { ?s ?p ?o } . `);
				builder.filter(` ?p != ${HKUris.HAS_PARENT_URI}`);
				builder.append(` OPTIONAL { GRAPH ?gOld { ?s ${HKUris.HAS_PARENT_URI} ?gOld } . }`);
			});

			builder.append(";");
		}

	}

	let query = builder.getQuery();

	return query;
}

function removeEntities (ids)
{
	if(!ids)
	{
		throw "Ids can not be null";
	}

	let builder = new SparqlBuilder();

	builder.delete("GRAPH ?g {?s ?p ?o} . GRAPH ?g {?a ?b ?c} ");

	builder.where(() =>
	{
		builder.closure(() =>
		{
			builder.addValues("?s", ids)
			builder.append(ENTITY_ANCHORS);
		});

		builder.appendUnion();
		
		builder.closure(() =>
		{
			builder.addValues("?o", ids);
			builder.append(DEFAULT_GRAPH_PATTERN);
		});

		builder.appendUnion();

		builder.closure(() =>
		{
			builder.addValues("?s", ids)
			builder.append(DEFAULT_GRAPH_PATTERN);
			// builder.optional(ENTITY_ANCHORS);
		});

		
	});

	return builder.getQuery();
}

function removeAllEntities ()
{
	return "CLEAR ALL";
}

function getContextHierarchy (uris, targetTypes, sparqlType = "construct")
{
	if(!uris)
	{
		throw "Uri can not be null";
	}

	if(uris.constructor !== Array)
	{
		uris = [uris];
	}

	const targetTypesUris = [];
	if(Array.isArray(targetTypes))
	{
		targetTypes.forEach((type) => {
			if(HKTypeUriMap.hasOwnProperty(type))
			{
				targetTypesUris.push(HKTypeUriMap[type])
			}
		});
	}

	let builder = new SparqlBuilder();

	switch(sparqlType)
	{
		case "describe":
			builder.describe(["?s"]);
			break;
		default :
			builder.construct(() =>
			{
				builder.append("GRAPH ?g {?s ?p ?o}");
			});
			break;
	}

	builder.where( () =>
	{
		builder.addValues("?parent", uris);
		builder.append(` ?s ${HKUris.HAS_PARENT_URI}* ?parent .`);
		builder.append(" GRAPH ?g {?s ?p ?o} .");
		if(targetTypesUris)
		{
			builder.append(` ?s ${HKUris.ISA_URI} ?type`);
			builder.addValues("?type", targetTypesUris);
		}
	});

	let query = builder.getQuery();

	return query;
}

function getLinks (ids, sparqlType = "construct")
{
	if(!ids)
	{
		throw "Uri can not be null";
	}

	let builder = new SparqlBuilder();

	builder[sparqlType]();

	builder.where(() =>
	{
		builder.closure(() =>
		{

			builder.closure(() =>
			{
				builder.addValues("?s", ids);

				// Get the connector itself
				builder.append(`?s ${HKUris.USES_CONNECTOR_URI} ?x`);
				builder.append(`GRAPH ?g {?s ?p ?o}`);

			});

			builder.appendUnion();
			builder.closure(() =>
			{
				builder.addValues("?x", ids);
				// Link with a bound entity
				builder.append(`?s ${HKUris.USES_CONNECTOR_URI} ?connector . ?s ?role ?x `);
				builder.append(`GRAPH ?g {?s ?p ?o}`);
			});

			builder.appendUnion();
			builder.closure(() =>
			{
				builder.addValues("?x", ids);
				// Link with a bound entity
				builder.append(`?s ${HKUris.ISA_URI} ${HKUris.CONNECTOR_URI} .`);
				builder.append(`?link ?role ?x . ?link ${HKUris.USES_CONNECTOR_URI} ?s . `);
				builder.append(`GRAPH ?g {?s ?p ?o}`);
			});

			// builder.appendUnion();

			// builder.closure(() =>
			// {
			// 	builder.addValues("?x", ids);
				
			// 	// Connector from a bound entity
			// 	// builder.append(`?s ${HKUris.ISA_URI} ${HKUris.CONNECTOR_URI} .`);
			// 	// builder.append(`?link ${HKUris.USES_CONNECTOR_URI} ?s . `);
			// 	builder.append(`?link ?role ?x `);
			// })



		});

		builder.append(DEFAULT_GRAPH_PATTERN);
	});

	let sparql = builder.getQuery();

	return sparql;
}

function deleteTriples (bgp)
{
	let builder = new SparqlBuilder();

	builder.delete(() =>
	{
		builder.append("GRAPH ?g {?s ?p ?o}");
	});

	builder.where(() =>
	{
		builder.closure(() =>
		{
			if(bgp[0] !== null)
			{
				builder.bindVar(bgp[0], "s");
			}
			if(bgp[1] !== null)
			{
				builder.bindVar(bgp[1], "p");
			}
			if(bgp[2] !== null)
			{
				builder.bindVar(bgp[2], "o");
			}
			if(bgp[3] !== null)
			{
				builder.bindVar(bgp[3], "g");
			}

			builder.append("GRAPH ?g {?s ?p ?o}");
		});

		if(Utils.isUriOrBlankNode(bgp[0]) && !Utils.isUriOrBlankNode(bgp[2]))
		{
			builder.appendUnion();

			builder.closure( () =>
			{
				builder.append(`?s ${HKUris.REFERENCES_URI} ${bgp[0]} `);
				if(bgp[1] !== null)
				{
					builder.bindVar(bgp[1], "p");
				}
				if(bgp[2] !== null)
				{
					builder.bindVar(bgp[2], "o");
				}
				if(bgp[3] !== null)
				{
					builder.bindVar(bgp[3], "g");
				}
				builder.append("GRAPH ?g {?s ?p ?o}");
			});
		}
	});

	// console.log(builder.query);

	return builder.query;
}

function getRdf(bgp, sparqlType = "construct")
{
	let builder = new SparqlBuilder();

	switch(sparqlType)
	{
		case "select":
			builder.select();
			break;
		default:
			builder.construct(() =>
			{
				builder.append("GRAPH ?g {?s ?p ?o}");
			});
	}

	builder.where(() =>
	{
		if(bgp[0] !== null)
		{
			builder.bindVar(bgp[0], "s");
		}
		if(bgp[1] !== null)
		{
			builder.bindVar(bgp[1], "p");
		}
		if(bgp[2] !== null)
		{
			builder.bindVar(bgp[2], "o");
		}
		if(bgp[3] !== null)
		{
			builder.bindVar(bgp[3], "g");
		}

		builder.append("GRAPH ?g {?s ?p ?o} .");

		builder.append( FILTER_HK);

	});

	let out = builder.query;

	return out;

}

function _filterForBinds(builder, binds, connector = null, parent = undefined)
{

	function filterForRole(includeReferences = false) {
		if (!connector) {
			builder.append(`?s ${HKUris.USES_CONNECTOR_URI} ?conn . `);
		}
		for (let role in binds) {
			if (Array.isArray(binds[role])) {
				builder.addValues("r", binds[role], true);

				if (role === "*") {

					builder.append(`?s ?anyRole ?r . `);
				}

				else {
					let uri = HKSerializer.compressRoleInUri(role);
					// builder.append(`?s ${HKUris.USES_CONNECTOR_URI} ?conn . `);
					if(includeReferences)
					{
						builder.closure(() => {
							builder.append(`?s ${uri}/${HKUris.REFERENCES_URI}? ${_convertToUri(binds[role])} . `);	
						});
						builder.appendUnion();
						builder.closure(() =>
						{
							builder.append(`?s ${uri}/${HKUris.REFERENCES_URI}? ?referredNode . `);	
							builder.append(`?referredNode ?isa ${_convertToUri(binds[role])} .`);
							builder.append(`?s ${HKUris.USES_CONNECTOR_URI} ?connector2 .`);
							builder.append(`?connector2 ${HKUris.CLASSNAME_URI} "${HIERARCHY}" .`);
						});
						builder.append(`?s ?anyRole ?node .`);
						builder.append(`?s ${HKUris.USES_CONNECTOR_URI} ?connector .`);
						builder.append(`?connector ${HKUris.CLASSNAME_URI} "${HIERARCHY}" .`);
					}
					else
					{
						builder.append(`?s ${uri} ?r . `);
					}
					
				}
			}

			else {
				if (role === "*") {
					// builder.append(`?s ${HKUris.USES_CONNECTOR_URI} ?conn . `);
					builder.append(`?s ?anyRole ${_convertToUri(binds[role])} . `);
				}

				else {
					let uri = HKSerializer.compressRoleInUri(role);
					// builder.append(`?s ${HKUris.USES_CONNECTOR_URI} ?conn . `);
					if(includeReferences)
					{
						builder.closure(() => {
							builder.append(`?s ${uri}/${HKUris.REFERENCES_URI}? ${_convertToUri(binds[role])} . `);	
						});
						builder.appendUnion();
						builder.closure(() =>
						{
							builder.append(`?s ${uri}/${HKUris.REFERENCES_URI}? ?referredNode . `);	
							builder.append(`?referredNode ?isa ${_convertToUri(binds[role])} .`);
							builder.append(`?s ${HKUris.USES_CONNECTOR_URI} ?connector2 .`);
							builder.append(`?connector2 ${HKUris.CLASSNAME_URI} "${HIERARCHY}" .`);
						});
						builder.append(`?s ?anyRole ?node .`);
						builder.append(`?s ${HKUris.USES_CONNECTOR_URI} ?connector .`);
						builder.append(`?connector ${HKUris.CLASSNAME_URI} "${HIERARCHY}" .`);
					}
					else
					{
						builder.append(`?s ${uri} ${_convertToUri(binds[role])} . `);
					}
				}
			}
		}
	}

	function filterForConnector(useGraph = true) {
		if (connector) {
			if(useGraph)
			{
				builder.append(`GRAPH ?g {?s ?p ?o} .`);
			}
			else
			{
				builder.append(`?s ?p ?o .`);
			}
			// builder.append(`?s ${HKUris.USES_CONNECTOR_URI} ${_convertToUri(connector)} . `)
			// builder.bindVar(_convertToUri(connector), "conn");
			if (Array.isArray(connector)) {
				builder.addValues("c", connector, true);
				builder.append(`?s ${HKUris.USES_CONNECTOR_URI} ?c `);
			}

			else {
				// builder.append(`?s ${HKUris.USES_CONNECTOR_URI} ${_convertToUri(constraint[k])} .`, true);
				builder.append(`?s ${HKUris.USES_CONNECTOR_URI} ${_convertToUri(connector)} . `);
			}
		}
	}

	builder.closure(() =>
	{

		if(parent === undefined)
		{
			filterForRole();
			filterForConnector();
		}
		else
		{
			builder.closure(() =>
			{
				filterForRole();
				filterForConnector();
				if(!connector)
				{
					builder.append(`GRAPH ?g {?s ?p ?o} .`);
				}
			});
			builder.appendUnion();
			builder.closure(() =>
			{
				filterForRole(true);
				filterForConnector(false);
				builder.append(`GRAPH ?g { ?ref ${HKUris.REFERENCES_URI} ?node }.`);
			});
			_filterForParent(builder, parent);
		}
	});

	

	
}

function appendUnionFilters(builder, andFilters, idVar = "s")
{
	for(let j = 0; j < andFilters.length; j++)
	{
		let constraint = andFilters[j];

		
		if(Object.keys(constraint).length >= 2)
		{
			if(constraint.binds && constraint.connector)
			{
				_filterForBinds(builder, constraint.binds, constraint.connector, constraint.parent);
				continue;
			}
		}

		for(let k in constraint)
		{
			let constraintValue = constraint[k];


			switch(k)
			{
				case "parent":
				{
					_filterForParent(builder, constraintValue);
					break;
				}
				case "ref":
				{
					if(Array.isArray(constraintValue))
					{
						builder.addValues("r", constraintValue, true);
						builder.append(`?s ${HKUris.REFERENCES_URI} ?r .`);
					}
					else if(constraint.parent)
					{
						builder.closure(() => 
						{
							builder.append('GRAPH ?g');
							builder.closure(() => 
							{
								builder.append(`?s ${HKUris.REFERENCES_URI} ${_convertToUri(constraint[k])} .`)
								builder.append(`?s ?p ?o .`);
							});
						});	
						
						builder.appendUnion();
						
						builder.closure(() => 
						{
							builder.append('GRAPH ?g');
							builder.closure(() => builder.append(`?s ${HKUris.REFERENCES_URI} ?referedNode .`));
							builder.append(`?referedNode ?isa ${_convertToUri(constraint[k])} .`);
							builder.append(`?isa ${HKUris.CLASSNAME_URI} "${HIERARCHY}" .`);
						});

						builder.appendUnion();

						builder.closure(() => 
						{
							builder.append(`?ref ${HKUris.REFERENCES_URI} ?referedNode .`);
							builder.append('GRAPH ?gref');
							builder.closure(() =>
							{
								builder.append(`?referedNode ?isa ${_convertToUri(constraint[k])}  .`);
								builder.append(`?s ${HKUris.REFERENCES_URI} ${_convertToUri(constraint[k])} .`);
								builder.append(`?s ?p ?o .`);
							});
							builder.append(`?isa ${HKUris.CLASSNAME_URI} "${HIERARCHY}" .`);
						});

					}
					else
					{
						builder.append(`?s ${HKUris.REFERENCES_URI} ${_convertToUri(constraint[k])} .`);
						builder.append(`GRAPH ?g {?s ?p ?o} .`);
					}
					break;
				}
				case "type":
				{
					if(Array.isArray(constraintValue))
					{
						builder.append(_filterForTypeArray(constraintValue, idVar), true);	
					}
					else
					{
						builder.append(_filterForType(constraintValue, idVar), true);
					}
					break;
				}
				case "id":
				{
					if(Array.isArray(constraintValue))
					{
						builder.addValues(idVar, constraintValue, true);
					}
					else
					{
						builder.bindVar(_convertToUri(constraintValue), idVar, true);
					}
					break;
				}
				case "connector":
				{
					if(Array.isArray(constraintValue))
					{
						builder.addValues("c", constraintValue, true);
						builder.append(`?s ${HKUris.USES_CONNECTOR_URI} ?c `);
					}
					else
					{
						builder.append(`?s ${HKUris.USES_CONNECTOR_URI} ${_convertToUri(constraint[k])} .`, true);
					}
					break;
				}
				case "className":
				{
					builder.append(`?s ${HKUris.CLASSNAME_URI} "${constraint[k]}" .`, true);
					break;
				}
				case "properties":
				{
					builder.append(_filterForProperties(constraint[k]), true);
					break;
				}
				case "binds":
				{	
					_filterForBinds(builder, constraintValue);
					break;
				}
				default:
				{
					throw `Invalid filter: ${k}`;
				}
			}
		}
	}
}

function _checkIfHasNodeInConstraint(andFilters)
{
	for(let i = 0; i < andFilters.length; i++)
	{
		let item = andFilters[i];
		for(let k in item)
		{
			if(k === "id" || k === "properties" || k === "parent")
			{
				return true;
			}
			else if(k === "type")
			{
				if(item[k] === "node" || item[k] === "context" || item[k] === "ref")
				{
					return true;
				}
			}
		}
	}
	return false;
}

function _filterForParent(builder, parent) {
	if (Array.isArray(parent)) {
		builder.addValues("g", parent, true);
	}
	else if (parent instanceof Object) {
		const parentId = parent.parentId;
		const includeNestedContexts = parent.includeNestedContexts;
		if (includeNestedContexts) {
			let parentIds = [];
			if (Array.isArray(parentId)) {
				parentIds = parentId;
			}
			else
			{
				parentIds = [parentId];
			}
			parentIds.forEach((g_root, index) =>
			{
				builder.closure(() =>
				{
					builder.append(`?g ${HKUris.HAS_PARENT_URI}* ${_convertToUri(g_root)} .`);
				});
				if(index + 1 < parentIds.length)
				{
					builder.appendUnion();
				}
			})
			
		}

		else {
			builder.bindVar(_convertToUri(parentId), "g", true);
		}
	}

	else {
		builder.bindVar(_convertToUri(parent), "g", true);
	}
}

function _filterForTypeArray(typeArray, idVar="s")
{
	let filter = '';
	for(let i = 0; i < typeArray.length; i++)
	{
		const typeFilter = _filterForType(typeArray[i], idVar);
		if(typeFilter !== null)
		{
			if(filter !== '')
			{
				filter += ' UNION ';
			}
			filter += ` { ${typeFilter} } `;
		}
	}
	return filter;
}

function _filterForType(type, idVar = "s")
{
	switch(type)
	{
		case HKTypes.NODE:
		{
			return `?${idVar} ${HKUris.ISA_URI} ${HKUris.NODE_URI} . `;
		}
		case HKTypes.CONNECTOR:
		{
			return `?s ${HKUris.ISA_URI} ${HKUris.CONNECTOR_URI} . `;
		}
		case HKTypes.CONTEXT:
		{
			return `?${idVar} ${HKUris.ISA_URI} ${HKUris.CONTEXT_URI} . `;
		}
		case HKTypes.TRAIL:
		{
			return `?s ${HKUris.ISA_URI} ${HKUris.TRAIL_URI} . `;
		}
		case HKTypes.REFERENCE:
		{
			return `GRAPH ?g { ?s ${HKUris.ISA_URI} ${HKUris.REF_URI}.  ?s ?p ?o .  } `;
		}
		case HKTypes.LINK:
		{
			return `?s ${HKUris.USES_CONNECTOR_URI} ?y . `;
		}
		default: 
		{
			return `?s ${HKUris.ISA_URI} ${_convertToUri(type)} . `;
		}
	}
}

function _filterForProperties(properties)
{
	let out = "";

	for(let k in properties)
	{
		let v = properties[k];

		let valueType = typeof v;

		if(Array.isArray(v))
		{
			for(let i = 0; i < v.length; i++)
			{
				out += `{ ?s ${_convertToUri(k)} "${v[i]}" . } `;
				if(i + 1 < v.length)
				{
					out += ' UNION ';
				}
			}
		}
		else if(valueType === "object")
		{
			// Assume $exist = true
			out += `?s ${_convertToUri(k)} ?x . `;
		}
		else if(valueType === "number" || valueType === "boolean")
		{
			out += `?s ${_convertToUri(k)} ${v} . `;
		}
		else
		{
			out += `?s ${_convertToUri(k)} "${v}" . `;
		}
	}
	return out;
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

exports.FILTER_HK = FILTER_HK;
exports.deleteTriples = deleteTriples;
exports.getContextHierarchy = getContextHierarchy;
exports.getAllEntities = getAllEntities;
exports.getAllEntitiesLazy = getAllEntitiesLazy;
exports.getRdf = getRdf;
exports.getAllEntitiesUncompressed = getAllEntitiesUncompressed;
exports.getEntities = getEntities;
exports.removeEntities = removeEntities;
exports.removeAllEntities = removeAllEntities;
exports.filterEntities = filterEntities;
exports.filterEntitiesSelect = filterEntitiesSelect;
exports.filterEntitiesLazy = filterEntitiesLazy;
exports.getLinks = getLinks;
exports.updateTriples = updateTriples;
exports.fromUris = fromUris;
exports.getEntitiesFromUris = getEntitiesFromUris;