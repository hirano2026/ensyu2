import * as openapix from "@alma-cdk/openapix";
import * as path from "path";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
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

        const api = new openapix.Api(this, "api", {
            source: path.join (__dirname, '../../openapi/OpenAPI.yml'),

            restApiProps: {
                policy: apiPolicy,  
                restApiName: "ensyu2-API",   
                deployOptions: {
                    stageName: "test",
                },
            },
            paths: {
                '/users': {
                    get: new openapix.LambdaIntegration(this, props.lambdas.indexUser),
                    post: new openapix.LambdaIntegration(this, props.lambdas.newUser),
                    options: new openapix.CorsIntegration(this, {
                        headers: "Content-Type,Authorization",
                        origins: props.websiteUrl,
                        methods: "GET,POST,OPTIONS",
                    }),
                },
                '/users/{userID}': {
                    get: new openapix.LambdaIntegration(this, props.lambdas.showUser),
                    put: new openapix.LambdaIntegration(this, props.lambdas.editUser),
                    delete: new openapix.LambdaIntegration(this, props.lambdas.deleteUser),
                    options: new openapix.CorsIntegration(this, {
                        headers: "Content-Type,Authorization",
                        origins: props.websiteUrl,
                        methods: "GET,PUT,DELETE,OPTIONS",
                    }),
                },
            },
        });

        this.apiUrl = api.url;
    }
}


