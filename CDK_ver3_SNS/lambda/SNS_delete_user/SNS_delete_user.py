# ユーザー削除をトリガーにメールを通知するLambda

import json
import os
import boto3
from boto3.dynamodb.types import TypeDeserializer
from datetime import datetime
from zoneinfo import ZoneInfo

sns = boto3.client("sns")
deserializer = TypeDeserializer()
SNS_TOPIC_ARN = os.environ["SNS_TOPIC_ARN"]

def deserialize_image(image):
    """DynamoDB Streams の型付きデータを Python の辞書に変換"""
    if not image:
        return {}

    image_to_python = {}
    for key, value in image.items():
        image_to_python[key] = deserializer.deserialize(value)
    return image_to_python

def get_current_time():
    now = datetime.now(ZoneInfo("Asia/Tokyo"))
    return now.strftime("%Y年%m月%d日 %H時%M分")

def publish_function(subject, message):
    sns.publish(
        TopicArn=SNS_TOPIC_ARN,
        Subject="subject",
        Message=message,
    )

def lambda_handler(event, context):
    for record in event.get("Records", []):

        event_name = record.get("eventName")

        if event_name not in ("INSERT", "REMOVE", "MODIFY"):
            continue

        dynamodb_data = record.get("dynamodb", {})

        if event_name == "INSERT":
            new_image = deserialize_image(dynamodb_data.get("NewImage"))
            user_id = new_image.get("userID")
            name = new_image.get("name")
            created_at_str = get_current_time()
            message = (
                "以下のユーザーが新規登録されました。\n\n"
                f"ユーザーID: {user_id}\n"
                f"名前: {name}\n"
                f"新規登録日時：{created_at_str}\n"
            )
            
            publish_function("User 新規登録のお知らせ", message)
            print(f"新規登録通知を送信しました：{user_id}")

        elif event_name == "REMOVE":
            old_image = deserialize_image(dynamodb_data.get("OldImage"))

            # 削除されたユーザーの情報
            name = old_image.get("name", "データが見つかりません")
            user_id = old_image.get("userID", "データが見つかりません")

            deleted_at_str = get_current_time()

            message = (
                "以下のユーザーが削除されました。\n\n"
                f"ユーザーID: {user_id}\n"
                f"名前: {name}\n"
                f"削除日時：{deleted_at_str}\n"
            )

            publish_function("User 削除のお知らせ", message)
            print(f"削除通知を送信しました：{user_id}")

        elif event_name == "MODIFY":
            new_image = deserialize_image(dynamodb_data.get("NewImage"))
            old_image = deserialize_image(dynamodb_data.get("OldImage"))
            new_user_id = new_image.get("userID")
            edited_at_str = get_current_time()

            fields = [
                ("userID", "ユーザーID")
                ("name", "名前"),
                ("email", "メールアドレス"),
                ("birth", "生年月日")
            ]

            changes = []
            NoChanges = []

            for key, label in fields:
                old_value = old_image.get(key, "データが見つかりません")
                new_value = new_image.get(key, "データが見つかりません")

                if old_value != new_value:
                    changes.append(f"{label}：{old_value} → {new_value}")
                else:
                    NoChanges.append(f"{label}：{old_value}（変更なし）")
            if not changes:
                print(f"通知対象の変更はありません：{new_user_id}")
                continue

            message = (
                f"ユーザー情報が変更されました。\n"
                f"変更日時: {edited_at_str}\n"
                "-----変更内容-----\n"
                + "\n".join(changes)
                + "\n".join(NoChanges)
            )

            publish_function("User 登録情報変更のお知らせ", message)
            print(f"登録情報変更通知を送信しました：{new_user_id}")

    return {
        "statusCode": 200,
        "body": json.dumps(
            {"message": "処理が完了しました"},
            ensure_ascii=False,
        ),
    }
