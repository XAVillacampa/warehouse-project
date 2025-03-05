const concurrently = require("concurrently");
const path = require("path");

const frontendPath = path.resolve(__dirname, "frontend");
const backendPath = path.resolve(__dirname, "backend");

concurrently([
  {
    name: "frontend",
    command: `cd ${frontendPath} && npm run dev`,
  },
  {
    name: "backend",
    command: `cd ${backendPath} && npm run dev`,
  },
]);
