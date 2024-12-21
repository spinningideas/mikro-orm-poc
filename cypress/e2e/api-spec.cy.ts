/// <reference types="cypress" />

const baseUrl = "http://localhost:5001";

describe("API Testing", function () {
  it("API - GET ALL continents", () => {
    cy.request({
      method: "GET",
      url: baseUrl + "/continents",
      failOnStatusCode: false,
    }).as("details");
    cy.get("@details").its("status").should("eq", 200);
    cy.get("@details").then((response) => {
      cy.log(JSON.stringify(response.body as unknown));
    });
  });

  it("API - GET countries in North America", () => {
    cy.request({
      method: "GET",
      url: baseUrl + "/countries/NA",
      failOnStatusCode: false,
    }).as("details");
    cy.get("@details").its("status").should("eq", 200);
    cy.get("@details").then((response) => {
      cy.log(JSON.stringify(response.body as unknown));
    });
  });

  it("API - GET countries in North America Paged - First page sorted by countryName DESC", () => {
    cy.request({
      method: "GET",
      url: baseUrl + "/countries/NA/1/10/countryName/DESC",
      failOnStatusCode: false,
    }).as("details");
    cy.get("@details").its("status").should("eq", 200);
    cy.get("@details").then((response) => {
      cy.log(JSON.stringify(response.body as unknown));
    });
  });

  it("API - GET countries in North America Paged - First page sorted by countryName ASC", () => {
    cy.request({
      method: "GET",
      url: baseUrl + "/countries/NA/1/10/countryName/ASC",
      failOnStatusCode: false,
    }).as("details");
    cy.get("@details").its("status").should("eq", 200);
    cy.get("@details").then((response) => {
      cy.log(JSON.stringify(response.body as unknown));
    });
  });
});
