// URLからuserIDを取得
function getUserID() {
    const queryString = window.location.search;
    const params = new URLSearchParams(queryString);
    return params.get("userID");
}

// ユーザー情報を取得
async function fetchUser(APIurl){
    const response = await fetch(APIurl);

    if (!response.ok) {
        throw new Error("ユーザー情報の取得に失敗しました");
    }

    return await response.json();
}

// ユーザー情報（デフォルト値）をformに表示
function formUser(user, element) {
   element.elements["name"].value = user.name;
   element.elements["email"].value = user.email;
   element.elements["phone"].value = user.phone ?? "";
   element.elements["birth"].value = user.birth; 
}

// formから更新情報を取得
function getFormData(formElement) {
    const formData = new FormData(formElement);

    return {
        name: formData.get("name"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        birth: formData.get("birth")
    };
}

// 入力データのフォーマット確認
function checkFormat(formData) {
    const birthPattern = /^\d{4}-\d{2}-\d{2}$/;
    //const phonePattern = /^0\d{1,3}-\d{2,4}-\d{4}$/;
    const checkHyphen = /^0\d{9,10}$/;

    if (!birthPattern.test(formData.birth)) {
        alert("生年月日はYYYY-MM-DD形式で入力してください（例：2000-02-03）");
        return false;
    }

    if(!checkHyphen.test(formData.phone)) {
        alert("電話番号の形式が正しくありません。ハイフンなしで入力してください(例：0312345678)");
        return false;
    }
    
    return true;
}


// 更新
async function updateUser(APIurl, requestBody) {
    const response = await fetch(
        APIurl,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        }
    );

    if (response.status === 404) {
        throw new Error("ユーザーが存在しません")
    }

    if (!response.ok) {
        throw new Error("ユーザー情報の更新に失敗しました");
    }
}

// main処理
async function main() {
    const userID = getUserID();
    const form = document.getElementById("user-form");

    if (!userID) {
        alert("ユーザーIDが不明です");
        return;
    }

    const APIurl = `${window.APP_CONFIG.API_URL}users/` + userID;

    try {
        const user = await fetchUser(APIurl);

        formUser(user, form);
    } catch (error) {
        console.error("エラー：", error.message);
        alert(error.message);
        
        return;
    }

    // ここまでformに表示する画面の処理
    // ここから更新

    form.addEventListener("submit", async function(event) {
        event.preventDefault();

        const requestBody = getFormData(form);

        if (!checkFormat(requestBody)) {
            return;
        }

        try {
            await updateUser(APIurl, requestBody);

            alert("ユーザー情報を更新しました");

            window.location.href = "show.html?userID=" + userID;
        } catch (error) {
            console.error("エラー：", error.message);
            alert(error.message);
        }
    });
}  

main();