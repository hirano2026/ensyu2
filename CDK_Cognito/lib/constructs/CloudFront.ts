import { Construct } from "constructs";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cdk from 'aws-cdk-lib/core';

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
                name: 'OriginAccessControlForContentsBucket',
                originAccessControlOriginType: 's3',
                signingBehavior: 'always',
                signingProtocol: 'sigv4',
                description: 'Access Control',
            },
        });

        // ドキュメント：https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.CfnDistribution.html
        // ドキュメント補足：https://docs.aws.amazon.com/ja_jp/cloudfront/latest/APIReference/API_DistributionConfig.html
        this.distribution = new cloudfront.CfnDistribution(this, 'Distribution',{
            distributionConfig: {
                enabled: true,
                defaultRootObject: "index.html",
                origins: [
                    {
                        id: "S3Origin",
                        domainName: props.bucket.bucketRegionalDomainName,
                        originAccessControlId: OriginAccessControl.ref,
                        s3OriginConfig: {},
                    },
                ],
                httpVersion: "http2",
                // ドキュメント：https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-distribution-defaultcachebehavior.html
                defaultCacheBehavior: { //pathを指定しない場合に必要になるデフォルトの設定
                    targetOriginId: "S3Origin",
                    viewerProtocolPolicy: "redirect-to-https",
                    compress: true,
                    cachePolicyId: cloudfront.CachePolicy.CACHING_OPTIMIZED.cachePolicyId,
                },
            },
        });
        props.bucket.addToResourcePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,

                principals: [
                    new iam.ServicePrincipal(
                        "cloudfront.amazonaws.com"
                    ),
                ],

                actions: [
                    "s3:GetObject",
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