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

        
        const MyAPI = new apigateway.CfnRestApi(this, 'MyAPI', {
            description: '個人情報管理システム用API',
            disableExecuteApiEndpoint: false, //デフォルトAPIエンドポイントを無効にするか（カスタムドメインならデフォルトはいらないからTrueにする）
            // 参考サイト「https://note.funlead.co.jp/n/ncc85eac6268d」
            endpointAccessMode: 'STRICT', // SecurityPolicy_で始まるもの(拡張ポリシー)を使う場合はエンドポイントアクセスモードの指定が必須(BASIC or STRICT)
            endpointConfiguration: {
                // ipAddressType: 'ipAddressType', IPv4なのかとかの設定
                types: ['REGIONAL'], // REGIONAL or EDGE or PRIVATE
                // vpcEndpointIds: ['vpcEndpointIds'], プライベートAPIでVPC Endpointと関連付けるときに使う
            },
            failOnWarnings: false, // warningで停止させるか
            name: 'ensyu2-API',
            policy: apiPolicy.toJSON(),
            securityPolicy: 'SecurityPolicy_TLS13_1_3_2025_09',

            // body: body, これはOpenAPI定義を直接渡してREST APIを構築するときに使う
            //   bodyS3Location: { S3においてあるOpenAPIを使う場合はこれ
            //     bucket: 'bucket',
            //     eTag: 'eTag',
            //     key: 'key',
            //     version: 'version',
            //   },
            //   mode: 'mode', openAPIを使ってREST APIを定義するときに使用
            //   parameters: { これもopenAPIで使うかも
            //     parametersKey: 'parameters',
            //   },
            //   tags: [{
            //     key: 'key',
            //     value: 'value',
            //   }],
            //   version: 'version',
        });

        const cognitoAuthorizer = new apigateway.CfnAuthorizer(this, "CognitoAuthorizer", {
            name: "ensyu2-CognitoAuthorizer",
            restApiId: MyAPI.ref,
            type: "COGNITO_USER_POOLS",
            identitySource: "method.request.header.Authorization",
            providerArns: [
                cdk.Fn.sub(
                    "arn:${AWS::Partition}:cognito-idp:${AWS::Region}:${AWS::AccountId}:userpool/${UserPoolId}",
                    {
                        UserPoolId: props.userPool.ref,
                    }
                ),
            ],
        })


        const users = new apigateway.CfnResource(this, "UsersResource", {
            parentId: MyAPI.attrRootResourceId,
            pathPart: "users",
            restApiId: MyAPI.ref,
        });

        const indexUser = new apigateway.CfnMethod(this, "indexUserMethod", {
            httpMethod: "GET",
            resourceId: users.ref,
            restApiId: MyAPI.ref,
            authorizationType: "COGNITO_USER_POOLS",
            authorizerId: cognitoAuthorizer.ref,
            authorizationScopes: [
                "ensyu2-resource-server-API/read",
            ],
            integration: {
                type: "AWS_PROXY", // Lambdaプロキシ統合
                integrationHttpMethod: "POST",
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
            httpMethod: "POST",
            resourceId: users.ref,
            restApiId: MyAPI.ref,
            authorizationType: "COGNITO_USER_POOLS",
            authorizerId: cognitoAuthorizer.ref,
            authorizationScopes: [
                "ensyu2-resource-server-API/write",
            ],
            integration: {
                type: "AWS_PROXY", // Lambdaプロキシ統合
                integrationHttpMethod: "POST",
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
            httpMethod: "OPTIONS",
            resourceId: users.ref,
            restApiId: MyAPI.ref,
            authorizationType: "NONE",
            integration: {
                type: "MOCK", // Lambdaプロキシ統合
                requestTemplates: {
                    "application/json": '{"statusCode": 204}',
                },
                integrationResponses: [
                    {
                        statusCode: "204",

                        responseParameters: {
                            "method.response.header.Access-Control-Allow-Origin":
                                `'${props.websiteUrl}'`,

                            "method.response.header.Access-Control-Allow-Methods":
                                "'GET,POST,OPTIONS'",

                            "method.response.header.Access-Control-Allow-Headers":
                                "'Content-Type,Authorization'",
                        },
                    },
                ],
            },

            methodResponses: [
                {
                    statusCode: "204",

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
            pathPart: "{userID}",
            restApiId: MyAPI.ref,
        });

        const showUser = new apigateway.CfnMethod(this, "showUserMethod", {
            httpMethod: "GET",
            resourceId: userId.ref,
            restApiId: MyAPI.ref,
            authorizationType: "COGNITO_USER_POOLS",
            authorizerId: cognitoAuthorizer.ref,
            authorizationScopes: [
                "ensyu2-resource-server-API/read",
            ],
            integration: {
                type: "AWS_PROXY", // Lambdaプロキシ統合
                integrationHttpMethod: "POST",
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
            httpMethod: "PUT",
            resourceId: userId.ref,
            restApiId: MyAPI.ref,
            authorizationType: "COGNITO_USER_POOLS",
            authorizerId: cognitoAuthorizer.ref,
            authorizationScopes: [
                "ensyu2-resource-server-API/read",
                "ensyu2-resource-server-API/write",
            ],
            integration: {
                type: "AWS_PROXY", // Lambdaプロキシ統合
                integrationHttpMethod: "POST",
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
            httpMethod: "DELETE",
            resourceId: userId.ref,
            restApiId: MyAPI.ref,
            authorizationType: "COGNITO_USER_POOLS",
            authorizerId: cognitoAuthorizer.ref,
            authorizationScopes: [
                "ensyu2-resource-server-API/read",
            ],
            integration: {
                type: "AWS_PROXY", // Lambdaプロキシ統合
                integrationHttpMethod: "POST",
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
            httpMethod: "OPTIONS",
            resourceId: userId.ref,
            restApiId: MyAPI.ref,
            authorizationType: "NONE",
            integration: {
                type: "MOCK", // Lambdaプロキシ統合
                requestTemplates: {
                    "application/json": '{"statusCode": 204}',
                },
                integrationResponses: [
                    {
                        statusCode: "204",

                        responseParameters: {
                            "method.response.header.Access-Control-Allow-Origin":
                                `'${props.websiteUrl}'`,

                            "method.response.header.Access-Control-Allow-Methods":
                                "'GET,PUT,DELETE,OPTIONS'",

                            "method.response.header.Access-Control-Allow-Headers":
                                "'Content-Type,Authorization'",
                        },
                    },
                ],
            },

            methodResponses: [
                {
                    statusCode: "204",

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
            action: "lambda:InvokeFunction",
            functionName: props.lambdas.indexUser.functionName,
            principal: "apigateway.amazonaws.com",
            sourceArn: cdk.Fn.sub(
                "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiId}/*/*",
                {
                    ApiId: MyAPI.ref,
                }
            ),
        })

        new lambda.CfnPermission(this, "showUserPermission", {
            action: "lambda:InvokeFunction",
            functionName: props.lambdas.showUser.functionName,
            principal: "apigateway.amazonaws.com",
            sourceArn: cdk.Fn.sub(
                "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiId}/*/*",
                {
                    ApiId: MyAPI.ref,
                }
            ),
        })

        new lambda.CfnPermission(this, "newUserPermission", {
            action: "lambda:InvokeFunction",
            functionName: props.lambdas.newUser.functionName,
            principal: "apigateway.amazonaws.com",
            sourceArn: cdk.Fn.sub(
                "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiId}/*/*",
                {
                    ApiId: MyAPI.ref,
                }
            ),
        })

        new lambda.CfnPermission(this, "editUserPermission", {
            action: "lambda:InvokeFunction",
            functionName: props.lambdas.editUser.functionName,
            principal: "apigateway.amazonaws.com",
            sourceArn: cdk.Fn.sub(
                "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiId}/*/*",
                {
                    ApiId: MyAPI.ref,
                }
            ),
        })

        new lambda.CfnPermission(this, "deleteUserPermission", {
            action: "lambda:InvokeFunction",
            functionName: props.lambdas.deleteUser.functionName,
            principal: "apigateway.amazonaws.com",
            sourceArn: cdk.Fn.sub(
                "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${ApiId}/*/*",
                {
                    ApiId: MyAPI.ref,
                }
            ),
        })

        const deployment = new apigateway.CfnDeployment(this, "Deployment", {
            restApiId: MyAPI.ref,
        });
        deployment.addResourceDependency(indexUser);
        deployment.addResourceDependency(newUser);
        deployment.addResourceDependency(showUser);
        deployment.addResourceDependency(editUser);
        deployment.addResourceDependency(deleteUser);
        deployment.addResourceDependency(usersOptions);
        deployment.addResourceDependency(userIdOptions);

        new apigateway.CfnStage(this, "Stage", {
            restApiId: MyAPI.ref,
            deploymentId: deployment.ref,
            stageName: "test",
        })

        this.apiUrl = cdk.Fn.sub(
            "https://${ApiId}.execute-api.${AWS::Region}.amazonaws.com/test/",
            {
                ApiId: MyAPI.ref,
            }
        );
    }
}


