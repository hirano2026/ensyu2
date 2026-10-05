import * as cdk from "aws-cdk-lib";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { S3Config } from "../../config/Dev";
import { Construct } from "constructs";

import { CdkDynamoDbConstruct } from "../constructs/DynamoDB";
import { CdkS3Construct } from "../constructs/S3";
import { LambdaFunctions } from "../constructs/Lambda";
import { APIGatewayConstruct } from "../constructs/API_Gateway";
// import { CloudFront } from "../constructs/CloudFront";
// import { Cognito } from "../constructs/Cognito";めいめい

export class MainStack extends cdk.Stack {

  constructor(
    scope: Construct,
    id: string,
    props?: cdk.StackProps
  ) {
    super(scope, id, props);

    // DynamoDB Construct
    const database = new CdkDynamoDbConstruct(
      this,
      "DynamoDB"
    );

    // S3 Construct
    const website = new CdkS3Construct(
      this,
      "S3"
    );

    // Lambda Construct
    const lambdaFunctions = new LambdaFunctions(
      this,
      "Lambda",
      {
        table: database.usersTable,
        bucket: website.bucket,
      }
    );

    // API Gateway Construct
    const apiGateway = new APIGatewayConstruct(
      this,
      "APIGateway",
      {
        websiteUrl: website.bucket.bucketWebsiteUrl,
        lambdas: {
          indexUser: lambdaFunctions.indexUser,
          showUser: lambdaFunctions.showUser,
          newUser: lambdaFunctions.newUser,
          editUser: lambdaFunctions.editUser,
          deleteUser: lambdaFunctions.deleteUser,
        },
      }
    );

        
    new s3deploy.BucketDeployment(this, "DeployWebsite", {
        sources: [
            s3deploy.Source.asset(S3Config.MyBucket.assetsPath),
            s3deploy.Source.data(
              "config.js",
              `window.APP_CONFIG = {API_URL: "${apiGateway.apiUrl}"};`
            ),
        ],
        destinationBucket: website.bucket,
    });
  }
}