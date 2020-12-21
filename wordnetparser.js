/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

const wordnet = require("./wordnet");
const Constants = require("./constants");
const Link = require("hklib/link");
const { LAMBDA } = require("hklib/constants");
const Context = require("hklib/context");
const { createSpoUri, createRefUri, generateResourceFromId } = require("rdf2hk/utils");
const Reference = require("hklib/reference");
const Node = require("hklib/node");
const { TYPE_URI } = require("rdf2hk/rdf");
const { CONTEXT } = require("hklib/types");

const LEXICAL_CONCEPTS_URI = generateResourceFromId('LexicalConcepts');

class WordnetParser
{

    constructor(entities, options)
	{
		this.entities = entities;
		this.subjectLabel = options.subjectLabel || Constants.DEFAULT_SUBJECT_ROLE;
        this.objectLabel = options.objectLabel || Constants.DEFAULT_OBJECT_ROLE;
        this.sensesMap = {};
        this.blankNodeMap = {};
        this.literalMap = {};
	}

    shouldConvert(s, p, o, parent)
    {
        if(p === wordnet.SENSE_URI || 
            p === wordnet.IS_LEXICALIZED_SENSE_OF_URI || 
            p === wordnet.CANNONICAL_FORM_URI ||
            p === wordnet.DEFINITION_URI ||
            p === wordnet.DEFINITION_VALUE_URI ||
            p === wordnet.WRITTEN_REP_URI ||
            p === wordnet.PART_OF_SPEECH_URI ||
            o === wordnet.LEXICAL_SENSE_URI || 
            o === wordnet.LEXICAL_CONCEPT_URI ||
            wordnet.SEMANTIC_RELATIONS_URIS.includes(p) ||
            this.sensesMap.hasOwnProperty(s) || 
            this.sensesMap.hasOwnProperty(o))
		{
			return true;
		}
		return false;
    }

    createEntities(s, p, o, parent)
    {
        let senseUri = null;
        let conceptUri = null;
        let entryUri = null;
        
        if(p === wordnet.SENSE_URI || this.sensesMap.hasOwnProperty(o))
        {
            senseUri = o;
            entryUri = s;
        }
        else if(p === wordnet.IS_LEXICALIZED_SENSE_OF_URI || o === wordnet.LEXICAL_SENSE_URI || this.sensesMap.hasOwnProperty(s))
        {
            senseUri = s;
            if(p === wordnet.IS_LEXICALIZED_SENSE_OF_URI) conceptUri = o;
        }
        else if(p === wordnet.CANNONICAL_FORM_URI || p === wordnet.DEFINITION_URI)
        {
            this.blankNodeMap[s] = o;
        }
        else if(p === wordnet.WRITTEN_REP_URI || p === wordnet.DEFINITION_VALUE_URI)
        {
            this.literalMap[s] = o;
        }
        else if(o === wordnet.LEXICAL_CONCEPT_URI)
        {
            conceptUri = o;
        }

        if(!this.sensesMap.hasOwnProperty(senseUri)) this.sensesMap[senseUri] = {};
        
        if(conceptUri)
        {
            if(!this.entities.hasOwnProperty(LEXICAL_CONCEPTS_URI))
            {
                this.entities[LEXICAL_CONCEPTS_URI] = new Context(LEXICAL_CONCEPTS_URI, parent);
            }
            if(senseUri)
            {
                this.sensesMap[senseUri].concept = conceptUri;
            }
            if(!this.entities.hasOwnProperty(conceptUri))
            {
                this.entities[conceptUri] = new Node(conceptUri, LEXICAL_CONCEPTS_URI);
                this.entities[conceptUri].metaProperties = {};
                this.entities[conceptUri].metaProperties[TYPE_URI] = wordnet.LEXICAL_CONCEPT_URI;
            }
        } 

        if(entryUri) 
        {
            this.sensesMap[senseUri].entry = entryUri;
            if(!this.entities.hasOwnProperty(entryUri))
            {
                this.entities[entryUri] = new Context(entryUri, parent);
                this.entities[entryUri].metaProperties = {};
                const interfaceProperties = {};
                interfaceProperties[TYPE_URI] = wordnet.LEXICAL_SENSE_URI;
                this.entities[entryUri].addInterface(senseUri, 'conceptual', interfaceProperties);
            }
        }
       
    }

