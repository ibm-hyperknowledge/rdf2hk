/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

const HK = require("hklib");
const HKTypes = HK.Types;
const ConnectorClass = HK.ConnectorClass;
const RoleTypes = HK.RolesTypes;
const Connector = HK.Connector;
const Link = HK.Link;
const HKConstants = HK.Constants;


const Constants = require("./constants");
const hk = require("./hk");
const Utils = require("./utils");

const uuid = require("uuid");
const MD5 = require("md5.js");

function HKSerializer(sharedGraph, options)
{
    this.graph = sharedGraph;
    this.nodeResourceType = hk.NODE_URI;
    this.contextResourceType = hk.CONTEXT_URI;
    this.virtualContextResourceType = hk.VIRTUAL_CONTEXT_URI;
    this.connectorResourceType = hk.CONNECTOR_URI;
    this.linkResourceType = hk.LINK_URI;
    this.trailResourceType = hk.TRAIL_URI;
    this.refResourceType = hk.REF_URI;

    this.isAPredicate = hk.ISA_URI;
    this.bodyResource = `<${Constants.HK_NULL}>`;
    this.hasParent = hk.HAS_PARENT_URI;

    this.hasBlankId = hk.HAS_BLANK_ID_URI;

    this.references = hk.REFERENCES_URI;
    this.hasBind = hk.HAS_BIND_URI;
    this.usesConnector = hk.USES_CONNECTOR_URI;
    this.boundRole = hk.BOUND_ROLE_URI;
    this.boundComponent = hk.BOUND_COMPONENT_URI;
    this.boundAnchor = hk.BOUND_ANCHOR_URI;

    this.className = hk.CLASSNAME_URI;
    this.hasRole = hk.HAS_ROLE_URI;
    this.hasRoleName = hk.HAS_ROLE_NAME_URI;
    this.hasRoleType = hk.HAS_ROLE_TYPE_URI;

    this.hasAnchor = hk.HAS_ANCHOR_URI;
    this.anchorKey = hk.ANCHOR_KEY_URI;
    this.anchorType = hk.ANCHOR_TYPE_URI;

    // compressReification = false

    this.compressReification = options.compressReification || false;
    this.inverseRefNode = options.inverseRefNode || false;
    this.preserveAnchorIds = options.convertOwlTime || false;
    this.reifyAnchorProperties = options.convertOwlTime || false;
    this.owlTimeSerializer = options.owlTimeSerializer;
}

