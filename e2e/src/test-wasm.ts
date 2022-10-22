import { parse } from "@jsona/openapi";

const expectedResult = {
  value: {
    openapi: "3.0.0",
    info: { version: "0.1.0", title: "openapi" },
    paths: {},
    components: {}
  },
  errors: null
};
const actualResult = parse("{}");

const expectedJson = JSON.stringify(expectedResult);
const actualJson = JSON.stringify(actualResult);
if (actualJson !== expectedJson) {
  console.error(`
          Expected ${expectedJson}
          but got  ${actualJson}`);
}
