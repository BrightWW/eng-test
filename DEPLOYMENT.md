# 部署說明文件 (Deployment Guide)

## 📋 系統資訊

- **內網 IP**: <YOUR_SERVER_IP>
- **前端 Port**: 3000
- **後端 Port**: 5000
- **資料庫**: SQLite3 (server/db/)

## 🚀 快速部署步驟

### 首次部署

1. **安裝所有依賴**
   ```bash
   npm run install:all
   ```

2. **安裝 serve 套件 (用於服務前端)**
   ```bash
   cd client && npm install serve && cd ..
   ```

3. **初始化資料庫**
   ```bash
   cd server && npm run init-db && cd ..
   ```

4. **構建前端應用**
   ```bash
   ./build.sh
   ```

5. **啟動服務**
   ```bash
   ./start_prod.sh
   ```

### 日常操作

#### 啟動服務
```bash
./start_prod.sh
```

#### 停止服務
```bash
./stop.sh
```

#### 查看狀態
```bash
./status.sh
```

#### 查看日誌
```bash
# 後端日誌
tail -f logs/backend.log

# 前端日誌
tail -f logs/frontend.log
```

## 🌐 訪問地址

### 本地訪問（在伺服器上）
- 前端: http://localhost:3000
- 後端 API: http://localhost:5000/api

### 內網訪問（局域網內其他電腦）
- **前端**: http://<YOUR_SERVER_IP>:3000
- **後端 API**: http://<YOUR_SERVER_IP>:5000/api
- **健康檢查**: http://<YOUR_SERVER_IP>:5000/api/health

## 👥 預設帳號

### 教師帳號
- **帳號**: teacher
- **密碼**: teacher123

### 學生
- 無需密碼，直接輸入名字即可進入

## 🔧 配置文件說明

### 後端配置 (`server/.env.production`)
```env
PORT=5000
JWT_SECRET=eng-test-production-secret-key-2026
NODE_ENV=production
HOST=0.0.0.0
```

### 前端配置 (`client/.env.production`)
```env
REACT_APP_API_URL=http://<YOUR_SERVER_IP>:5000
```

## 📁 重要文件位置

```
eng-test/
├── server/
│   ├── .env.production      # 後端生產環境配置
│   ├── db/                  # SQLite 資料庫目錄
│   └── index.js             # 後端入口文件
├── client/
│   ├── .env.production      # 前端生產環境配置
│   ├── build/               # 前端構建產物
│   └── src/                 # 前端源碼
├── logs/
│   ├── backend.log          # 後端日誌
│   ├── backend.pid          # 後端進程 ID
│   ├── frontend.log         # 前端日誌
│   └── frontend.pid         # 前端進程 ID
├── start_prod.sh            # 啟動腳本
├── stop.sh                  # 停止腳本
├── status.sh                # 狀態檢查腳本
└── build.sh                 # 前端構建腳本
```

## 🔥 防火牆設置（如需要）

如果其他電腦無法訪問，可能需要開放防火牆端口：

```bash
# CentOS/RHEL/Rocky Linux
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --reload

# Ubuntu/Debian
sudo ufw allow 3000/tcp
sudo ufw allow 5000/tcp
sudo ufw reload
```

## 🐛 故障排除

### 問題：端口已被佔用
```bash
# 查看佔用端口的進程
lsof -i :3000
lsof -i :5000

# 停止服務
./stop.sh
```

### 問題：其他電腦無法訪問
1. 檢查防火牆設置
2. 確認 IP 地址正確
3. 確認服務正在運行：`./status.sh`

### 問題：後端連接失敗
1. 檢查後端日誌：`tail -f logs/backend.log`
2. 測試後端健康檢查：`curl http://<YOUR_SERVER_IP>:5000/api/health`

### 問題：前端顯示錯誤
1. 檢查前端日誌：`tail -f logs/frontend.log`
2. 重新構建前端：`./build.sh`
3. 清除瀏覽器快取

## 🔄 更新部署

當程式碼有更新時：

```bash
# 1. 停止服務
./stop.sh

# 2. 更新代碼
git pull  # 如果使用 git

# 3. 重新安裝依賴（如有變更）
npm run install:all

# 4. 重新構建前端
./build.sh

# 5. 啟動服務
./start_prod.sh
```

## 📞 技術支援

如有問題，請聯繫系統管理員或查看：
- 後端日誌: `logs/backend.log`
- 前端日誌: `logs/frontend.log`
- 系統狀態: `./status.sh`

---

**最後更新**: 2026-02-25
**維護者**: Jack_CC_Lee
