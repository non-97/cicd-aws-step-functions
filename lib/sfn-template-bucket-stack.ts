import { Construct } from "constructs";
import {
  Stack,
  StackProps,
  aws_s3 as s3,
  aws_s3_deployment as s3deploy,
} from "aws-cdk-lib";

export class SfnTemplateBucketStack extends Stack {
  public readonly sfnTemplateBucket: s3.IBucket;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // S3 buckets to store AWS Step Function template files and CodeBuild shell scripts
    this.sfnTemplateBucket = new s3.Bucket(this, "SfnTemplateBucket", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      }),
    });

    // Deploy AWS Step Function template files and CodeBuild shell scripts to S3 bucket
    new s3deploy.BucketDeployment(this, "DeployFilesToSfnTemplateBucket", {
      sources: [
        s3deploy.Source.asset("./src/codeBuild", { exclude: [".DS_Store"] }),
      ],
      destinationBucket: this.sfnTemplateBucket,
    });
  }
}
