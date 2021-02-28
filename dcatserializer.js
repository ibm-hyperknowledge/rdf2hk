/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

const dcat               = require("./dcat");
const Utils             = require("./utils");

class DcatSerializer
{
	
  constructor (sharedGraph)
	{
        this.graph = sharedGraph;
	}

	serializeTAnchorBind (entity, entities, subjectLabel, objectLabel, subjId, objId, defaultGraph, context)
	{
      // TODO
  }
    
  serializeAnchorProperty(interfaceNode, p, prop, parentUri, interfaceProperties)
  {
      const hasTypeArray = interfaceProperties.hasOwnProperty(rdf.TYPE_URI) && Array.isArray(interfaceProperties[rdf.TYPE_URI]);
      const typeArray = hasTypeArray ? interfaceProperties[rdf.TYPE_URI] : [];
      if(p === dcat.HAS_PART_URI)
      {
          this.graph.add(interfaceNode, p, prop, parentUri);            
      }
      else if(p === rdf.TYPE_URI && Array.isArray(prop))
      {
          for(let i = 0; i < prop.length; i++)
          {
              this.graph.add(interfaceNode, p, prop[i], parentUri);
          }
      }
      else
      {
          this.graph.add(interfaceNode, p, Utils.createLiteralObject(prop), parentUri);
      }
  }

}

module.exports = DcatSerializer;