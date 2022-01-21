#!/usr/bin/env node
import "source-map-support/register";
import "dotenv/config";
import * as cdk from "aws-cdk-lib";
import { Ec2InstancesStack } from "../lib/ec2-instances-stack";
import { SfnTemplateBucketStack } from "../lib/sfn-template-bucket-stack";
import { ArtifactBucketStack } from "../lib/artifact-bucket-stack";
import { RoleStack } from "../lib/role-stack";
import { EventBusStack } from "../lib/event-bus-stack";
import { NoticeEventsFunctionStack } from "../lib/notice-events-function-stack";
import { WorkflowSupportFunctionStack } from "../lib/workflow-support-function-stack";
import { CicdStack } from "../lib/cicd-stack";

const app = new cdk.App();

if (
  typeof process.env.APP_TEAM_WEBHOOK_URL == "undefined" ||
  typeof process.env.APP_TEAM_MANAGER_WEBHOOK_URL == "undefined" ||
  typeof process.env.INFRA_TEAM_WEBHOOK_URL == "undefined" ||
  typeof process.env.JUMP_ACCOUNT == "undefined"
) {
  console.error(`
    There is not enough input in the .env file.
    Please enter a value in the .env file.`);
  process.exit(1);
}

const appTeamWebhookUrl = process.env.APP_TEAM_WEBHOOK_URL;
const appTeamManagerWebhookUrl = process.env.APP_TEAM_MANAGER_WEBHOOK_URL;
const infraTeamWebhookUrl = process.env.INFRA_TEAM_WEBHOOK_URL;

const sfnTemplateBucketStack = new SfnTemplateBucketStack(
  app,
  "SfnTemplateBucketStack"
);
const artifactBucketStack = new ArtifactBucketStack(app, "ArtifactBucketStack");

// new Ec2InstancesStack(app, "Ec2InstancesStack");

const roleStack = new RoleStack(app, "RoleStack", {
  jumpAccount: process.env.JUMP_ACCOUNT,
});

new EventBusStack(app, "EventBusStack", {
  sourceAccounts: process.env.SOURCE_ACCOUNTS,
});

const noticeEventsFunctionStack = new NoticeEventsFunctionStack(
  app,
  "NoticeEventsFunctionStack"
);

new WorkflowSupportFunctionStack(app, "WorkflowSupportFunctionStack");

new CicdStack(app, "StateMachineTest001CicdStack", {
  stateMachineName: "StateMachineTest001",
  artifactBucket: artifactBucketStack.artifactBucket,
  sfnTemplateBucket: sfnTemplateBucketStack.sfnTemplateBucket,
  sfnTemplateBucketGitTemplateKey: "git-template.zip",
  sfnTemplateBucketSamTemplateKey: "sam-template.yml",
  appTeamWebhookUrl: appTeamWebhookUrl,
  appTeamManagerWebhookUrl: appTeamManagerWebhookUrl,
  infraTeamWebhookUrl: infraTeamWebhookUrl,
  mainBranchApprovalRuleTemplate: roleStack.mainBranchApprovalRuleTemplate,
  developBranchApprovalRuleTemplate:
    roleStack.developBranchApprovalRuleTemplate,
  noticePullRequestEventsFunction:
    noticeEventsFunctionStack.noticePullRequestEventsFunction,
  noticeCodeBuildEventsFunction:
    noticeEventsFunctionStack.noticeCodeBuildEventsFunction,
  noticeExecuteStateMachineEventsFunction:
    noticeEventsFunctionStack.noticeExecuteStateMachineEventsFunction,
});
