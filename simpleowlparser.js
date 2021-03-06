/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";
const HKLib				= require("hklib");
const Node              = HKLib.Node;
const Trail             = HKLib.Trail;
const Connector         = HKLib.Connector;
const Link              = HKLib.Link;
const Context           = HKLib.Context;
const ConnectorClass    = HKLib.ConnectorClass;
const Reference         = HKLib.Reference;
const RoleTypes         = HKLib.RolesTypes;

const owl 				= require("./owl");
const rdfs				= require("./rdfs");
const rdf  				= require("./rdf");

const Utils             = require("./utils");

const Constants         = require("./constants");

let owlVocabulary = new Set(Object.values(owl));
owlVocabulary.add(rdfs.DOMAIN_URI);
owlVocabulary.add(rdfs.RANGE_URI);
owlVocabulary.add(rdfs.SUBPROPERTYOF_URI);


class SimpleOwlParser
{
	constructor(entities, options)
	{
		this.entities = entities;
		this.subjectLabel = options.subjectLabel || Constants.DEFAULT_SUBJECT_ROLE;
    	this.objectLabel = options.objectLabel || Constants.DEFAULT_OBJECT_ROLE;

	}

	shouldConvert (s, p, o, g, spo)
	{
		if(p === owl.IMPORTS_URI)
		{
			return false;
		}
		else if(p === rdf.TYPE_URI && owl.OBJECT_PROPERTY_URIS.includes(o))
    	{
			return true;
		}
		// if(owlVocabulary.has(s) || 
		// 	owlVocabulary.has(p) ||
		// 	owlVocabulary.has(o) ||
		// 	owlVocabulary.has(g))
		// {
		// 	// if(Utils.isUriOrBlankNode(o))
		// 	// {
		// 	// }
		// 		return true;
		// }
		return false;
	}

	createConnectors (s, p, o, g, spo)
	{
		if(p === rdf.TYPE_URI && owl.OBJECT_PROPERTY_URIS.includes(o))
    	{
			if(!this.entities.hasOwnProperty(s))
			{
				let connector = new Connector();
				connector.id = s;

				connector.className = ConnectorClass.FACTS;
				connector.addRole(this.subjectLabel, RoleTypes.SUBJECT);
				connector.addRole(this.objectLabel, RoleTypes.OBJECT);

				this.entities[s] = connector;
			}
		}
	}

	createRelationships (s, p, o, g)
	{
		if((p === rdf.TYPE_URI && !owl.OBJECT_PROPERTY_URIS.includes(o)) ||
		   (owlVocabulary.has(p)) )
    	{
			let refID = Utils.createRefUri(s, g);
			let ref = null;

			if(!this.entities.hasOwnProperty(refID))
			{
				ref = new Reference();
				ref.id = refID;
				ref.ref = s;

				this.entities[refID] = ref;
			}
			else
			{
				ref = this.entities[refID];
			}

			if(Utils.isLiteral(o))
			{
				let info = {};
				let literal = Utils.getValueFromLiteral(o, info);

				ref.setOrAppendToProperty(p, literal, info.type || null);
			}
			else
			{
				ref.setOrAppendToProperty(p, o);
			}

			return true;
		}
		return false;

	}

	finish ()
	{

	}
}

module.exports = SimpleOwlParser;