import { Construct } from "constructs";
import { Stack, StackProps, aws_iam as iam } from "aws-cdk-lib";

interface SamDeployRoleStackProps extends StackProps {
  deploymentControlAccount: string;
}

export class SamDeployRoleStack extends Stack {
  constructor(scope: Construct, id: string, props: SamDeployRoleStackProps) {
    super(scope, id, props);

    const createStateMachineStackIamPolicy = new iam.ManagedPolicy(
      this,
      "CreateStateMachineStackIamPolicy",
      {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [
              `arn:aws:states:${this.region}:${this.account}:stateMachine:*`,
            ],
            actions: [
              "states:CreateStateMachine",
              "states:DeleteStateMachine",
              "states:DescribeStateMachine",
              "states:UpdateStateMachine",
              "states:TagResource",
              "states:UntagResource",
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [
              `arn:aws:iam::${this.account}:role/*`,
              `arn:aws:iam::${this.account}:policy/*`,
            ],
            actions: [
              "iam:AttachRolePolicy",
              "iam:CreateRole",
              "iam:CreatePolicy",
              "iam:DeleteRole",
              "iam:DeleteRolePolicy",
              "iam:DetachRolePolicy",
              "iam:GetRole",
              "iam:GetRolePolicy",
              "iam:PassRole",
              "iam:PutRolePolicy",
              "iam:TagRole",
              "iam:UntagRole",
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [`arn:aws:kms:${this.region}:${this.account}:key/*`],
            actions: ["kms:Decrypt", "kms:GenerateDataKey"],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [`arn:aws:logs:*:${this.account}:log-group:*`],
            actions: [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:DeleteLogGroup",
              "logs:DescribeLogGroups",
              "logs:ListTagsLogGroup",
              "logs:PutRetentionPolicy",
              "logs:TagLogGroup",
              "logs:UntagLogGroup",
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [
              `arn:aws:cloudformation:${this.region}:${this.account}:stack/*`,
            ],
            actions: [
              "cloudformation:CreateChangeSet",
              "cloudformation:CreateStack",
              "cloudformation:DeleteStack",
              "cloudformation:DescribeChangeSet",
              "cloudformation:DescribeStackEvents",
              "cloudformation:DescribeStacks",
              "cloudformation:ExecuteChangeSet",
              "cloudformation:GetTemplate",
              "cloudformation:GetTemplateSummary",
              "cloudformation:ListStackResources",
              "cloudformation:UpdateStack",
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [`arn:aws:events:${this.region}:${this.account}:rule/*`],
            actions: [
              "events:DeleteRule",
              "events:DescribeRule",
              "events:PutTargets",
              "events:PutRule",
              "events:RemoveTargets",
              "events:TagResource",
              "events:UntagResource",
            ],
          }),
          new iam.PolicyStatement({
            actions: [
              "s3:GetObject*",
              "s3:GetBucket*",
              "s3:List*",
              "s3:DeleteObject*",
              "s3:PutObject",
              "s3:Abort*",
            ],
            resources: ["*"],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [
              `arn:aws:cloudformation:${this.region}:aws:transform/Serverless-2016-10-31`,
            ],
            actions: ["cloudformation:CreateChangeSet"],
          }),
        ],
      }
    );

    // IAM roles for the sam deploy
    new iam.Role(this, "SamDeployRole", {
      assumedBy: new iam.AccountPrincipal(props.deploymentControlAccount),
      managedPolicies: [createStateMachineStackIamPolicy],
    });
  }
}
