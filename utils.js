/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
"use strict";


const FOAF 			= require("./foaf");
const RDFS 			= require("./rdfs");
const SKOS 			= require("./skos");
const DCTERMS 		= require("./dcterms");
const hk 			= require("./hk");
const Constants 	= require("./constants");

const MD5 			= require("md5.js");

const xml 			= require("./xmlschema");
const HKTypes 		= require("hklib").Types;

const HKProtocolLength = Constants.HK_ID_PREFIX.length;
const BlankIdProtocolLength = Constants.HK_BLANK_NODE_PREFIX.length;
const HKRefProtocolLength = Constants.HK_REFERENCE_PREFIX.length;

const NUMBER_DATATYPES = new Set();
NUMBER_DATATYPES.add(xml.INTEGER_URI);
NUMBER_DATATYPES.add(xml.NONNEGATIVEINTEGER_URI);
NUMBER_DATATYPES.add(xml.DECIMAL_URI);
NUMBER_DATATYPES.add(xml.DOUBLE_URI);
NUMBER_DATATYPES.add(xml.FLOAT_URI);

const LIST_OF_PROPERTIES = 
[
    SKOS.PREF_LABEL_URI,
    SKOS.ALT_LABEL_URI,
    RDFS.LABEL_URI,
    FOAF.NAME_URI,
    FOAF.NICK_URI,
    DCTERMS.TITLE_URI,
    "title",
    "rdfs:label"
];

function isBlankNode(str)
{
    if(typeof str !== "string")
    {
        return false;
    }
    return str.startsWith("_:");
}

function isUriOrBlankNode(str)
{
    return isUri(str) || isBlankNode(str);
}

function isUri(str)
{
    if(typeof str !== "string")
    {
        return false;
    }

    str = str.trim();
    if(str.length >= 3)
    {
        return str.startsWith("<") && str.endsWith(">");
    }

    return false;
}

function isLiteral(str)
{
	if(typeof str !== "string")
    {
        return false;
    }

	if(str.startsWith("\""))
	{
		return true;
	}

    return false;
}

function getIdFromResource(uri)
{
    if(isUri(uri))
    {
        if(uri === hk.BODY_URI)
        {
            return null;
        }
        else if(uri.startsWith(`<${Constants.HK_ID_PREFIX}`))
        {
            let id = uri.slice(HKProtocolLength + 2, -1); // +2 for '<' and '/'; -1 for '>'

            if(id !== "null")
            {
                return decodeURIComponent(id);
            }
            else
            {
                return null;
            }
        }
		else if(uri.startsWith(`<${Constants.HK_BLANK_NODE_PREFIX}`))
        {
            let id = uri.slice(BlankIdProtocolLength + 2, -1);

            return `_:${id}`;
        }
    }
    return uri;
}

function generateResourceFromId(id)
{  
    if(id)
    {
        return `${Constants.HK_ID_PREFIX}/${encodeURIComponent(id)}`;
    }
    return Constants.HK_NULL;
}

// THis code follows this EBNF

//literal	                ::=	STRING_LITERAL_QUOTE ('^^' IRIREF | LANGTAG)?
// STRING_LITERAL_QUOTE     ::= '"' ([^#x22#x5C#xA#xD] | ECHAR | UCHAR)* '"'
// LANGTAG                  ::= '@' [a-zA-Z]+ ('-' [a-zA-Z0-9]+)*
// IRIREF                   ::= '<' ([^#x00-#x20<>"{}|^\`\] | UCHAR)* '>'
// HEX	                    ::=  	[0-9] | [A-F] | [a-f]
// ECHAR	                ::=  	'\\' [tbnrf\\"']
// UCHAR                    ::= '\u' HEX HEX HEX HEX | '\U' HEX HEX HEX HEX HEX HEX HEX HEX
// 
// The main motivation to implement like this is to make it fast without complicated regex

