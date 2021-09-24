/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

const HKUris = require("./hk");
const Utils = require("./utils");
const Constants = require("./constants");
const xml = require("./xmlschema");
const hk = require("./hk");

const HK = require("hklib");

const Node = HK.Node;
const Trail = HK.Trail;
const Action = Trail.Action;
const Connector = HK.Connector;
const Link = HK.Link;
const Context = HK.Context;
const Reference = HK.Reference;
const LAMBDA = HK.Constants.LAMBDA;

const HYPERKNOWLEDGE_URIS = new Set();

HYPERKNOWLEDGE_URIS.add(HKUris.HAS_PARENT_URI);
HYPERKNOWLEDGE_URIS.add(HKUris.REFERENCES_URI);
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

// Trails
HYPERKNOWLEDGE_URIS.add(HKUris.AGENT_URI);
HYPERKNOWLEDGE_URIS.add(HKUris.EVENT_PROPERTIES_URI);
HYPERKNOWLEDGE_URIS.add(HKUris.EVENT_TYPE_URI);
HYPERKNOWLEDGE_URIS.add(HKUris.FROM_URI);
HYPERKNOWLEDGE_URIS.add(HKUris.HAS_ACTION_URI);
HYPERKNOWLEDGE_URIS.add(HKUris.HAS_TIMESTAMP_URI);
HYPERKNOWLEDGE_URIS.add(HKUris.TO_URI);

const NUMBER_DATATYPES = new Set();
NUMBER_DATATYPES.add(xml.INTEGER_URI);
NUMBER_DATATYPES.add(xml.NONNEGATIVEINTEGER_URI);
NUMBER_DATATYPES.add(xml.DECIMAL_URI);
NUMBER_DATATYPES.add(xml.DOUBLE_URI);
NUMBER_DATATYPES.add(xml.FLOAT_URI);


function HKParser(sharedEntities, connectors, sharedBlankNodeMap, sharedRefNodesMap, options)
{
  this.entities = sharedEntities;

  this.onlyHK = options.onlyHK || false;
  this.binds = {};
  this.bindLinks = {};
  this.connectors = connectors;
  this.blankNodesMap = sharedBlankNodeMap;
  this.refNodesMap = sharedRefNodesMap;

  this.linksWithCompressedBinds = new Set();

  this.interfaces = {};

  this.mustConvert = options.onlyHK || options.convertHK;
  this.textLiteralAsNode = options.textLiteralAsNode || false;
}

HKParser.prototype.shouldConvert = function (s, p, o, g)
{
  if (!this.mustConvert)
  {
    return false;
  }

  if (HYPERKNOWLEDGE_URIS.has(p) || HYPERKNOWLEDGE_URIS.has(o) ||
    isCompressedRoleUri(p) ||
    isCompressedRoleUri(o) ||
    isCompressedAnchor(s))
  {
    return true;
  }
  // else if(this.onlyHK && Utils.isUriOrBlankNode(o))
  else if (this.onlyHK && (Utils.isUriOrBlankNode(o)))
  {
    return true;
  }
  else if (this.interfaces.hasOwnProperty(s))
  {
    return true;
  }

  if (!Utils.isUriOrBlankNode(o))
  {

    let info = {};
    Utils.getValueFromLiteral(o, info);

    if (info.type === HKUris.DATA_LIST_URI)
    {
      return true;
    }
  }


  return false;
}

HKParser.prototype.createEntities = function (s, p, o, g, spo)
{
  if (p === HKUris.ISA_URI)
  {
    _createEntities.call(this, s, p, o, g);
  }
  else if (p === HKUris.USES_CONNECTOR_URI)
  {
    _createCompressedLink.call(this, s, p, o, g);
  }
  else if (p === HKUris.HAS_ANCHOR_URI)
  {
    _createInterface.call(this, s, p, o, g);
  }
  else if (p.includes(HKUris.TRAIL_BASE_URI))
  {
    _createActions.call(this, s, p, o, g);
  }
  else if (p === HKUris.HAS_BIND_URI || p === HKUris.HAS_ANCHOR_URI)
  {
    this.setIntrinsicProperties(s, p, o, g);
  }
}

