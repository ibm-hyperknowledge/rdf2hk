/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

const HKLib = require("hklib");
const Node = HKLib.Node;
const Trail = HKLib.Trail;
const Connector = HKLib.Connector;
const Link = HKLib.Link;
const Context = HKLib.Context;
const VirtualContext = HKLib.VirtualContext;
const ConnectorClass = HKLib.ConnectorClass;
const Reference = HKLib.Reference;
const RoleTypes = HKLib.RolesTypes;

const VIRTUAL_SOURCE_PROPERTY = HKLib.VIRTUAL_SOURCE_PROPERTY;

const Constants 		= require("./constants");
const Utils 			= require("./utils");

const owl 				= require("./owl");
const rdfs 				= require("./rdfs");
const xml 				= require("./xmlschema");
const skos 				= require("./skos");
const foaf 				= require("./foaf");
const dcterms 			= require("./dcterms");
const hk 				= require("./hk");

const uuidv1 			= require('uuid/v1');


// Sub Parsers
const OWLParser = require("./simpleowlparser");
const OWLTimeParser = require("./owltimeparser");
const HKParser = require("./hkparser");

const RELATION_QUALIFIER_URIS = new Set();
RELATION_QUALIFIER_URIS.add(owl.INVERSE_OF_URI);
RELATION_QUALIFIER_URIS.add(rdfs.SUBPROPERTYOF_URI);
const HK_NULL_URI = `<${Constants.HK_NULL}>`;


const isUriOrBlankNode = Utils.isUriOrBlankNode;

/**
 * Parse rdf to Hyperknowledge entities.
 * 
 * @param {object} graph The graph (quads, if it contains named graph) to be parsed and converted to Hyperknowledge entities.
 * @param {boolean|object} [options] Parsing options, if it is a boolean, is equivalent to {createContext: true} which means it will generate context for each named graph.
 * @param {boolean} [options.createContext] Create the context entity for each named graph. Default is false.
 * @param {boolean} [options.namespaceContext] Contextualize entities based on their namespace.
 * @param {boolean} [options.subjectLabel] Set the subject role name `subject`
 * @param {boolean} [options.objectLabel] Set the object role name `object`
 * @param {boolean} [options.convertOwl] EXPERIMENTAL OWL rules. Default is false.
 * @param {boolean} [options.convertOwlTime] EXPERIMENTAL OWL Time rules. Default is false.
 * @param {boolean} [options.timeContext] Context for OWL Time entities and relationships, if convertOwlTime is true.
 * @param {boolean} [options.preserveBlankNodes] Preserve the blank node ids if true, otherwise replace it by a uuid inteded to be unique in the database. Default is false.
 * @param {boolean} [options.serialize] Serialize output, i. e. remove unnecessary methods and fields from the intances.
 * @param {boolean} [options.convertHK] If set, it will read the Hyperknowledge vocabulary and make special conversion. Default is true.
 * @param {boolean} [options.onlyHK] If set, it will ONLY read the Hyperknowledge vocabulary and convert those entities, this options override `convertHK`. Default is false.
 * @param {boolean} [options.textLiteralAsNode] If true, string literals will be converted to content nodes, which will be linked to subject using a link whose connector is the predicate.
 * @param {boolean} [options.textLiteralAsNodeEncoding] If 'property', textLiteralAsNode encoding will be made using node and link properties. If 'metaproperty' encoding will be made using node and link metaproperties. Default is 'metaproperty'.
 * @param {string}  [options.strategy] "pre-existing-context", "new-context" or "automatically"
 */

