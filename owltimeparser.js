/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

const rdf  				= require("rdf2hk/rdf");
const time				= require("rdf2hk/owltime");

const Utils				= require("rdf2hk/utils");

const Constants			= require("rdf2hk/constants");
const { LAMBDA } 		= require("hklib/constants");
const Context			= require("hklib/context");
const Link			= require("hklib/link");

class OwlTimeParser
{
	constructor(entities, options)
	{
		this.entities = entities;
		this.subjectLabel = options.subjectLabel || Constants.DEFAULT_SUBJECT_ROLE;
		this.objectLabel = options.objectLabel || Constants.DEFAULT_OBJECT_ROLE;
		this.timeContext = null;
		this.anchors = null;
	}

	shouldConvert (s, p, o, context)
	{
		this.timeContext = this.entities[context] || {};
		this.anchors = this.timeContext.interfaces || {};

		if(o === time.INSTANT_URI || o === time.PROPER_INTERVAL_URI 
			|| p === time.HAS_BEGINNING_URI || p === time.HAS_END_URI 
			|| p === time.DATE_TIME_URI || this.anchors.hasOwnProperty(s))
		{
			return true;
		}
		return false;
    }
    
    createContextAnchor(s, context)
    {
		this.timeContext = this.entities[context] ||  new Context(context) ;
		this.timeContext.addInterface(s, 'temporal', {});
		this.entities[context] = this.timeContext;
	}

	convertToContextAnchor(id)
	{
		// create context anchor for id, if it does not exist
		const anchor = this.anchors[id] || {type: 'temporal', properties: {}};
		this.anchors[id] = anchor;
		// remove id entity if there is any
		if(this.entities.hasOwnProperty(id))
		{
			delete this.entities[id];
		}
		return anchor;
	}

	createTimeRelationships (s, p, o, context)
	{
		if(p === rdf.TYPE_URI && (o === time.PROPER_INTERVAL_URI || o === time.INSTANT_URI || this.anchors.hasOwnProperty(s)))
		{
			const anchor = this.convertToContextAnchor(s);
			
			// create property of anchor to represent rdf:type relationship
			const types = anchor.properties[rdf.TYPE_URI] || [];
			types.push(o);
			anchor.properties[rdf.TYPE_URI] = types;
			return true;
		}
		else if (p === time.HAS_BEGINNING_URI || p === time.HAS_END_URI)
		{
			this.convertToContextAnchor(s)
			this.convertToContextAnchor(o);

			// create link between s and o in context
			const anchorLink = new Link();
			anchorLink.addBind(this.subjectLabel, context, s);
			anchorLink.addBind(this.objectLabel, context, o);
			anchorLink.connector = p;
			anchorLink.parent = context;
			anchorLink.id = Utils.createSpoUri(s, p, o, context);
			this.entities[anchorLink.id] = anchorLink;
			return true;
		}
		else if(p === time.DATE_TIME_URI)
		{
			const anchor = this.convertToContextAnchor(s);

			// set begin and end properties of anchor as o
			const literal = Utils.getValueFromLiteral(o, {}, true);
			anchor.properties.begin = literal;
			anchor.properties.end = literal;
			return true;
		}
		else if(this.anchors.hasOwnProperty(s) || this.anchors.hasOwnProperty(o))
		{

			// check if s is an anchor, and update subject if needed
			let subjectEntity = s;
			let subjectAnchor = LAMBDA;
			if(this.anchors.hasOwnProperty(s))
			{
				subjectEntity = context;
				subjectAnchor = s;
			}

			// check if o is an anchor, and updated object if needed
			let objectEntity = o;
			let objectAnchor = LAMBDA;
			if(this.anchors.hasOwnProperty(o))
			{
				objectEntity = context;
				objectAnchor = o;
			}

			// create link with updated subject and object
			const anchorLink = new Link();
			anchorLink.addBind(this.subjectLabel, subjectEntity, subjectAnchor);
			anchorLink.addBind(this.objectLabel, objectEntity, objectAnchor);
			anchorLink.connector = p;
			anchorLink.parent = context;
			anchorLink.id = Utils.createSpoUri(s, p, o, context);
			this.entities[anchorLink.id] = anchorLink;
			return true;
		}
		return false;
	}

	finish ()
	{

	}
}

module.exports = OwlTimeParser;