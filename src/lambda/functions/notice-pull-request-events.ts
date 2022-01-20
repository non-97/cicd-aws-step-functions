import {
  CodeCommitClient,
  GetPullRequestCommand,
  GetCommentsForPullRequestCommand,
} from "@aws-sdk/client-codecommit";
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

// Ref: https://docs.aws.amazon.com/ja_jp/codecommit/latest/userguide/monitoring-events.html#pullRequestCreated
// - commentOnPullRequestCreated Event
// - commentOnPullRequestUpdated Event
// - pullRequestCreated Event
// - pullRequestSourceBranchUpdated Event
// - pullRequestStatusChanged Event
// - pullRequestMergeStatusUpdated Event
// - pullRequestApprovalStateChanged Event

interface CommentOnPullRequestCreatedDetailEvent {
  afterCommitId: string;
  beforeCommitId: string;
  callerUserArn: string;
  commentId: string;
  displayName: string;
  emailAddress: string;
  event: string;
  inReplyTo: string;
  notificationBody: string;
  pullRequestId: string;
  repositoryId: string;
  repositoryName: string;
}

interface CommentOnPullRequestUpdatedDetailEvent {
  afterCommitId: string;
  beforeCommitId: string;
  callerUserArn: string;
  commentId: string;
  event: string;
  inReplyTo: string;
  notificationBody: string;
  pullRequestId: string;
  repositoryId: string;
  repositoryName: string;
}

interface PullRequestDetailEvent {
  author: string;
  callerUserArn: string;
  creationDate: string;
  description: string;
  destinationCommit: string;
  destinationReference: string;
  event: string;
  isMerged: string;
  lastModifiedDate: string;
  notificationBody: string;
  pullRequestId: string;
  pullRequestStatus: string;
  repositoryNames: string[];
  revisionId: string;
  sourceCommit: string;
  sourceReference: string;
  title: string;
}

interface PullRequestMergeStatusUpdatedDetailEvent {
  author: string;
  callerUserArn: string;
  creationDate: string;
  description: string;
  destinationCommit: string;
  destinationReference: string;
  event: string;
  isMerged: string;
  lastModifiedDate: string;
  mergeOption: string;
  notificationBody: string;
  pullRequestId: string;
  pullRequestStatus: string;
  repositoryNames: string[];
  revisionId: string;
  sourceCommit: string;
  sourceReference: string;
  title: string;
}

interface PullRequestApprovalStateChangedDetailEvent {
  approvalStatus: string;
  author: string;
  callerUserArn: string;
  creationDate: string;
  description: string;
  destinationCommit: string;
  destinationReference: string;
  event: string;
  isMerged: string;
  lastModifiedDate: string;
  notificationBody: string;
  pullRequestId: string;
  pullRequestStatus: string;
  repositoryNames: string[];
  revisionId: string;
  sourceCommit: string;
  sourceReference: string;
  title: string;
}

interface CodeCommitEvent {
  originalEvent: {
    version: string;
    id: string;
    "detail-type": string;
    source: string;
    account: string;
    time: string;
    region: string;
    resources: string[];
    detail:
      | CommentOnPullRequestCreatedDetailEvent
      | CommentOnPullRequestUpdatedDetailEvent
      | PullRequestDetailEvent
      | PullRequestMergeStatusUpdatedDetailEvent
      | PullRequestApprovalStateChangedDetailEvent;
  };
  noticeTargets: { [key: string]: string[] }[];
}

interface SlackMessgage {
  blocks: {
    type: string;
    block_id?: string;
    text?: { type: string; text: string };
    fields?: { type: string; text: string }[];
  }[];
}

// Number of characters limit for slack
// Ref: https://api.slack.com/reference/block-kit/blocks#section_fields
const characterLimit = 2000;

const requestSlack = async (
  slackWebhookUrl: string,
  slackMessage: SlackMessgage
) => {
  return new Promise<AxiosResponse | AxiosError>((resolve, reject) => {
    // Request parameters
    const options: AxiosRequestConfig = {
      url: slackWebhookUrl,
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      data: slackMessage,
    };

    // Request Slack
    axios(options)
      .then((response) => {
        console.log(
          `response data : ${JSON.stringify(response.data, null, 2)}`
        );
        resolve(response);
      })
      .catch((error) => {
        console.error(`response error : ${JSON.stringify(error, null, 2)}`);
        reject(error);
      });
  });
};

