/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

const rdf = require("./rdf");
const xml = require("./xmlschema");
const wordnet = require("./wordnetconstants");
const Utils = require("./utils");
const { TYPE_URI } = require("rdf2hk/rdfs");
const { REFERENCE } = require("hklib/types");

class WordnetSerializer
{
	constructor(sharedGraph, options)
	{
		this.graph = sharedGraph;
		this.options = options;
	}

	serializeConceptualAnchors(entity)
	{
		const anchors = entity.interfaces;
		if (anchors)
		{
			for (let key in anchors)
			{
				if (anchors[key].type === 'conceptual' && anchors[key].properties.hasOwnProperty(TYPE_URI))
				{
					this.graph.add(key, TYPE_URI, anchors[key].properties[TYPE_URI], entity.parent);
					this.graph.add(entity.id, wordnet.SENSE_URI, key, entity.parent);
				}
			}
		}
	}

	shouldConvertProperty(id, key, value, entity)
	{
		return key === wordnet.CANNONICAL_PROPERTY || key === wordnet.DEFINITION_PROPERTY;
	}

	convertProperty(id, key, value, metaProperty, graphName, entity)
	{
		if (key === wordnet.CANNONICAL_PROPERTY)
		{
			const metaProperties = entity.metaProperties;
			const bNode = metaProperties[wordnet.CANNONICAL_FORM_URI];
			const writtenRep = Utils.createLiteralObject(value);
			this.graph.add(id, wordnet.CANNONICAL_FORM_URI, bNode);
			this.graph.add(bNode, wordnet.WRITTEN_REP_URI, writtenRep);
		}
		else if (key === wordnet.DEFINITION_PROPERTY)
		{
			const metaProperties = entity.metaProperties;
			const bNode = metaProperties[wordnet.DEFINITION_URI];
			const definitionValue = Utils.createLiteralObject(value);
			this.graph.add(id, wordnet.DEFINITION_URI, bNode);
			this.graph.add(bNode, wordnet.DEFINITION_VALUE_URI, definitionValue);
		}

	}

	serializeLexicalBind(entity, entities, subjectLabel, objectLabel, subjId, objId, defaultGraph, context)
	{
		const contextParent = (entities.hasOwnProperty(entity.parent) ? entities[entity.parent].parent : defaultGraph) || defaultGraph;
		if (entity.connector === wordnet.SENSE_CONNECTOR)
		{
			// serialize triple using timeContext anchors
			subjId = entity.binds[subjectLabel][subjId][0];
			this.graph.add(subjId, wordnet.IS_LEXICALIZED_SENSE_OF_URI, objId, contextParent);
		}
		else if (wordnet.SEMANTIC_RELATIONS_URIS.includes(entity.connector) || entity.connector === wordnet.PART_OF_SPEECH_URI) 
		{
			this.graph.add(subjId, entity.connector, objId, contextParent);
		}
		else
		{
			this.graph.add(subjId, entity.connector, objId, context);
		}
	}

	isLexicalConceptReference(entity, entities)
	{
		return entity.type === REFERENCE
			&& entities.hasOwnProperty(entity.ref)
			&& entities[entity.ref].metaProperties
			&& entities[entity.ref].metaProperties[TYPE_URI] === wordnet.LEXICAL_CONCEPT_URI;
	}



}

module.exports = WordnetSerializer;