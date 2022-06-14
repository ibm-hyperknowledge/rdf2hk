/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

const rdf = require("./rdf");
const time = require("./owltime");

const Utils = require("./utils");

const Constants = require("./constants");
const { LAMBDA } = require("hklib").Constants;
const Context = require("hklib").Context;
const Link = require("hklib").Link;

class OwlTimeParser
{
  constructor(entities, options)
  {
    this.entities = entities;
    this.subjectLabel = options.subjectLabel || Constants.DEFAULT_SUBJECT_ROLE;
    this.objectLabel = options.objectLabel || Constants.DEFAULT_OBJECT_ROLE;
    this.timeContext = options.timeContext || null;
    this.anchors = null;
    this.instantDatetimeMap = {}; // {instantId: datetime}
    this.dateTimeDescriptionMap = {}; // {descriptionId: GeneralDateTimeDescription}
    this.intervalDateTimeDescriptionMap = {}; // {intervalId: descriptionId}
    this.mustConvert = options.convertOwlTime || false;
  }

  _shouldConvert(s, p, o, context)
  {
    if (!this.mustConvert)
    {
      return false;
    }
    if (this.timeContext != null)
    {
      context = this.timeContext;
    }

    this.timeContext = this.entities[context] || {};
    this.anchors = this.timeContext.interfaces || {};

    if (o === time.INSTANT_URI || time.INTERVAL_URIS.includes(o)
      || p === time.HAS_BEGINNING_URI || p === time.HAS_END_URI
      || p === time.IN_DATE_TIME_URI || p === time.HAS_TIME_URI
      || p === time.HAS_DATE_TIME_DESCRIPTION_URI || time.GENERAL_DATE_TIME_DESCRIPTION_URIS.includes(p)
      || this.anchors.hasOwnProperty(s))
    {
      return true;
    }
    return false;
  }

  firstLoopShouldConvert(s, p, o, context)
  {
    return this._shouldConvert(s, p, o, context);
  }

  secondLoopShouldConvert(s, p, o, context)
  {
    return this._shouldConvert(s, p, o, context);
  }

  lastLoopShouldConvert(s, p, o, context)
  {
    return this._shouldConvert(s, p, o, context);
  }

  createContextAnchor(s, p, o, context)
  {
    this.timeContext = this.entities[context] || new Context(context);
    if (p !== time.HAS_TIME_URI)
    {
      this.timeContext.addInterface(s, 'temporal', {});
    }
    else
    {
      this.timeContext.addInterface(o, 'temporal', {});
    }

    this.entities[context] = this.timeContext;
    if (p === time.IN_DATE_TIME_URI)
    {
      const literal = Utils.getValueFromLiteral(o, {}, true);
      this.instantDatetimeMap[s] = literal;
    }
  }

  convertToContextAnchor(id)
  {
    // create context anchor for id, if it does not exist
    const anchor = this.anchors[id] || { type: 'temporal', properties: {} };
    this.anchors[id] = anchor;
    // remove id entity if there is any
    if (this.entities.hasOwnProperty(id))
    {
      delete this.entities[id];
    }
    return anchor;
  }

