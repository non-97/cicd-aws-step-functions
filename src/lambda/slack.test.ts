import { buildHeader, buildBody, postSlackMessage } from "./slack";
import mockAxios from "jest-mock-axios";

describe("slack", () => {
  describe("buildHeader", () => {
    it("return Slack Message Header", () => {
      const text = "testMessage";
      const actual = buildHeader(text);
      const expected = {
        type: "header",
        block_id: "header",
        text: {
          type: "plain_text",
          text,
        },
      };
      expect(actual).toEqual(expected);
    });
  });
  describe("buildBody", () => {
    it("return Slack Message Body", () => {
      const fields = [{ header: "testHeader", body: "testBody" }];
      const actual = buildBody(fields);
      const expected = {
        type: "section",
        block_id: "fieldsSection",
        fields: [
          {
            type: "mrkdwn",
            text: `*testHeader:*\ntestBody`,
          },
        ],
      };
      expect(actual).toEqual(expected);
    });
  });
  describe("postSlackMessage", () => {
    describe("When Succeed", () => {
      it("return AxiosResponse", async () => {
        const expected = { data: "hello" };
        const promise = postSlackMessage("http://localhost", {
          blocks: [buildHeader("testHeader")],
        });
        mockAxios.mockResponse(expected);
        const actual = await promise;
        expect(actual).toHaveProperty("status", 200);
        expect(actual).toHaveProperty("data", "hello");
      });
    });
  });
});
