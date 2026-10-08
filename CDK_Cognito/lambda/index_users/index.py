# 会員一覧表示のためのLambda

import json
import boto3
import os


# -------------------
#    テーブルの設定   
# -------------------
dynamodb = boto3.resource('dynamodb')
table_name = os.environ["TABLE_NAME"]
table = dynamodb.Table(table_name)

# --------------------------------
#    レスポンスの形式をJsonに統一   
# --------------------------------
website_url = os.environ["WEBSITE_URL"]
def response_json(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Access-Control-Allow-Origin": website_url
        },
        "body": json.dumps(body)
    }
# -------------------------
#    DynamoDBから全件取得   
# -------------------------
def get_all_users():
    items = []
    break_count = 0
    response = table.scan()

    items.extend(response.get("Items", []))
    exclusive_start_key = response.get("LastEvaluatedKey")
    if not exclusive_start_key:
        print(f"ユーザー数: {len(items)}")
    else:
        while True:
            response = table.scan(ExclusiveStartKey=exclusive_start_key)
            items.extend(response.get("Items", []))
            exclusive_start_key = response.get("LastEvaluatedKey")
            break_count += 1
            if not exclusive_start_key:
                print(f"ユーザー数: {len(items)}")
                break
            if break_count >= 100:
                print(f"ユーザー数: {len(items)}")
                break
    return items

# -------------------------------
#    クライアントの認証確認(401)   
# -------------------------------
def is_authentication(event):
    # 今回は認証の設定はないからTrueを返す
    return True

# -------------------------------
#    クライアントの権限確認(403)   
# -------------------------------
def is_permission(event):
    # 今回は権限の設定はないからTrueを返す
    return True

# -------------------------------
#    クライアントのリクエスト確認(400)   
# -------------------------------
def check_request(event):
    # キーワード検索やページネーションを追加したらリクエストをチェックする必要がある？
    return True


def lambda_handler(event, context):
    try:

        # ---------------
        # 401 認証チェック
        # ---------------
        if not is_authentication(event):
            print("クライアントの認証が失敗しました")
            return response_json(401, {"message": "認証に失敗しました"})

        # ---------------
        # 403 権限チェック
        # ---------------
        if not is_permission(event):
            print("クライアントのアクセス権限がありません")
            return response_json(403, {"message": "アクセス権限がありません"})

        # --------------------
        # 400 リクエストチェック
        # --------------------
        if not check_request(event):
            print("不正なリクエストです")
            return response_json(400, {"message": "リクエストが不正です"})

        # ---------------
        # DynamoDBから取得
        # ---------------
        print("会員一覧情報を取得します")
        body = get_all_users()
        return response_json(200, body)

    # ---------------------------
    # 一時的にサービスが利用できない(503)
    # ---------------------------
    #どんなエラーがでる？

    # --------------------
    # 何らかのサーバーエラー
    # --------------------
    except Exception as e:
        print("サーバーでエラーが発生しました")
        return {
            "statusCode": 500,
            "headers": {
                "ACCess-Control-Allow-Origin": website_url
            },
            "body": json.dumps({
                "message": "サーバーエラーが発生しました"
            })
        }

