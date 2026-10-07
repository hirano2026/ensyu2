import * as cdk from "aws-cdk-lib";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { S3Config } from "../../config/Dev";
import { Construct } from "constructs";

import { CdkDynamoDbConstruct } from "../constructs/DynamoDB";
import { CdkS3Construct } from "../constructs/S3";
import { LambdaFunctions } from "../constructs/Lambda";
import { APIGatewayConstruct } from "../constructs/API_Gateway";
import { CognitoConstruct } from "../constructs/Cognito"
import { CloudFrontConstruct } from "../constructs/CloudFront";
// import { Cognito } from "../constructs/Cognito";

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
    const S3 = new CdkS3Construct(
      this,
      "S3"
    );

    // CloudFront Construct
    const cloudfront = new CloudFrontConstruct(
      this,
      "CloudFront",
      {
        bucket: S3.bucket,
      }
    );

    // Cognito Construct
    const cognito = new CognitoConstruct(
      this,
      "Cognito",
      {
        distribution: cloudfront.distribution,
      }
    );

    // Lambda Construct
    const lambdaFunctions = new LambdaFunctions(
      this,
      "Lambda",
      {
        table: database.usersTable,
        distribution: cloudfront.distribution,
      }
    );

    // API Gateway Construct
    const apiGateway = new APIGatewayConstruct(
      this,
      "APIGateway",
      {
        websiteUrl: "https://" + cloudfront.distribution.attrDomainName,
        lambdas: {
          indexUser: lambdaFunctions.indexUser,
          showUser: lambdaFunctions.showUser,
          newUser: lambdaFunctions.newUser,
          editUser: lambdaFunctions.editUser,
          deleteUser: lambdaFunctions.deleteUser,
        },
        userPool: cognito.userPool
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
        destinationBucket: S3.bucket,
    });
  }
}