function adHocGetType(input)
{

    let out = {value: null, type: null, lang: null};

    try
    {
        if(typeof input !== "string")
        {
            input = String(input);
        }

        if(input.startsWith(`"`))
        {
            let uriIdx = -1;
            
            let length = input.length;
            if(input.endsWith(">"))
            {
                for(let i = length - 1; i >= 2 ; i--)
                {
                    if(input[i] === "<" )
                    {
                        if(input[i -1] == "^" && input[i-2] == "^" && input[i-3] === "\"")
                        {
                            uriIdx = i;
                            break;
                        }
                    }
                }

                if(uriIdx >= 0)
                {
                    out.type = input.substr(uriIdx, input.length - uriIdx);
                    out.value = input.substr(1, uriIdx - 4);
                    return out;
                }
                
                return null;
            }
            else // probably Lang literal
            {
                for(let i = length - 1; i >= 2 ; i--)
                {
                    if(input[i] === "@" )
                    {
                        if(input[i -1] == "\"" )
                        {
                            uriIdx = i;
                            break;
                        }
                    }
                }

                if(uriIdx >= 0)
                {
                    out.lang = input.substr(uriIdx+1, input.length - uriIdx);
                    out.value = input.substr(1, uriIdx - 2);
                    return out;
                }
            }

            if(input.startsWith("\"") && input.endsWith("\""))
            {
                out.value = input.substr(1, input.length - 2);
                return out;
            }
        }
    }
    catch(exp)
    {
        console.error(exp);
    }

    return null;
}

function getValueFromLiteral(literal, typeInfo = {}, convert = false)
{
    let parsedLiteral = adHocGetType(literal);

	typeInfo = typeInfo || {}; // in case of

    let value = null;
    if(parsedLiteral)
    {
        typeInfo.type = parsedLiteral.type;
        typeInfo.lang = parsedLiteral.lang;

		value = parsedLiteral.value;
		if(convert)
		{
			if (NUMBER_DATATYPES.has(typeInfo.type))
			{
				let numberValue = Number(value);
				if (!isNaN(numberValue))
				{
					value = numberValue;
				}
			}
			else if (typeInfo.type === xml.BOOLEAN_URI)
			{
				if (value === "false")
				{
					value = false;
				}
				else if(value === "true")
				{
					value = true
				}
			}
		}

        return value;
    }
    else if(!isUriOrBlankNode(literal)) 
    {
        value = literal;
    }

    return value;
}

function getLabelFromUri(uri)
{
    if(typeof uri !== "string")
    {
        return "";
    }
    if(!uri || uri.length == 0)
    {
        return "";
    }
    let last = uri[uri.length-1] === ">" ? uri.length-1 : uri.length;
    let first = last;

    while(first > 0 && uri[first-1] !== "#" && uri[first-1] !== "/" && uri[first-1] !== "<")
    {
        first--;
    }

    let out = uri.substr(first, last - first);
    if(out && out.length > 0)
    {
        return out;
    }
    else
    {
        if(uri.startsWith("<") && uri.endsWith(">"))
        {
            return uri.substr(1, uri.length -2);
        }
        else
        {
            return uri;
        }
    }
}

function getTitleFromProperty(properties, key)
{
    if(!properties.hasOwnProperty(key))
    {
        return null;
    }

    let v = properties[key];
    
    if(Array.isArray(v))
    {
        if(v.length > 0)
        {
            return getValueFromLiteral(v[0]) || v[0];
        }
        else
        {
            return null;
        }
    }
    else
    {
        return getValueFromLiteral(v) || v;
    }
}


function getTitlesByLanguageFromProperty(properties, key)
{
    if(!properties.hasOwnProperty(key))
    {
        return null;
    }

    let value = properties[key];
   
    const titlesByLanguage = {};
    
    if(Array.isArray(value))
    {
        for(let i = 0; i < value.length; i++)
        {
            const titleInfo = {lang: null};
            const title = getValueFromLiteral(value[i], titleInfo) || value[i];
            const titleLanguage = titleInfo.lang || 'unknown';
            if(!titlesByLanguage.hasOwnProperty(titleLanguage))
            {
                titlesByLanguage[titleLanguage] = [];
            }
            titlesByLanguage[titleLanguage].push(title);
        }
    }
    else
    {
        const titleInfo = {lang: null};
        const title = getValueFromLiteral(value, titleInfo) || value;
        const titleLanguage = titleInfo.lang || 'unknown';
        titlesByLanguage[titleLanguage] = [title];
    }

    return titlesByLanguage;
}

