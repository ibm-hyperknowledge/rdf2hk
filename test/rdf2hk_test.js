"use strict";

const mocha = require("mocha");
const expect = require("chai").expect;

const fs = require("fs");
const path = require("path");

const { NODE, LINK, CONTEXT, CONNECTOR, TRAIL, VIRTUAL_CONTEXT } = require("hklib").Types;

const { promisify } = require("util");

const Parser = require("../parser");

const GraphFactory = require("../graphfactory");
const Constants = require("../constants");

const DEFAULT_OPTIONS = {
	createContext: true,
	setNodeContext: true,
	convertHK: true,
	convertNumber: true,
	compressReification: true,
	skipRefNodes: true,
	inverseRefNode: true,
	reifyArray: false,
	textLiteralAsNode: false,
	textLiteralAsNodeEncoding: 'property',
	defaultGraph: `<${Constants.HK_NULL}>`
};
const mimeType = "application/trig";

const filePath = "./data/people_from_jf.ttl";
let hkEntities;
let types;
let graph;

const util = require("./common");

const HKDatasource = util.preamble();

describe("Transforming RDF to HK", () => {	
	before(`Reading ${filePath} about Humans born in Juiz de Fora from Wikidata`, async () => {
		try
		{
			/**
			 * 
			 *  # Wikidata SPARQL Query
					# Humans born in Juiz de Fora with limit 10
					CONSTRUCT
					{
						?person ?instance wd:Q5;
										?placeOfBirth wd:Q193019;
										rdfs:label ?itemLabel .
						wd:Q5 rdfs:label ?humanItemLabel .
						wd:Q193019 rdfs:label ?cityLabel .
					}
					WHERE
					{
						BIND (wdt:P31 as ?instance)
						BIND (wdt:P19 as ?placeOfBirth)
						?person ?instance wd:Q5;
										wdt:P19 wd:Q193019;
										rdfs:label ?itemLabel .
						wd:Q5 rdfs:label ?humanItemLabel .
						wd:Q193019 rdfs:label ?cityLabel .
						FILTER(LANG(?itemLabel) = "pt")
						FILTER(LANG(?humanItemLabel) = "pt")
						FILTER(LANG(?cityLabel) = "pt")
					}

					ORDER BY ASC(?itemLabel)

					LIMIT 10
			*/
			let rdf = fs.readFileSync(path.resolve(__dirname, filePath), "utf-8");
			graph = await promisify(GraphFactory.parseGraph)(rdf, mimeType);	
		}
		catch(err)
		{
			throw err
		}
	});

	describe("Number of", () => 
	{	
		before("Parsing", ()=>{
			hkEntities = Parser.parseGraph(graph, DEFAULT_OPTIONS);
		});

		it("#entities", () => {
			// Number of entities
			expect(Object.keys(hkEntities).length).to.be.equal(34);
		});		

		let types = { [NODE]: 12, [LINK]: 20, [CONTEXT]: 0 };
		Object.entries(types).forEach ( entry => {
			const [type, number] = entry;
			it(`#entities by type ${type}`, () =>{
				let onlyValues = Object.values(hkEntities);
				const numbers = onlyValues.reduce((acc, cur) => cur.type === type ? ++acc : acc, 0);
				expect(numbers).to.be.equal(number);
			});
		});					
	});

	describe("Custom import", () => 
	{
		beforeEach("Creating context using the <http://www.wikidata.org/prop/direct/P19> relation", ()=> {
			//Register custom parser
			Parser.registerParser(require("../customhkparser"));

			let customParserDict = {
				"contextualize": [
					{ 
						p: "<http://www.wikidata.org/prop/direct/P19>", 
						allowReference: true
					} 
				]
			}

			let options = Object.assign(DEFAULT_OPTIONS, { customRdfParser: true, hierarchyConnectorIds: ["<http://www.wikidata.org/prop/direct/P31>"] })

			hkEntities = Parser.parseGraph(graph, options, customParserDict);

		});

		it("", ()=> {

			let onlyValues = Object.values(hkEntities);

			console.log(JSON.stringify(onlyValues));
			
			const numbers = onlyValues.reduce((acc, cur) => cur.type === CONTEXT ? ++acc : acc, 0);
			expect(numbers).to.be.equal(1);
		});
	});

	describe("Custom import", () => 
	{
		beforeEach("Parsing", ()=> {
			//Register custom parser
			Parser.registerParser(require("../customhkparser"));

			let customParserDict = {
				"contextualize": [
					{
						p: "<http://www.wikidata.org/prop/direct/P19>", 
						allowReference: false
					} 
				]
			}

			let options = Object.assign(DEFAULT_OPTIONS, { customRdfParser: true, hierarchyConnectorIds: ["<http://www.wikidata.org/prop/direct/P31>"] })

			hkEntities = Parser.parseGraph(graph, options, customParserDict);

		});

		it("", ()=> {

			let onlyValues = Object.values(hkEntities);
			
			const numbers = onlyValues.reduce((acc, cur) => cur.type === CONTEXT ? ++acc : acc, 0);
			expect(numbers).to.be.equal(1);
		});
	});
});