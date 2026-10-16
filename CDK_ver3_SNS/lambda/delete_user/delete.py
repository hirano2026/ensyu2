# ユーザー削除のためのLambda

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

# --------------------
#    delete処理  
# --------------------
def delete_user(userID):
    response_delete = table.delete_item(Key={"userID": userID}, ReturnValues="ALL_OLD")
    old_data = response_delete.get("Attributes")
    if not old_data:
        return False
    return True
    
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
        # DynamoDBに登録
        # ---------------
        userID = pathParameters_id(event)
        delete_check = delete_user(userID)
            # --------------------
            # 400 リクエストチェック
            # --------------------
        if delete_check:
            return response_json(203, {"message": "ユーザーを削除しました"})
        else:
            return response_json(404, {"message": "削除対象のユーザーは存在しません"})
        

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

