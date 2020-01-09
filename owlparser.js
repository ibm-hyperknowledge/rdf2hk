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
const RoleTypes         = HKLib.roletypes;
const Constants         = require("./constants");

const owl 				= require("./owl");
const rdfs				= require("./rdfs");
const rdf  				= require("./rdf");

const uuidv1            = require ('uuid/v1');

const Utils             = require("./utils");

const RESTRICTION_URIS = new Set()
RESTRICTION_URIS.add(owl.ON_PROPERTY_URI);
RESTRICTION_URIS.add(owl.RESTRICTION_URI);
RESTRICTION_URIS.add(owl.SOME_VALUES_FROM_URI);
RESTRICTION_URIS.add(owl.ALL_VALUES_FROM_URI);

const RELATION_TYPES_URIS = new Set();
RELATION_TYPES_URIS.add(owl.OBJECT_PROPERTY_URI)
RELATION_TYPES_URIS.add(owl.FUNCTIONAL_PROPERTY)
RELATION_TYPES_URIS.add(owl.INVERSE_FUNCTIONAL_PROPERTY_URI);
// RELATION_TYPES_URIS.add(owl.DATATYPE_PROPERTY_URI);
RELATION_TYPES_URIS.add(owl.TRANSITIVE_PROPERTY_URI);
RELATION_TYPES_URIS.add(owl.SIMMETRIC_PROPERTY_URI);

const HIERARCHY_URIS = new Set();
HIERARCHY_URIS.add(rdf.TYPE_URI);
HIERARCHY_URIS.add(rdfs.SUBCLASSOF_URI);

const RELATION_QUALIFIER_URIS = new Set();
RELATION_QUALIFIER_URIS.add(owl.INVERSE_OF_URI);
RELATION_QUALIFIER_URIS.add(rdfs.SUBPROPERTYOF_URI);

// console.log(Object.values(owl));

let owlVocabulary = new Set(Object.values(owl));
owlVocabulary.add(rdfs.DOMAIN_URI);
owlVocabulary.add(rdfs.RANGE_URI);

const ON_PROPERTY_LABEL = "owl:onProperty";
const SOME_VALUES_FROM_LABEL = "owl:someValuesFrom";
const ALL_VALUES_FROM_LABEL = " owl:allValuesFrom";
const HAS_VALUE_LABEL = "owl:hasValue";

function OWLParser(entities, options)
{
	this.entities = entities;
    this.objectPropertyMap = {};

    this.relationQualifierMap = {};

    this.restrictionMap = {};

	this.rangeDomainMap = {};

	this.connectors = {};

	this.dataTypeRelations = {};

	this.subjectLabel = options.subjectLabel || Constants.DEFAULT_SUBJECT_ROLE;
    this.objectLabel = options.objectLabel || Constants.DEFAULT_OBJECT_ROLE;
}

OWLParser.prototype.shouldConvert = function(s, p, o, g, spo)
{
	if(p === owl.IMPORTS_URI)
	{
		return false;
	}
	if(owlVocabulary.has(s) || 
		owlVocabulary.has(p) ||
		owlVocabulary.has(o) ||
		owlVocabulary.has(g))
	{
		return true;
	}
	else if(this.objectPropertyMap.hasOwnProperty(s) || this.dataTypeRelations.hasOwnProperty(s))
	{
		return true;
	}
	// else if(HIERARCHY_URIS.has(p))
	// {
	// 	return true;
	// }
	return false;

}

