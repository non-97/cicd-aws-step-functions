import { Construct } from "constructs";
import {
  Stack,
  StackProps,
  aws_s3 as s3,
  aws_s3_deployment as s3deploy,
} from "aws-cdk-lib";

export class SfnTemplateBucketStack extends Stack {
  public readonly sfnTemplateBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create S3 Bucket for git template
    this.sfnTemplateBucket = new s3.Bucket(this, "SfnTemplateBucket", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      }),
    });

    // Upload the template file for the Step Function to the S3 bucket.
    new s3deploy.BucketDeployment(this, "BucketDeployment", {
      sources: [s3deploy.Source.asset("./src/s3", { exclude: [".DS_Store"] })],
      destinationBucket: this.sfnTemplateBucket,
    });
  }
}
