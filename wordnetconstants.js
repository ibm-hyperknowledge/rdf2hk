/*
 * Copyright (c) 2016-present, IBM Research
 * Licensed under The MIT License [see LICENSE for details]
 */
'use strict';


const ontolex = 'http://www.w3.org/ns/lemon/ontolex#';
const dc =  'http://purl.org/dc/terms/';
const ili = 'http://ili.globalwordnet.org/ili/';
const lime = 'http://www.w3.org/ns/lemon/lime#';
const owl = 'http://www.w3.org/2002/07/owl#';
const rdfs = 'http://www.w3.org/2000/01/rdf-schema#';
const schema = 'http://schema.org/'
const skos = 'http://www.w3.org/2004/02/skos/core#';
const synsem = 'http://www.w3.org/ns/lemon/synsem#';
const wn = 'http://wordnet-rdf.princeton.edu/ontology#'; 
const wordnetlicense = 'http://wordnet.princeton.edu/wordnet/license/';
const pwnlemma = 'http://wordnet-rdf.princeton.edu/rdf/lemma/';

const wn30Root = '<http://wordnet.princeton.edu/>';
const wn30Schema = 'https://w3id.org/own-pt/wn30/schema/';

exports.LEXICAL_SENSE_URI= `<${ontolex}LexicalSense>`;
exports.LEXICAL_ENTRY_URI= `<${ontolex}LexicalEntry>`;
exports.LEXICAL_CONCEPT_URI= `<${ontolex}LexicalConcept>`;

// Predicades
exports.IS_LEXICALIZED_SENSE_OF_URI = `<${ontolex}isLexicalizedSenseOf>`;
exports.SENSE_URI = `<${ontolex}sense>`;
exports.PART_OF_SPEECH_URI = `<${wn}partOfSpeech>`;
exports.HYPERNYM_URI = `<${wn}hypernym>`;
exports.HYPONYM_URI = `<${wn}hyponym>`;
exports.INSTANCE_HYPONYM_URI = `<${wn}instance_hyponym>`;
exports.MERO_PART_URI = `<${wn}mero_part>`;
exports.MERO_SUBSTANCE_URI = `<${wn}mero_substance>`;
exports.HOLO_MEMBER_URI = `<${wn}holo_member>`;
exports.HOLO_SUBSTANCE_URI = `<${wn}holo_substance>`;
exports.DERIVATION_URI = `<${wn}derivation>`;

exports.DEFINITION_VALUE_URI = `<${wn}definition>`;

const WN30_ROOT = wn30Root;
const WORD = `<${wn30Schema}Word>`;
const NOUN_SYNSET = `<${wn30Schema}NounSynset>`;
const ADJECTIVE_SATELLITE_SYNSET = `<${wn30Schema}AdjectiveSatelliteSynset>`;
const ADJECTIVE_SYNSET = `<${wn30Schema}AdjectiveSynset>`;
const VERB_SYNSET = `<${wn30Schema}VerbSynset>`;
const ADVERB_SYNSET = `<${wn30Schema}AdverbSynset>`;
const CORE_CONCEPT = `<${wn30Schema}CoreConcept>`;
const WORD_SENSE = `<${wn30Schema}WordSense>`;
const NOUN_WORD_SENSE = `<${wn30Schema}NounWordSense>`;
const VERB_WORD_SENSE = `<${wn30Schema}VerbWordSense>`;
const ADJECTIVE_WORD_SENSE = `<${wn30Schema}AdjectiveWordSense>`;
const ADJECTIVE_SATELLITE_WORD_SENSE = `<${wn30Schema}AdjectiveSatelliteWordSense>`;
const ADVERB_WORD_SENSE = `<${wn30Schema}AdverbWordSense>`;
const BASE_CONCEPT = `<${wn30Schema}BaseConcept>`;
const CONCEPT_SCHEMA = `<${skos}ConceptScheme>`;


const WORD_PREDICADE = `<${wn30Schema}word>`;
const CONTAINS_WORD_SENSE = `<${wn30Schema}containsWordSense>`;
const LEXICAL_FORM = `<${wn30Schema}lexicalForm>`;
const WORD_NUMBER = `<${wn30Schema}wordNumber>`;
const LEXICOGRAPHER_FILE = `<${wn30Schema}lexicographerFile>`;
const GLOSS = `<${wn30Schema}gloss>`;
const SYNSET_ID = `<${wn30Schema}synsetId>`;
const LEMMA = `<${wn30Schema}lemma>`;
const TAG_COUNT = `<${wn30Schema}tagCount>`;
const SENSE_KEY = `<${wn30Schema}senseKey>`;
const SENSE_NUMBER = `<${wn30Schema}senseNumber>`;
const LEXICAL_ID = `<${wn30Schema}lexicalId>`;
const DERIVATIONAL_RELATED = `<${wn30Schema}derivationallyRelated>`;
const ADJECTVE_PERTAINS_TO = `<${wn30Schema}adjectivePertainsTo>`;


exports.WN30 = {
	WN30_ROOT,
	WORD,
	NOUN_SYNSET,
	ADJECTIVE_SATELLITE_SYNSET,
	ADJECTIVE_SYNSET,
	VERB_SYNSET,
	ADVERB_SYNSET,
	CORE_CONCEPT,
	WORD_SENSE,
	NOUN_WORD_SENSE,
	VERB_WORD_SENSE,
	ADJECTIVE_WORD_SENSE,
	ADJECTIVE_SATELLITE_WORD_SENSE,
	ADVERB_WORD_SENSE,
	WORD_PREDICADE,
	CONTAINS_WORD_SENSE,
	BASE_CONCEPT,
	DERIVATIONAL_RELATED,
	CONCEPT_SCHEMA,
	LEXICAL_FORM,
	WORD_NUMBER,
	LEXICOGRAPHER_FILE,
	GLOSS,
	SYNSET_ID,
	LEMMA,
	TAG_COUNT,
	SENSE_KEY,
	SENSE_NUMBER,
	LEXICAL_ID,
	ADJECTVE_PERTAINS_TO
}

exports.WN30_SYNSET_TYPES = [
	NOUN_SYNSET,
	ADJECTIVE_SATELLITE_SYNSET,
	ADJECTIVE_SYNSET,
	VERB_SYNSET,
	ADVERB_SYNSET
]


exports.WN30_OBJECTS = [
	WN30_ROOT,
	WORD,
	NOUN_SYNSET,
	ADJECTIVE_SATELLITE_SYNSET,
	ADJECTIVE_SYNSET,
	VERB_SYNSET,
	ADVERB_SYNSET,
	CORE_CONCEPT,
	WORD_SENSE,
	NOUN_WORD_SENSE,
	VERB_WORD_SENSE,
	ADJECTIVE_WORD_SENSE,
	ADJECTIVE_SATELLITE_WORD_SENSE,
	ADVERB_WORD_SENSE,
	BASE_CONCEPT,
	CONCEPT_SCHEMA
];

exports.W30_PREDICATES = [
	WORD_PREDICADE,
	CONTAINS_WORD_SENSE,
	LEXICAL_FORM,
	WORD_NUMBER,
	LEXICOGRAPHER_FILE,
	GLOSS,
	SYNSET_ID,
	LEMMA,
	TAG_COUNT,
	SENSE_KEY,
	SENSE_NUMBER,
	LEXICAL_ID,
	DERIVATIONAL_RELATED,
	ADJECTVE_PERTAINS_TO
];