  createTimeRelationships(s, p, o, context)
  {
    if (p === rdf.TYPE_URI && (time.INTERVAL_URIS.includes(o) || o === time.INSTANT_URI || this.anchors.hasOwnProperty(s)))
    {
      const anchor = this.convertToContextAnchor(s);

      // create property of anchor to represent rdf:type relationship
      const types = anchor.properties[rdf.TYPE_URI] || [];
      types.push(o);
      anchor.properties[rdf.TYPE_URI] = types;
      return true;
    }
    else if (p === time.HAS_BEGINNING_URI || p === time.HAS_END_URI)
    {
      const anchor = this.convertToContextAnchor(s)

      // if instant is indefinite, set its URI as begin or end of the interval
      // otherwise, set its begin and end (which should be the same date) as begin or end of the interval
      if (!this.instantDatetimeMap.hasOwnProperty(o))
      {
        if (p === time.HAS_BEGINNING_URI)
        {
          anchor.properties.begin = o;
        }
        else if (p === time.HAS_END_URI)
        {
          anchor.properties.end = o;
        }
      }
      else
      {
        if (p === time.HAS_BEGINNING_URI)
        {
          anchor.properties.begin = this.instantDatetimeMap[o];
        }
        else if (p === time.HAS_END_URI)
        {
          anchor.properties.end = this.instantDatetimeMap[o];
        }
      }

      // add instant identifier as a property
      anchor.properties[p] = o;

      return true;
    }
    else if (p === time.IN_DATE_TIME_URI)
    {
      const anchor = this.convertToContextAnchor(s);

      // set begin and end properties of anchor as o
      const literal = Utils.getValueFromLiteral(o, {}, true);
      anchor.properties.begin = literal;
      anchor.properties.end = literal;
      return true;
    }
    else if (p === time.HAS_DATE_TIME_DESCRIPTION_URI)
    {
      if (!this.intervalDateTimeDescriptionMap.hasOwnProperty(o))
      {
        this.intervalDateTimeDescriptionMap[s] = o;
      }
      return true;
    }
    else if (time.GENERAL_DATE_TIME_DESCRIPTION_URIS.includes(p) || o === time.DATE_TIME_DESCRIPTION_URI)
    {
      if (!this.dateTimeDescriptionMap.hasOwnProperty(s))
      {
        this.dateTimeDescriptionMap[s] = {};
      }
      this.dateTimeDescriptionMap[s][p] = o;
    }
    else if (this.anchors.hasOwnProperty(s) || this.anchors.hasOwnProperty(o))
    {

      // check if s is an anchor, and update subject if needed
      let subjectEntity = s;
      let subjectAnchor = LAMBDA;
      if (this.anchors.hasOwnProperty(s))
      {
        subjectEntity = context;
        subjectAnchor = s;
      }

      // check if o is an anchor, and updated object if needed
      let objectEntity = o;
      let objectAnchor = LAMBDA;
      if (this.anchors.hasOwnProperty(o))
      {
        objectEntity = context;
        objectAnchor = o;
      }

      if (time.DATE_TIME_URIS.includes(p) && Utils.isLiteral(o))
      {
        const anchor = this.convertToContextAnchor(s);
        anchor.properties.begin = o;
        anchor.properties.end = o;
      }
      else
      {
        // create link with updated subject and object
        const anchorLink = new Link();
        anchorLink.addBind(this.subjectLabel, subjectEntity, subjectAnchor);
        anchorLink.addBind(this.objectLabel, objectEntity, objectAnchor);
        anchorLink.connector = p;
        anchorLink.parent = context;
        anchorLink.id = Utils.createSpoUri(s, p, o, context);
        this.entities[anchorLink.id] = anchorLink;
      }

      return true;
    }
    return false;
  }

  finish()
  {
    // post process date time descriptions
    for (let intervalId in this.intervalDateTimeDescriptionMap)
    {
      const descriptionId = this.intervalDateTimeDescriptionMap[intervalId];
      const dateTimeDescription = this.dateTimeDescriptionMap[descriptionId];
      const anchor = this.convertToContextAnchor(intervalId);
      delete this.timeContext.interfaces[descriptionId];

      anchor.properties[time.HAS_DATE_TIME_DESCRIPTION_URI] = descriptionId;

      let beginDate = null;
      let endDate = null;

      for (let generalDescriptionPredicate of time.GENERAL_DATE_TIME_DESCRIPTION_URIS)
      {
        if (!dateTimeDescription || !dateTimeDescription.hasOwnProperty(generalDescriptionPredicate)) continue; // skip

        const generalDescriptionValue = dateTimeDescription[generalDescriptionPredicate];
        const generalDescriptionValueLiteral = Utils.getValueFromLiteral(generalDescriptionValue, {}, true);

        if (!beginDate)
        {
          beginDate = new Date(generalDescriptionValueLiteral);
        }

        if (!endDate)
        {
          endDate = new Date(generalDescriptionValueLiteral);
        }

        switch (generalDescriptionPredicate)
        {
          case time.YEAR_URI:
            endDate.setFullYear(endDate.getFullYear() + 1);
            endDate.setMilliseconds(-1);
            anchor.properties[time.YEAR_URI] = generalDescriptionValue;
            break;
          case time.MONTH_URI:
            beginDate.setMonth(generalDescriptionValueLiteral);
            endDate.setFullYear(beginDate.getFullYear());
            endDate.setMonth(beginDate.getMonth() + 1);
            endDate.setMilliseconds(-1);
            anchor.properties[time.MONTH_URI] = generalDescriptionValue;
            break;
          case time.DAY_URI:
            beginDate.setDate(generalDescriptionValueLiteral);
            endDate.setFullYear(beginDate.getFullYear());
            endDate.setMonth(beginDate.getMonth());
            endDate.setDate(beginDate.getDate() + 1);
            endDate.setMilliseconds(-1);
            anchor.properties[time.DAY_URI] = generalDescriptionValue;
            break;
          default:
            console.warn(`Parsing of ${generalDescriptionPredicate} not fully supported yet!`);
            anchor.properties[generalDescriptionPredicate] = generalDescriptionValue;
        }
      }

      if (!anchor.properties.begin && beginDate)
      {
        anchor.properties.begin = beginDate.toLocaleString();
      }
      if (!anchor.properties.end && endDate)
      {
        anchor.properties.end = endDate.toLocaleString();
      }
    }

  }

