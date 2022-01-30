import { Construct } from "constructs";
import {
  Stack,
  StackProps,
  aws_iam as iam,
  aws_logs as logs,
  custom_resources as cr,
} from "aws-cdk-lib";

interface RoleStackProps extends StackProps {
  appTeamIamUserArns: string[];
  appTeamManagerIamUserArns: string[];
  infraTeamIamUserArns: string[];
}

export class RoleStack extends Stack {
  // CodeCommit approval rule template
  public readonly mainBranchApprovalRuleTemplate: cr.AwsCustomResource;
  public readonly developBranchApprovalRuleTemplate: cr.AwsCustomResource;

  constructor(scope: Construct, id: string, props: RoleStackProps) {
    super(scope, id, props);

    // IAM policy to prohibit direct editing of files on main and develop branches
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

    // IAM Role for the app team
    const appTeamIamRole = new iam.Role(this, "AppTeamIamRole", {
      assumedBy: new iam.CompositePrincipal(
        ...((): iam.IPrincipal[] => {
          const principals: iam.IPrincipal[] = new Array();
          props.appTeamIamUserArns.forEach((appTeamIamUserArn) => {
            principals.push(new iam.ArnPrincipal(appTeamIamUserArn));
          });
          return principals;
        })()
      ).withConditions({
        Bool: {
          "aws:MultiFactorAuthPresent": "true",
        },
      }),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"),
        denyPushMainAndDevelopBranchPolicy,
      ],
    });

    // IAM Role for the app team manager
    const appTeamManagerIamRole = new iam.Role(this, "AppTeamManagerIamRole", {
      assumedBy: new iam.CompositePrincipal(
        ...((): iam.IPrincipal[] => {
          const principals: iam.IPrincipal[] = new Array();
          props.appTeamManagerIamUserArns.forEach(
            (appTeamManagerIamUserArn) => {
              principals.push(new iam.ArnPrincipal(appTeamManagerIamUserArn));
            }
          );
          return principals;
        })()
      ).withConditions({
        Bool: {
          "aws:MultiFactorAuthPresent": "true",
        },
      }),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"),
        denyPushMainAndDevelopBranchPolicy,
      ],
    });

    // IAM Role for the infra team
    const infraTeamIamRole = new iam.Role(this, "InfraTeamIamRole", {
      assumedBy: new iam.CompositePrincipal(
        ...((): iam.IPrincipal[] => {
          const principals: iam.IPrincipal[] = new Array();
          props.infraTeamIamUserArns.forEach((infraTeamIamUserArn) => {
            principals.push(new iam.ArnPrincipal(infraTeamIamUserArn));
          });
          return principals;
        })()
      ).withConditions({
        Bool: {
          "aws:MultiFactorAuthPresent": "true",
        },
      }),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"),
      ],
    });

    // CodeCommit approval rule template
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

    // Approval rule template for CodeCommit's main branch
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

    // Approval rule template for CodeCommit's develop branch
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
