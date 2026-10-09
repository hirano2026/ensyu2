import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import * as apigateway from "aws-cdk-lib/aws-apigateway";

// 型定義
interface LAMBDA_FUNCTION_CONFIG {
    functionProps: {
        functionName: string;
        code: lambda.Code;
        handler: string;
    };
    actions: string[];
}

interface LAMBDA_CONFIG {
    common: {
        runtime: lambda.Runtime;
    };
    indexUser: LAMBDA_FUNCTION_CONFIG;
    showUser: LAMBDA_FUNCTION_CONFIG;
    newUser: LAMBDA_FUNCTION_CONFIG;
    editUser: LAMBDA_FUNCTION_CONFIG;
    deleteUser: LAMBDA_FUNCTION_CONFIG;
}

export const lambdaConfig: LAMBDA_CONFIG = {
    common: { // 共通部分
        runtime: lambda.Runtime.PYTHON_3_14,
    },

    indexUser: {
        functionProps:{
            functionName: "ensyu2-indexUser",
            code: lambda.Code.fromAsset("./lambda/index_users/"),
            handler: "index.lambda_handler",
        },
        actions: [
            "dynamodb:Scan",
        ],
    },

    showUser: {
        functionProps: {
            functionName: "ensyu2-showUser",
            code: lambda.Code.fromAsset("./lambda/show_user/"),
            handler: "show.lambda_handler",
        },
        actions: [
            "dynamodb:GetItem",
        ],
    },

    newUser: {
        functionProps: {
            functionName: "ensyu2-newUser",
            code: lambda.Code.fromAsset("./lambda/new_user/"),
            handler: "new.lambda_handler",
        },
        actions: [
            "dynamodb:PutItem",
        ],
    },

    editUser: {
        functionProps: {
            functionName: "ensyu2-editUser",
            code: lambda.Code.fromAsset("./lambda/edit_user/"),
            handler: "edit.lambda_handler",
        },
        actions: [
            "dynamodb:PutItem",
        ],
    },

    deleteUser: {
        functionProps: {
            functionName: "ensyu2-deleteUser",
            code: lambda.Code.fromAsset("./lambda/delete_user/"),
            handler: "delete.lambda_handler",
        },
        actions: [
            "dynamodb:DeleteItem",
        ],
    },
};

interface DYNAMODB_CONFIG {
    usersTable: {
        tableName: string;
        partitionKey: {
            name: string;
            type: dynamodb.AttributeType;
        };
        removalPolicy: cdk.RemovalPolicy;
    }
}

export const DynamoDBConfig: DYNAMODB_CONFIG = {
    usersTable: {
        tableName: "ensyu2-usersTable",
        partitionKey: {
            name: "userID",
            type: dynamodb.AttributeType.STRING,
        },
        removalPolicy: cdk.RemovalPolicy.DESTROY,
    }    
};

interface S3_CONFIG {
    MyBucket: {
        S3Props: {
            removalPolicy: cdk.RemovalPolicy;
            autoDeleteObjects: boolean;
        };
        blockPublicAccess: {
            blockPublicPolicy: boolean;
            blockPublicAcls: boolean;
            ignorePublicAcls: boolean;
            restrictPublicBuckets: boolean;
        };
        bucketName: string;
        assetsPath: string;
    };
};

export const S3Config: S3_CONFIG = {
    MyBucket: {
        S3Props: {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        },
        blockPublicAccess: {
            blockPublicPolicy: true,
            blockPublicAcls: true,
            ignorePublicAcls: true,
            restrictPublicBuckets: true,
        },
        bucketName: "ensyu2-S3bucket-20261005",
        assetsPath: "./assets",
    },
};

interface API_GATEWAY_CONFIG {
    restApiName: string;
    cors: {
        allowMethods: string[];
    } ;
    resourcePolicy: {
        actions: string[];
        resources: string[];
        conditions: {
            IpAddress: {
                "aws:SourceIp": string;
            };
        };
    }
};

export const APIGatewayConfig: API_GATEWAY_CONFIG = {
    restApiName: "ensyu2-API",
    cors: {
        allowMethods: [
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "OPTIONS",
        ],
    },
    resourcePolicy: {
        actions: ["execute-api:Invoke"],
        resources: ["execute-api:/*"],
        conditions: {
            IpAddress: {
                "aws:SourceIp": "221.255.117.34/32",
            },
        },
    }
};