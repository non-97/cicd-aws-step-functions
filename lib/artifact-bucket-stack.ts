import { Construct } from "constructs";
import { Stack, StackProps, aws_s3 as s3, aws_iam as iam } from "aws-cdk-lib";

interface ArtifactBucketStackProps extends StackProps {
  deploymentDestinationAccount: string | undefined;
}

export class ArtifactBucketStack extends Stack {
  public readonly artifactBucket: s3.IBucket;

  constructor(scope: Construct, id: string, props?: ArtifactBucketStackProps) {
    super(scope, id, props);

    // S3 bucket for CodeBuild artifacts
    this.artifactBucket = new s3.Bucket(this, "ArtifactBucket", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      }),
    });

    // If the AWS account to access EventBus is not specified, finish the process
    if (typeof props?.deploymentDestinationAccount == "undefined")
      process.exit(0);

    this.artifactBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject*", "s3:GetBucket*", "s3:List*", "s3:PutObject"],
        resources: [
          `${this.artifactBucket.bucketArn}`,
          `${this.artifactBucket.bucketArn}/*`,
        ],
        principals: [
          new iam.AccountPrincipal(props.deploymentDestinationAccount),
        ],
      })
    );
  }
}
