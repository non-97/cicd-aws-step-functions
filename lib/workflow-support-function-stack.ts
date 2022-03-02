import { Construct } from "constructs";
import {
  Stack,
  StackProps,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_lambda_nodejs as nodejs,
  aws_logs as logs,
} from "aws-cdk-lib";

export class WorkflowSupportFunctionStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Lambda function to check if a StateMachine was executed on the same day
    new nodejs.NodejsFunction(this, "SameDayExecutionHistoryCheckFunction", {
      entry: "src/lambda/functions/same-day-execution-history-check.ts",
      runtime: lambda.Runtime.NODEJS_14_X,
      bundling: {
        minify: true,
        sourceMap: true,
      },
      environment: {
        UTC_OFFSET: "9",
        BASE_LOCAL_TIME: "07:30",
        REGION: this.region,
        NODE_OPTIONS: "--enable-source-maps",
      },
      role: new iam.Role(
        this,
        "SameDayExecutionHistoryCheckFunctionLambdaIamRole",
        {
          assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
          managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName(
              "service-role/AWSLambdaBasicExecutionRole"
            ),
            new iam.ManagedPolicy(this, "ListExecutionsIamPolicy", {
              statements: [
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: ["states:ListExecutions"],
                  resources: [
                    `arn:aws:states:${this.region}:${this.account}:stateMachine:*`,
                  ],
                }),
              ],
            }),
          ],
        }
      ),
      logRetention: logs.RetentionDays.TWO_WEEKS,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Lambda function to calculate the waiting time until a specified time
    new nodejs.NodejsFunction(
      this,
      "CalculateWaitingTimeForTargetTimeFunction",
      {
        entry: "src/lambda/functions/calculate-waiting-time-for-target-time.ts",
        runtime: lambda.Runtime.NODEJS_14_X,
        bundling: {
          minify: true,
          sourceMap: true,
        },
        environment: {
          UTC_OFFSET: "9",
          BASE_LOCAL_TIME: "07:30",
          NODE_OPTIONS: "--enable-source-maps",
        },
        role: new iam.Role(
          this,
          "CalculateWaitingTimeForTargetTimeFunctionLambdaIamRole",
          {
            assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
            managedPolicies: [
              iam.ManagedPolicy.fromAwsManagedPolicyName(
                "service-role/AWSLambdaBasicExecutionRole"
              ),
            ],
          }
        ),
        logRetention: logs.RetentionDays.TWO_WEEKS,
        tracing: lambda.Tracing.ACTIVE,
      }
    );
  }
}
