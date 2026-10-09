import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";

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



interface CLOUDFRONT_CONFIG {
    originAccessControl: {
        name: string;
        originAccessControlOriginType: string;
        signingBehavior: string;
        signingProtocol: string;
        description: string;
    };

    distribution: {
        enabled: boolean;
        defaultRootObject: string;
        httpVersion: string;
    };

    origin: {
        id: string;
        s3OriginConfig: object;
    };

    defaultCacheBehavior: {
        viewerProtocolPolicy: string;
        compress: boolean;
        cachePolicyId: string;
    };

    bucketPolicy: {
        effect: iam.Effect;
        actions: string[];
    };
}

export const CloudFrontConfig: CLOUDFRONT_CONFIG = {
    originAccessControl: {
        name: "OriginAccessControlForContentsBucket",
        originAccessControlOriginType: "s3",
        signingBehavior: "always",
        signingProtocol: "sigv4",
        description: "Access Control",
    },

    distribution: {
        enabled: true,
        defaultRootObject: "index.html",
        httpVersion: "http2",
    },

    origin: {
        id: "S3Origin",
        s3OriginConfig: {},
    },

    defaultCacheBehavior: {
        viewerProtocolPolicy: "redirect-to-https",
        compress: true,
        cachePolicyId: cloudfront.CachePolicy.CACHING_OPTIMIZED.cachePolicyId,
    },

    bucketPolicy: {
        effect: iam.Effect.ALLOW,
        actions: [
            "s3:GetObject",
        ]
    },
};

interface COGNITO_CONFIG {
    userPool: {
        userPoolName: string;
        aliasAttributes: string[];
        schema: {
            name: string;
            required: boolean;
            mutable: boolean;
        }[];
        autoVerifiedAttributes: string[];
        policies: {
            passwordPolicy: {
                minimumLength: number;
                requireLowercase: boolean;
                requireUppercase: boolean;
                requireNumbers: boolean;
                requireSymbols: boolean;
            };
        };
        emailConfiguration: {
            emailSendingAccount: string;
        };
        deletionProtection: string;
        usernameConfiguration: {
            caseSensitive: boolean;
        };
        userPoolTier: string;
    };

    resourceServer: {
        identifier: string;
        name: string;
        scopes: {
            scopeName: string;
            scopeDescription: string;
        }[];
    };

    userPoolClient: {
        clientName: string;
        generateSecret: boolean;
        explicitAuthFlows: string[];
        allowedOAuthFlowsUserPoolClient: boolean;
        allowedOAuthFlows: string[];
        allowedOAuthScopes: string[];
        supportedIdentityProviders: string[];
        accessTokenValidity: number;
        idTokenValidity: number;
        refreshTokenValidity: number;
        authSessionValidity: number;
        tokenValidityUnits: {
            accessToken: string;
            idToken: string;
            refreshToken: string;
        };
        enableTokenRevocation: boolean;
        preventUserExistenceErrors: string;
    };

    domain: {
        domain: string;
        managedLoginVersion: number;
    };

    managedLogin: {
        useCognitoProvidedValues: boolean;
    };
}

export const CognitoConfig: COGNITO_CONFIG = {
    userPool: {
        userPoolName: "ensyu2-user-pool",

        aliasAttributes: [
            "email",
        ],

        schema: [
            {
                name: "email",
                required: true,
                mutable: true,
            },
        ],

        autoVerifiedAttributes: [
            "email",
        ],

        policies: {
            passwordPolicy: {
                minimumLength: 6,
                requireLowercase: true,
                requireUppercase: true,
                requireNumbers: true,
                requireSymbols: true,
            },
        },

        emailConfiguration: {
            emailSendingAccount: "COGNITO_DEFAULT",
        },

        deletionProtection: "INACTIVE",

        usernameConfiguration: {
            caseSensitive: false,
        },

        userPoolTier: "ESSENTIALS",
    },

    resourceServer: {
        identifier: "ensyu2-resource-server-API",
        name: "ensyu2 Resource Server API",

        scopes: [
            {
                scopeName: "read",
                scopeDescription: "ユーザー情報の読み取り",
            },
            {
                scopeName: "write",
                scopeDescription: "ユーザー情報の登録・更新・削除",
            },
        ],
    },

    userPoolClient: {
        clientName: "ensyu2-client",

        generateSecret: false,

        explicitAuthFlows: [
            "ALLOW_USER_AUTH",
            "ALLOW_USER_SRP_AUTH",
            "ALLOW_REFRESH_TOKEN_AUTH",
        ],

        allowedOAuthFlowsUserPoolClient: true,

        allowedOAuthFlows: [
            "implicit",
        ],

        allowedOAuthScopes: [
            "openid",
            "email",
            "ensyu2-resource-server-API/read",
            "ensyu2-resource-server-API/write",
        ],

        supportedIdentityProviders: [
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

        preventUserExistenceErrors: "ENABLED",
    },

    domain: {
        domain: "ensyu2-managed-login",
        managedLoginVersion: 2,
    },

    managedLogin: {
        useCognitoProvidedValues: true,
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