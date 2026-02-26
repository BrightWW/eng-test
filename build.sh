#!/bin/bash

# English Test System - Build Frontend Script
# Author: Jack_CC_Lee
# Description: Build frontend for production deployment

echo "📦 構建前端應用程式"
echo "========================================"

# Color definitions
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/client"

echo -e "${BLUE}🔍 檢查 node_modules...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📥 安裝依賴套件...${NC}"
    npm install
fi

echo -e "${BLUE}🔨 開始構建...${NC}"
echo -e "${YELLOW}API URL: http://10.248.226.81:5000${NC}"
echo ""

# Set environment and build
NODE_ENV=production npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo -e "${GREEN}✅ 構建完成！${NC}"
    echo ""
    echo "構建結果位於: client/build/"
    echo ""
    echo "下一步: 執行 ./start_prod.sh 啟動服務"
    echo "========================================"
else
    echo ""
    echo "========================================"
    echo -e "${RED}❌ 構建失敗${NC}"
    echo "請檢查錯誤訊息並修復問題"
    echo "========================================"
    exit 1
fi
