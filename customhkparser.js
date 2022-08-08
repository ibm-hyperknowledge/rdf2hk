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
const Link = HKLib.Link;
const Context = HKLib.Context;
const Reference = HKLib.Reference;
const RoleTypes = HKLib.RoleTypes;

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
    this.subjectLabel = options.subjectLabel || Constants.DEFAULT_SUBJECT_ROLE;
    this.objectLabel = options.objectLabel || Constants.DEFAULT_OBJECT_ROLE;
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
    return this.mustConvert && Utils.isUriOrBlankNode(o);
  }

  createContext(s, p, o, g)
  {
    let entities = this.entities;
    let context;

    // TODO replace "find" to "any" and iterate over the array
    let contextSelector = this.contextualize.find(e => e.p === p);

    if (contextSelector.o && contextSelector.o !== o)
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
    if (!Utils.isLiteral(o))
    {
      let entities = this.entities;
      let node;
      const id = Utils.getIdFromResource(s);
      const contextId = Utils.getIdFromResource(o);

      if (entities.hasOwnProperty(id))
      {
        if (entities[id].parent !== contextId)
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
    Object.values(entities).forEach(entity =>
    {
      if (entity.type === REFERENCE)
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
    const parentIdFromResource = Utils.getIdFromResource(g);
    if (Utils.isUriOrBlankNode(o))
    {
      let connectorId = Utils.getIdFromResource(p);
      if (this.connectors.hasOwnProperty(connectorId))
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
            let subjId = this.blankNodesMap.hasOwnProperty(s) ? this.blankNodesMap[s] : s;
            subjId = Utils.getIdFromResource(subjId);
            const node = this.entities[subjId];

            if (node.parent === parentIdFromResource)
            {
              link.addBind(this.subjectLabel, subjId);
            }
            else
            {
              // must use the refnode in the relation
              const refNodeId = Utils.createRefUri(s, parentIdFromResource);
              link.addBind(this.subjectLabel, refNodeId);
            }
          }
          else if (roleType === RoleTypes.OBJECT || roleType === RoleTypes.PARENT)
          {
            let objId = this.blankNodesMap.hasOwnProperty(o) ? this.blankNodesMap[o] : o;
            objId = Utils.getIdFromResource(objId);

            const node = this.entities[objId];
            if (node.parent === parentIdFromResource)
            {
              link.addBind(this.objectLabel, objId);
            }
            else
            {
              // must use the refnode in the relation
              const refNodeId = Utils.createRefUri(o, parentIdFromResource);
              link.addBind(this.objectLabel, refNodeId);
            }
          }
          link.id = Utils.createSpoUri(s, p, o, g);

          link.connector = connectorId;
          if (g)
          {
            link.parent = parentIdFromResource;
          }
          this.entities[link.id] = link;
        }
      }
    }

    return false;
  }
}

module.exports = CustomHKParser;