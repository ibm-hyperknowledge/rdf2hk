/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

const hklib	= require("hklib");
const wordnet = require("./wordnetconstants");
const Constants = require("./constants");
const Link = require("hklib/link");
const { LAMBDA } = require("hklib/constants");
const Context = require("hklib/context");
const Connector = hklib.Connector;
const { createSpoUri, createRefUri, generateResourceFromId } = require("rdf2hk/utils");
const Reference = require("hklib/reference");
const Node = require("hklib/node");
const { TYPE_URI } = require("rdf2hk/rdf");
const rdf = require("./rdf");
const rdfs = require("./rdfs");
const xml = require("./xmlschema");
const uuidv1 = require ('uuid/v1');

const Utils = require("./utils");

const has = Object.prototype.hasOwnProperty;
const RoleTypes 		= hklib.RolesTypes;

const HK_NULL_URI = `<${Constants.HK_NULL}>`;

class WordnetParser
{

	constructor(entities, connectors, blankNodesMap, preserveBlankNodes, wordnetDefaultContext, options)
	{

		this.entities = entities;
		this.connectors = connectors;
		this.blankNodesMap = blankNodesMap;
		this.preserveBlankNodes = preserveBlankNodes;
		this.wordnetDefaultContext = wordnetDefaultContext;
		this.subjectLabel = options.subjectLabel || Constants.DEFAULT_SUBJECT_ROLE;
		this.objectLabel = options.objectLabel || Constants.DEFAULT_OBJECT_ROLE;
		this.contextReferences = {};
	}

	shouldConvert(s, p, o, parent)
	{
		if (wordnet.WN30_OBJECTS.includes(o) || wordnet.W30_PREDICATES.includes(p) || p === rdfs.LABEL_URI)
		{
			return true;
		}
		return false;
	}

	createMainEntities(s, p, o, parent)
	{
		if (p === rdf.TYPE_URI)
		{
			if(wordnet.WN30_OBJECTS.includes(o))
			{
				if(!has.call(this.entities, o))
				{
					this.entities[o] = new Node(o, this.wordnetDefaultContext);
				}
				if(!has.call(this.entities, s))
				{
					this.entities[s] = new Node(s, parent);
				}
			}
	
		}
		else if(p === wordnet.WN30.CONTAINS_WORD_SENSE)
		{
			const wordSenseNode = new Node(o, s);
			this.entities[o] = wordSenseNode;
		}
	}

	createContexts(s, p, o, context)
	{
		if (p === rdf.TYPE_URI && wordnet.WN30_SYNSET_TYPES.includes(o))
		{
			if(has.call(this.entities, s))
			{
				/**
				 * This is tentative
				 * Creating ref node to context
				 * */ 
				if(this.entities[s].parent !== context)
				{
					const refContextId = uuidv1();
					let refContext = new Reference(refContextId, s, context);
					refContext.type = "context";
					this.entities[refContextId] = refContext;
				}
			}
			else
			{
				this.entities[s] = new Context(s, context);
			}
		}
	}

