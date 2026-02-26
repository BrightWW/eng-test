#!/bin/bash

# English Test System - Status Check Script
# Author: Jack_CC_Lee
# Description: Check the status of all services

echo "📊 English Test System - 服務狀態"
echo "========================================"

# Color definitions
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Function to check service status
check_service() {
    local service_name=$1
    local pid_file=$2
    local port=$3
    
    echo -e "${BLUE}$service_name:${NC}"
    
    if [ -f "$pid_file" ]; then
        PID=$(cat "$pid_file")
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "  狀態: ${GREEN}運行中${NC}"
            echo -e "  PID: $PID"
            echo -e "  Port: $port"
            
            # Check if port is listening
            if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
                echo -e "  監聽: ${GREEN}正常${NC}"
            else
                echo -e "  監聽: ${RED}端口未開啟${NC}"
            fi
        else
            echo -e "  狀態: ${RED}已停止${NC} (PID 文件存在但進程不存在)"
        fi
    else
        echo -e "  狀態: ${YELLOW}未啟動${NC}"
        
        # Check if something else is using the port
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            PORT_PID=$(lsof -ti:$port)
            echo -e "  警告: ${YELLOW}Port $port 被其他進程佔用 (PID: $PORT_PID)${NC}"
        fi
    fi
    echo ""
}

# Check backend
check_service "後端伺服器" "logs/backend.pid" "5000"

# Check frontend
check_service "前端伺服器" "logs/frontend.pid" "3000"

echo "========================================"
echo -e "${BLUE}網路資訊:${NC}"
echo "  本機 IP: 127.0.0.1"
echo "  內網 IP: 10.248.226.81"
echo ""
echo -e "${BLUE}訪問地址:${NC}"
if [ -f "logs/frontend.pid" ] && ps -p $(cat logs/frontend.pid) > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ http://10.248.226.81:3000${NC}"
else
    echo -e "  ${RED}❌ 前端未運行${NC}"
fi
echo "========================================"
