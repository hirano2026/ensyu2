// formから登録情報を取得
function getFormData(){
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;
    const birth = document.getElementById("birth").value;

    return {
        name: name,
        email: email,
        phone: phone,
        birth: birth
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

// 新規登録
async function createUser(APIurl, requestBody) {
    const response = await fetch(
        APIurl,
        {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
            },
            body: JSON.stringify(requestBody)
        }
    );

    if (!response.ok) {
        throw new Error("ユーザーの登録に失敗しました");
    }
}

// main処理
const form = document.getElementById("user-form");
const APIurl = `${window.APP_CONFIG.API_URL}users`;

form.addEventListener(
    "submit",
    async function(event) {
        event.preventDefault();

        const requestBody = getFormData();

        if (!checkFormat(requestBody)) {
            return;
        }

        try {
            await createUser(APIurl, requestBody);

            window.location.href = "index.html";
        } catch (error) {
            console.error("エラー：",error.message);
            alert("ユーザーの登録に失敗しました");
        }
    }
);