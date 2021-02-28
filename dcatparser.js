/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";


const HKLib				= require("hklib");
const Node              = HKLib.Node;
const Trail             = HKLib.Trail;
const Connector         = HKLib.Connector;
const Link              = HKLib.Link;
const Context           = HKLib.Context;
const ConnectorClass    = HKLib.ConnectorClass;
const Reference         = HKLib.Reference;
const RoleTypes         = HKLib.roletypes;
const Constants         = require("./constants");

const dcat 				= require("./dcat");

const uuidv1            = require ('uuid/v1');

const Utils             = require("./utils");


function DCATParser(entities, options)
{
	this.entities = entities;
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

DCATParser.prototype.createAnchors = function(s, p, o, g, spo)
{
  
}

DCATParser.prototype.createRelationships = function(s, p, o, g, spo)
{
  // TODO
}

DCATParser.prototype.finish = function(entities)
{

}

module.exports = DCATParser;