function parseGraph(graph, options)
{
	if (typeof options === "boolean")
	{
		options = {
			createContext: options
		};
	}
	else if (typeof options === Array)
	{
		// options = {ids: options};
	}
	else if (!options)
	{
		options = {};
	}

	let namespaceContext = options.namespaceContext || false; 

	let createContext = options.createContext || namespaceContext;

	let strategy = options.strategy;

	const preserveBlankNodes = options.preserveBlankNodes || false;

	let convertOwl = options.convertOwl || false;
	
	let convertOwlTime = options.convertOwlTime || false;

	let setNodeContext = options.setNodeContext || false;

	let rootContext = options.context;
	
	let timeContext = options.timeContext;

	let convertHK = options.convertHK && true;

	let onlyHK = options.onlyHK || false;
	
	let textLiteralAsNode = options.textLiteralAsNode || false;
	let textLiteralAsNodeEncoding = options.textLiteralAsNodeEncoding || 'metaproperty';

	convertHK = convertHK || onlyHK;

	let serialize = options.serialize || false;

	const subjectLabel = options.subjectLabel || Constants.DEFAULT_SUBJECT_ROLE;
	const objectLabel = options.objectLabel || Constants.DEFAULT_OBJECT_ROLE;
	const hierarchyConnectorIDs = options.hierarchyConnectorIDs || [rdfs.TYPE_URI, rdfs.SUBCLASSOF_URI, rdfs.SUBPROPERTYOF_URI];

	let entities = {};
	let connectors = {};

	let blankNodesMap = {};
	let refNodesMap = {};

  // instantiate new parsers
  const parsers = [];
  registeredParsers.forEach(parser => {
    try {
      const instantiatedParser = new parser(entities, connectors, blankNodesMap, refNodesMap, options);
      parsers.push(instantiatedParser);
      // console.log(`new instantiated parser ${instantiatedParser}`);
    }
    catch(err) {
      console.error(`There was anrror while instatianting the parser ${parser}`);
      throw err;
    }
  });

	let getParent = (iri, g) => 
	{
		if (namespaceContext) {
			if (iri.includes("#")) {
				return `<${iri.split('#')[0].replace('<', '')}>`
			}
		}
		return ((g === HK_NULL_URI || g === null) && rootContext) ? rootContext : g;
	}

	let createReference = (s, g) =>
	{
		const parent = getParent(s, g);
		let ref = new Reference();
		ref.id = Utils.createRefUri(s, parent);
		ref.ref = s;
		ref.parent = parent;

		entities[ref.id] = ref;
		refNodesMap[ref.id] = ref;

		return ref;
	}

	// FIRST LOOP
	// Collect basic connectors
	// Collect contexts
	graph.forEachStatement((s, p, o, g) =>
	{
		const parent = getParent(s, g);

    for (let i = 0; i < parsers.length; i++) {
      const parser = parsers[i];
      if (parser.shouldConvert(s, p, o, parent)) {
        let shouldContinue = parser.firstLoopCallback(s, p, o, parent);
        if (shouldContinue !== undefined && !shouldContinue) {
          return;
        }
      }
    }

		// Create connector?

		if (Utils.isUri(p) && Utils.isUriOrBlankNode(o))
		{
			let connector = new Connector();
			connector.id = Utils.getIdFromResource(p);
			connector.className = hierarchyConnectorIDs.includes(p) ? ConnectorClass.HIERARCHY : ConnectorClass.FACTS;
			connector.addRole(subjectLabel, RoleTypes.SUBJECT);
			connector.addRole(objectLabel, RoleTypes.OBJECT);
			connectors[connector.id] = connector;
			entities[connector.id] = connector;
		}

		const isPreExistingContext = strategy === 'pre-existing-context' && parent === rootContext;
		if (createContext && parent && parent !== HK_NULL_URI && !isPreExistingContext)
		{
			// Create context
			if (!entities.hasOwnProperty(parent))
			{
				let context = new Context();
				context.id = parent;
				entities[parent] = context;
			}
		}
	});

	// SECOND LOOP
	// Create nodes
	graph.forEachStatement((s, p, o, g) =>
	{
		const parent = getParent(s, g);
		// console.log(s, p, o);
		// Replace the blank node identitier to uuid
		// In order to make this id more robust along the base
		if (!preserveBlankNodes)
		{
			if (Utils.isBlankNode(s) && !blankNodesMap.hasOwnProperty(s))
			{
				blankNodesMap[s] = `_:${uuidv1()}`;
			}

			if (Utils.isBlankNode(o) && !blankNodesMap.hasOwnProperty(o))
			{
				blankNodesMap[o] = `_:${uuidv1()}`;
			}
		}

    for(let i = 0; i < parsers.length; i++) {
      const parser = parsers[i];
      if (parser.shouldConvert(s, p, o, parent)) {
        let shouldContinue = parser.secondLoopCallback(s, p, o, parent);
        if (shouldContinue !== undefined && !shouldContinue) {
          return;
        }
      }
    }

		let subjectId = Utils.getIdFromResource(s);
		if ( isUriOrBlankNode(s) && !entities.hasOwnProperty(subjectId))
		{
			let node = new Node();
			node.id = blankNodesMap.hasOwnProperty(s) ? blankNodesMap[s] : subjectId;
			entities[node.id] = node;
			node.parent = undefined;

			// Set the context to the graph name
			if (setNodeContext && parent)
			{
				node.parent = Utils.getIdFromResource(parent);
			}
		}

		let objectId = Utils.getIdFromResource(o);
		if ( isUriOrBlankNode(o) && !entities.hasOwnProperty(objectId))
		{
			let node = new Node();
			node.id = blankNodesMap.hasOwnProperty(o) ? blankNodesMap[o] : objectId;
			entities[node.id] = node;
			node.parent = undefined;

			// Set the context to the graph name
			if (setNodeContext && parent)
			{
				const parentId = Utils.getIdFromResource(parent);
				node.parent = parentId !== node.id ? parentId : null;
			}
		}

	});

	// LAST LOOP
	// Create attributes, relations and ref nodes if needed
	graph.forEachStatement((s, p, o, g) =>
	{
		const parent = getParent(s, g);

    for(let i = 0; i < parsers.length; i++) {
      const parser = parsers[i];
      if (parser.shouldConvert(s, p, o, parent)) {
        let shouldContinue = parser.lastLoopCallback(s, p, o, parent);
        if (shouldContinue !== undefined && !shouldContinue) {
          return;
        }
      }
    }

		// Set relationship
		if (isUriOrBlankNode(o))
		{
			let connectorId = Utils.getIdFromResource(p);
			if (connectors.hasOwnProperty(connectorId))
			{
				let connector = connectors[connectorId];
				let link = new Link();

				let roles = connector.getRoles();

				for (let i = 0; i < roles.length; i++)
				{
					let r = roles[i];

					let roleType = connector.getRoleType(r);
					if (roleType === RoleTypes.SUBJECT || roleType === RoleTypes.CHILD)
					{
						let subjId = blankNodesMap.hasOwnProperty(s) ? blankNodesMap[s] : s;
						subjId = Utils.getIdFromResource(subjId);
						link.addBind(subjectLabel, subjId);
					}
					else if (roleType === RoleTypes.OBJECT || roleType === RoleTypes.PARENT)
					{
						let objId = blankNodesMap.hasOwnProperty(o) ? blankNodesMap[o] : o;
						objId = Utils.getIdFromResource(objId);
						link.addBind(objectLabel, objId);
					}
				}

				// console.log(s, p, o);
				link.id = Utils.createSpoUri(s, p, o, parent);

				link.connector = connectorId;
				if (g)
				{
					link.parent = Utils.getIdFromResource(parent);
				}
				entities[link.id] = link;
			}
		}
		else
		{
			// Set Entity properties

			// Define the entity to bind the property
			let entity = null;

			// Get maped blank node
			if (!preserveBlankNodes && blankNodesMap.hasOwnProperty(s))
			{
				s = blankNodesMap[s];
			}
			let subjectId = Utils.getIdFromResource(s);

			if (!Utils.getIdFromResource(parent))
			{
				entity = entities[subjectId]; // we assume the entity must have been created
			}
			else
			{
				entity = entities[subjectId] || null;

				if(entity !== null)
				{
					if (entity.type !== Connector.type && entity.parent !== Utils.getIdFromResource(parent))
					{
						// The node already exists and it belongs to another context
						// This assign will force to look for a reference node
						entity = null;
					}
				}

				// Check if there is a reference to the resource
				if (!entity)
				{
					let refId = Utils.createRefUri(s, parent);

					entity = entities[refId] || null;
				}
			}

			// If at this point the entity was not set
			// create a reference to it
			if (!entity)
			{
				if (onlyHK)
				{
					// Do not create entities by inference
					// when conversion is to only convert
					// hyperknowledge entities
					return;
				}
				entity = createReference(s, parent);
			}

			// Convert the literal
			_setPropertyFromLiteral(entity, p, o, entities, connectors, subjectLabel, objectLabel, textLiteralAsNode, textLiteralAsNodeEncoding);
			
		}

	});

	// Finish conversion

	// Add connectors
	for (let c in connectors)
	{
		entities[c] = connectors[c];
	}

  parsers.forEach(parser => {
    if (parser.mustConvert) {
      parser.finish(entities);
    }
  });

	// Serialize entities
	if (serialize)
	{
		for (let k in entities)
		{
			entities[k] = entities[k].serialize();
		}
	}

	return entities;
}

