import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";

import { lambdaConfig } from "../../config/Dev"

interface LambdaFunctionsProps {
    table: dynamodb.Table;
    distribution: cloudfront.CfnDistribution;
}

export class LambdaFunctions extends Construct {

    public readonly indexUser: lambda.Function;
    public readonly showUser: lambda.Function;
    public readonly newUser: lambda.Function;
    public readonly editUser: lambda.Function;
    public readonly deleteUser: lambda.Function;


    constructor(scope: Construct, id: string, props: LambdaFunctionsProps) { 
        super(scope, id);

        // 一覧表示
        this.indexUser = new lambda.Function(this, "indexUser", {
            ...lambdaConfig.indexUser.functionProps,
            ...lambdaConfig.common,

            environment: { // これでpythonファイルに環境変数としてテーブル名を渡せる
                TABLE_NAME: props.table.tableName,
                WEBSITE_URL: "https://" + props.distribution.attrDomainName,
            },
        });

        // 詳細表示
        this.showUser = new lambda.Function(this, "showUser", {
            ...lambdaConfig.showUser.functionProps,
            ...lambdaConfig.common,

            environment: { // これでpythonファイルに環境変数としてテーブル名を渡せる
                TABLE_NAME: props.table.tableName,
                WEBSITE_URL: "https://" + props.distribution.attrDomainName,
            },
        });

        // 新規登録
        this.newUser = new lambda.Function(this, "newUser", {
            ...lambdaConfig.newUser.functionProps,
            ...lambdaConfig.common,

            environment: { // これでpythonファイルに環境変数としてテーブル名を渡せる
                TABLE_NAME: props.table.tableName,
                WEBSITE_URL: "https://" + props.distribution.attrDomainName,
            },
        });

        // 編集
        this.editUser = new lambda.Function(this, "editUser", {
            ...lambdaConfig.editUser.functionProps,
            ...lambdaConfig.common,

            environment: { // これでpythonファイルに環境変数としてテーブル名を渡せる
                TABLE_NAME: props.table.tableName,
                WEBSITE_URL: "https://" + props.distribution.attrDomainName,
            },
        });

        // 削除
        this.deleteUser = new lambda.Function(this, "deleteUser", {
            ...lambdaConfig.deleteUser.functionProps,
            ...lambdaConfig.common,

            environment: { // これでpythonファイルに環境変数としてテーブル名を渡せる
                TABLE_NAME: props.table.tableName,
                WEBSITE_URL: "https://" + props.distribution.attrDomainName,
            },
        });

        // DynamoDB実行ロール
        this.indexUser.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: lambdaConfig.indexUser.actions,
                resources: [
                    props.table.tableArn,
                ],
            })
        )
        this.showUser.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: lambdaConfig.showUser.actions,
                resources: [
                    props.table.tableArn,
                ],
            })
        )
        this.newUser.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: lambdaConfig.newUser.actions,
                resources: [
                    props.table.tableArn,
                ],
            })
        )

        this.editUser.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: lambdaConfig.editUser.actions,
                resources: [
                    props.table.tableArn,
                ],
            })
        )

        this.deleteUser.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: lambdaConfig.deleteUser.actions,
                resources: [
                    props.table.tableArn,
                ],
            })
        )
    }
}