export const handler = async (
  event: CodeCommitEvent
): Promise<AxiosResponse | AxiosError | void> => {
  if (!process.env["REGION"]) {
    console.log(
      `The region name environment variable (REGION) is not specified.
      e.g. us-east-1`
    );
    return;
  }

  console.log(`event : ${JSON.stringify(event, null, 2)}`);

  const region: string = process.env["REGION"];

  const codeCommitclient = new CodeCommitClient({ region: region });

  const getPullRequestCommandOutput = await codeCommitclient.send(
    new GetPullRequestCommand({
      pullRequestId: event.originalEvent.detail.pullRequestId,
    })
  );

  const slackMessage: SlackMessgage = {
    blocks: [
      {
        type: "header",
        block_id: "header",
        text: {
          type: "plain_text",
          text: "",
        },
      },
      {
        type: "divider",
      },
      {
        type: "section",
        block_id: "fieldsSection",
        fields: new Array(),
      },
      {
        type: "section",
        block_id: "textSection",
        text: {
          type: "mrkdwn",
          text: "",
        },
      },
    ],
  };

  const headerIndex = slackMessage.blocks.findIndex(
    (block) => block.block_id === "header"
  );
  const fieldsSectionIndex = slackMessage.blocks.findIndex(
    (block) => block.block_id === "fieldsSection"
  );
  const textSectionIndex = slackMessage.blocks.findIndex(
    (block) => block.block_id === "textSection"
  );

  const repositoryName =
    "repositoryNames" in event.originalEvent.detail
      ? event.originalEvent.detail.repositoryNames.toString()
      : event.originalEvent.detail.repositoryName
      ? event.originalEvent.detail.repositoryName
      : "undifined";

  const notificationBody = event.originalEvent.detail.notificationBody;
  const callerUserArn = event.originalEvent.detail.callerUserArn;
  const destinationReference =
    getPullRequestCommandOutput.pullRequest?.pullRequestTargets?.find(
      (pullRequestTarget) => pullRequestTarget.destinationReference
    )?.destinationReference;
  const consoleUrl = notificationBody.substring(
    notificationBody.indexOf("https://")
  );

  slackMessage.blocks[fieldsSectionIndex].fields?.push({
    type: "mrkdwn",
    text: `*AWS Management Console URL:*\n${consoleUrl}`,
  });

  slackMessage.blocks[fieldsSectionIndex].fields?.push({
    type: "mrkdwn",
    text: `*Caller User ARN:*\n${callerUserArn}`,
  });

  slackMessage.blocks[
    textSectionIndex
  ].text!.text = `\`\`\`${notificationBody.substring(
    0,
    characterLimit - 1
  )}\`\`\``;

  slackMessage.blocks[fieldsSectionIndex].fields?.push({
    type: "mrkdwn",
    text: `*Pull Request ID:*\n${getPullRequestCommandOutput.pullRequest?.pullRequestId}`,
  });

  slackMessage.blocks[fieldsSectionIndex].fields?.push({
    type: "mrkdwn",
    text: `*Pull Request Title:*\n${getPullRequestCommandOutput.pullRequest?.title?.substring(
      0,
      characterLimit - 1
    )}`,
  });

  slackMessage.blocks[fieldsSectionIndex].fields?.push({
    type: "mrkdwn",
    text: `*Pull Request Status:*\n${getPullRequestCommandOutput.pullRequest?.pullRequestStatus}`,
  });

  slackMessage.blocks[fieldsSectionIndex].fields?.push({
    type: "mrkdwn",
    text: `*isMerged Status:*\n${
      getPullRequestCommandOutput.pullRequest?.pullRequestTargets?.find(
        (pullRequestTarget) => pullRequestTarget.mergeMetadata
      )?.mergeMetadata?.isMerged
    }`,
  });

  slackMessage.blocks[fieldsSectionIndex].fields?.push({
    type: "mrkdwn",
    text: `*Destination Reference:*\n${destinationReference?.substring(
      0,
      characterLimit - 1
    )}`,
  });

  slackMessage.blocks[fieldsSectionIndex].fields?.push({
    type: "mrkdwn",
    text: `*Source Reference:*\n${getPullRequestCommandOutput.pullRequest?.pullRequestTargets
      ?.find((pullRequestTarget) => pullRequestTarget.sourceReference)
      ?.sourceReference?.substring(0, characterLimit - 1)}`,
  });

  if ("commentId" in event.originalEvent.detail) {
    const getCommentsForPullRequestCommandOutput = await codeCommitclient.send(
      new GetCommentsForPullRequestCommand({
        pullRequestId: event.originalEvent.detail.pullRequestId,
      })
    );

    slackMessage.blocks[fieldsSectionIndex].fields?.push({
      type: "mrkdwn",
      text: `*File:*\n${getCommentsForPullRequestCommandOutput.commentsForPullRequestData
        ?.find((pullRequest) =>
          pullRequest.comments?.find(
            (comment) =>
              "commentId" in event.originalEvent.detail &&
              comment.commentId === event.originalEvent.detail.commentId
          )
        )
        ?.location?.filePath?.substring(0, characterLimit - 1)}`,
    });

    slackMessage.blocks[fieldsSectionIndex].fields?.push({
      type: "mrkdwn",
      text: `*Comment:*\n${getCommentsForPullRequestCommandOutput.commentsForPullRequestData
        ?.find((pullRequest) =>
          pullRequest.comments?.find(
            (comment) =>
              "commentId" in event.originalEvent.detail &&
              comment.commentId === event.originalEvent.detail.commentId
          )
        )
        ?.comments?.find(
          (comment) =>
            "commentId" in event.originalEvent.detail &&
            comment.commentId === event.originalEvent.detail.commentId
        )
        ?.content?.substring(0, characterLimit - 1)}`,
    });
  }

  if ("approvalStatus" in event.originalEvent.detail) {
    slackMessage.blocks[fieldsSectionIndex].fields?.push({
      type: "mrkdwn",
      text: `*Approval Status:*\n${event.originalEvent.detail.approvalStatus}`,
    });
  }

  switch (event.originalEvent.detail.event) {
    case "commentOnPullRequestCreated":
      slackMessage.blocks[
        headerIndex
      ].text!.text = `The pull request in the ${repositoryName} repository has been commented`;
      break;
    case "commentOnPullRequestUpdated":
      slackMessage.blocks[
        headerIndex
      ].text!.text = `The ${repositoryName} repository pull request comments has been updated`;
      break;
    case "pullRequestCreated":
      slackMessage.blocks[
        headerIndex
      ].text!.text = `The pull request has been created in the ${repositoryName} repository`;
      break;
    case "pullRequestSourceBranchUpdated":
      slackMessage.blocks[
        headerIndex
      ].text!.text = `The source branch of the pull request in the ${repositoryName} repository has been updated`;
      break;
    case "pullRequestStatusChanged":
      slackMessage.blocks[
        headerIndex
      ].text!.text = `The status of the ${repositoryName} repository pull request has changed`;
      break;
    case "pullRequestMergeStatusUpdated":
      slackMessage.blocks[
        headerIndex
      ].text!.text = `The merge status of the ${repositoryName} repository pull request has changed`;
      break;
    case "pullRequestApprovalStateChanged":
      slackMessage.blocks[
        headerIndex
      ].text!.text = `The approval status of the ${repositoryName} repository pull request has changed`;
      break;
  }

  console.log(`slackMessage : ${JSON.stringify(slackMessage, null, 2)}`);

  for (const [key, slackWebhookUrls] of Object.entries(
    event.noticeTargets.find(
      (noticeTarget) => destinationReference! in noticeTarget
    )!
  )) {
    for (const [index, slackWebhookUrl] of slackWebhookUrls.entries()) {
      await requestSlack(slackWebhookUrl, slackMessage);
    }
  }
};
