import { getAWSAccount, getRegion } from "./utils";

describe("utils", () => {
  describe("getRegion", () => {
    it("returns AWS Region name in env", () => {
      const actual = getRegion();
      const expected = "us-east-1";
      expect(actual).toBe(expected);
    });
  });
  describe("getAWSAccount", () => {
    it("returns AWS Account in env", () => {
      const actual = getAWSAccount({
        callbackWaitsForEmptyEventLoop: true,
        succeed: () => {},
        fail: () => {},
        done: () => {},
        functionVersion: "$LATEST",
        functionName: "LambdaFunction",
        memoryLimitInMB: "128",
        logGroupName: "/aws/lambda/LambdaFunction",
        logStreamName: "2022/04/04/[$LATEST]7ce0e06c6ea94c919b47407a98434511",
        clientContext: undefined,
        identity: undefined,
        invokedFunctionArn:
          "arn:aws:lambda:us-east-1:123456789012:function:LambdaFunction",
        awsRequestId: "c8e06ace-6bdf-4a17-ac60-8247e63e6d4e",
        getRemainingTimeInMillis: () => 1,
      });
      const expected = "123456789012";
      expect(actual).toBe(expected);
    });
  });
});
