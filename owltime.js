/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

const INSTANT_URI = "<http://www.w3.org/2006/time#Instant>";
const INTERVAL_URI = "<http://www.w3.org/2006/time#Interval>";
const PROPER_INTERVAL_URI = "<http://www.w3.org/2006/time#ProperInterval>";
const DATE_TIME_INTERVAL = "<http://www.w3.org/2006/time#DateTimeInterval>";
const HAS_BEGINNING_URI = "<http://www.w3.org/2006/time#hasBeginning>";
const HAS_END_URI = "<http://www.w3.org/2006/time#hasEnd>";
const IN_DATE_TIME_URI = "<http://www.w3.org/2006/time#inXSDDateTime>";
const DATE_TIME_URI = '<http://www.w3.org/2006/time#xsdDateTime>';
const HAS_TIME_URI = '<http://www.w3.org/2006/time#hasTime>';
const HAS_DATE_TIME_DESCRIPTION_URI = '<http://www.w3.org/2006/time#hasDateTimeDescription>';
const TIME_ZONE_URI = '<http://www.w3.org/2006/time#timeZone>';
const UNIT_TYPE_URI = '<http://www.w3.org/2006/time#unitType>';
const YEAR_URI = '<http://www.w3.org/2006/time#year>';
const MONTH_URI = '<http://www.w3.org/2006/time#month>';
const DAY_URI = '<http://www.w3.org/2006/time#day>';
const HOUR_URI = '<http://www.w3.org/2006/time#hour>';
const MINUTE_URI = '<http://www.w3.org/2006/time#minute>';
const SECOND_URI = '<http://www.w3.org/2006/time#second>';
const WEEK_URI = '<http://www.w3.org/2006/time#week>';
const DAY_OF_YEAR_URI = '<http://www.w3.org/2006/time#dayOfYear>';
const DAY_OF_WEEK_URI = '<http://www.w3.org/2006/time#dayOfWeek>';
const MONTH_OF_YEAR_URI = '<http://www.w3.org/2006/time#monthOfYear>';
const DATE_TIME_DESCRIPTION_URI = '<http://www.w3.org/2006/time#DateTimeDescription>';

exports.TIME_ZONE_URI = TIME_ZONE_URI;
exports.UNIT_TYPE_URI = UNIT_TYPE_URI;
exports.YEAR_URI = YEAR_URI;
exports.MONTH_URI = MONTH_URI;
exports.DAY_URI = DAY_URI;
exports.HOUR_URI = HOUR_URI;
exports.MINUTE_URI = MINUTE_URI;
exports.SECOND_URI = SECOND_URI;
exports.WEEK_URI = WEEK_URI;
exports.DAY_OF_YEAR_URI = DAY_OF_YEAR_URI;
exports.DAY_OF_WEEK_URI = DAY_OF_WEEK_URI;
exports.MONTH_OF_YEAR_URI = MONTH_OF_YEAR_URI;
exports.INSTANT_URI = INSTANT_URI;
exports.INTERVAL_URI = INTERVAL_URI;
exports.PROPER_INTERVAL_URI = PROPER_INTERVAL_URI;
exports.DATE_TIME_INTERVAL = DATE_TIME_INTERVAL;
exports.HAS_BEGINNING_URI = HAS_BEGINNING_URI;
exports.HAS_END_URI = HAS_END_URI;
exports.IN_DATE_TIME_URI = IN_DATE_TIME_URI;
exports.DATE_TIME_URI = DATE_TIME_URI;
exports.HAS_TIME_URI = HAS_TIME_URI;
exports.HAS_DATE_TIME_DESCRIPTION_URI = HAS_DATE_TIME_DESCRIPTION_URI;
exports.DATE_TIME_DESCRIPTION_URI = DATE_TIME_DESCRIPTION_URI;
exports.GENERAL_DATE_TIME_DESCRIPTION_URIS = [
    TIME_ZONE_URI, UNIT_TYPE_URI, YEAR_URI, MONTH_URI, DAY_URI,
    HOUR_URI, MINUTE_URI, SECOND_URI, WEEK_URI, DAY_OF_YEAR_URI,
    DAY_OF_WEEK_URI, MONTH_OF_YEAR_URI
];
exports.INTERVAL_URIS = [INTERVAL_URI, PROPER_INTERVAL_URI, DATE_TIME_INTERVAL];
exports.DATE_TIME_URIS = [IN_DATE_TIME_URI, DATE_TIME_URI];
