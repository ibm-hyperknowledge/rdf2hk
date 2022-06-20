/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

const HKUris = require("./hk");
const Utils = require("./utils");
const Constants = require("./constants");
const xml = require("./xmlschema");

const HKLib = require("hklib");
const { CONNECTOR, CONTEXT, NODE, REFERENCE, LINK } = require("hklib").Types;

const Node = HKLib.Node;
const Trail = HKLib.Trail;
const Connector = HKLib.Connector;
const Link = HKLib.Link;
const Context = HKLib.Context;
const VirtualContext = HKLib.VirtualContext;
const VirtualNode = HKLib.VirtualNode;
const VirtualLink = HKLib.VirtualLink;
const Reference = HKLib.Reference;
const LAMBDA = HKLib.Constants.LAMBDA;

const HYPERKNOWLEDGE_URIS = new Set();

HYPERKNOWLEDGE_URIS.add(HKUris.HAS_PARENT_URI);
HYPERKNOWLEDGE_URIS.add(HKUris.REFERENCES_URI);
HYPERKNOWLEDGE_URIS.add(HKUris.REFERENCED_BY_URI);
HYPERKNOWLEDGE_URIS.add(HKUris.USES_CONNECTOR_URI);

HYPERKNOWLEDGE_URIS.add(HKUris.HAS_BIND_URI);
HYPERKNOWLEDGE_URIS.add(HKUris.BOUND_ROLE_URI);
HYPERKNOWLEDGE_URIS.add(HKUris.BOUND_ANCHOR_URI);
HYPERKNOWLEDGE_URIS.add(HKUris.BOUND_COMPONENT_URI);
HYPERKNOWLEDGE_URIS.add(HKUris.CLASSNAME_URI);
HYPERKNOWLEDGE_URIS.add(HKUris.ISA_URI);
HYPERKNOWLEDGE_URIS.add(HKUris.LIST_ENTRY_URI);
HYPERKNOWLEDGE_URIS.add(HKUris.LIST_NEXT_URI);
HYPERKNOWLEDGE_URIS.add(HKUris.HAS_ANCHOR_URI);
HYPERKNOWLEDGE_URIS.add(HKUris.ANCHOR_KEY_URI);
HYPERKNOWLEDGE_URIS.add(HKUris.ANCHOR_TYPE_URI);

const NUMBER_DATATYPES = new Set();
NUMBER_DATATYPES.add(xml.INTEGER_URI);
NUMBER_DATATYPES.add(xml.NONNEGATIVEINTEGER_URI);
NUMBER_DATATYPES.add(xml.DECIMAL_URI);
NUMBER_DATATYPES.add(xml.DOUBLE_URI);
NUMBER_DATATYPES.add(xml.FLOAT_URI);


class CustomHKParser
{
  constructor(entities, connectors, blankNodesMap, refNodesMap, options, customizableOptions)
  {
    this.entities = entities;
    this.connectors = connectors;
    this.blankNodesMap = blankNodesMap;
    this.refNodesMap = refNodesMap;
    this.contextualize = customizableOptions.contextualize;
    this.mustConvert = options.customRdfParser || false;
  }

  _shouldConvert(s, p, o, g)
  {
    if (!this.mustConvert)
    {
      return false;
    }
    // if some element is a predicate it shouldn't become a connector
    if (this.contextualize.some(e => e.p === p))
    {
      return true;
    }

    return false;
  }

  firstLoopShouldConvert(s, p, o, g)
  {
    return this._shouldConvert(s, p, o, g);
  }

  secondLoopShouldConvert(s, p, o, g)
  {
    return this._shouldConvert(s, p, o, g);
  }

  lastLoopShouldConvert(s, p, o, g)
  {
    return this._shouldConvert(s, p, o, g);
  }

  createContext(s, p, o, g)
  {
    let entities = this.entities; 
    let context; 

    // TODO replace "find" to "any" and iterate over the array
    let contextSelector = this.contextualize.find(e => e.p === p);

    if(contextSelector.o && contextSelector.o !== o)
    {
      return;
    }

    const id = Utils.getIdFromResource(o);
    if (!entities.hasOwnProperty(id) && !Utils.isBlankNode(o))
    {
      context = new Context(id);
    }

    if (context)
    {
      entities[context.id] = context;
      if (g && context.type !== CONNECTOR)
      {
        context.parent = g;
      }
    }
  }

  createNode(s, p, o, g)
  {
    if(!Utils.isLiteral(o))
    {
      let entities = this.entities; 
      let node; 
      const id = Utils.getIdFromResource(s);
      const contextId = Utils.getIdFromResource(o);
  
      if(entities.hasOwnProperty(id))
      {   
        if(entities[id].parent !== contextId)
        { 
          let contextSelector = this.contextualize.find(e => e.p === p);
          if (contextSelector.allowReference)
          {
            let ref = new Reference();
            ref.id = Utils.createRefUri(s, contextId);
            ref.ref = s;
            ref.parent = contextId;

            entities[ref.id] = ref;
            this.refNodesMap[ref.id] = ref;
          }
          else
          {
            // Create a refnode to replace it
            const oldParent = entities[id].parent;
            node = entities[id];
            node.parent = contextId;
    
            let ref = new Reference();
            ref.id = Utils.createRefUri(s, oldParent);
            ref.ref = id;
            ref.parent = oldParent;
            entities[node.id] = node;
            entities[ref.id] = ref;
            this.refNodesMap[ref.id] = ref;

          }
        }
      }
      else
      {  
        id = this.blankNodesMap.hasOwnProperty(s) ? this.blankNodesMap[s] : id;
        node = new Node(id, contextId);
        entities[node.id] = node;
      }
    }
  }

  finish()
  {
    let entities = this.entities;
    Object.values(entities).forEach(entity =>{
      if(entity.type === REFERENCE)
      { 
        entity.properties = entities[entity.ref].properties;
        entity.interfaces = entities[entity.ref].interfaces;
        entity.metaProperties = entities[entity.ref].metaProperties;
      }
    })
  }


  firstLoopCallback(s, p, o, g)
  {
    this.createContext(s, p, o, g);
    return false;
  }

  secondLoopCallback(s, p, o, g)
  {
    this.createNode(s, p, o, g)
    return false;
  }

  lastLoopCallback(s, p, o, g)
  {
    return false;
  }
}

module.exports = CustomHKParser;