#!/bin/bash

# English Test System - Production Start Script
# Author: Jack_CC_Lee
# Description: Start frontend and backend servers for LAN access

echo "🚀 啟動 English Test System (生產環境)"
echo "========================================"

# Color definitions
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}⚠️  Port $port is already in use${NC}"
        return 1
    fi
    return 0
}

# Check if required ports are available
echo -e "${BLUE}📡 檢查端口狀態...${NC}"
check_port 5000
BACKEND_PORT_STATUS=$?
check_port 3000
FRONTEND_PORT_STATUS=$?

if [ $BACKEND_PORT_STATUS -ne 0 ] || [ $FRONTEND_PORT_STATUS -ne 0 ]; then
    echo -e "${YELLOW}請先停止佔用端口的程序，或使用 ./stop.sh 停止現有服務${NC}"
    exit 1
fi

# Start backend server
echo -e "${BLUE}🔧 啟動後端伺服器 (Port 5000)...${NC}"
cd server
NODE_ENV=production node index.js > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../logs/backend.pid
cd ..
echo -e "${GREEN}✅ 後端已啟動 (PID: $BACKEND_PID)${NC}"

# Wait for backend to be ready
sleep 3

# Start frontend server
echo -e "${BLUE}🎨 啟動前端伺服器 (Port 3000)...${NC}"
cd client

# Check if build directory exists, if not, build it
if [ ! -d "build" ]; then
    echo -e "${YELLOW}📦 首次部署，正在構建前端...${NC}"
    npm run build
fi

# Serve the built frontend
npx serve -s build -l 3000 > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../logs/frontend.pid
cd ..
echo -e "${GREEN}✅ 前端已啟動 (PID: $FRONTEND_PID)${NC}"

echo ""
echo "========================================"
echo -e "${GREEN}🎉 系統啟動完成！${NC}"
echo ""
echo "📍 訪問地址："
echo "   本機訪問: http://localhost:3000"
echo "   內網訪問: http://10.248.226.81:3000"
echo ""
echo "📍 API 地址："
echo "   本機訪問: http://localhost:5000/api"
echo "   內網訪問: http://10.248.226.81:5000/api"
echo ""
echo "📊 日誌文件："
echo "   後端日誌: logs/backend.log"
echo "   前端日誌: logs/frontend.log"
echo ""
echo "🛑 停止服務: ./stop.sh"
echo "📈 查看狀態: ./status.sh"
echo "========================================"
