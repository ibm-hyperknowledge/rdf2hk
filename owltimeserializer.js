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
const DATE_TIME_URI = "<http://www.w3.org/2006/time#inXSDDateTime>";

exports.INSTANT_URI = INSTANT_URI;
exports.INTERVAL_URI = INTERVAL_URI;
exports.PROPER_INTERVAL_URI = PROPER_INTERVAL_URI;
exports.DATE_TIME_INTERVAL = DATE_TIME_INTERVAL;
exports.INTERVAL_URIS = [INTERVAL_URI, PROPER_INTERVAL_URI, DATE_TIME_INTERVAL];
exports.HAS_BEGINNING_URI = HAS_BEGINNING_URI;
exports.HAS_END_URI = HAS_END_URI;
exports.DATE_TIME_URI = DATE_TIME_URI;
