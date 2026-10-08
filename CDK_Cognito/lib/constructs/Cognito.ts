import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";

interface CognitoProps {
    distribution: cloudfront.CfnDistribution;
}

export class CognitoConstruct extends Construct {

    public readonly userPool: cognito.CfnUserPool;

    constructor(scope: Construct, id: string, props: CognitoProps) {
        super(scope, id);
        // ドキュメント：https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.CfnUserPool.html
        this.userPool = new cognito.CfnUserPool(this, 'ensyu2-user-pool', {
            userPoolName: 'ensyu2-user-pool',
            usernameAttributes: ["email"], // ログイン時のユーザー名
            // aliasAttributes: ["email"], // 本来のユーザー名とは別にメールアドレスや電話番号でもサインインできる
            autoVerifiedAttributes: ["email"], // サインアップ時にメールにコードが届く
            policies: {
                passwordPolicy: {
                    minimumLength: 6,
                    requireLowercase: true,
                    requireUppercase: true,
                    requireNumbers: true,
                    requireSymbols: true,
                },
            },
            emailConfiguration: { // メール認証時にAWSの用意したメールで確認コードが送られる。自分のメールアドレスとかに指定できる？
                emailSendingAccount: "COGNITO_DEFAULT",
            },
            deletionProtection: "INACTIVE", // ユーザーを誤って削除しないように保護
            usernameConfiguration: { // 大文字と小文字を区別
                caseSensitive: false,
            },
            userPoolTier: "ESSENTIALS",
        });

        // ドキュメント：https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.CfnUserPoolResourceServer.html
        const resourceServer = new cognito.CfnUserPoolResourceServer(this, 'ensyu2-user-pool-resourceServer', {
            identifier: "ensyu2-resource-server-API",
            name: "ensyu2 Resource Server API",
            userPoolId: this.userPool.ref,
            scopes: [
                {
                    scopeName: "read",
                    scopeDescription: "ユーザー情報の読み取り",
                },
                {
                    scopeName: "write",
                    scopeDescription: "ユーザー情報の登録・更新・削除"
                }
            ]
        });

        const userPoolClient = new cognito.CfnUserPoolClient(this, 'ensyu2-user-pool-client', {
            userPoolId: this.userPool.ref, // ユーザープールを指定
            clientName: "ensyu2-client",
            generateSecret: false,
            allowedOAuthFlowsUserPoolClient: true,
            allowedOAuthFlows: [
                "implicit"
            ],
            allowedOAuthScopes: [
                "openid",
                "email",
                "ensyu2-resource-server-API/read",
                "ensyu2-resource-server-API/write",
            ],
            callbackUrLs: [
                "https://" + props.distribution.attrDomainName
            ],
            // defaultRedirectUri: props.distribution.attrDomainName
            supportedIdentityProviders: [ // マネージドログインでどのプロバイダーを使えるようにするか
                "COGNITO",
            ],
            accessTokenValidity: 60,
            idTokenValidity: 60,
            refreshTokenValidity: 5,
            authSessionValidity: 3,
            tokenValidityUnits: {
                accessToken: "minutes",
                idToken: "minutes",
                refreshToken: "days",
            },
            enableTokenRevocation: true,
            preventUserExistenceErrors: "ENABLED", // 存在しないユーザーでログインしようとして失敗しても存在しているかのようにエラーを出す
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
            domain: "ensyu2-managed-login",
            managedLoginVersion: 2,
        });
    }
}