	createRelationships(s, p, o, parent)
	{
		// Change parents
		
		if(p === wordnet.WN30.WORD_PREDICADE)
		{
			let parentWord = parent;
			if(has.call(this.entities,s))
			{
				parentWord = this.entities[s].parent
			}

			if(has.call(this.entities, o))
			{
				let originalWord = this.entities[o];
				if(originalWord.parent !== parentWord)
				{
					let refNodeId = uuidv1();	

					if(this.contextReferences[parentWord])
					{
						if(!this.contextReferences[parentWord][o])
						{
							let refNode = new Reference(refNodeId, originalWord.id, parentWord);
							this.entities[refNodeId] = refNode;
							this.contextReferences[parentWord][o] = refNodeId;
							this._createLink(s, p, refNodeId, parentWord);
						}
					}
					else
					{
						this.contextReferences[parentWord] = {};
						let refNode = new Reference(refNodeId, originalWord.id, parentWord);
						this.entities[refNodeId] = refNode;
						this.contextReferences[parentWord][o] = refNodeId;
						this._createLink(s, p, refNodeId, parentWord);
					}
				}
			}
			else
			{
				const word = new Node(o, parentWord);
				this.entities[o] = word;
				this._createLink(s, p, o, parentWord);
			}	
		}
		else if (p === rdf.TYPE_URI)
		{
			if(wordnet.WN30_OBJECTS.includes(o))
			{
				if(has.call(this.entities, o))
				{
					let originalNode = this.entities[o];
					let parentSubject = this.entities[s].parent || parent;
					if(originalNode.parent !== parentSubject)
					{
						let refNodeId = uuidv1();	

						if(this.contextReferences[parentSubject])
						{
							if(this.contextReferences[parentSubject][o])
							{
								this._createLink(s, p, this.contextReferences[parentSubject][o], parentSubject);
							}
							else
							{
								let refNode = new Reference(refNodeId, originalNode.id, parentSubject);
								this.entities[refNodeId] = refNode;
								this.contextReferences[parentSubject][o] = refNodeId;
								this._createLink(s, p, refNodeId, parentSubject);
							}
						}
						else
						{
							this.contextReferences[parentSubject] = {};
							let refNode = new Reference(refNodeId, originalNode.id, parentSubject);
							this.entities[refNodeId] = refNode;
							this.contextReferences[parentSubject][o] = refNodeId;
							this._createLink(s, p, refNodeId, parentSubject);
						}
					}	
				}
				else
				{
					this.entities[o] = new Node(o, this.wordnetDefaultContext);
				}
			}
		}
		else
		{
			// Define the entity to bind the property
			let node = null;

			// Get maped blank node
			if (!this.preserveBlankNodes && has.call(this.blankNodesMap, s))
			{
				s = blankNodesMap[s];
			}
			let subjectId = Utils.getIdFromResource(s);

			node = this.entities[subjectId] || null;

			// Convert the literal
			this._setPropertyFromLiteral(node, p, o);
		}


		return true;
	}

	finish(entities)
	{
		console.log(entities);
	}

	_createLink(s, p, o, parent)
	{
		let connectorId = Utils.getIdFromResource(p);
		if (has.call(this.connectors, connectorId))
		{
			let connector = this.connectors[connectorId];
			let link = new Link();

			let roles = connector.getRoles();

			for (let i = 0; i < roles.length; i++)
			{
				let role = roles[i];

				let roleType = connector.getRoleType(role);
				if (roleType === RoleTypes.SUBJECT || roleType === RoleTypes.CHILD)
				{
					let subjId = s;
					subjId = Utils.getIdFromResource(subjId);
					link.addBind(this.subjectLabel, subjId);
				}
				else if (roleType === RoleTypes.OBJECT || roleType === RoleTypes.PARENT)
				{
					let objId = o;
					objId = Utils.getIdFromResource(objId);
					link.addBind(this.objectLabel, objId);
				}
			}

			link.id = Utils.createSpoUri(s, p, o, parent);

			link.connector = connectorId;

			link.parent = Utils.getIdFromResource(parent);

			this.entities[link.id] = link;
		}
	}

	_setPropertyFromLiteral(node, p, o)
	{
		let typeInfo = {};
		let value = Utils.getValueFromLiteral(o, typeInfo, true);
	
		if(typeof value === "string")
		{
			let literalSlices = value.split(`^^`);
			if (literalSlices[0] === `"${HK_NULL_URI}"`)
			{
				if (literalSlices[1] !== null)
				{
					node.setMetaProperty(Utils.getIdFromResource(p), Utils.getIdFromResource(literalSlices[1]));
				}
				return;
			}
		}
	
	
		let propertyName = Utils.getIdFromResource(p);
	
		if (typeInfo.lang)
		{
			node.setOrAppendToProperty(propertyName, `"${value}"@${typeInfo.lang}`);
		}
		else
		{
			node.setOrAppendToProperty(propertyName, value);
		}
	
		if (typeInfo.type && typeInfo.type !== xml.STRING_URI)
		{
			node.setMetaProperty(propertyName, Utils.getIdFromResource(typeInfo.type));
		}
	}

}

module.exports = WordnetParser;