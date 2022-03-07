import { OriginalEventBase } from "../aws/event-bridge";
import {
  Field,
  SlackMessage,
  buildHeader,
  buildBody,
  postSlackMessage,
} from "../slack";
import { getRegion, getAWSAccount } from "../aws/utils";

// Ref: https://docs.aws.amazon.com/ja_jp/codebuild/latest/userguide/sample-build-notifications.html#sample-build-notifications-ref
interface CodeBuildOriginalEvent extends OriginalEventBase {
  detail: {
    "build-status": string;
    "project-name": string;
    "build-id": string;
    "additional-information": {
      artifact: {
        md5sum: string;
        sha256sum: string;
        location: string;
      };
      environment: {
        image: string;
        "privileged-mode": boolean;
        "compute-type": string;
        type: string;
        "environment-variables": string[];
      };
      "timeout-in-minutes": number;
      "build-complete": boolean;
      initiator: string;
      "build-start-time": string;
      source: {
        location: string;
        type: string;
      };
      logs: {
        "group-name": string;
        "stream-name": string;
        "deep-link": string;
      };
      phases: {
        "phase-context": string[];
        "start-time": string;
        "end-time": string;
        "duration-in-seconds": number;
        "phase-type": string;
        "phase-status": string;
      }[];
      "current-phase": string;
      "current-phase-context": string[];
      version: string;
    };
  };
}

interface HandlerParameters {
  originalEvent: CodeBuildOriginalEvent;
  slackWebhookUrls: string[];
}

interface Context {
  region: string;
  account: string;
}

export const handler = async (
  event: HandlerParameters,
  lambdaContext: AWSLambda.Context
): Promise<void | Error> => {
  console.log(`event : ${JSON.stringify(event, null, 2)}`);

  const context = {
    region: getRegion(),
    account: getAWSAccount(lambdaContext),
  };

  // Define Slack message
  const displayInfo = collectDisplayInfo(event, context);
  const header = buildHeader(
    `CodeBuild Build State has changed to ${event.originalEvent.detail["build-status"]}`
  );
  const fields = buildBody(displayInfo);
  const slackMessage: SlackMessage = {
    blocks: [
      header,
      {
        type: "divider",
      },
      fields,
    ],
  };
  console.log(`slackMessage : ${JSON.stringify(slackMessage, null, 2)}`);
  await sendMessageToAllSlackChannels(event, slackMessage);

  return;
};

const sendMessageToAllSlackChannels = async (
  event: HandlerParameters,
  slackMessage: SlackMessage
) => {
  // Send a message to the specified Slack webhook URL
  await Promise.all(
    event.slackWebhookUrls.map((slackWebhookUrl) =>
      postSlackMessage(slackWebhookUrl, slackMessage)
    )
  );
};

const collectDisplayInfo = (event: HandlerParameters, context: Context) => {
  // Name of the CodeBuild project
  const projectName = event.originalEvent.detail["project-name"];

  // Build ARN of CodeBuild
  // e.g. arn:aws:codebuild:us-east-1:123456789012:build/ProjectXX11223-W1omLb3AtUBB:e03db6f7-fec3-4851-b368-687b0ab51809
  const buildArn = event.originalEvent.detail["build-id"];

  // Build status of CodeBuild
  const buildStatus = event.originalEvent.detail["build-status"];

  // Build ID
  // e.g. ProjectXX11223-W1omLb3AtUBB:e03db6f7-fec3-4851-b368-687b0ab51809
  const buildId = buildArn.substring(buildArn.indexOf(projectName));

  // AWS Management Console URL
  const consoleUrl = `https://console.aws.amazon.com/codesuite/codebuild/${context.account}/projects/${projectName}/build/${buildId}?region=${context.region}`;

  return [
    {
      header: "AWS Management Console URL",
      body: consoleUrl,
    },
    {
      header: "Project Name",
      body: projectName,
    },
    {
      header: "Build ARN",
      body: buildId,
    },
    { header: "Build Status", body: buildStatus },
  ] as Field[];
};