HKParser.prototype.setIntrinsicProperties = function (s, p, o, g, spo)
{
  if (p !== HKUris.ISA_URI)
  {
    let entities = this.entities;
    let entityId = Utils.getIdFromResource(s);
    let entity = entities[entityId];

    const isAnchor = isCompressedAnchor(s) || this.interfaces.hasOwnProperty(s);
    if (!entity && !this.binds.hasOwnProperty(s) && !isAnchor)
    {
      return;
    }

    if (isCompressedRoleUri(p))
    {
      let role = decompressRoleUri(p);

      if (entity.type === Link.type)
      {
        if (!entity.binds)
        {
          entity.binds = {};
        }

        if (!entity.binds.hasOwnProperty(role))
        {
          entity.binds[role] = {};
        }

        if (Utils.isUriOrBlankNode(o))
        {
          let comp = Utils.getIdFromResource(o);
          if (!entity.binds[role][comp])
          {
            entity.binds[role][comp] = null;
          }
          this.linksWithCompressedBinds.add(entityId);

        }
        else
        {
          let v = Utils.getValueFromLiteral(o);
          let idx = v.lastIndexOf("#");

          let comp = v.substr(0, idx);
          let anchorKey = v.substr(idx + 1);

          if (!entity.binds[role][comp])
          {
            entity.binds[role][comp] = [anchorKey]
          }
          else
          {
            entity.binds[role][comp].push(anchorKey);
          }
        }
      }
      else if (entity.type === Connector.type)
      {
        entity.addRole(role, Utils.getValueFromLiteral(o));
        // entity.addRole(role, o);
      }
      return;
    }

    switch (p)
    {
      case HKUris.HAS_PARENT_URI:
        {
          entity.parent = Utils.getIdFromResource(o);
          break;
        }
      case HKUris.ANCHOR_KEY_URI:
        {
          let interf = this.interfaces[s];
          if (interf)
          {
            interf.key = Utils.getValueFromLiteral(o);
          }
          break;
        }
      case HKUris.ANCHOR_TYPE_URI:
        {
          let interf = this.interfaces[s];
          if (interf)
          {
            interf.type = Utils.getValueFromLiteral(o);
          }
          break;
        }
      case HKUris.REFERENCES_URI:
        {
          entity.ref = Utils.getIdFromResource(o);
          break;
        }
      case HKUris.USES_CONNECTOR_URI:
        {
          entity.connector = Utils.getIdFromResource(o);
          break;
        }
      case HKUris.CLASSNAME_URI:
        {
          entity.className = Utils.getValueFromLiteral(o);
          break;
        }
      case HKUris.HAS_BIND_URI:
        {
          if (!this.binds.hasOwnProperty(o))
          {
            let bind = { role: null, comp: null, anchor: null };
            this.binds[o] = bind;

            let link = null;
            if (!this.bindLinks.hasOwnProperty(s))
            {
              link = [];
              this.bindLinks[s] = link;
            }
            else
            {
              link = this.bindLinks[s];
            }
            link.push(bind);
          }

          break;
        }
      case HKUris.BOUND_ROLE_URI:
        {
          if (this.binds.hasOwnProperty(s))
          {
            this.binds[s].role = Utils.getValueFromLiteral(o);
          }
          break;
        }
      case HKUris.BOUND_ANCHOR_URI:
        {
          if (this.binds.hasOwnProperty(s))
          {
            this.binds[s].anchor = Utils.getValueFromLiteral(o);
          }
          break;

        }
      case HKUris.BOUND_COMPONENT_URI:
        {
          if (this.binds.hasOwnProperty(s))
          {
            this.binds[s].comp = Utils.getValueFromLiteral(o);
          }
          break;
        }
      default:
        {
          // Set properties of an anchor
          if (this.interfaces.hasOwnProperty(s))
          {
            let interf = this.interfaces[s];
            if (interf)
            {
              let properties = interf.properties;

              let value = Utils.isUri(o) ? o : Utils.getValueFromLiteral(o, null, true);

              properties[Utils.getIdFromResource(p)] = value;
            }
          }
          break;
        }

    }
  }
}

