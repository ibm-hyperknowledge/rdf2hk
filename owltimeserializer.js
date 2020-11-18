/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

const rdf               = require("./rdf");
const xml               = require("./xmlschema");
const owltime           = require("./owltime");
const Utils             = require("./utils");

class OwlTimeSerializer
{
	constructor (sharedGraph, options)
	{
        this.graph = sharedGraph;
        this.timeContext = options.timeContext;
	}

	serializeTemporalAnchorBind (entity, entities, subjectLabel, objectLabel, subjId, objId, defaultGraph, context)
	{
        if(this.timeContext === subjId && subjId === objId)
        {
            // serialize triple using timeContext anchors
            subjId = entity.binds[subjectLabel][subjId][0];
            objId = entity.binds[objectLabel][objId][0];
            context = (entities.hasOwnProperty(entity.parent) ? entities[entity.parent].parent : defaultGraph) || defaultGraph;
            this.graph.add(subjId, entity.connector, objId, context);
        }
        else
        {
            this.graph.add(subjId, entity.connector, objId, context);
        }
    }
    
    serializeTemporalAnchorProperty(interfaceNode, p, prop, parentUri, interfaceProperties)
    {
        const hasTypeArray = interfaceProperties.hasOwnProperty(rdf.TYPE_URI) && Array.isArray(interfaceProperties[rdf.TYPE_URI]);
        const typeArray = hasTypeArray ? interfaceProperties[rdf.TYPE_URI] : [];
        
        const isInstant = typeArray.includes(owltime.INSTANT_URI);
        let isInterval = false;
        owltime.INTERVAL_URIS.forEach((uri) => isInterval = isInterval || interfaceProperties[rdf.TYPE_URI].includes(uri));
        
        if(p === rdf.TYPE_URI && Array.isArray(prop))
        {
            for(let i = 0; i < prop.length; i++)
            {
                this.graph.add(interfaceNode, p, prop[i], parentUri);
            }
        }
        else if((p === 'begin' || p === 'end') && (isInstant || isInterval))
        {
            if(isInstant)
            {
                this.graph.add(interfaceNode, owltime.DATE_TIME_URI, Utils.createLiteralObject(prop, null, xml.DATETIME_URI), parentUri);
            }
            this.graph.add(interfaceNode, p, Utils.createLiteralObject(prop), parentUri);
        }
        else if(p === owltime.HAS_BEGINNING_URI || owltime.HAS_END_URI)
        {
            this.graph.add(interfaceNode, p, prop, parentUri);    
        }
        else
        {
            this.graph.add(interfaceNode, p, Utils.createLiteralObject(prop), parentUri);
        }
    }



}

module.exports = OwlTimeSerializer;