OWLParser.prototype.createConnectors = function(s, p, o, g, spo)
{
	let entities = this.entities;

    // Create connector for restriction
    if(p === rdfs.TYPE_URI && o === owl.RESTRICTION_URI)
    {
        if(!this.restrictionMap.hasOwnProperty(s))
        {
            this.restrictionMap[s] = {};
        }

        // Create restriction connector
        if(!this.connectors.hasOwnProperty(owl.RESTRICTION_URI))
        {
            let connector = new Connector();
            connector.id = owl.RESTRICTION_URI;

            connector.className = ConnectorClass.FACTS;
            connector.addRole(ON_PROPERTY_LABEL, RoleTypes.SUBJECT);
            connector.addRole(SOME_VALUES_FROM_LABEL, RoleTypes.OBJECT);
            connector.addRole(ALL_VALUES_FROM_LABEL, RoleTypes.OBJECT);
            connector.addRole(HAS_VALUE_LABEL, RoleTypes.OBJECT);

            connector.appendToProperty(rdfs.TYPE_URI, o);

            this.connectors[owl.RESTRICTION_URI] = connector;
            entities[owl.RESTRICTION_URI] = connector;
        }
    }
    // else if(RELATION_TYPES_URIS.has(o))
    // {
    //     s = Utils.getIdFromResource(s);
    //     if(!this.connectors.hasOwnProperty(s))
    //     {
    //         let connector = new Connector();
    //         connector.id = s;

    //         connector.className = ConnectorClass.FACTS;
    //         connector.addRole(this.subjectLabel, RoleTypes.SUBJECT);
    //         connector.addRole(this.objectLabel, RoleTypes.OBJECT);

    //         connector.setOrAppendToProperty(rdfs.TYPE_URI, o);


    //         this.connectors[s] = connector;
    //         entities[s] = connector;

	// 		this.objectPropertyMap[s] = {};
    //     }
    //     else
    //     {
    //         let connector = this.connectors[s];

    //         connector.setOrAppendToProperty(rdfs.TYPE_URI, o);
    //     }

    // }
    else if(p === rdfs.RANGE_URI || p === rdfs.DOMAIN_URI)
    {
		if(!this.rangeDomainMap.hasOwnProperty(s))
		{
			this.rangeDomainMap[s] = {range: null, domain: null};
		}

		if(p === rdfs.RANGE_URI)
		{
			this.rangeDomainMap[s].range = o;
		}
		else if(p === rdfs.DOMAIN_URI)
		{
			this.rangeDomainMap[s].domain = o;
		}
    }
	else if(p === rdfs.TYPE_URI && o === owl.DATATYPE_PROPERTY_URI)
	{
		this.dataTypeRelations[s] = {};
	}
    else if (RELATION_QUALIFIER_URIS.has(p))
    {
        if(this.relationQualifierMap.hasOwnProperty(s))
        {
            this.relationQualifierMap[s].push({ property: p, value: o });
        }
        else
        {
            this.relationQualifierMap[s] = [{ property: p, value: o }];
        }
    }
	// else if(HIERARCHY_URIS.has(p) && !this.connectors.hasOwnProperty(p))
	// {
	// 	let connector = new Connector();
	// 	connector.id = p;
	// 	connector.className = ConnectorClass.HIERARCHY;
	// 	connector.addRole(this.subjectLabel, RoleTypes.SUBJECT);
	// 	connector.addRole(this.objectLabel, RoleTypes.OBJECT);
	// 	this.connectors[p] = connector;
	// }
}

