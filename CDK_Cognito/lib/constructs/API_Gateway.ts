import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

import { APIGatewayConfig } from "../../config/Dev";

interface APIGatewayProps {
    websiteUrl: string;

    lambdas: {
        indexUser: lambda.Function;
        showUser: lambda.Function;
        newUser: lambda.Function;
        editUser: lambda.Function;
        deleteUser: lambda.Function;
    }

    userPool: cognito.CfnUserPool;
}

export class APIGatewayConstruct extends Construct {

    public readonly apiUrl: string;
    public readonly restApi: apigateway.CfnRestApi;
    public readonly stage: apigateway.CfnStage;
    
    constructor(scope: Construct, id: string, props: APIGatewayProps) {
        super(scope, id);// 親クラスcdk.Stackのconstructorを呼び出し

        // リソースベースポリシー
        const apiPolicy = new iam.PolicyDocument({
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    principals: [
                        new iam.AnyPrincipal(),
                    ],
                    actions: APIGatewayConfig.resourcePolicy.actions,
                    resources: APIGatewayConfig.resourcePolicy.resources,
                    conditions: APIGatewayConfig.resourcePolicy.conditions,
                })
            ]
        });

        this.restApi = new apigateway.CfnRestApi(this, 'MyAPI', {
            policy: apiPolicy,
            ...APIGatewayConfig.restApi,
        });

        const cognitoAuthorizer = new apigateway.CfnAuthorizer(this, "CognitoAuthorizer", {
            restApiId: this.restApi.ref,
            providerArns: [
                cdk.Fn.sub(
                    "arn:${AWS::Partition}:cognito-idp:${AWS::Region}:${AWS::AccountId}:userpool/${UserPoolId}",
                    {
                        UserPoolId: props.userPool.ref,
                    }
                ),
            ],
            ...APIGatewayConfig.authorizer,
        });

        const users = new apigateway.CfnResource(this, "UsersResource", {
            parentId: this.restApi.attrRootResourceId,
            restApiId: this.restApi.ref,
            pathPart: APIGatewayConfig.resource.users.pathPart,
        });

        const indexUser = new apigateway.CfnMethod(this, "indexUserMethod", {
            resourceId: users.ref,
            restApiId: this.restApi.ref,
            authorizerId: cognitoAuthorizer.ref,
            ...APIGatewayConfig.methods.indexUser,
            integration: {
                ...APIGatewayConfig.integration,
                // timeoutInMillis: 123,
                uri: cdk.Fn.sub( // 参考「https://dev.classmethod.jp/articles/cloudformation_template_for_api_gateway_integration_to_lambda/」
                    "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${LambdaArn}/invocations",
                    {
                        LambdaArn: props.lambdas.indexUser.functionArn,
                    }
                )
            }
        });

        const newUser = new apigateway.CfnMethod(this, "newUserMethod", {
            resourceId: users.ref,
            restApiId: this.restApi.ref,
            authorizerId: cognitoAuthorizer.ref,
            ...APIGatewayConfig.methods.newUser,
            integration: {
                ...APIGatewayConfig.integration,
                // timeoutInMillis: 123,
                uri: cdk.Fn.sub(
                    "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${LambdaArn}/invocations",
                    {
                        LambdaArn: props.lambdas.newUser.functionArn,
                    }
                )
            }
        });

        // L1はOPTIONSでCORSの設定をする
        const usersOptions = new apigateway.CfnMethod(this, "UsersOptionsMethod", {
            resourceId: users.ref,
            restApiId: this.restApi.ref,
            ...APIGatewayConfig.cors.users.options,
            integration: {
                type: APIGatewayConfig.cors.users.integration.type, // Lambdaプロキシ統合
                requestTemplates: {
                    "application/json": `{"statusCode": ${APIGatewayConfig.cors.users.integration.statusCode}}`,
                },
                integrationResponses: [
                    {
                        statusCode: `${APIGatewayConfig.cors.users.integration.statusCode}`,

                        responseParameters: {
                            "method.response.header.Access-Control-Allow-Origin":
                                `'${props.websiteUrl}'`,

                            "method.response.header.Access-Control-Allow-Methods":
                                `'${APIGatewayConfig.cors.users.allowMethods}'`,

                            "method.response.header.Access-Control-Allow-Headers":
                                `'${APIGatewayConfig.cors.users.allowHeaders}'`,
                        },
                    },
                ],
            },

            methodResponses: [
                {
                    statusCode: `${APIGatewayConfig.cors.users.integration.statusCode}`,

                    responseParameters: {
                        "method.response.header.Access-Control-Allow-Origin":
                            true,

                        "method.response.header.Access-Control-Allow-Methods":
                            true,

                        "method.response.header.Access-Control-Allow-Headers":
                            true,
                    },
                },
            ],
        });

        const userId = new apigateway.CfnResource(this, "UserIdResource", {
            parentId: users.ref,
            restApiId: this.restApi.ref,
            pathPart: APIGatewayConfig.resource.userId.pathPart,
        });

        const showUser = new apigateway.CfnMethod(this, "showUserMethod", {
            resourceId: userId.ref,
            restApiId: this.restApi.ref,
            authorizerId: cognitoAuthorizer.ref,
            ...APIGatewayConfig.methods.showUser,
            integration: {
                ...APIGatewayConfig.integration,
                // timeoutInMillis: 123,
                uri: cdk.Fn.sub(
                    "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${LambdaArn}/invocations",
                    {
                        LambdaArn: props.lambdas.showUser.functionArn,
                    }
                )
            }
        });

        const editUser = new apigateway.CfnMethod(this, "editUserMethod", {
            resourceId: userId.ref,
            restApiId: this.restApi.ref,
            authorizerId: cognitoAuthorizer.ref,
            ...APIGatewayConfig.methods.editUser,
            integration: {
                ...APIGatewayConfig.integration,
                // timeoutInMillis: 123,
                uri: cdk.Fn.sub(
                    "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${LambdaArn}/invocations",
                    {
                        LambdaArn: props.lambdas.editUser.functionArn,
                    }
                )
            }
        });

        const deleteUser = new apigateway.CfnMethod(this, "deleteUserMethod", {
            resourceId: userId.ref,
            restApiId: this.restApi.ref,
            authorizerId: cognitoAuthorizer.ref,
            ...APIGatewayConfig.methods.deleteUser,
            integration: {
                ...APIGatewayConfig.integration,
                // timeoutInMillis: 123,
                uri: cdk.Fn.sub(
                    "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${LambdaArn}/invocations",
                    {
                        LambdaArn: props.lambdas.deleteUser.functionArn,
                    }
                )
            }
        });

        const userIdOptions = new apigateway.CfnMethod(this, "UserIdOptionsMethod", {
            resourceId: userId.ref,
            restApiId: this.restApi.ref,
            ...APIGatewayConfig.cors.userId.options,
            integration: {
                type: APIGatewayConfig.cors.userId.integration.type,
                requestTemplates: {
                    "application/json": `{"statusCode": ${APIGatewayConfig.cors.userId.integration.statusCode}}`,
                },
                integrationResponses: [
                    {
                        statusCode: `${APIGatewayConfig.cors.userId.integration.statusCode}`,

                        responseParameters: {
                            "method.response.header.Access-Control-Allow-Origin":
                                `'${props.websiteUrl}'`,

                            "method.response.header.Access-Control-Allow-Methods":
                                `'${APIGatewayConfig.cors.userId.allowMethods}'`,

                            "method.response.header.Access-Control-Allow-Headers":
                                `'${APIGatewayConfig.cors.userId.allowHeaders}'`,
                        },
                    },
                ],
            },

            methodResponses: [
                {
                    statusCode: `${APIGatewayConfig.cors.userId.integration.statusCode}`,

                    responseParameters: {
                        "method.response.header.Access-Control-Allow-Origin":
                            true,

                        "method.response.header.Access-Control-Allow-Methods":
                            true,

                        "method.response.header.Access-Control-Allow-Headers":
                            true,
                    },
                },
            ],
        });

        new lambda.CfnPermission(this, "IndexUserPermission", {
            functionName: props.lambdas.indexUser.functionName,
            ...APIGatewayConfig.lambdaPermission,
            sourceArn: cdk.Fn.sub(
                "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiId}/*/*",
                {
                    ApiId: this.restApi.ref,
                }
            ),
        })

        new lambda.CfnPermission(this, "showUserPermission", {
            functionName: props.lambdas.showUser.functionName,
            ...APIGatewayConfig.lambdaPermission,
            sourceArn: cdk.Fn.sub(
                "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiId}/*/*",
                {
                    ApiId: this.restApi.ref,
                }
            ),
        })

        new lambda.CfnPermission(this, "newUserPermission", {
            functionName: props.lambdas.newUser.functionName,
            ...APIGatewayConfig.lambdaPermission,
            sourceArn: cdk.Fn.sub(
                "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiId}/*/*",
                {
                    ApiId: this.restApi.ref,
                }
            ),
        })

        new lambda.CfnPermission(this, "editUserPermission", {
            functionName: props.lambdas.editUser.functionName,
            ...APIGatewayConfig.lambdaPermission,
            sourceArn: cdk.Fn.sub(
                "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiId}/*/*",
                {
                    ApiId: this.restApi.ref,
                }
            ),
        })

        new lambda.CfnPermission(this, "deleteUserPermission", {
            functionName: props.lambdas.deleteUser.functionName,
            ...APIGatewayConfig.lambdaPermission,
            sourceArn: cdk.Fn.sub(
                "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiId}/*/*",
                {
                    ApiId: this.restApi.ref,
                }
            ),
        })

        const deployment = new apigateway.CfnDeployment(this, "Deployment", {
            restApiId: this.restApi.ref,
        });
        deployment.addResourceDependency(indexUser);
        deployment.addResourceDependency(newUser);
        deployment.addResourceDependency(showUser);
        deployment.addResourceDependency(editUser);
        deployment.addResourceDependency(deleteUser);
        deployment.addResourceDependency(usersOptions);
        deployment.addResourceDependency(userIdOptions);

        this.stage = new apigateway.CfnStage(this, "Stage", {
            restApiId: this.restApi.ref,
            deploymentId: deployment.ref,
            stageName: APIGatewayConfig.stage.stageName,
        })

        this.apiUrl = cdk.Fn.sub(
            "https://${ApiId}.execute-api.${AWS::Region}.amazonaws.com/test/",
            {
                ApiId: this.restApi.ref,
            }
        );
    }
}


