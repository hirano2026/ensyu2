// APIからユーザー一覧を取得

const hash = new URLSearchParams(
    window.location.hash.substring(1)
);

const accessTokenUrl = hash.get("access_token");

let accessToken;

if (accessTokenUrl) {
    localStorage.setItem("accessToken", accessTokenUrl);

    accessToken = accessTokenUrl;

    history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
    );
} else {
    accessToken = localStorage.getItem("accessToken");
}

if (!accessToken) {
    console.error("アクセストークンを取得できませんでした")
} else {
    fetchUsers();
}

async function fetchUsers() {
    try {
        const response = await fetch(`${window.APP_CONFIG.API_URL}users`,{
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error("一覧情報の取得に失敗しました");
        }

    const users = await response.json();

    displayUsers(users);
    } catch (error) {
        console.error("エラー：", error.message);
    }
}

// ユーザー一覧を表示
function displayUsers(users) {
    const userList = document.getElementById("user-list");

    for (const user of users) {
    const row = document.createElement("tr");

    row.innerHTML = `
        <td><a href="show.html?userID=${user.userID}">${user.name}</a></td>
        <td>${user.email}</td>
        <td>${user.phone ?? ""}</td>
    `;

    userList.appendChild(row);
    }
}

