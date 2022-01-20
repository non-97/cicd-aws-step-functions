import { Construct } from "constructs";
import {
  Stack,
  StackProps,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_lambda_nodejs as nodejs,
} from "aws-cdk-lib";

export class NoticeEventsFunctionStack extends Stack {
  public readonly noticePullRequestEventsFunction: nodejs.NodejsFunction;
  public readonly noticeCodeBuildEventsFunction: nodejs.NodejsFunction;
  public readonly noticeExecuteStateMachineEventsFunction: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Lambda function
    this.noticePullRequestEventsFunction = new nodejs.NodejsFunction(
      this,
      "NoticePullRequestEventsFunction",
      {
        entry: "src/lambda/functions/notice-pull-request-events.ts",
        runtime: lambda.Runtime.NODEJS_14_X,
        bundling: {
          minify: true,
        },
        environment: {
          REGION: this.region,
        },
        role: new iam.Role(this, "NoticePullRequestEventsFunctionIamRole", {
          assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
          managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName(
              "service-role/AWSLambdaBasicExecutionRole"
            ),
            new iam.ManagedPolicy(
              this,
              "NoticePullRequestEventsFunctionIamPolicy",
              {
                statements: [
                  new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                      "codecommit:GetPullRequest",
                      "codecommit:GetCommentsForPullRequest",
                    ],
                    resources: [
                      `arn:aws:codecommit:${this.region}:${this.account}:*`,
                    ],
                  }),
                ],
              }
            ),
          ],
        }),
      }
    );

    this.noticeCodeBuildEventsFunction = new nodejs.NodejsFunction(
      this,
      "NoticeCodeBuildEventsFunction",
      {
        entry: "src/lambda/functions/notice-codebuild-events.ts",
        runtime: lambda.Runtime.NODEJS_14_X,
        bundling: {
          minify: true,
        },
        environment: {
          REGION: this.region,
          ACCOUNT: this.account,
        },
        role: new iam.Role(this, "NoticeCodeBuildEventsFunctionIamRole", {
          assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
          managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName(
              "service-role/AWSLambdaBasicExecutionRole"
            ),
          ],
        }),
      }
    );

    this.noticeExecuteStateMachineEventsFunction = new nodejs.NodejsFunction(
      this,
      "NoticeExecuteStateMachineEventsFunction",
      {
        entry: "src/lambda/functions/notice-execute-statemachine-events.ts",
        runtime: lambda.Runtime.NODEJS_14_X,
        bundling: {
          minify: true,
        },
        environment: {
          UTC_OFFSET: "9",
          REGION: this.region,
        },
        role: new iam.Role(
          this,
          "NoticeExecuteStateMachineEventsFunctionIamRole",
          {
            assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
            managedPolicies: [
              iam.ManagedPolicy.fromAwsManagedPolicyName(
                "service-role/AWSLambdaBasicExecutionRole"
              ),
            ],
          }
        ),
      }
    );
  }
}
