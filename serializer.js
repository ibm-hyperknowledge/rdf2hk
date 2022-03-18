/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

const { HKTypes, HKEntity, Connector, Link, Reference, RoleTypes } = require("hklib");

const Utils = require("./utils");
const Constants = require("./constants");

const TriGGraph = require("./triggraph");
const HKSerializer = require("./hkserializer");
const OWLSerializer = require("./simpleowlserializer");
const OLWTimeSerializer = require("./owltimeserializer");
const hk = require("./hk");


/**
 * Convert Hyperknowledge entities to a rdflib.js graph. 
 * 
 * @param {Array} entities Entities to convert.
 * @param {IndexedFormula} graph Graph to update, if it is null create a new graph
 * @param {object} options Dictionary with parameters
 * @param {boolean} [options.subjectLabel] Set the subject role name `subject`, can be null
 * @param {boolean} [options.objectLabel] Set the object role name `object`, can be null
 * @param {boolean} [options.convertHK] Generate additional triples to build hyperknowledge entities
 * @param {boolean} [options.convertOwl] Uses owl rules to convert entities 
 * @param {boolean} [options.convertOwlTime] Uses owl Time rules to convert entities
 * @param {boolean} [options.timeContext] Context for owl Time conversion generated entities and relationships.
 * @param {boolean} [options.skipRefNodes] Skip extra reference nodes in case convertHK is true. Default is false.
 * @param {boolean} [options.inverseRefNode] When convertHK is true, the triple of ref nodes are inversed. That is, generates 'uri isReferenceBy refId' instead of 'refId references uri', . This promotes rdf view of data.
 * @param {boolean} [options.compressReification] If convertHK is true, links will be reificated, the compress mode will generate the minimum of triples, default is false
 * @param {boolean} [options.convertNumber] Convert the number/boolean to xsd schema
 * @param {boolean} [options.reifyArray] Reify the arrays, default is false.
 * @param {boolean} [options.defaultGraph] The uri to set when the parent of a entity is null
 * @param {boolean} [options.suppressDuplicates] If true, duplicate quads will be suppressed from the output graph. Otherwise, they will not be suppressed. Defaults to true.
 * @param {object} referenceMap A string indexed map. Where the index is a refnode id and the value is the refnode itself.
 * @returns An instance of rdflib.js graph.
 */

function serialize(entities, options = {}, graph = new TriGGraph(), referenceMap = {}) 
{
  if (!entities)
  {
    return graph;
  }

  let connectors = {};
  let literalAsNodeTriples = {};

  let defaultGraph = options.defaultGraph || null;
  let suppressDuplicates = options.hasOwnProperty('suppressDuplicates') ? options.suppressDuplicates : true;


  if (options.convertHK)
  {
    if (!options.hasOwnProperty("reifyArray"))
    {
      options.reifyArray = true;
      // compressArray = true;
    }
  }

  let subjectLabel = null;
  let objectLabel = null;

  options.owlSerializer = new OWLSerializer(graph, options);
  options.owlTimeSerializer = new OLWTimeSerializer(graph, options);
  let hkSerializer = new HKSerializer(graph, options);

  // We can set subjectLabel and objectLabel as null
  if (options.hasOwnProperty("subjectLabel"))
  {
    subjectLabel = options.subjectLabel;
  }
  else
  {
    subjectLabel = Constants.DEFAULT_SUBJECT_ROLE;
  }

  if (options.hasOwnProperty("objectLabel"))
  {
    objectLabel = options.objectLabel;
  }
  else
  {
    objectLabel = Constants.DEFAULT_OBJECT_ROLE;
  }

  // Collect connectors, references and literal links
  for (let k in entities)
  {
    let entity = entities[k];
    if (entity.type === Connector.type)
    {
      connectors[entity.id] = entity;

      _collectProperties(entity, graph, options);
    }
    else if (entity.type === Reference.type)
    {
      referenceMap[entity.id] = entity;
    }
    else if (entity.type === Link.type)
    {
      const literalTypeId = hk.DATA_LITERAL_URI;
      const hasLiteralProperty = entity.properties && entity.properties.hasOwnProperty(literalTypeId);
      const hasLiteralMetaProperty = entity.metaProperties && entity.metaProperties.hasOwnProperty(literalTypeId);
      if (hasLiteralProperty || hasLiteralMetaProperty)
      {
        const subject = Object.keys(entity.binds[subjectLabel])[0];
        const predicate = entity.connector;
        const object = entities[Object.keys(entity.binds[objectLabel])[0]].getProperty('data');
        const graph = entity.parent;
        literalAsNodeTriples[entity.id] = { subject, predicate, object, graph };
      }
    }
  }

  for (let k in entities)
  {
    let entity = entities[k];

    switch (entity.type)
    {
      case HKTypes.CONTEXT:
      case HKTypes.NODE:
      case HKTypes.VIRTUAL_CONTEXT:
      case HKTypes.VIRTUAL_NODE:
        {
          // Convert literals
          _collectProperties(entity, graph, options);
          break;
        }
      case HKTypes.REFERENCE:
        {
          // Convert literals

          if (options.convertHK && !options.skipRefNodes)
          {
            _collectProperties(entity, graph, options);
          }

          // Generate triples to the resource from the ref
          if (options.convertOwl || ((!options.convertHK || options.compressReification) && entity.parent))          
          {

            let refObj = {
              id: entity.ref,
              properties: entity.properties,
              metaProperties: entity.metaProperties,
              parent: entity.parent
            };
            _collectProperties(refObj, graph, options);
          }

          break;
        }
      case HKTypes.LINK:
        {
          let connector = connectors[entity.connector];

          let roles = null;

          if (connector)
          {
            let connectorRoles = Connector.prototype.getRoles.call(connector);
            let tempRole = { s: null, o: null };
            for (let j = 0; j < connectorRoles.length; j++)
            {
              let role = connectorRoles[j];
              let t = Connector.prototype.getRoleType.call(connector, role);
              if (t === RoleTypes.CHILD || t === RoleTypes.SUBJECT)
              {
                tempRole.s = role;
              }
              else if (t === RoleTypes.PARENT || t === RoleTypes.OBJECT)
              {
                tempRole.o = role;
              }
            }
            if (tempRole.s && tempRole.o)
            {
              roles = [tempRole.s, tempRole.o];
            }
          }
          else
          {
            roles = [subjectLabel, objectLabel];
          }

          if (roles)
          {
            Link.prototype.forEachCrossBind.call(entity, roles, (s, o) =>
            {

              let subjId = s;
              let objId = o;

              //in case we are still using reference nodes
              if (referenceMap.hasOwnProperty(s))
              {
                subjId = referenceMap[s].ref;
              }
              if (referenceMap.hasOwnProperty(o))
              {
                objId = referenceMap[o].ref;
              }

              let context = undefined;
              if (entity.parent)
              {
                context = entity.parent;
              }
              else if (defaultGraph)
              {
                context = defaultGraph;
              }

              if (options.convertOwlTime)
              {
                options.owlTimeSerializer.serializeTemporalAnchorBind(entity, entities, subjectLabel, objectLabel, subjId, objId, defaultGraph, context);
              }
              else
              {
                graph.add(subjId, entity.connector, objId, context);
              }
            });
          }

          if (options.convertHK)
          {
            _collectProperties(entity, graph, options);
          }
          break;
        }
      case HKTypes.CONNECTOR:
        break;
      case HKTypes.TRAIL:
        break;
      default:
        {
          if (entity.properties)
          {
            _collectProperties(entity, graph, options);
          }
          break;
        }
    }

    if (entity && options.convertHK)
    {
      hkSerializer.serialize(entity);
    }
  }

  // reify literal as node triples
  for (let k in literalAsNodeTriples)
  {
    const triple = literalAsNodeTriples[k];
    const literal = _buildLiteralObject(triple.object);
    graph.add(triple.subject, triple.predicate, literal, triple.graph);
  }

  if(suppressDuplicates) graph.suppressDuplicates();
  return graph;
}

