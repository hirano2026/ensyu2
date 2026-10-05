# 詳細情報表示のためのLambda

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

# -----------------------------------
#    pathParametersからuserIDを取得   
# -----------------------------------
def pathParameters_id(event):
    userID = (event.get("pathParameters") or {}).get("userID")
    if not userID:
        return None
    return userID

# -------------------------
#    DynamoDBから詳細情報を取得   
# -------------------------
def get_users(userID):
    response = table.get_item(Key={"userID":userID})
    item = response.get("Item")
    if not item:
        print(f"userID: {userID} の情報が見つかりません")
        return None
    return item

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
            return response_json(401, {"message": "認証に失敗しました"})

        # ---------------
        # 403 権限チェック
        # ---------------
        if not is_permission(event):
            return response_json(403, {"message": "アクセス権限がありません"})

        # ---------------
        # DynamoDBから取得
        # ---------------
        userID = pathParameters_id(event)
            # --------------------
            # 400 リクエストチェック
            # --------------------
        if not userID:
            return response_json(400, {"message": "リクエストが不正です"})
        body = get_users(userID)
            # -------------
            # 404 Not Found
            # -------------
        if not body:
            return response_json(404, {"message": "ユーザー情報が見つかりません"})

        return response_json(200, body)

    # ---------------------------
    # 一時的にサービスが利用できない
    # ---------------------------
    #どんなエラーがでる？

    # --------------------
    # 何らかのサーバーエラー
    # --------------------
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({
                "message": "サーバーエラーが発生しました"
            })
        }