HKParser.prototype.finish = function ()
{
  let entities = this.entities;

  // Set interfaces
  for (let k in this.interfaces)
  {
    let interf = this.interfaces[k];

    let entity = entities[Utils.getIdFromResource(interf.entityId)];

    if (entity)
    {
      if (!entity.hasOwnProperty("interfaces"))
      {
        entity.interfaces = {};
      }

      entity.interfaces[interf.key] = {
        type: interf.type,
        key: interf.key,
        properties: interf.properties
      };
    }
  }

  // Set compressed binds
  for (let l of this.linksWithCompressedBinds)
  {
    let link = entities[l];
    let isLinkBindedWithParent = false;

    for (let role in link.binds)
    {
      let linkRoles = link.binds[role];
      let nonParentBindings = [];
      for (let comp in linkRoles)
      {
        let anchors = linkRoles[comp];

        if (anchors === null)
        {
          linkRoles[comp] = [LAMBDA];
        }

        if (comp === link.parent)
        {
          isLinkBindedWithParent = true;
        }
        else
        {
          nonParentBindings.push(comp);
        }
      }

      // replace nonParentBind by parent anchor
      if (isLinkBindedWithParent && nonParentBindings.length === 1 &&
        link.parent !== undefined && linkRoles.hasOwnProperty(link.parent) &&
        linkRoles[link.parent].length === 1 && linkRoles[nonParentBindings[0]].length === 1 &&
        linkRoles[link.parent][0] === LAMBDA && linkRoles[nonParentBindings[0]][0] === LAMBDA)
      {
        delete linkRoles[nonParentBindings[0]];
        linkRoles[link.parent] = [nonParentBindings[0]];
      }

    }
  }

  // Set binds
  for (let id in this.bindLinks)
  {
    let linkId = Utils.getIdFromResource(id);
    let link = entities[linkId];
    let binds = this.bindLinks[id];
    if (link)
    {
      for (let i = 0; i < binds.length; i++)
      {
        let bind = binds[i];
        if (bind.role && bind.comp)
        {
          let compId = Utils.getIdFromResource(bind.comp);
          link.addBind(bind.role, compId, bind.anchor);
        }
      }
    }
  }

  // suppress referenced nodes with undefined parent
  for(let id in this.refNodesMap)
  {
    let ref = this.refNodesMap[id].ref;
    if(entities.hasOwnProperty(ref) && entities[ref].parent === undefined)
    {
      delete this.entities[ref];
    }
  }

  // set parents of remaining nodes with undefined parent as null
  for(let id in this.entities)
  {
    const entity = this.entities[id];
    if(entity.parent === undefined)
    {
      entity.parent = null;
    }

    const literalTypeId = HKUris.DATA_LITERAL_URI;
    if(!this.textLiteralAsNode && (entity.type === Node.type || entity.type === Link.type))
    {
      let propertyName = null;
      if(entity.hasProperty(literalTypeId))
      {
        propertyName = entity.getProperty(literalTypeId);
        delete entity.properties[literalTypeId];
      }
      else if(entity.getMetaProperty(literalTypeId))
      {
        propertyName = entity.getMetaProperty(literalTypeId);
        delete entity.metaProperties[literalTypeId];
      }
      if(propertyName) delete entity.properties[propertyName];  
    }
    else if(entity.type === Trail.type && entity.size()>0)
    {
      entity.actions = entity.loadActions(entity.actions.toArray());
    }
  }
}

function _createCompressedLink(s, p, o, g)
{
  let linkId = Utils.getIdFromResource(s);
  if (this.entities.hasOwnProperty(linkId))
  {
    return;
  }
  let link = new Link();
  link.id = linkId;
  link.connector = Utils.getIdFromResource(o);
  this.entities[link.id] = link;

  if (g)
  {
    link.parent = Utils.getIdFromResource(g);
  }
}

function _createEntities(s, p, o, g)
{
  let entities = this.entities;
  let entity = null;

  // Map blank nodes
  // if(Utils.isBlankNode(s) && !this.blankNodesMap.hasOwnProperty(s))
  // {
  // 	this.blankNodesMap[s] = "_:" + uuidv1();
  // }
  // let id = this.blankNodesMap.hasOwnProperty(s) ? this.blankNodesMap[s] : Utils.getIdFromResource(s);
  let id = Utils.getIdFromResource(s);

  if (!entities.hasOwnProperty(id))
  {
    switch (o)
    {
      case HKUris.NODE_URI:
        {
          entity = new Node();
          break;
        }
      case HKUris.CONTEXT_URI:
        {
          entity = new Context();
          break;
        }
      case HKUris.CONNECTOR_URI:
        {
          entity = new Connector();
          break; // this is a return, we do not set parent to connectors
        }
      case HKUris.REF_URI:
        {
          entity = new Reference();
          break;
        }
      case HKUris.LINK_URI:
        {
          entity = new Link();
          break;
        }
      case HKUris.TRAIL_URI:
        {
          // check if trail already exists
          if (!this.entities[id]) 
          {
            entity = new Trail(id);
            entities[id] = entity;
          }
          else 
          {
            entity = this.entities[id]
          }
          
          break;
        }
    }
    entity.id = id;
  }

  if (entity)
  {
    entities[entity.id] = entity;
    if (!entity.parent && g && entity && entity.type !== Connector.type)
    {
      entity.parent = Utils.getIdFromResource(g);
    }
    if(entity.type === Reference.type)
    {
      this.refNodesMap[entity.id] = entity;
    }
  }
}

