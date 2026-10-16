# 更新のためのLambda

import json
import boto3
from botocore.exceptions import ClientError
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

# ------------------------------
#    リクエストボディを辞書型に   
# ------------------------------
def parse_requestbody(event):
    body = event.get("body")
    if not body:
        return None
    try:
        return json.loads(body)
    except Exception as e:
        return None

# --------------------------
#    登録情報の不備チェック  
# --------------------------
def check_request(requestbody):
    required_data = ["name", "email", "birth"]

    for data in required_data:
        if data not in requestbody:
            return False

    return True

# -----------------------------------
#    pathParametersからuserIDを取得   
# -----------------------------------
def pathParameters_id(event):
    userID = (event.get("pathParameters") or {}).get("userID")
    if not userID:
        return None
    return userID

# -------------------------
#    DynamoDBの情報を更新  
# -------------------------
def new_users(requestbody, userID):
    item = {"userID": userID}
    item["name"] = requestbody["name"]
    item["email"] = requestbody["email"]
    if "phone" in requestbody:
        item["phone"] = requestbody["phone"]
    item["birth"] = requestbody["birth"]

    print(f"ユーザー(userID:{userID})の情報を更新します")
    table.put_item(Item=item, ConditionExpression="attribute_exists(userID)")
    
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
        # DynamoDBの情報を更新
        # ---------------
        body = parse_requestbody(event)
        userID = pathParameters_id(event)
            # --------------------
            # 400 リクエストチェック
            # --------------------
        if not body:
            return response_json(400, {"message": "リクエストが不正です"})
        if not check_request(body):
            return response_json(400, {"message": "必要な情報が不足しています"})
        
        new_users(body, userID)
        return response_json(201, {"message": f"ユーザー(userID:{userID})の情報を更新しました"})

    # ---------------------------
    # 一時的にサービスが利用できない
    # ---------------------------
    #どんなエラーがでる？

    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return response_json(404, {"message": "ユーザーが存在しません"})
    
        print(f"DynamoDBエラー：{e}")
        return response_json(
            500,
            {"message": "サーバーエラーが発生しました"}
        )

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

