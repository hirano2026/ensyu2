console.log("読み込み成功")
// URLからuserIDを取得
function getUserID() {
    const queryString = window.location.search;
    const params = new URLSearchParams(queryString);
    return params.get("userID");
}

// ユーザー情報を取得
async function fetchUser(APIurl){
    const response = await fetch(APIurl,{
        headers: {
            "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
        }
    });
    if (response.status === 404) {
        throw new Error("エラー：ユーザー情報の取得に失敗しました")
    }

    if (!response.ok) {
        throw new Error("ユーザー情報の取得に失敗しました");
    }

    return await response.json();
}

// ユーザー情報を表示
function displayUser(user, element) {
    element.innerHTML = `
        <tr>
            <th>ユーザーID</th>
            <td>${user.userID}</td>
        </tr>
        <tr>
            <th>氏名</th>
            <td>${user.name}</td>
        </tr>
        <tr>
            <th>メールアドレス</th>
            <td>${user.email}</td>
        </tr>
        <tr>
            <th>電話番号</th>
            <td>${user.phone ?? ""}</td>
        </tr>
        <tr>
            <th>生年月日</th>
            <td>${user.birth}</td>
        </tr>
    `;  
}

// 編集、削除ボタン
function displayButtons(userID, element) {
    element.innerHTML = `
        <a href="edit.html?userID=${userID}">編集する</a>
        <button id="delete-button">削除する</button>
    `
}

// ユーザーを削除
async function deleteUser(APIurl) {
    if (!confirm("本当に削除しますか？")) {
        return;
    }

    const response = await fetch(
        APIurl,
        {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
            }
        }
    );

    if (!response.ok) {
        throw new Error("ユーザーの削除に失敗しました");
    }

    alert("ユーザーを削除しました");
    window.location.href = "index.html";
}

// ユーザー情報をHTMLに表示しつつdeleteの処理もまとめて
async function loadUser(APIurl, userID, userElement, userDelete) {
    try {
        const user = await fetchUser(APIurl);

        displayUser(user, userElement);
        displayButtons(userID, userDelete);

        const deleteButton = document.getElementById("delete-button");

        deleteButton.addEventListener(
            "click",
            async function() {
                try {
                    await deleteUser(APIurl);
                } catch (error) {
                    console.error("エラー：",error.message);
                    alert("ユーザーの削除に失敗しました");
                }
            }
        );
    } catch (error) {
        // console.error("エラー：", error.message);

        // userElement.innerHTML = `
        //     <tr>
        //         <td>${error.message}</td>
        //     </tr>
        // `;
        console.error("エラー：", error.message);

        console.log("userElement:", userElement);
        console.log("表示処理の直前");

        userElement.innerHTML = `
            <tr>
                <td colspan="2">${error.message}</td>
            </tr>
        `;

        console.log("表示処理の直後");

    }
}

// main処理
const userID = getUserID();
// API
const APIurl = `${window.APP_CONFIG.API_URL}users/` + userID;
const userElement = document.getElementById("user-data");
const userDelete = document.getElementById("edit-delete");

loadUser(APIurl, userID, userElement, userDelete);