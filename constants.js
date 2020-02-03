/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";

exports.HK_PROTOCOL							= "hk";
exports.DEFAULT_SUBJECT_ROLE 	            = "subject";
exports.DEFAULT_OBJECT_ROLE 	            = "object";
exports.HK_ID_PREFIX             			= `${exports.HK_PROTOCOL}://id`;
exports.HK_ANCHOR_PREFIX		            = `${exports.HK_PROTOCOL}://a`;
exports.HK_BLANK_NODE_PREFIX 		        = `${exports.HK_PROTOCOL}://b`;
exports.HK_REFERENCE_PREFIX 			    = `${exports.HK_PROTOCOL}://ref`;
exports.HK_ROLE_PREFIX 			    		= `${exports.HK_PROTOCOL}://role`;
exports.HK_LINK_PREFIX 				        = `${exports.HK_PROTOCOL}://link`;

exports.HK_NULL 				            = `${exports.HK_ID_PREFIX}/null`;
exports.MIMETYPE_APPLICATION_TURTLE 		= "application/turtle";
exports.MIMETYPE_TEXT_TURTLE 		        = "text/turtle";
exports.MIMETYPE_APPLICATION_NTRIPLE 		= "application/n-triples";