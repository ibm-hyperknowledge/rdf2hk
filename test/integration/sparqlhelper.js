"use strict";

const mocha = require("mocha");
const expect = require("chai").expect;

const SparqlHelper = require("../../sparqlhelper");


describe("Testing sparqlHelper functions", () => {

	it("Set from clause in a query", done => {

		const query = `SELECT ?x WHERE { ?x ?y ?z. }`;

    let newQuery = SparqlHelper.setNamedGraphFilter(query, "hk://id/TBox");

    const expectedQuery = "SELECT ?x FROM <hk://id/TBox> WHERE { ?x ?y ?z. }" 

		newQuery = newQuery.replace(/(\r\n|\n|\r)/gm, " ")
		expect(newQuery.toLowerCase()).to.be.equal(expectedQuery.toLowerCase().trim())
		done();
	});
});