function _setPropertyFromLiteral(entity, p, o, entities, connectors, subjectLabel, objectLabel, textLiteralAsNode = false, textLiteralAsNodeEncoding = 'property')
{
	let typeInfo = {};
	let value = Utils.getValueFromLiteral(o, typeInfo, true);
	let propertyName = Utils.getIdFromResource(p);

  if(propertyName === VIRTUAL_SOURCE_PROPERTY)
  {
    const vContext = new VirtualContext(entity.id);
    vContext.parent = entity.parent;
    vContext.properties = entity.properties || {};
    vContext.metaProperties = entity.metaProperties || {};
    entity = vContext;
    entities[entity.id] = entity;

  }

	if (typeInfo.lang)
	{
		value = `"${value}"@${typeInfo.lang}`;
	}

	if(typeof value === "string")
	{
		let literalSlices = value.split(`^^`);
		if (literalSlices[0] === `"${HK_NULL_URI}"`)
		{
			if (literalSlices[1] !== null)
			{
				entity.setMetaProperty(Utils.getIdFromResource(p), Utils.getIdFromResource(literalSlices[1]));
			}
			return;
		}

		if(textLiteralAsNode)
		{

			// add property or metaproperty in subject node
			const literalTypeId =  Utils.getIdFromResource(hk.DATA_LITERAL_URI);
			const predicateId = Utils.getIdFromResource(p);
			if(textLiteralAsNodeEncoding === 'property')
			{
				entity.setProperty(literalTypeId, predicateId);
			}
			else if(textLiteralAsNodeEncoding === 'metaproperty')
			{
				entity.setMetaProperty(literalTypeId, predicateId);
			}
			

			// create content node with literal as data, if needed
			const contentNodeUri = Utils.createContentNodeUri(value);
			if(!entities.hasOwnProperty(contentNodeUri))
			{
				const contentNode = new Node(contentNodeUri, entity.parent);
				contentNode.setProperty('mimeType', 'plain/text');
				contentNode.setProperty('data', value);
				entities[contentNodeUri] = contentNode;
			}

			// create predicate connector, if needed
			const connectorId =  Utils.getIdFromResource(p);
			if(!connectors.hasOwnProperty(connectorId))
			{
				const contentConnector = new Connector(connectorId, ConnectorClass.FACTS);
				contentConnector.addRole(subjectLabel, RoleTypes.SUBJECT);
				contentConnector.addRole(objectLabel, RoleTypes.OBJECT);
				connectors[contentConnector.id] = contentConnector;
				entities[contentConnector.id] = contentConnector;
			}
			
			// create spo link between subject and content node
			const linkUri = Utils.createSpoUri(entity.id, p, value, entity.parent);
			const contentLink = new Link(linkUri, p, entity.parent);
			contentLink.addBind(subjectLabel, entity.id);
			contentLink.addBind(objectLabel, contentNodeUri);
			if(textLiteralAsNodeEncoding === 'property')
			{
				contentLink.setProperty(literalTypeId, predicateId);
			}
			else if(textLiteralAsNodeEncoding === 'metaproperty')
			{
				contentLink.setMetaProperty(literalTypeId, predicateId);
			}
			entities[linkUri] = contentLink;

		  // create hierarchical connector, if needed
			const typeConnectorId =  Utils.getIdFromResource(rdfs.TYPE_URI);
			if(!connectors.hasOwnProperty(typeConnectorId))
			{
				const typeConnector = new Connector(typeConnectorId, ConnectorClass.HIERARCHY);
				typeConnector.addRole(subjectLabel, RoleTypes.SUBJECT);
				typeConnector.addRole(objectLabel, RoleTypes.OBJECT);
				connectors[typeConnector.id] = typeConnector;
				entities[typeConnector.id] = typeConnector;
			}

			// add literal node to body, if needed
			let typeNode = entities[literalTypeId];
			if(!typeNode)
			{
				typeNode = new Node(literalTypeId, null);
				entities[literalTypeId] = typeNode;
			}

			// add reference to literal node within context, if needed
			if(entity.parent && entity.parent !== "null" && entity.parent !== HK_NULL_URI)
			{
				const typeReferenceUri = Utils.createRefUri(literalTypeId, entity.parent);
				if(!entities.hasOwnProperty(typeReferenceUri))
				{
					typeNode = new Reference(typeReferenceUri, literalTypeId, entity.parent);
					entities[typeReferenceUri] = typeNode;
				}
				else
				{
					typeNode = entities[typeReferenceUri];
				}
			}

			// create hierarchical link between content node and literal type
			const typeLinkUri = Utils.createSpoUri(contentNodeUri, rdfs.TYPE_URI, hk.DATA_LITERAL_URI, entity.parent);
			const typeLink = new Link(typeLinkUri, rdfs.TYPE_URI, entity.parent);
			typeLink.addBind(subjectLabel, contentNodeUri);
			typeLink.addBind(objectLabel, typeNode.id);
			entities[typeLinkUri] = typeLink;

			return;
		}
	}

	entity.setOrAppendToProperty(propertyName, value);

	if (typeInfo.type && typeInfo.type !== xml.STRING_URI)
	{
		entity.setMetaProperty(propertyName, Utils.getIdFromResource(typeInfo.type));
	}
}

const registeredParsers = new Set();

function registerParser(parser) {
  registeredParsers.add(parser);
}

exports.registerParser = registerParser;
exports.parseGraph = parseGraph;