    createRelationships(s, p, o, parent)
    {
        let senseUri = null;
        
        if(p === wordnet.SENSE_URI)
        {
            senseUri = o;
        }
        else if(p === wordnet.IS_LEXICALIZED_SENSE_OF_URI || o === wordnet.LEXICAL_SENSE_URI)
        {
            senseUri = s;
        }
        else if(p === wordnet.CANNONICAL_FORM_URI || p === wordnet.WRITTEN_REP_URI || p === wordnet.DEFINITION_URI || p === wordnet.DEFINITION_VALUE_URI)
        {
            if(p === wordnet.CANNONICAL_FORM_URI)
            {
                if(!this.entities[s].properties)
                {
                    this.entities[s].properties = {};
                }
                this.entities[s].properties[wordnet.CANNONICAL_PROPERTY] = this.literalMap[o];
                this.entities[s].metaProperties[wordnet.CANNONICAL_FORM_URI] = o;
            }
            if(p === wordnet.DEFINITION_URI)
            {
                if(!this.entities[s].properties)
                {
                    this.entities[s].properties = {};
                }
                this.entities[s].properties[wordnet.DEFINITION_PROPERTY] = this.literalMap[o];
                this.entities[s].metaProperties[wordnet.DEFINITION_URI] = o;
            }
            return true;
        }
        else if(wordnet.SEMANTIC_RELATIONS_URIS.includes(p) || o === wordnet.LEXICAL_CONCEPT_URI)
        {
            if(!this.entities.hasOwnProperty(s))
            {
                this.entities[s] = new Node(s, LEXICAL_CONCEPTS_URI);
            }
            if(!this.entities.hasOwnProperty(o))
            {
                this.entities[o] = new Node(o, LEXICAL_CONCEPTS_URI);
            }

            const linkId = createSpoUri(s, p, o, LEXICAL_CONCEPTS_URI);
            const link = new Link(linkId, p, LEXICAL_CONCEPTS_URI);
            link.addBind(this.subjectLabel, s, LAMBDA);
            link.addBind(this.objectLabel, o, LAMBDA);
            this.entities[linkId] = link;
            return true;
        }
        else if(p === wordnet.PART_OF_SPEECH_URI)
        {

            if(!this.entities.hasOwnProperty(o))
            {
                this.entities[o] = new Node(o, parent);
            }
            
            if(this.entities[s].parent !== this.entities[o].parent)
            {
                parent = this.entities[s].parent;
                const refId = createRefUri(o, parent);
                if(!this.entities.hasOwnProperty(refId))
                {
                    this.entities[refId] = new Reference(refId, o, parent);
                }
                o = refId;
            }
            
            const linkId = createSpoUri(s, p, o, parent);
            const link = new Link(linkId, p, parent);
            link.addBind(this.subjectLabel, s, LAMBDA);
            link.addBind(this.objectLabel, o, LAMBDA);
            this.entities[linkId] = link;
            
            return true;
        }
        else
        {
            return false;
        }

        let entryUri = this.sensesMap[senseUri].entry;
        let conceptUri = this.sensesMap[senseUri].concept;

        const refId = createRefUri(conceptUri, entryUri);
        if(!this.entities.hasOwnProperty(refId))
        {
            this.entities[refId] = new Reference(refId, conceptUri, entryUri);
        }

        const linkId = createSpoUri(entryUri, wordnet.SENSE_CONNECTOR, conceptUri, entryUri);
        const link = new Link(linkId, wordnet.SENSE_CONNECTOR, entryUri);
        link.addBind(this.subjectLabel, entryUri, senseUri);
        link.addBind(this.objectLabel, refId, LAMBDA);
        link.metaProperties = {};
        link.metaProperties[TYPE_URI] = wordnet.LEXICAL_SENSE_URI;
        
        this.entities[linkId] = link;
        
        return true;

    }

    finish(entities)
    {
        console.log(entities);
    }

}

module.exports = WordnetParser;