OWLParser.prototype.createRelationships = function(s, p, o, g, spo)
{
    if (this.restrictionMap.hasOwnProperty(s) && 
        RESTRICTION_URIS.has(p))
    {
        let restriction = this.restrictionMap[s];
        
        if(restriction.hasOwnProperty(s))
        {
            restriction[p].push(o);
        }
        else
        {
            restriction[p] = [o];
        }

        if(g !== null && g !== undefined)
        {
            restriction.context = g;
        }
    }
	else if(this.dataTypeRelations.hasOwnProperty(s) && p === rdfs.DOMAIN_URI)
	{
		let id = Utils.getIdFromResource(o);
		let entity = this.entities[id];

		if(entity)
		{
			if(this.rangeDomainMap.hasOwnProperty(s))
			{
				let range = this.rangeDomainMap[s].range;
				if(range)
				{
					entity.setOrAppendToProperty(s, range);
				}
			}
		}
	}
	// else if(Utils.isUriOrBlankNode(s) && Utils.isUriOrBlankNode(o) && this.connectors.hasOwnProperty(p))
	// {
	// 	let connector = this.connectors[p];
	// 	let link = new Link();

	// 	let roles = connector.getRoles();
		
	// 	for(let i = 0; i < roles.length; i++)
	// 	{
	// 		let r = roles[i];
			
	// 		let roleType = connector.getRoleType(r);
	// 		if(roleType === RoleTypes.SUBJECT || roleType === RoleTypes.CHILD)
	// 		{
	// 			let subjId = blankNodesMap.hasOwnProperty(s) ? blankNodesMap[s] : s;
	// 			subjId = Utils.getIdFromResource(subjId);
	// 			link.addBind(this.subjectLabel, subjId);
	// 		}
	// 		else if(roleType === RoleTypes.OBJECT || roleType === RoleTypes.PARENT)
	// 		{
	// 			let objId = blankNodesMap.hasOwnProperty(o) ? blankNodesMap[o] : o;
	// 			objId = Utils.getIdFromResource(objId);
	// 			link.addBind(this.objectLabel, objId);
	// 		}
	// 	}
		
	// 	link.id = uuidv1();

	// 	link.connector = connectorId;
	// 	if(g)
	// 	{
	// 		link.parent = Utils.getIdFromResource(g);
	// 	}
	// 	this.entities[link.id] = link;

		
	// }

}

OWLParser.prototype.finish = function(entities)
{
    let bindRestriction = (restriction, l, uri, label) =>
    {
        let targets = restriction[uri];
        if(restriction.hasOwnProperty(uri))
        {
            for(let i = 0; i < targets.length; i++)
            {
                l.addBind(label, targets[i]);
            }
        }
    }

    for(let k in this.relationQualifierMap)
    {
        if(this.connectors.hasOwnProperty(k))
        {
            let connector = this.connectors[k];
            let qualifiers = this.relationQualifierMap[k];

            for(let i = 0; i < qualifiers.length; i++)
            {
                let qualifierEntry = qualifiers[i];
                connector.appendToProperty(qualifierEntry.property, qualifierEntry.value);
            }
        }
        else
        {
            console.log("not found", k);
        }
    }

    // TBOX: Bind objects
    for(let k in this.objectPropertyMap)
    {
        let entry = this.rangeDomainMap[k];

		if(entry)
		{
			let connector = this.connectors[k];

			if(entry.range && entry.domain)
			{
				let l = new Link();
				l.id = uuidv1();
				l.connector = connector.id;

				l.addBind(this.subjectLabel, entry.domain);
				l.addBind(this.objectLabel, entry.range);

				connector.appendToProperty(rdfs.DOMAIN_URI, entry.domain);
				connector.appendToProperty(rdfs.RANGE_URI, entry.range);

				entities[l.id] = l;
			}
		}
	}

    for(let k in this.restrictionMap)
    {
        let l = new Link;
        l.connector = owl.RESTRICTION_URI;
        l.id = uuidv1();

        let restriction = this.restrictionMap[k];

        bindRestriction(restriction, l, owl.ON_PROPERTY_URI, ON_PROPERTY_LABEL);
        bindRestriction(restriction, l, owl.SOME_VALUES_FROM_URI, SOME_VALUES_FROM_LABEL);
        bindRestriction(restriction, l, owl.ALL_VALUES_FROM_URI, ALL_VALUES_FROM_LABEL);

        if(restriction.hasOwnProperty("context"))
        {
            l.parent = restriction.context;
        }

        entities[l.id] = l;
    }

	// Add connectors
    for(let c in this.connectors)
    {
        entities[c] = this.connectors[c];
    }

	for(let k of HIERARCHY_URIS)
	{

		if(entities.hasOwnProperty(k))
		{
			let c = entities[k];

			if(c.className)
			{
				c.className = ConnectorClass.HIERARCHY;
			}
		}
	}
	

}

module.exports = OWLParser;