function getEntityTitle(entity, languagePreference = null)
{
    if(entity.properties)
    {
    
        // fetch all available titles
        const orderedLangs = languagePreference || ['en', 'es'];
        const titlesByLang = {
            'en': [],
            'es': []
        };
        for(let i = 0; i < LIST_OF_PROPERTIES.length; i++)
        {
            const titlesByLangFromProperty = getTitlesByLanguageFromProperty(entity.properties, LIST_OF_PROPERTIES[i]);
            
            // handle title as a dictionary of titles by language
            if(titlesByLangFromProperty != null)
            {
                for(const titleLang in titlesByLangFromProperty)
                {
                    if(!titlesByLang.hasOwnProperty(titleLang))
                    {
                        titlesByLang[titleLang] = [];
                        orderedLangs.push(titleLang)
                    }
                    titlesByLang[titleLang] = titlesByLang[titleLang].concat(titlesByLangFromProperty[titleLang]);
                }   
            }
        }

        // Retrieve the first valid title following languange preference order
        for(let i = 0; i < orderedLangs.length; i++)
        {
            const titles = titlesByLang[orderedLangs[i]];
            for(let j = 0; j < titles.length; j++)
            {
                const title = titles[j];
                if(!isUriOrBlankNode(title))
                {
                    return title;
                }
            }   
        }

        // retrieves null if no titles were found
        return null;
    }

    if(entity.type === HKTypes.REFERENCE)
    {
        return getLabelFromUri(entity.ref);
    }
    else
    {
        return getLabelFromUri(entity.id);
    }
}


function getTypeIfNumberOrBoolean(value)
{
    if(typeof value === "number")
    {
		return Number.isInteger(value) ? xml.INTEGER_URI : xml.DOUBLE_URI;
    }
	else if(typeof value === "boolean")
	{
		return xml.BOOLEAN_URI;
	}
    return null;
}

function createLiteralObject(value, lang, type)
{
	if(!type && !lang)
	{
		// src: N3.js@1.2.0
		switch (typeof value) 
		{
      		// Convert a boolean
			case 'boolean':
				type = xml.BOOLEAN_URI;
			break;
			// Convert an integer or double

			case 'number':
				if (Number.isFinite(value)) 
				{
					type = Number.isInteger(value) ? xml.INTEGER_URI : xml.DOUBLE_URI;
				}
				else 
				{
					type = xml.DOUBLE_URI;
					if (!Number.isNaN(value)) 
					{
						value = value > 0 ? 'INF' : '-INF';
					}
				}
			break;
		}
	}
	return {value: value, lang: lang || null, type: type || null};
}

function createLiteral(value, lang, type)
{
	if(typeof value === "object")
	{
		return createLiteral(value.value, value.lang, value.type);
	}
	else
	{
		if(lang)
		{
			return `"${value}"@${lang}`;
		}
		else if(type)
		{
			return `"${value}"^^${type}`;
		}
		else
		{
			return `"${value}"`;
		}
	}
}

function createRefUri(id, parent)
{
	let hash = new MD5().update(`${encodeURIComponent(parent)}/${encodeURIComponent(id)}`).digest("hex");
	return `<${Constants.HK_REFERENCE_PREFIX}/${hash}>`;
}

function createBlankNodeUri(id)
{
	return `<${Constants.HK_BLANK_NODE_PREFIX}/${id}>`;
}

function createSpoUri(s, p, o, g = "")
{
	let hash = new MD5().update(`${s}${p}${o}${g}`).digest("hex");
	return `<${Constants.HK_LINK_PREFIX}/${hash}>`;
}

exports.createLiteralObject = createLiteralObject;
exports.createRefUri = createRefUri;
exports.createSpoUri = createSpoUri;
exports.createLiteral = createLiteral;
exports.getTypeIfNumberOrBoolean = getTypeIfNumberOrBoolean;
exports.generateResourceFromId = generateResourceFromId;
exports.getIdFromResource = getIdFromResource; 
exports.getValueFromLiteral = getValueFromLiteral;
exports.getEntityTitle = getEntityTitle;
exports.getLabelFromUri = getLabelFromUri;
exports.isLiteral = isLiteral;
exports.isUri = isUri;
exports.isBlankNode = isBlankNode;
exports.createBlankNodeUri = createBlankNodeUri;
exports.isUriOrBlankNode = isUriOrBlankNode;