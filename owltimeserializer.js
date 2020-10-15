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
    
    serializeTemporalAnchorProperty(interfaceNode, p, prop, parentUri)
    {
        if(p === rdf.TYPE_URI && Array.isArray(prop))
        {
            for(let i = 0; i < prop.length; i++)
            {
                this.graph.add(interfaceNode, p, prop[i], parentUri);
            }
            return;
        }
        else if(p === 'begin')
        {
            this.graph.add(interfaceNode, owltime.DATE_TIME_URI, Utils.createLiteralObject(prop, null, xml.DATETIME_URI), parentUri);
        }
        else if(p === 'end')
        {
            this.graph.add(interfaceNode, owltime.DATE_TIME_URI, Utils.createLiteralObject(prop, null, xml.DATETIME_URI), parentUri);
        }
        this.graph.add(interfaceNode, p, Utils.createLiteralObject(prop), parentUri);
    }



}

module.exports = OwlTimeSerializer;