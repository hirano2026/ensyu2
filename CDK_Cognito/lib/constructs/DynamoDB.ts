import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

import { DynamoDBConfig } from '../../config/Dev'

export class CdkDynamoDbConstruct extends Construct {

    public readonly usersTable: dynamodb.Table;
    
    constructor(scope: Construct, id: string) {
        super(scope, id);

        this.usersTable = new dynamodb.Table(this, 'usersTable', {
            ...DynamoDBConfig.usersTable,
        });
    }
}
