import { Construct } from "constructs";
import {
  Stack,
  StackProps,
  aws_iam as iam,
  aws_ec2 as ec2,
  aws_ssm as ssm,
} from "aws-cdk-lib";
import * as fs from "fs";

export class Ec2InstancesStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create SSM IAM role
    const ssmIamRole = new iam.Role(this, "SsmIamRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore"
        ),
      ],
    });

    // Create a VPC
    const vpc = new ec2.Vpc(this, "Vpc", {
      cidr: "10.0.0.0/24",
      enableDnsHostnames: true,
      enableDnsSupport: true,
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 27,
        },
      ],
    });

    // User data for Amazon Linux
    const userDataParameter = fs.readFileSync(
      "./src/ec2/user_data_amazon_linux2.sh",
      "utf8"
    );
    const userDataAmazonLinux2 = ec2.UserData.forLinux({
      shebang: "#!/bin/bash",
    });
    userDataAmazonLinux2.addCommands(userDataParameter);

    // Create EC2 instance
    // AmazonLinux 2
    vpc
      .selectSubnets({ subnetGroupName: "Public" })
      .subnets.forEach((subnet, index) => {
        new ec2.Instance(this, `Ec2Instance${index}`, {
          machineImage: ec2.MachineImage.latestAmazonLinux({
            generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
          }),
          instanceType: new ec2.InstanceType("t3.micro"),
          vpc: vpc,
          role: ssmIamRole,
          vpcSubnets: vpc.selectSubnets({
            subnetGroupName: "Public",
            availabilityZones: [vpc.availabilityZones[index]],
          }),
        });
      });

    // Read CloudWatch parameters for Linux
    const cloudWatchParameter = fs.readFileSync(
      "./src/cloudwatch/AmazonCloudWatch-linux.json",
      "utf8"
    );

    // Create a new SSM Parameter
    new ssm.StringParameter(this, "CloudWatchParameter", {
      description: "CloudWatch parameters for Linux",
      parameterName: "AmazonCloudWatch-linux",
      stringValue: cloudWatchParameter,
    });
  }
}
