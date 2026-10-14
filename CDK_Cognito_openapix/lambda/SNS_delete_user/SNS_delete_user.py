# ユーザー削除をトリガーにメールを通知するLambda

import json
import os
import boto3
from boto3.dynamodb.types import TypeDeserializer
from datetime import datetime
from zoneinfo import ZoneInfo

sns = boto3.client("sns")
deserializer = TypeDeserializer()

dynamodb = boto3.resource("dynamodb")
table_name = os.environ["TABLE_NAME"]
table = dynamodb.Table(table_name)

def deserialize_image(image):
    """DynamoDB Streams の型付きデータを Python の辞書に変換"""
    if not image:
        return {}

    image_to_python = {}
    for key, value in image.items():
        image_to_python[key] = deserializer.deserialize(value)
    return image_to_python


def lambda_handler(event, context):
    for record in event.get("Records", []):

        event_name = record.get("eventName")

        # 削除イベントと新規登録イベント以外は無視
        if event_name not in ("INSERT", "REMOVE"):
            continue

        dynamodb_data = record.get("dynamodb", {})

        if event_name == "INSERT":
            new_image = deserialize_image(dynamodb_data.get("NewImage"))
            user_id = new_image.get("userID")
            email = new_image.get("email")

            if not user_id or not email:
                print("新規登録データが見つかりません")
                continue
            
            response = sns.create_topic(
                Name = f"topic-user-{user_id}"
            )
            topic_arn = response["TopicArn"]
            sns.subscribe(
                TopicArn=topic_arn,
                Protocol="email",
                Endpoint=email
            )

            table.update_item(
                Key={"userID": user_id},
                UpdateExpression="SET topicArn = :topic_arn",
                ExpressionAttributeValues={
                    ":topic_arn": topic_arn
                }
            )
            print(f"トピックARNを保存しました：{user_id}")

        elif event_name == "REMOVE":
            old_image = deserialize_image(dynamodb_data.get("OldImage"))

            # 削除されたユーザーの情報
            name = old_image.get("name", "データが見つかりません")
            user_id = old_image.get("userID", "データが見つかりません")
            topic_arn = old_image.get("topicArn")
            if not topic_arn:
                print(f"トピックARNがみつかりません：{user_id}")
                continue

            # 削除された日時を取得
            deleted_at = datetime.now(ZoneInfo("Asia/Tokyo"))
            deleted_at_str = deleted_at.strftime("%Y年%m月%d日 %H時%M分")

            message = (
                f"{name}様\n"
                "以下のユーザーが削除されました。\n\n"
                f"ユーザーID: {user_id}\n"
                f"名前: {name}\n"
                f"削除日時：{deleted_at_str}\n"
            )

            sns.publish(
                TopicArn=topic_arn,
                Subject="User 削除のお知らせ",
                Message=message,
            )
            print(f"削除通知を送信しました：{user_id}")

    return {
        "statusCode": 200,
        "body": json.dumps(
            {"message": "処理が完了しました"},
            ensure_ascii=False,
        ),
    }
