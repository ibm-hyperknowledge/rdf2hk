/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

const { Connector, ConnectorClass, Reference, RoleTypes } = require("hklib");

const owl = require("./owl");
const rdfs = require("./rdfs");
const rdf = require("./rdf");

const Utils = require("./utils");

const Constants = require("./constants");

let owlVocabulary = new Set(Object.values(owl));
owlVocabulary.add(rdfs.DOMAIN_URI);
owlVocabulary.add(rdfs.RANGE_URI);
owlVocabulary.add(rdfs.SUBPROPERTYOF_URI);
owlVocabulary.add(owl.EQUIVALENT_PROPERTY_URI);


class SimpleOwlParser
{
  constructor(entities, connectors, blackNodesMap, refNodesMap, options, ...params)
  {
    this.entities = entities;
    this.refNodesMap = refNodesMap;
    this.subjectLabel = options.subjectLabel || Constants.DEFAULT_SUBJECT_ROLE;
    this.objectLabel = options.objectLabel || Constants.DEFAULT_OBJECT_ROLE;
    this.mustConvert = options.convertOwl || false;
  }

  _shouldConvert(s, p, o, g)
  {
    if (!this.mustConvert)
    {
      return false;
    }
    if (p === owl.IMPORTS_URI)
    {
      return false;
    }
    else if (p === rdf.TYPE_URI && owl.OBJECT_PROPERTY_URIS.includes(o))
    {
      return true;
    }
    else if(owlVocabulary.has(p))
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

  firstLoopShouldConvert(s, p, o, g)
  {
    return this._shouldConvert(s, p, o, g)
  }

  secondLoopShouldConvert(s, p, o, g)
  {
    return this._shouldConvert(s, p, o, g)
  }

  lastLoopShouldConvert(s, p, o, g)
  {
    return this._shouldConvert(s, p, o, g)
  }

  createConnectors(s, p, o, g, spo)
  {
    if (
      !Utils.isBlankNode(s) 
      && (
        (p === rdf.TYPE_URI && owl.OBJECT_PROPERTY_URIS.includes(o)) 
        || owlVocabulary.has(p)
      )
    )
    {
      if (!this.entities.hasOwnProperty(s))
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

  createRelationships(s, p, o, g)
  {
    if (
      !Utils.isBlankNode(s) && (
        (p === rdf.TYPE_URI && !owl.OBJECT_PROPERTY_URIS.includes(o)) ||
        (owlVocabulary.has(p))
      )
    )
    {
      let refId = Utils.createRefUri(s, g);
      let ref = null;

      if (!this.entities.hasOwnProperty(refId))
      {
        ref = new Reference();
        ref.id = refId;
        ref.ref = s;
        ref.parent = g;

        this.entities[refId] = ref;
        this.refNodesMap[refId] = ref;
      }
      else
      {
        ref = this.entities[refId];
      }

      if (Utils.isLiteral(o))
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

  finish()
  {

  }

  firstLoopCallback(s, p, o, parent)
  {
    this.createConnectors(s, p, o, parent);
    return false;
  }

  secondLoopCallback(s, p, o, parent)
  {
    return false;
  }

  lastLoopCallback(s, p, o, parent)
  {
    return !this.createRelationships(s, p, o, parent);
  }

}

module.exports = SimpleOwlParser;