function _bindBlankNodes(s, p, o, g)
{
  let ctx = Utils.getIdFromResource(g);
  if (Utils.isBlankNode(s))
  {
    if (!this.blankNodesMap.hasOwnProperty(s))
    {
      if (!ctx)
      {
        this.blankNodesMap[s] = Utils.getIdFromResource(o);
      }
    }
  }
}

function _createInterface(s, p, o, g)
{
  this.interfaces[o] = { entityId: s, properties: {}, key: null, type: null };
}

function _createActions(s, p, o, g)
{
  let graph = Utils.getIdFromResource(g);
  let subject = Utils.getIdFromResource(s);
  let property = Utils.getLabelFromUri(p);
  let value = Utils.getValueFromLiteral(o);

  // check if parent trail exists
  if (!this.entities.hasOwnProperty(graph))
  {
    this.entities[graph] = new Trail(graph);
  }
  let trail = this.entities[graph];
  let action = null;

  // aux function to check actions
  function checkAction(trail, actionId)
  {
    // if we already have this action reference
    if(this.action && this.action.id == actionId)
    {
      return this.action;
    }

    // search action in trail
    this.action = trail.search(actionId);

    if(!this.action)
    {
      this.action = trail.append(new Action({event: { "id": actionId }}));
    }
    return this.action;
  }

  switch(p)
  {
    case hk.HAS_ACTION_URI:
      let actionId = Utils.getIdFromResource(o);
      action = checkAction.call(this, trail, actionId);

      break;
    case hk.FROM_URI:
      action = checkAction.call(this, trail, subject);
      action['from'] = JSON.parse(value);

      break;
    case hk.TO_URI:
      action = checkAction.call(this, trail, subject);
      action['to'] = JSON.parse(value);

      break;
    case hk.EVENT_TYPE_URI:
      action = checkAction.call(this, trail, subject);
      action.event['type'] = value;

      break;
    case hk.EVENT_PROPERTIES_URI:
      action = checkAction.call(this, trail, subject);
      action.event['properties'] = value;

      break;
    case hk.HAS_TIMESTAMP_URI:
      action = checkAction.call(this, trail, subject);
      action.event['timestamp'] = value;

      break;
    case hk.AGENT_URI:
      action = checkAction.call(this, trail, subject);
      action['agent'] = value;

      break;
    default:
      action = checkAction.call(this, trail, subject);
      action[property] = value;
  }
}

function isCompressedRoleUri(uri)
{
  if (typeof uri === "string")
  {
    // return uri.startsWith("<hkrole://h/");
    return uri.startsWith(`<${Constants.HK_ROLE_PREFIX}`);
  }
  return false;
}

function isCompressedAnchor(uri)
{
  if (typeof uri === "string")
  {
    return uri.startsWith(`<${Constants.HK_ANCHOR_PREFIX}`);
  }
  return false;
}

function decompressRoleUri(uri)
{
  return decodeURIComponent(uri.slice(Constants.HK_ROLE_PREFIX.length + 2, -1));
}

HKParser.prototype.firstLoopCallback = function (s, p, o, parent)
{
  this.createEntities(s, p, o, parent);
  // this indicates if the parsing should stop or not...
  return false;
};

HKParser.prototype.secondLoopCallback = function (s, p, o, parent)
{
  return false;
}

HKParser.prototype.lastLoopCallback = function (s, p, o, parent)
{
  this.setIntrinsicProperties(s, p, o, parent);
  return false;
}

module.exports = HKParser;