  finish()
  {
    // post process date time descriptions
    for (let intervalId in this.intervalDateTimeDescriptionMap)
    {
      const descriptionId = this.intervalDateTimeDescriptionMap[intervalId];
      const dateTimeDescription = this.dateTimeDescriptionMap[descriptionId];
      const anchor = this.convertToContextAnchor(intervalId);
      delete this.timeContext.interfaces[descriptionId];

      anchor.properties[time.HAS_DATE_TIME_DESCRIPTION_URI] = descriptionId;

      let beginDate = null;
      let endDate = null;

      for (let generalDescriptionPredicate of time.GENERAL_DATE_TIME_DESCRIPTION_URIS)
      {
        if (!dateTimeDescription || !dateTimeDescription.hasOwnProperty(generalDescriptionPredicate)) continue; // skip

        const generalDescriptionValue = dateTimeDescription[generalDescriptionPredicate];
        const generalDescriptionValueLiteral = Utils.getValueFromLiteral(generalDescriptionValue, {}, true);

        if (!beginDate)
        {
          beginDate = new Date(generalDescriptionValueLiteral);
        }

        if (!endDate)
        {
          endDate = new Date(generalDescriptionValueLiteral);
        }

        switch (generalDescriptionPredicate)
        {
          case time.YEAR_URI:
            endDate.setFullYear(endDate.getFullYear() + 1);
            endDate.setMilliseconds(-1);
            anchor.properties[time.YEAR_URI] = generalDescriptionValue;
            break;
          case time.MONTH_URI:
            beginDate.setMonth(generalDescriptionValueLiteral);
            endDate.setFullYear(beginDate.getFullYear());
            endDate.setMonth(beginDate.getMonth() + 1);
            endDate.setMilliseconds(-1);
            anchor.properties[time.MONTH_URI] = generalDescriptionValue;
            break;
          case time.DAY_URI:
            beginDate.setDate(generalDescriptionValueLiteral);
            endDate.setFullYear(beginDate.getFullYear());
            endDate.setMonth(beginDate.getMonth());
            endDate.setDate(beginDate.getDate() + 1);
            endDate.setMilliseconds(-1);
            anchor.properties[time.DAY_URI] = generalDescriptionValue;
            break;
          default:
            console.warn(`Parsing of ${generalDescriptionPredicate} not fully supported yet!`);
            anchor.properties[generalDescriptionPredicate] = generalDescriptionValue;
        }
      }

      if (!anchor.properties.begin && beginDate)
      {
        anchor.properties.begin = beginDate.toLocaleString();
      }
      if (!anchor.properties.end && endDate)
      {
        anchor.properties.end = endDate.toLocaleString();
      }
    }

  }

  firstLoopCallback(s, p, o, context)
  {
    if (this.timeContext && context != this.timeContext)
    {
      context = this.timeContext;
    }
    this.createContextAnchor(s, p, o, context);
    return true;
  }

  secondLoopCallback(s, p, o, context)
  {
    return false;
  }

  lastLoopCallback(s, p, o, parent)
  {
    if (this.timeContext && parent != this.timeContext)
    {
      parent = this.timeContext;
    }
    return !this.createTimeRelationships(s, p, o, parent);
  }

}

module.exports = OwlTimeParser;