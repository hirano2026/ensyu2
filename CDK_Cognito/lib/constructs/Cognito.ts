import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import { CognitoConfig } from "../../config/Dev";

interface CognitoProps {
    distribution: cloudfront.CfnDistribution;
}

export class CognitoConstruct extends Construct {

    public readonly userPool: cognito.CfnUserPool;

    constructor(scope: Construct, id: string, props: CognitoProps) {
        super(scope, id);
        // ドキュメント：https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.CfnUserPool.html
        this.userPool = new cognito.CfnUserPool(this, 'ensyu2-user-pool', {
            // usernameAttributes: ["email"], // ログイン時のユーザー名をメールアドレスにする
            ...CognitoConfig.userPool,
        });

        // ドキュメント：https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.CfnUserPoolResourceServer.html
        const resourceServer = new cognito.CfnUserPoolResourceServer(this, 'ensyu2-user-pool-resourceServer', {
            userPoolId: this.userPool.ref,
            ...CognitoConfig.resourceServer,
        });

        const userPoolClient = new cognito.CfnUserPoolClient(this, 'ensyu2-user-pool-client', {
            userPoolId: this.userPool.ref, // ユーザープールを指定
            callbackUrLs: [
                "https://" + props.distribution.attrDomainName
            ],
            ...CognitoConfig.userPoolClient,
            // defaultRedirectUri: props.distribution.attrDomainName
            // readAttributes: [ // 一旦デフォルトで試す
            //     "email"
            // ]
            // writeAttributes: [ // 上と同様
            //     "name",
            // ]
        });
        userPoolClient.addResourceDependency(resourceServer);

        const userPoolDomain = new cognito.CfnUserPoolDomain(this, "ensyu2-user-pool-domain", {
            userPoolId: this.userPool.ref,
            ...CognitoConfig.domain,
        });

        const managedLogin = new cognito.CfnManagedLoginBranding(this, 'managedLogin', {
            userPoolId: this.userPool.ref,
            clientId: userPoolClient.ref,
            ...CognitoConfig.managedLogin,

        })
    }
}