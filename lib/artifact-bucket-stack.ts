import { Construct } from "constructs";
import { Stack, StackProps, aws_s3 as s3, aws_iam as iam } from "aws-cdk-lib";

export class ArtifactBucketStack extends Stack {
  public readonly artifactBucket: s3.IBucket;

  constructor(scope: Construct, id: string, props?: StackProps) {
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
  }
}
