/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
'use strict';


const ontolex = 'http://www.w3.org/ns/lemon/ontolex#';
const dc =  'http://purl.org/dc/terms/';
const ili = 'http://ili.globalwordnet.org/ili/';
const lime = 'http://www.w3.org/ns/lemon/lime#';
const ontolex = 'http://www.w3.org/ns/lemon/ontolex#';
const owl = 'http://www.w3.org/2002/07/owl#';
const rdfs = 'http://www.w3.org/2000/01/rdf-schema#';
const schema = 'http://schema.org/'
const skos = 'http://www.w3.org/2004/02/skos/core#';
const synsem = 'http://www.w3.org/ns/lemon/synsem#';
const wn = 'http://wordnet-rdf.princeton.edu/ontology#'; 
const wordnetlicense = 'http://wordnet.princeton.edu/wordnet/license/';
const pwnlemma = 'http://wordnet-rdf.princeton.edu/rdf/lemma/';

export const LEXICAL_SENSE_URI= `<${ontolex}LexicalSense>`;
export const LEXICAL_ENTRY_URI= `<${ontolex}LexicalEntry>`;
export const LEXICAL_CONCEPT_URI= `<${ontolex}LexicalConcept>`;

// Predicades
export const IS_LEXICALIZED_SENSE_OF_URI = `<${ontolex}isLexicalizedSenseOf>`;
export const SENSE_URI = `<${ontolex}sense>`;
export const PART_OF_SPEECH_URI = `<${wn}partOfSpeech>`;
export const HYPERNYM_URI = `<${wn}hypernym>`;
export const HYPONYM_URI = `<${wn}hyponym>`;
export const INSTANCE_HYPONYM_URI = `<${wn}instance_hyponym>`;
export const MERO_PART_URI = `<${wn}mero_part>`;
export const MERO_SUBSTANCE_URI = `<${wn}mero_substance>`;
export const HOLO_MEMBER_URI = `<${wn}holo_member>`;
export const HOLO_SUBSTANCE_URI = `<${wn}holo_substance>`;
export const DERIVATION_URI = `<${wn}derivation>`;

export const DEFINITION_VALUE_URI = `<${wn}definition>`;


