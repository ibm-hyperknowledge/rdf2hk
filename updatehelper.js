/*
 * copyright: IBM Confidential
 * copyright: OCO Source Materials
 * copyright: © IBM Corp. All Rights Reserved
 * date: 2020
 *
 * IBM Certificate of Originality
 */
"use strict";

const Utils = require("./utils");
const Serializer = require("./serializer");
const GraphFactory = require("./graphfactory");
const HK = require("./hk");
const HKTypes = require("hklib").Types;

function serializeToUpdate(entities, oldEntities, conversionOptions)
{
	let changedParents = {};
	let changeEntities = {};

	for(let k in entities)
	{
		let entity = entities[k];

		if(!entity.id)
		{
			continue;
		}

		if(entity.properties || entity.metaProperties || (entity.interfaces || entity.interfaces === null) || entity.className)
		{
			let triples = [];
			let propertiesSet = new Set();
			let metaProperties = {};

			// Collect properties and metaproperties that are being modified
			let metaAndProperties = Object.keys(entity.properties || {});
			metaAndProperties = metaAndProperties.concat(Object.keys(entity.metaProperties || {}) || []);
			propertiesSet = new Set(metaAndProperties);
			
			let interfaceChanges = _evaluateInterfacesChanges(entity);

			if(propertiesSet.size > 0 || interfaceChanges.interfacesKeys.length > 0 || entity.className)
			{
				triples = _convertEntityToTriples(entity, conversionOptions, interfaceChanges.interfacesToUpdate, propertiesSet);
				
			} 
			else if(entity.interfaces === null && oldEntities.hasOwnProperty(entity.id))
			{
				entity.interfaces = oldEntities[entity.id].interfaces || {};
				for(let interfaceKey in entity.interfaces)
				{
					entity.interfaces[interfaceKey] = null;
				}
				interfaceChanges = _evaluateInterfacesChanges(entity);
				triples = _convertEntityToTriples(entity, conversionOptions, interfaceChanges.interfacesToUpdate, propertiesSet);
			}

			let changes = {properties: Array.from(propertiesSet),  
						   interfacesToUpdate: interfaceChanges.interfacesToUpdate,
						   interfacesToRemove: interfaceChanges.interfacesToRemove,
						   interfacesPropertites: interfaceChanges.interfacesProperties,
						   metaProperties: metaProperties,
						   triples: triples,};
			changeEntities[entity.id] = changes;
		}

		// Collect entities that being reparent
		if(entity.hasOwnProperty("parent"))
		{
			changedParents[entity.id] = entity.parent;
		}
	}

	return {changedEntities: changeEntities, changedParents: changedParents};
}

function _convertEntityToTriples(entity, conversionOptions, interfacesToUpdate, propertiesSet = new Set())
{
	let obj = {id: entity.id, 
		properties: entity.properties || {}, 
		metaProperties: entity.metaProperties || {},
		interfaces: interfacesToUpdate};

	if(entity.type === HKTypes.REFERENCE)
	{
		obj.type = HKTypes.REFERENCE;
		obj.ref = entity.ref;
	}

	if(entity.type === HKTypes.CONNECTOR)
	{
		propertiesSet.add(HK.CLASSNAME_URI);
		obj.className = entity.className;
        	obj.type = HKTypes.CONNECTOR;
        	obj.roles = entity.roles;
        
	}

	if(entity.hasOwnProperty("parent"))
	{
		obj.parent = entity.parent;
	}

	let graph = GraphFactory.createGraph("application/json",true);
	Serializer.serialize([obj], conversionOptions, graph);
	let triples = [];
	// Escape literal, this is for sparql
	graph.forEachStatement((s, p, o, g) =>
	{
		// let t = triples[i];
		let t = [s, p, o, g];

		if(!Utils.isUriOrBlankNode(t[2]))
		{
			let info = {};

			let v = Utils.getValueFromLiteral(t[2], info);

			// Escape string literal
			let hasBreakLine = v.search("\n");


			let escapedQuote = hasBreakLine > 0 ? "\\\"\"\"" :  "\\\"";
			let q = hasBreakLine > 0 ? "\"\"\"" :  "\"";

			if(! conversionOptions.noEscape)
			{
				v = JSON.stringify(v).slice(1, -1);
			}
				
			if(hasBreakLine >= 0)
			{
				v = v.replace(new RegExp(q, "ig"), escapedQuote);
			}

			if(info.type)
			{
				let type = Utils.isUri(info.type) ? info.type : `<${Utils.generateResourceFromId(info.type)}>`;
				t[2] = `${q}${v}${q}^^${type}`;
			}
			else if(info.lang)
			{
				t[2] = `${q}${v}${q}@${info.lang}`;
			}
			else
			{
				if( ! conversionOptions.noEscape)
				{
					t[2] = `${q}${v}${q}`;
				}
				else
				{
					let literal = v.split("^^");
					if(literal[1])
					{
						t[2] = `${literal[0]}^^<${Utils.generateResourceFromId(literal[1])}>`;
					}
					else
					{
						t[2] = `${q}${v}${q}`;
					}
					
				}
			}

		}

		triples.push(t);
	});

	return triples;
}

function _evaluateInterfacesChanges(entity)
{
	// Collect interfaces
	let interfs = entity.interfaces || {};
	let interfacesKeys = Object.keys(interfs);

	let interfacesToRemove = [];
	let interfacesToUpdate = {};
	let interfacesProperties = {};

	for(let k in interfs)
	{
		let interf = interfs[k];
		if(interf)
		{
			interfacesToUpdate[interf.key || k] = interf ;
			let properties = Object.keys(interf.properties || {});

			if(properties.length > 0)
			{
				interfacesProperties[interf.key || k] = properties;
			}
		}
		else
		{
			interfacesToRemove.push(k);
		}
	}
	
	return {
		interfacesKeys: interfacesKeys,
		interfacesToRemove: interfacesToRemove,
		interfacesToUpdate: interfacesToUpdate,
		interfacesProperties: interfacesProperties
	};
}

exports.serializeToUpdate = serializeToUpdate;
