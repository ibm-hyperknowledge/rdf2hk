/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";


const HKLib				   = require("hklib");
const Link           = HKLib.Link;
const Connector      = HKLib.Connector;
const ConnectorClass = HKLib.ConnectorClass;
const RoleTypes     = HKLib.RolesTypes;
const Constants      = require("./constants");
const dcat 				   = require("./dcat");
const uuidv1         = require ('uuid/v1');


function DCATParser(entities, options)
{
	this.entities = entities;
  this.linksBySubject = {};
  this.linksByObject = {};
	this.subjectLabel = options.subjectLabel || Constants.DEFAULT_SUBJECT_ROLE;
  this.objectLabel = options.objectLabel || Constants.DEFAULT_OBJECT_ROLE;
}

DCATParser.prototype.shouldConvert = function(s, p, o, g, spo)
{
	if(p === dcat.HAS_PART_URI)
	{
		return true;
	}
	return false;

}

DCATParser.prototype.createConnectors = function(s, p, o, g)
{
  if(!this.entities.hasOwnProperty(dcat.HAS_PART_URI))
  {
    let connector = new Connector();
    connector.id = dcat.HAS_PART_URI;
    connector.className = ConnectorClass.FACTS;
    connector.addRole(this.subjectLabel, RoleTypes.SUBJECT);
    connector.addRole(this.objectLabel, RoleTypes.OBJECT);
    this.entities[connector.id] = connector;
  }
  
  if(!this.entities.hasOwnProperty(dcat.IS_PART_OF_URI))
  {
    let connector = new Connector();
    connector.id = dcat.IS_PART_OF_URI;
    connector.className = ConnectorClass.FACTS;
    connector.addRole(this.subjectLabel, RoleTypes.SUBJECT);
    connector.addRole(this.objectLabel, RoleTypes.OBJECT);
    this.entities[connector.id] = connector;
  }
}

DCATParser.prototype.createRelationships = function(s, p, o, g, spo)
{
  if(!this.linksBySubject.hasOwnProperty(s))
  {
    const linkId = uuidv1();
    this.linksBySubject[s] = new Link(linkId, dcat.HAS_PART_URI, g);
    this.linksBySubject[s].addBind(this.subjectLabel, s);
    this.entities[linkId] = this.linksBySubject[s];
  }
  if(!this.linksByObject.hasOwnProperty(o))
  {
    const linkId = uuidv1();
    this.linksByObject[o] = new Link(linkId, dcat.IS_PART_OF_URI, g);
    this.linksByObject[o].addBind(this.subjectLabel, o);
    this.entities[linkId] = this.linksByObject[o];
  }
  this.linksBySubject[s].addBind(this.objectLabel, o);
  this.linksByObject[o].addBind(this.objectLabel, s);
  return true;
}

DCATParser.prototype.finish = function(entities)
{

}

module.exports = DCATParser;