import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";

import { S3Config } from "../../config/Dev";

export class CdkS3Construct extends Construct { //exportはこのファイル外からこのクラスを使えるようにする
  
    public readonly bucket: s3.Bucket;
    
    constructor(scope: Construct, id: string) {
    // constructorはこのクラスからオブジェクトを作るとき最初に実行される処理
    // ?は省略可能な変数を意味する
        super(scope, id);// 親クラスcdk.Stackのconstructorを呼び出し
        
        this.bucket = new s3.Bucket(this, 'MyBucket', { // L1だとs3.CfnBucket
            ...S3Config.MyBucket.S3Props,
            
            blockPublicAccess: new s3.BlockPublicAccess(S3Config.MyBucket.blockPublicAccess),
        });

        // this.bucket.addToResourcePolicy(
        //     new iam.PolicyStatement({
        //         sid: "AllowCloudFrontServicePrincipal",
        //         effect: iam.Effect.ALLOW,
        //         principals: [
        //             new iam.ServicePrincipal("cloudfront.amazonaws.com")
        //         ],
        //         actions: [
        //             "s3:GetObject"
        //         ],
        //         resources: [
        //             this.bucket.arnForObjects("*")
        //         ],
        //         conditions: {
        //             ArnLike: {
        //                 "AWS:SourceArn":
        //                 `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`
        //             }
        //         }
        //     })
        // )
    }
}
