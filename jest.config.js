console.log("jest.config.ts");

module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  setupFiles: ["./setup.jest.ts"],
};
