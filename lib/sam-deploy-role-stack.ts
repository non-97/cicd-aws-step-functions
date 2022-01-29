import { Construct } from "constructs";
import { Stack, StackProps, aws_iam as iam } from "aws-cdk-lib";

interface SamDeployRoleStackProps extends StackProps {
  deploymentControlAccount: string;
}

export class SamDeployRoleStack extends Stack {
  constructor(scope: Construct, id: string, props: SamDeployRoleStackProps) {
    super(scope, id, props);

    // IAM roles for the sam deploy
    new iam.Role(this, "SamDeployRole", {
      assumedBy: new iam.AccountPrincipal(props.deploymentControlAccount),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"),
      ],
    });
  }
}