HKSerializer.prototype.serialize = function (entity)
{
    let graph = this.graph;

    let parentUri = undefined;
    if (entity.parent)
    {
        parentUri = entity.parent;
    }
    else
    {
        parentUri = this.bodyResource;
    }


    let entityUri = entity.id;

    // if(Utils.isBlankNode(entity.id))
    // {
    // 	graph.add(entityUri, this.hasBlankId, graph.createBlankid(entity.id), parentUri);
    // }

    switch (entity.type)
    {
        case HKTypes.CONNECTOR:
            {
                let classNameLiteral = Utils.createLiteralObject(entity.className);
                graph.add(entityUri, this.isAPredicate, this.connectorResourceType, parentUri);
                graph.add(entityUri, this.className, classNameLiteral, parentUri);

                if (this.compressReification)
                {
                    for (let k in entity.roles)
                    {
                        let roleUri = compressRoleInUri(k);
                        let roleTypeUri = Utils.createLiteralObject(entity.roles[k]);
                        graph.add(entityUri, roleUri, roleTypeUri, parentUri);
                    }
                }
                else
                {
                    let bnode = `_:${uuid()}`;

                    graph.add(entityUri, this.hasRole, bnode, parentUri);
                    graph.add(bnode, this.hasRoleName, bnode, parentUri);

                    for (let k in entity.roles)
                    {
                        let roleNameLit = Utils.createLiteralObject(k);
                        let roleTypeLit = Utils.createLiteralObject(entity.roles[k]);
                        graph.add(bnode, this.hasRoleName, roleNameLit, parentUri);
                        graph.add(bnode, this.hasRoleType, roleTypeLit, parentUri);
                    }
                }

                break;
            }
        case HKTypes.VIRTUALCONTEXT:
        case HKTypes.CONTEXT:
            {
                let parentContext = parentUri;
                if (!parentContext)
                {
                    parentContext = this.bodyResource;
                }
                if (entity.type === HKTypes.CONTEXT)
                {
                    graph.add(entityUri, this.isAPredicate, this.contextResourceType, parentUri);
                }
                else
                {
                    graph.add(entityUri, this.isAPredicate, this.virtualContextResourceType, parentUri);
                }

                graph.add(entityUri, this.hasParent, parentContext, parentUri);

                _serializeAnchors.call(this, entityUri, entity, parentUri, graph);
                break;
            }
        case HKTypes.LINK:
            {
                let connectorUri = entity.connector;
                if (!this.compressReification)
                {
                    graph.add(entityUri, this.isAPredicate, this.linkResourceType, parentUri);
                }
                graph.add(entityUri, this.usesConnector, connectorUri, parentUri);

                let link = new Link(entity);

                // Reificate binds
                link.forEachBind((role, comp, anchor) =>
                {
                    let compNode = comp;

                    if (Utils.isBlankNode(compNode))
                    {
                        compNode = Utils.createBlankNodeUri(compNode.substr(2));
                    }
                    if (!this.compressReification)
                    {
                        let bnode = `_:${uuid()}`;
                        let roleLiteral = Utils.createLiteralObject(role);
                        let anchorId = this.preserveAnchorIds ? anchor : Utils.createLiteralObject(anchor);
                        graph.add(entityUri, this.hasBind, bnode, parentUri);
                        graph.add(bnode, this.boundRole, roleLiteral, parentUri);
                        graph.add(bnode, this.boundComponent, compNode, parentUri);
                        graph.add(bnode, this.boundAnchor, anchorId, parentUri);
                    }
                    else
                    {
                        let roleUri = compressRoleInUri(role);
                        graph.add(entityUri, roleUri, compNode, parentUri);

                        if (anchor !== HKConstants.LAMBDA)
                        {
                            let anchorId = this.preserveAnchorIds ? anchor : Utils.createLiteralObject(`${comp}#${anchor}`);
                            graph.add(entityUri, roleUri, anchorId, parentUri);
                        }
                    }
                });
                break;
            }
        case HKTypes.NODE:
            {
                if (Utils.isBlankNode(entityUri))
                {
                    let uri = Utils.createBlankNodeUri(entityUri.substr(2));

                    graph.add(uri, this.isAPredicate, this.nodeResourceType, parentUri);
                    graph.add(uri, hk.REFERENCES_URI, entityUri, parentUri);
                }
                else
                {
                    graph.add(entityUri, this.isAPredicate, this.nodeResourceType, parentUri);
                }

                _serializeAnchors.call(this, entityUri, entity, parentUri, graph);
                break;
            }
        case HKTypes.REFERENCE:
            {
                let referencedNode = entity.ref;

                graph.add(entityUri, this.isAPredicate, this.refResourceType, parentUri);
                if (this.inverseRefNode)
                {
                    graph.add(entityUri, hk.REFERENCES_URI, referencedNode, parentUri);
                }
                else
                {
                    graph.add(entityUri, this.references, referencedNode, parentUri);
                }
                _serializeAnchors.call(this, entityUri, entity, parentUri, graph);
                break;
            }
        case HKTypes.TRAIL:
            {
                graph.add(entityUri, this.isAPredicate, this.trailResourceType, parentUri);
                break;
            }
        default:
            _serializeAnchors.call(this, entityUri, entity, parentUri, graph);
            break;
    }
}

function compressRoleInUri(role)
{
    return `<${Constants.HK_ROLE_PREFIX}/${encodeURIComponent(role)}>`;
}

function compressAnchorInUri(entityId, key)
{
    let hash = new MD5().update(`${encodeURIComponent(entityId)}/${encodeURIComponent(key)}`).digest("hex");

    return `<${Constants.HK_ANCHOR_PREFIX}/${hash}>`;
}

function _serializeAnchors(uri, entity, parentUri, graph)
{
    if (entity.hasOwnProperty("interfaces"))
    {
        for (let k in entity.interfaces)
        {

            let interf = entity.interfaces[k];
            let key = interf.key || k;
            let interfaceNode = this.preserveAnchorIds ? key : compressAnchorInUri(entity.id, key);

            if (key)
            {
                graph.add(uri, this.hasAnchor, interfaceNode, parentUri);
                const keyLabel = Utils.isUri(key) ? Utils.getLabelFromUri(key) : key;
                graph.add(interfaceNode, this.anchorKey, Utils.createLiteralObject(keyLabel), parentUri);

                if (interf.type)
                {
                    graph.add(interfaceNode, this.anchorType, Utils.createLiteralObject(interf.type), parentUri);
                }

                let properties = interf.properties || {};

                for (let p in properties)
                {
                    let prop = properties[p];
                    if (prop !== null && prop !== undefined)
                    {
                        if (this.reifyAnchorProperties && this.owlTimeSerializer)
                        {
                            this.owlTimeSerializer.serializeTemporalAnchorProperty(interfaceNode, p, prop, parentUri, properties);
                        }
                        else
                        {
                            graph.add(interfaceNode, p, Utils.createLiteralObject(prop), parentUri);
                        }
                    }
                }
            }
        }
    }
}

HKSerializer.compressRoleInUri = compressRoleInUri;

module.exports = HKSerializer;