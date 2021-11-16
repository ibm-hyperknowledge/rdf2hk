"use strict";

const mocha = require("mocha");
const expect = require("chai").expect;

const sparqljs = require("sparqljs")

const parser = new sparqljs.Parser();
const generator = new sparqljs.Generator;


describe("Testing sparqljs features", () => {

	it("Parsing and Unparsing", done => {

		const query = `SELECT ?x where { ?x ?y ?z. } group by ?x`;
		let parsedQuery = parser.parse(query);

		let generatedQuery = generator.stringify(parsedQuery);

		generatedQuery = generatedQuery.replace(/(\r\n|\n|\r)/gm, " ")
		expect(generatedQuery.toLowerCase()).to.be.equal(query.toLowerCase().trim())
		done();
	});
});