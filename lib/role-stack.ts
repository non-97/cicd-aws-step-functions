import { Construct } from "constructs";
import {
  Stack,
  StackProps,
  aws_iam as iam,
  aws_logs as logs,
  custom_resources as cr,
} from "aws-cdk-lib";

interface RoleStackProps extends StackProps {
  jumpAccount: string;
}

export class RoleStack extends Stack {
  public readonly mainBranchApprovalRuleTemplate: cr.AwsCustomResource;
  public readonly developBranchApprovalRuleTemplate: cr.AwsCustomResource;

  constructor(scope: Construct, id: string, props: RoleStackProps) {
    super(scope, id, props);

    const denyPushMainAndDevelopBranchPolicy = new iam.ManagedPolicy(
      this,
      "DenyPushMainAndDevelopBranchPolicy",
      {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.DENY,
            actions: ["codecommit:PutFile", "codecommit:GitPush"],
            resources: ["*"],
            conditions: {
              StringEqualsIfExists: {
                "codecommit:References": [
                  "refs/heads/main",
                  "refs/heads/develop",
                ],
              },
              Null: { "codecommit:References": false },
            },
          }),
        ],
      }
    );

    // Create App Team IAM role
    const appTeamIamRole = new iam.Role(this, "AppTeamIamRole", {
      assumedBy: new iam.AccountPrincipal(props.jumpAccount).withConditions({
        Bool: {
          "aws:MultiFactorAuthPresent": "true",
        },
      }),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"),
        denyPushMainAndDevelopBranchPolicy,
      ],
    });

    // Create App Manaer IAM role
    const appTeamManagerIamRole = new iam.Role(this, "AppTeamManagerIamRole", {
      assumedBy: new iam.AccountPrincipal(props.jumpAccount).withConditions({
        Bool: {
          "aws:MultiFactorAuthPresent": "true",
        },
      }),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"),
        denyPushMainAndDevelopBranchPolicy,
      ],
    });

    // Create Infra Team IAM role
    const infraTeamIamRole = new iam.Role(this, "InfraTeamIamRole", {
      assumedBy: new iam.AccountPrincipal(props.jumpAccount).withConditions({
        Bool: {
          "aws:MultiFactorAuthPresent": "true",
        },
      }),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"),
      ],
    });

    // Create an IAM role for Lambda functions to operate EC2 instances.
    const sfnIamRole = new iam.Role(this, "SfnIamRole", {
      assumedBy: new iam.ServicePrincipal("states.amazonaws.com"),
    });

    // Create IAM policy for Lambda to operate EC2 instances.
    const sfnIamPolicy = new iam.Policy(this, "SfnIamPolicy", {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["iam:PassRole"],
          resources: [sfnIamRole.roleArn],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["ec2:StartInstances", "ec2:StopInstances"],
          resources: [`arn:aws:ec2:${this.region}:${this.account}:instance/*`],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["ec2:DescribeInstances", "ec2:DescribeInstanceStatus"],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["ssm:SendCommand"],
          resources: [
            `arn:aws:ssm:${this.region}:${this.account}:managed-instance/*`,
            `arn:aws:ssm:${this.region}:*:document/*`,
            `arn:aws:ec2:${this.region}:${this.account}:instance/*`,
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["ssm:ListCommandInvocations"],
          resources: ["*"],
        }),
      ],
    });

    // Attach an IAM policy to the IAM role for Lambda to operate EC2 instances.
    sfnIamRole.attachInlinePolicy(sfnIamPolicy);

    const approvalRuleTemplatePolicy =
      cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: [
            "codecommit:CreateApprovalRuleTemplate",
            "codecommit:UpdateApprovalRuleTemplateContent",
            "codecommit:DeleteApprovalRuleTemplate",
          ],
          resources: ["*"],
        }),
      ]);

    this.mainBranchApprovalRuleTemplate = new cr.AwsCustomResource(
      this,
      "MainBranchApprovalRuleTemplate",
      {
        logRetention: logs.RetentionDays.ONE_WEEK,
        onCreate: {
          action: "createApprovalRuleTemplate",
          parameters: {
            approvalRuleTemplateContent: JSON.stringify({
              Version: "2018-11-08",
              DestinationReferences: ["refs/heads/main"],
              Statements: [
                {
                  Type: "Approvers",
                  NumberOfApprovalsNeeded: 1,
                  ApprovalPoolMembers: [
                    `arn:aws:sts::${this.account}:assumed-role/${infraTeamIamRole.roleName}/*`,
                  ],
                },
              ],
            }),
            approvalRuleTemplateDescription:
              "Approval rule template for the main branch",
            approvalRuleTemplateName: "MainBranchApprovalRuleTemplate",
          },
          physicalResourceId: cr.PhysicalResourceId.fromResponse(
            "approvalRuleTemplate.approvalRuleTemplateId"
          ),
          service: "CodeCommit",
        },
        onUpdate: {
          action: "updateApprovalRuleTemplateContent",
          parameters: {
            newRuleContent: JSON.stringify({
              Version: "2018-11-08",
              DestinationReferences: ["refs/heads/main"],
              Statements: [
                {
                  Type: "Approvers",
                  NumberOfApprovalsNeeded: 1,
                  ApprovalPoolMembers: [
                    `arn:aws:sts::${this.account}:assumed-role/${infraTeamIamRole.roleName}/*`,
                  ],
                },
              ],
            }),
            approvalRuleTemplateName: "MainBranchApprovalRuleTemplate",
          },
          physicalResourceId: cr.PhysicalResourceId.fromResponse(
            "approvalRuleTemplate.approvalRuleTemplateId"
          ),
          service: "CodeCommit",
        },
        onDelete: {
          action: "deleteApprovalRuleTemplate",
          parameters: {
            approvalRuleTemplateName: "MainBranchApprovalRuleTemplate",
          },
          service: "CodeCommit",
        },
        policy: approvalRuleTemplatePolicy,
      }
    );

    this.developBranchApprovalRuleTemplate = new cr.AwsCustomResource(
      this,
      "DevelopBranchApprovalRuleTemplate",
      {
        logRetention: logs.RetentionDays.ONE_WEEK,
        onCreate: {
          action: "createApprovalRuleTemplate",
          parameters: {
            approvalRuleTemplateContent: JSON.stringify({
              Version: "2018-11-08",
              DestinationReferences: ["refs/heads/develop"],
              Statements: [
                {
                  Type: "Approvers",
                  NumberOfApprovalsNeeded: 1,
                  ApprovalPoolMembers: [
                    `arn:aws:sts::${this.account}:assumed-role/${appTeamManagerIamRole.roleName}/*`,
                  ],
                },
              ],
            }),
            approvalRuleTemplateDescription:
              "Approval rule template for the develop branch",
            approvalRuleTemplateName: "DevelopBranchApprovalRuleTemplate",
          },
          physicalResourceId: cr.PhysicalResourceId.fromResponse(
            "approvalRuleTemplate.approvalRuleTemplateId"
          ),
          service: "CodeCommit",
        },
        onUpdate: {
          action: "updateApprovalRuleTemplateContent",
          parameters: {
            newRuleContent: JSON.stringify({
              Version: "2018-11-08",
              DestinationReferences: ["refs/heads/develop"],
              Statements: [
                {
                  Type: "Approvers",
                  NumberOfApprovalsNeeded: 1,
                  ApprovalPoolMembers: [
                    `arn:aws:sts::${this.account}:assumed-role/${appTeamManagerIamRole.roleName}/*`,
                  ],
                },
              ],
            }),
            approvalRuleTemplateName: "DevelopBranchApprovalRuleTemplate",
          },
          physicalResourceId: cr.PhysicalResourceId.fromResponse(
            "approvalRuleTemplate.approvalRuleTemplateId"
          ),
          service: "CodeCommit",
        },
        onDelete: {
          action: "deleteApprovalRuleTemplate",
          parameters: {
            approvalRuleTemplateName: "DevelopBranchApprovalRuleTemplate",
          },
          service: "CodeCommit",
        },
        policy: approvalRuleTemplatePolicy,
      }
    );
  }
}
