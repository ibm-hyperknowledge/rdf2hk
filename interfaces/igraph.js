/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
'use strict';

/** @constructor */
function IGraph ()
{
}

/**
 * Init the datasource
 *
 * @param {object} options An object/dictionary with the specifics parameters to initialize the connection with the native db
 * @param {IDB#initCallback} callback callback that handles the response
 */
IGraph.prototype.init = function (options, callback)
{
	throw 'Not implemented yet';
};

IGraph.prototype.add = function (s, p, o, g)
{
    throw 'Not implemented yet';
}

IGraph.prototype.forEachStatement = function (callback)
{
    throw 'Not implemented yet';
}