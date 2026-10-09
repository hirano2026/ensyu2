import * as cdk from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as openapix from "@alma-cdk/openapix";

import { Construct } from "constructs";

interface WAFProps {
    api: openapix.Api;
    stageName: string;
}

export class WAFConstruct extends Construct {
    constructor(scope: Construct, id: string, props: WAFProps) {
        super(scope, id);

        const IPSet = new wafv2.CfnIPSet(this, "IPSet", {
            name: "ensyu2-IPSet",
            scope: "REGIONAL",
            ipAddressVersion: "IPV4",
            addresses: [
                "221.255.117.34/32"
            ],
        });

        const webAcl = new wafv2.CfnWebACL(this, "WAF", {
            defaultAction: {
                block: {}
            },
            name: "ensyu2-WAF",
            scope: "REGIONAL",
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                metricName: "ensyu2-WAF-metricName",
                sampledRequestsEnabled: true,
            },
            rules: [
                {
                    name: "Only-IP-Allow",
                    priority: 1,
                    statement: {
                        ipSetReferenceStatement: {
                            arn: IPSet.attrArn,
                        },
                    },
                    action: {
                        allow: {},
                    },
                    visibilityConfig: {
                        cloudWatchMetricsEnabled: true,
                        metricName: "Only-IP-Allow",
                        sampledRequestsEnabled: true,
                    },
                },
            ],
        });

        const stageArn =
            `arn:${cdk.Stack.of(this).partition}:apigateway:` +
            `${cdk.Stack.of(this).region}::/restapis/` +
            `${props.api.restApiId}/stages/${props.stageName}`;

        new wafv2.CfnWebACLAssociation(this, "WAFAssociation", {
            resourceArn: stageArn,
            webAclArn: webAcl.attrArn,
        });
    }
}