import { Construct } from "constructs";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cdk from 'aws-cdk-lib/core';
import { CloudFrontConfig } from '../../config/Dev'

export interface CloudFrontProps {
    bucket: s3.Bucket;
}

export class CloudFrontConstruct extends Construct {
    public readonly distribution: cloudfront.CfnDistribution;

    constructor(scope: Construct, id:string, props: CloudFrontProps){
        super(scope, id);
        // ドキュメント：https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.CfnOriginAccessControl.html
        // ドキュメントの補足：https://docs.aws.amazon.com/ja_jp/cloudfront/latest/APIReference/API_OriginAccessControlConfig.html
        const OriginAccessControl = new cloudfront.CfnOriginAccessControl(this, 'OriginAccessControl', {
            originAccessControlConfig: {
                ...CloudFrontConfig.originAccessControl,
            },
        });

        // ドキュメント：https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.CfnDistribution.html
        // ドキュメント補足：https://docs.aws.amazon.com/ja_jp/cloudfront/latest/APIReference/API_DistributionConfig.html
        this.distribution = new cloudfront.CfnDistribution(this, 'Distribution',{
            distributionConfig: {
                ...CloudFrontConfig.distribution,
                origins: [
                    {
                        domainName: props.bucket.bucketRegionalDomainName,
                        originAccessControlId: OriginAccessControl.ref,
                        ...CloudFrontConfig.origin,
                    },
                ],
                // ドキュメント：https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-distribution-defaultcachebehavior.html
                defaultCacheBehavior: { //pathを指定しない場合に必要になるデフォルトの設定
                    targetOriginId: CloudFrontConfig.origin.id,
                    ...CloudFrontConfig.defaultCacheBehavior,
                },
            },
        });
        props.bucket.addToResourcePolicy(
            new iam.PolicyStatement({
                ...CloudFrontConfig.bucketPolicy,
                principals: [
                    new iam.ServicePrincipal(
                        "cloudfront.amazonaws.com"
                    ),
                ],

                resources: [
                    props.bucket.arnForObjects("*"),
                ],

                conditions: {
                    ArnLike: {
                        "AWS:SourceArn": `arn:aws:cloudfront::${cdk.Stack.of(this).account}:distribution/${this.distribution.attrId}`
                    },
                },
            })
        );
    }
}