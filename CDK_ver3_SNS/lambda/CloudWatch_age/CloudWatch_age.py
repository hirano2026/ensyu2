# 参考：https://qiita.com/KantaHasegawa/items/3452543c7966bd56bd71
import os
import boto3
from collections import Counter
from datetime import datetime, timezone

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])

cloudwatch = boto3.client("cloudwatch")

NAMESPACE = "MemberManagement/AgeDistribution"
METRIC_NAME = "MemberCount"

# 10代から90代、100歳以上
AGE_GROUPS = [
    "under10", "10", "20", "30", "40", "50",
    "60", "70", "80", "90", "100over"
]


def get_all_users():
    items = []
    params = {}

    while True:
        response = table.scan(**params)
        items.extend(response.get("Items", []))

        last_key = response.get("LastEvaluatedKey")
        if not last_key:
            break

        params = {"ExclusiveStartKey": last_key}

    return items


def get_age_group(age):
    """年齢から年代ラベルを返す"""
    if age is None:
        return None

    try:
        age = int(age)
    except (ValueError, TypeError, OverflowError):
        return None

    if age < 10:
        return "under10"

    if age >= 100:
        return "100over"

    decade = (age // 10) * 10
    return f"{decade}"


def lambda_handler(event, context):
    users = get_all_users()
    counts = Counter()

    skipped = 0

    for user in users:
        group = get_age_group(user.get("age"))

        if group is None:
            skipped += 1
            continue

        counts[group] += 1

    # 人数0人の年代も送信する
    timestamp = datetime.now(timezone.utc)

    metric_data = [
        {
            "MetricName": METRIC_NAME,
            "Dimensions": [
                {"Name": "AgeGroup", "Value": group}
            ],
            "Timestamp": timestamp,
            "Value": counts[group],
            "Unit": "Count"
        }
        for group in AGE_GROUPS
    ]

    cloudwatch.put_metric_data(
        Namespace=NAMESPACE,
        MetricData=metric_data
    )

    result = {
        "total_users": len(users),
        "counted_users": sum(counts.values()),
        "skipped_users": skipped,
        "age_distribution": {
            group: counts[group] for group in AGE_GROUPS
        }
    }

    print(result)
    return result
