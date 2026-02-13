# 英文測驗系統 (English Test System)

多人線上英文測驗平台，支援學生作答與教師出題批改。

## 功能特色

- ✅ **多人同時作答**：每位學生只能看到自己的作答內容
- ✅ **教師出題介面**：支援多種題型（選擇題、填空題、改寫句子）
- ✅ **教師批改系統**：交卷後由教師進行批註與評分
- ✅ **靈活題型設計**：易於擴展新題型

## 技術架構

- **前端**：React 18 + React Router + Axios
- **後端**：Node.js + Express
- **資料庫**：SQLite3
- **認證**：JWT (教師) / 名字識別 (學生)

## 專案結構

```
eng-test/
├── client/          # React 前端
├── server/          # Node.js 後端
├── package.json     # 根目錄 scripts
└── README.md
```

## 安裝與啟動

### 1. 安裝所有依賴

```bash
npm run install:all
```

### 2. 初始化資料庫

```bash
cd server
npm run init-db
```

### 3. 啟動開發伺服器

```bash
# 從根目錄同時啟動前後端
npm run dev
```

或分別啟動：

```bash
# 終端機 1 - 啟動後端 (port 5000)
npm run server

# 終端機 2 - 啟動前端 (port 3000)
npm run client
```

### 4. 訪問應用

- 前端：http://localhost:3000
- 後端 API：http://localhost:5000

## 預設帳號

### 教師帳號
- 帳號：`teacher`
- 密碼：`teacher123`

### 學生
- 無需密碼，直接輸入名字即可進入測驗

## 使用流程

### 學生端
1. 輸入名字進入系統
2. 查看當前測驗並開始作答
3. 完成後交卷
4. 等待教師批改並查看結果

### 教師端
1. 使用帳號密碼登入
2. 建立測驗並新增題目
3. 查看學生提交
4. 逐題批改並給予評語
5. 學生即可看到批改結果

## License

MIT
