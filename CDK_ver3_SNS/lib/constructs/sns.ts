import * as sns from "aws-cdk-lib/aws-sns";
import { Construct } from "constructs";

import { SNSConfig } from "../../config/Dev";

export class SNSConstruct extends Construct {
    public readonly topic: sns.CfnTopic;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        this.topic = new sns.CfnTopic(this, 'Topic', {
            ...SNSConfig.topicConfig,
        });

        const subscription = new sns.CfnSubscription(this,"Subscription", {
            topicArn: this.topic.attrTopicArn,
            ...SNSConfig.subscriptionConfig,
        });
        

    }
}