function _addLiteral(entity, graph, predicate, value, metaProperty, graphName)
{
  let literal = _buildLiteralObject(value, metaProperty);

  if (entity.hasOwnProperty('type'))
  {
    if (entity.type === Reference.type && entity.parent)
    {
      //we are dealing with a ref node, use reference for the triple 
      graph.add(entity.ref, predicate, literal, graphName);
    }
  }
  graph.add(entity.id, predicate, literal, graphName);
}

function _buildLiteralObject(value, metaProperty)
{
  let typeInfo = {};

  let v = null;

  if (value !== null)
  {
    v = Utils.getValueFromLiteral(value, typeInfo) || value;
  }

  else
  {
    // Entity with only metaproperties
    v = `<${Constants.HK_NULL}>`;
  }
  let lang = undefined;

  let type = typeInfo.type || metaProperty;

  if (typeInfo.lang)
  {
    lang = typeInfo.lang;
  }
  let literal = Utils.createLiteralObject(v, lang, type);
  return literal;
}

function _collectProperties(entity, graph, options)
{
  let convertNumber = options.convertNumber || false;
  let reifyArray = options.reifyArray || false;
  let defaultGraph = options.defaultGraph || null;
  HKEntity.prototype.foreachProperty.call(entity, (key, value, metaProperty) =>
  {
    let graphName = null;

    if (entity.parent)
    {
      graphName = entity.parent;
    }
    else if (defaultGraph)
    {
      graphName = defaultGraph;
    }

    if (value === null || value === undefined)
    {
      if (metaProperty !== null)
      {
        // Update only metaproperty
        _addLiteral(entity, graph, key, null, metaProperty, graphName);
      }
      return;
    }

    if (options.convertOwl && options.owlSerializer.shouldConvertProperty(entity.id, key, value))
    {
      options.owlSerializer.convertProperty(entity.id, key, value, metaProperty, graphName);
      return;
    }

    if (reifyArray && Array.isArray(value))
    {
      let literal = Utils.createLiteralObject(JSON.stringify(value), null, hk.DATA_LIST_URI);

      graph.add(entity.id, key, literal, graphName);
    }
    // else 
    if (Array.isArray(value))
    {
      value = Array.from(new Set(value));
      for (let i = 0; i < value.length; i++)
      {
        if (metaProperty)
        {
          _addLiteral(entity, graph, key, value[i], metaProperty, graphName);
        }
        else
        {
          let currentMetaProperty = Utils.getTypeIfNumberOrBoolean(value[i]);
          _addLiteral(entity, graph, key, value[i], currentMetaProperty, graphName);
        }
      }
    }
    else
    {
      if (!metaProperty && convertNumber)
      {
        metaProperty = Utils.getTypeIfNumberOrBoolean(value);
      }
      _addLiteral(entity, graph, key, value, metaProperty, graphName);
    }
  });
}

exports.serialize = serialize;