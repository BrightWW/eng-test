#!/bin/bash

# English Test System - Stop Script
# Author: Jack_CC_Lee
# Description: Stop all running services

echo "🛑 停止 English Test System"
echo "========================================"

# Color definitions
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Function to stop process by PID file
stop_process() {
    local service_name=$1
    local pid_file=$2
    
    if [ -f "$pid_file" ]; then
        PID=$(cat "$pid_file")
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "${YELLOW}停止 $service_name (PID: $PID)...${NC}"
            kill $PID
            sleep 2
            # Force kill if still running
            if ps -p $PID > /dev/null 2>&1; then
                echo -e "${RED}強制停止 $service_name...${NC}"
                kill -9 $PID
            fi
            echo -e "${GREEN}✅ $service_name 已停止${NC}"
        else
            echo -e "${YELLOW}⚠️  $service_name 進程不存在 (PID: $PID)${NC}"
        fi
        rm -f "$pid_file"
    else
        echo -e "${YELLOW}⚠️  找不到 $service_name 的 PID 文件${NC}"
    fi
}

# Stop backend
stop_process "後端伺服器" "logs/backend.pid"

# Stop frontend
stop_process "前端伺服器" "logs/frontend.pid"

# Also try to kill by port (fallback)
echo ""
echo -e "${YELLOW}檢查並清理端口...${NC}"

# Kill process on port 5000
PORT_5000_PID=$(lsof -ti:5000 2>/dev/null)
if [ ! -z "$PORT_5000_PID" ]; then
    echo -e "${YELLOW}清理 Port 5000 上的進程...${NC}"
    kill -9 $PORT_5000_PID 2>/dev/null
fi

# Kill process on port 3000
PORT_3000_PID=$(lsof -ti:3000 2>/dev/null)
if [ ! -z "$PORT_3000_PID" ]; then
    echo -e "${YELLOW}清理 Port 3000 上的進程...${NC}"
    kill -9 $PORT_3000_PID 2>/dev/null
fi

echo ""
echo "========================================"
echo -e "${GREEN}🎉 所有服務已停止${NC}"
echo "========================================"
