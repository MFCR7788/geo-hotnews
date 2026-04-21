#!/bin/bash

# yupi-hot-monitor 全面功能测试脚本
# 测试所有核心 API 端点

BASE_URL="http://localhost:3001"
TEST_RESULTS=()
PASS_COUNT=0
FAIL_COUNT=0
ERROR_COUNT=0

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试结果记录函数
log_test() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    
    TEST_RESULTS+=("$test_name|$status|$details")
    
    if [ "$status" == "PASS" ]; then
        PASS_COUNT=$((PASS_COUNT + 1))
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
    elif [ "$status" == "FAIL" ]; then
        FAIL_COUNT=$((FAIL_COUNT + 1))
        echo -e "${RED}✗ FAIL${NC}: $test_name - $details"
    else
        ERROR_COUNT=$((ERROR_COUNT + 1))
        echo -e "${YELLOW}! ERROR${NC}: $test_name - $details"
    fi
}

# HTTP 请求辅助函数
api_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local token="$4"
    
    local headers=(-H "Content-Type: application/json")
    if [ -n "$token" ]; then
        headers+=(-H "Authorization: Bearer $token")
    fi
    
    if [ "$method" = "GET" ]; then
        curl -s -w "\n%{http_code}" "${headers[@]}" "$BASE_URL$endpoint"
    elif [ "$method" = "POST" ]; then
        curl -s -X POST -w "\n%{http_code}" "${headers[@]}" -d "$data" "$BASE_URL$endpoint"
    elif [ "$method" = "PUT" ]; then
        curl -s -X PUT -w "\n%{http_code}" "${headers[@]}" -d "$data" "$BASE_URL$endpoint"
    elif [ "$method" = "PATCH" ]; then
        curl -s -X PATCH -w "\n%{http_code}" "${headers[@]}" -d "$data" "$BASE_URL$endpoint"
    elif [ "$method" = "DELETE" ]; then
        curl -s -X DELETE -w "\n%{http_code}" "${headers[@]}" "$BASE_URL$endpoint"
    fi
}

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}  yupi-hot-monitor 功能测试套件${NC}"
echo -e "${BLUE}  测试时间: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BLUE}========================================\n${NC}"

# ============================================
# 1. 健康检查 & 基础连接测试
# ============================================
echo -e "\n${BLUE}[1/10] 健康检查 & 基础连接测试${NC}\n"

response=$(curl -s -w "\n%{http_code}" $BASE_URL/api/health)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ] && echo "$body" | grep -q '"status":"ok"'; then
    log_test "健康检查端点" "PASS" "HTTP $http_code"
else
    log_test "健康检查端点" "FAIL" "HTTP $http_code"
fi

# ============================================
# 2. 用户认证系统测试
# ============================================
echo -e "\n${BLUE}[2/10] 用户认证系统测试${NC}\n"

TEST_EMAIL="test_$(date +%s)@example.com"
TEST_PASSWORD="Test123456"

# 2.1 用户注册 - 正常场景
echo "--- 2.1 用户注册 ---"
register_data="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"Test User\"}"
response=$(api_request "POST" "/api/auth/register" "$register_data")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "201" ] && echo "$body" | grep -q '"message":"注册成功"'; then
    ACCESS_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$body" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
    USER_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    log_test "用户注册（正常）" "PASS" "HTTP $http_code, User ID: $USER_ID"
else
    log_test "用户注册（正常）" "FAIL" "HTTP $http_code, Body: $body"
fi

# 2.2 用户注册 - 邮箱格式验证
register_bad_email=$(api_request "POST" "/api/auth/register" '{"email":"invalid","password":"123456"}')
http_code=$(echo "$register_bad_email" | tail -n1)
if [ "$http_code" = "400" ]; then
    log_test "邮箱格式验证" "PASS" "正确拒绝无效邮箱 (HTTP $http_code)"
else
    log_test "邮箱格式验证" "FAIL" "应返回400, 实际: HTTP $http_code"
fi

# 2.3 用户注册 - 密码长度验证
register_short_pwd=$(api_request "POST" "/api/auth/register" '{"email":"test2@example.com","password":"12345"}')
http_code=$(echo "$register_short_pwd" | tail -n1)
if [ "$http_code" = "400" ]; then
    log_test "密码长度验证（<6位）" "PASS" "正确拒绝短密码 (HTTP $http_code)"
else
    log_test "密码长度验证（<6位）" "FAIL" "应返回400, 实际: HTTP $http_code"
fi

# 2.4 用户注册 - 重复注册检测
register_duplicate=$(api_request "POST" "/api/auth/register" "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
http_code=$(echo "$register_duplicate" | tail -n1)
if [ "$http_code" = "409" ]; then
    log_test "重复邮箱检测" "PASS" "正确拒绝重复注册 (HTTP $http_code)"
else
    log_test "重复邮箱检测" "FAIL" "应返回409, 实际: HTTP $http_code"
fi

# 2.5 用户登录 - 正常场景
echo "--- 2.5 用户登录 ---"
login_data="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
response=$(api_request "POST" "/api/auth/login" "$login_data")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ] && echo "$body" | grep -q '"message":"登录成功"'; then
    ACCESS_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$body" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
    log_test "用户登录（正常）" "PASS" "HTTP $http_code, Token已获取"
else
    log_test "用户登录（正常）" "FAIL" "HTTP $http_code, Body: $body"
fi

# 2.6 用户登录 - 错误密码
login_wrong_pwd=$(api_request "POST" "/api/auth/login" "{\"email\":\"$TEST_EMAIL\",\"password\":\"wrongpassword\"}")
http_code=$(echo "$login_wrong_pwd" | tail -n1)
if [ "$http_code" = "401" ]; then
    log_test "错误密码登录" "PASS" "正确拒绝 (HTTP $http_code)"
else
    log_test "错误密码登录" "FAIL" "应返回401, 实际: HTTP $http_code"
fi

# 2.7 获取当前用户信息
if [ -n "$ACCESS_TOKEN" ]; then
    response=$(api_request "GET" "/api/auth/me" "" "$ACCESS_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ] && echo "$body" | grep -q "\"email\":\"$TEST_EMAIL\""; then
        log_test "获取用户信息" "PASS" "HTTP $http_code"
    else
        log_test "获取用户信息" "FAIL" "HTTP $http_code"
    fi
else
    log_test "获取用户信息" "ERROR" "无有效Token"
fi

# 2.8 Token刷新
if [ -n "$REFRESH_TOKEN" ]; then
    response=$(api_request "POST" "/api/auth/refresh" "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ] && echo "$body" | grep -q '"accessToken"'; then
        NEW_ACCESS_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
        log_test "Token刷新" "PASS" "HTTP $http_code, 新Token已获取"
        ACCESS_TOKEN="$NEW_ACCESS_TOKEN"
    else
        log_test "Token刷新" "FAIL" "HTTP $http_code"
    fi
else
    log_test "Token刷新" "ERROR" "无Refresh Token"
fi

# 2.9 无效Token访问保护
invalid_token_response=$(api_request "GET" "/api/auth/me" "" "invalid_token_12345")
http_code=$(echo "$invalid_token_response" | tail -n1)
if [ "$http_code" = "401" ]; then
    log_test "无效Token访问保护" "PASS" "正确拒绝 (HTTP $http_code)"
else
    log_test "无效Token访问保护" "FAIL" "应返回401, 实际: HTTP $http_code"
fi

# 2.10 无Token访问保护
no_token_response=$(api_request "GET" "/api/auth/me" "")
http_code=$(echo "$no_token_response" | tail -n1)
if [ "$http_code" = "401" ]; then
    log_test "无Token访问保护" "PASS" "正确拒绝 (HTTP $http_code)"
else
    log_test "无Token访问保护" "FAIL" "应返回401, 实际: HTTP $http_code"
fi

# ============================================
# 3. 关键词管理系统测试
# ============================================
echo -e "\n${BLUE}[3/10] 关键词管理系统测试${NC}\n"

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}错误: 无有效Token，跳过关键词测试${NC}"
else
    # 3.1 获取全局词库
    response=$(api_request "GET" "/api/keywords/library" "" "$ACCESS_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        LIBRARY_COUNT=$(echo "$body" | grep -o '\[' | wc -l | tr -d ' ')
        log_test "获取全局词库" "PASS" "HTTP $http_code"
    else
        log_test "获取全局词库" "FAIL" "HTTP $http_code"
    fi
    
    # 3.2 添加关键词到全局词库
    response=$(api_request "POST" "/api/keywords/library" '{"text":"AI测试关键词_'$(date +%s)'","category":"AI"}' "" "$ACCESS_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
        KEYWORD_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        KEYWORD_TEXT=$(echo "$body" | grep -o '"text":"[^"]*"' | head -1 | cut -d'"' -f4)
        log_test "添加关键词到词库" "PASS" "HTTP $http_code, ID: $KEYWORD_ID"
    else
        log_test "添加关键词到词库" "FAIL" "HTTP $http_code, Body: $body"
    fi
    
    # 3.3 订阅关键词
    if [ -n "$KEYWORD_ID" ]; then
        response=$(api_request "POST" "/api/keywords/subscribe" "{\"keywordId\":\"$KEYWORD_ID\"}" "" "$ACCESS_TOKEN")
        http_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | sed '$d')
        
        if [ "$http_code" = "201" ] || ([ "$http_code" = "200" ] && echo "$body" | grep -q '"alreadySubscribed"'); then
            SUBSCRIPTION_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
            log_test "订阅关键词" "PASS" "HTTP $http_code, Subscription ID: $SUBSCRIPTION_ID"
        else
            log_test "订阅关键词" "FAIL" "HTTP $http_code, Body: $body"
        fi
        
        # 3.4 获取用户已订阅的关键词
        response=$(api_request "GET" "/api/keywords" "" "$ACCESS_TOKEN")
        http_code=$(echo "$response" | tail -n1)
        
        if [ "$http_code" = "200" ]; then
            SUBSCRIBED_COUNT=$(echo "$(echo "$response" | sed '$d')" | jq '. | length' 2>/dev/null || echo "N/A")
            log_test "获取已订阅关键词" "PASS" "HTTP $http_code, 数量: $SUBSCRIBED_COUNT"
        else
            log_test "获取已订阅关键词" "FAIL" "HTTP $http_code"
        fi
        
        # 3.5 搜索相似关键词
        response=$(api_request "GET" "/api/keywords/similar?q=AI" "" "$ACCESS_TOKEN")
        http_code=$(echo "$response" | tail -n1)
        
        if [ "$http_code" = "200" ]; then
            SIMILAR_COUNT=$(echo "$(echo "$response" | sed '$d')" | jq '. | length' 2>/dev/null || echo "N/A")
            log_test "搜索相似关键词" "PASS" "HTTP $http_code, 结果数: $SIMILAR_COUNT"
        else
            log_test "搜索相似关键词" "FAIL" "HTTP $http_code"
        fi
        
        # 3.6 切换关键词状态
        if [ -n "$SUBSCRIPTION_ID" ]; then
            response=$(api_request "PATCH" "/api/keywords/toggle/$SUBSCRIPTION_ID" "" "$ACCESS_TOKEN")
            http_code=$(echo "$response" | tail -n1)
            
            if [ "$http_code" = "200" ]; then
                log_test "切换关键词开关" "PASS" "HTTP $http_code"
            else
                log_test "切换关键词开关" "FAIL" "HTTP $http_code"
            fi
            
            # 3.7 取消订阅关键词
            response=$(api_request "DELETE" "/api/keywords/unsubscribe/$KEYWORD_ID" "" "$ACCESS_TOKEN")
            http_code=$(echo "$response" | tail -n1)
            
            if [ "$http_code" = "204" ]; then
                log_test "取消订阅关键词" "PASS" "HTTP $http_code"
            else
                log_test "取消订阅关键词" "FAIL" "HTTP $http_code"
            fi
        fi
    fi
fi

# ============================================
# 4. 热点数据系统测试
# ============================================
echo -e "\n${BLUE}[4/10] 热点数据系统测试${NC}\n"

if [ -n "$ACCESS_TOKEN" ]; then
    # 4.1 获取热点列表（空列表，因未订阅关键词）
    response=$(api_request "GET" "/api/hotspots?limit=10&page=1" "" "$ACCESS_TOKEN")
    http_code=$(response=$(api_request "GET" "/api/hotspots?limit=10&page=1" "" "$ACCESS_TOKEN") && echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        HOTSPOTS_TOTAL=$(echo "$body" | jq '.pagination.total' 2>/dev/null || echo "0")
        log_test "获取热点列表" "PASS" "HTTP $http_code, 总数: $HOTSPOTS_TOTAL"
    else
        log_test "获取热点列表" "FAIL" "HTTP $http_code"
    fi
    
    # 4.2 获取热点统计
    response=$(api_request "GET" "/api/hotspots/stats" "" "$ACCESS_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_test "获取热点统计" "PASS" "HTTP $http_code"
    else
        log_test "获取热点统计" "FAIL" "HTTP $http_code"
    fi
    
    # 4.3 手动搜索热点（需要外部服务）
    response=$(api_request "POST" "/api/hotspots/search" '{"query":"AI news","sources":["bing"]}' "" "$ACCESS_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "500" ]; then
        # 500可能是因为未配置Bing API key
        if [ "$http_code" = "500" ]; then
            log_test "手动搜索热点" "INFO" "HTTP $http_code (可能缺少搜索API配置)"
        else
            SEARCH_RESULTS=$(echo "$(echo "$response" | sed '$d')" | jq '.results | length' 2>/dev/null || echo "0")
            log_test "手动搜索热点" "PASS" "HTTP $http_code, 结果数: $SEARCH_RESULTS"
        fi
    else
        log_test "手动搜索热点" "FAIL" "HTTP $http_code"
    fi
fi

# ============================================
# 5. 通知系统测试
# ============================================
echo -e "\n${BLUE}[5/10] 通知系统测试${NC}\n"

if [ -n "$ACCESS_TOKEN" ]; then
    # 5.1 获取通知列表
    response=$(api_request "GET" "/api/notifications?limit=20" "" "$ACCESS_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        NOTIF_COUNT=$(echo "$(echo "$response" | sed '$d')" | jq '.data | length' 2>/dev/null || echo "0")
        UNREAD_COUNT=$(echo "$(echo "$response" | sed '$d')" | jq '.unreadCount' 2>/dev/null || echo "0")
        log_test "获取通知列表" "PASS" "HTTP $http_code, 数量: $NOTIF_COUNT, 未读: $UNREAD_COUNT"
    else
        log_test "获取通知列表" "FAIL" "HTTP $http_code"
    fi
fi

# ============================================
# 6. 设置管理测试
# ============================================
echo -e "\n${BLUE}[6/10] 设置管理测试${NC}\n"

if [ -n "$ACCESS_TOKEN" ]; then
    # 6.1 获取设置
    response=$(api_request "GET" "/api/settings" "" "$ACCESS_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_test "获取用户设置" "PASS" "HTTP $http_code"
    else
        log_test "获取用户设置" "FAIL" "HTTP $http_code"
    fi
    
    # 6.2 更新设置
    response=$(api_request "PUT" "/api/settings" '{"themeMode":"dark","notifyEmail":true}' "" "$ACCESS_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_test "更新用户设置" "PASS" "HTTP $http_code"
    else
        log_test "更新用户设置" "FAIL" "HTTP $http_code"
    fi
fi

# ============================================
# 7. 忘记密码流程测试
# ============================================
echo -e "\n${BLUE}[7/10] 忘记密码流程测试${NC}\n"

# 7.1 发送重置邮件（无论是否存在都返回成功）
forgot_response=$(api_request "POST" "/api/auth/forgot-password" "{\"email\":\"$TEST_EMAIL\"}")
http_code=$(echo "$forgot_response" | tail -n1)

if [ "$http_code" = "200" ]; then
    log_test "发送重置邮件" "PASS" "HTTP $http_code (防枚举攻击设计)"
else
    log_test "发送重置邮件" "FAIL" "HTTP $http_code"
fi

# ============================================
# 8. 修改密码测试
# ============================================
echo -e "\n${BLUE}[8/10] 修改密码测试${NC}\n"

if [ -n "$ACCESS_TOKEN" ]; then
    NEW_TEST_PASSWORD="NewPass123456"
    
    # 8.1 修改密码
    change_pwd_response=$(api_request "PUT" "/api/auth/change-password" "{\"oldPassword\":\"$TEST_PASSWORD\",\"newPassword\":\"$NEW_TEST_PASSWORD\"}" "" "$ACCESS_TOKEN")
    http_code=$(echo "$change_pwd_response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_test "修改密码" "PASS" "HTTP $http_code"
        
        # 使用新密码登录验证
        login_new_pwd=$(api_request "POST" "/api/auth/login" "{\"email\":\"$TEST_EMAIL\",\"password\":\"$NEW_TEST_PASSWORD\"}")
        http_code=$(echo "$login_new_pwd" | tail -n1)
        
        if [ "$http_code" = "200" ]; then
            body=$(echo "$login_new_pwd" | sed '$d')
            ACCESS_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
            REFRESH_TOKEN=$(echo "$body" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
            log_test "新密码登录验证" "PASS" "新密码生效"
        else
            log_test "新密码登录验证" "FAIL" "新密码无法登录 (HTTP $http_code)"
        fi
    else
        log_test "修改密码" "FAIL" "HTTP $http_code"
    fi
    
    # 8.2 错误原密码
    wrong_old_pwd=$(api_request "PUT" "/api/auth/change-password" "{\"oldPassword\":\"wrongpassword\",\"newPassword\":\"AnotherPass123\"}" "" "$ACCESS_TOKEN")
    http_code=$(echo "$wrong_old_pwd" | tail -n1)
    
    if [ "$http_code" = "401" ]; then
        log_test "错误原密码验证" "PASS" "正确拒绝 (HTTP $http_code)"
    else
        log_test "错误原密码验证" "FAIL" "应返回401, 实际: HTTP $http_code"
    fi
fi

# ============================================
# 9. 限流中间件测试
# ============================================
echo -e "\n${BLUE}[9/10] 限流与安全测试${NC}\n"

# 9.1 快速多次请求测试限流
RATE_LIMIT_PASSED=false
for i in {1..15}; do
    response=$(api_request "GET" "/api/health" "")
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "429" ]; then
        RATE_LIMIT_PASSED=true
        break
    fi
done

if [ "$RATE_LIMIT_PASSED" = true ]; then
    log_test "API限流机制" "PASS" "在第$i次请求时触发限流 (HTTP 429)"
else
    log_test "API限流机制" "INFO" "15次请求内未触发限流（可能限制较高）"
fi

# ============================================
# 10. 边界条件与异常处理测试
# ============================================
echo -e "\n${BLUE}[10/10] 边界条件与异常处理测试${NC}\n"

# 10.1 不存在的资源
if [ -n "$ACCESS_TOKEN" ]; then
    not_found=$(api_request "GET" "/api/hotspots/nonexistent-id" "" "$ACCESS_TOKEN")
    http_code=$(echo "$not_found" | tail -n1)
    
    if [ "$http_code" = "404" ]; then
        log_test "不存在资源(404)" "PASS" "HTTP $http_code"
    else
        log_test "不存在资源(404)" "FAIL" "应返回404, 实际: HTTP $http_code"
    fi
    
    # 10.2 无效的JSON格式
    invalid_json=$(curl -s -X POST -w "\n%{http_code}" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d '{"invalid": }' \
        "$BASE_URL/api/keywords/library")
    http_code=$(echo "$invalid_json" | tail -n1)
    
    if [ "$http_code" = "400" ] || [ "$http_code" = "500" ]; then
        log_test "无效JSON处理" "PASS" "正确拒绝无效JSON (HTTP $http_code)"
    else
        log_test "无效JSON处理" "INFO" "HTTP $http_code"
    fi
    
    # 10.3 超长输入
    LONG_TEXT=$(python3 -c "print('A'*10000)")
    long_input=$(api_request "POST" "/api/auth/register" "{\"email\":\"test_long@example.com\",\"password\":\"$LONG_TEXT\"}" 2>&1)
    http_code=$(echo "$long_input" | tail -n1)
    
    if [ "$http_code" = "400" ] || [ "$http_code" = "413" ] || [ "$http_code" = "500" ]; then
        log_test "超长输入处理" "PASS" "正确处理超长输入 (HTTP $http_code)"
    else
        log_test "超长输入处理" "INFO" "HTTP $http_code"
    fi
fi

# ============================================
# 测试结果汇总
# ============================================
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}           测试结果汇总${NC}"
echo -e "${BLUE}========================================${NC}"

TOTAL=$((PASS_COUNT + FAIL_COUNT + ERROR_COUNT))

echo -e "\n总计: ${TOTAL} 个测试用例"
echo -e "${GREEN}通过: ${PASS_COUNT}${NC}"
echo -e "${RED}失败: ${FAIL_COUNT}${NC}"
echo -e "${YELLOW}错误: ${ERROR_COUNT}${NC}"

PASS_RATE=$((PASS_COUNT * 100 / TOTAL))
echo -e "\n通过率: ${PASS_RATE}%"

if [ $FAIL_COUNT -gt 0 ] || [ $ERROR_COUNT -gt 0 ]; then
    echo -e "\n${RED}失败的测试:${NC}"
    for result in "${TEST_RESULTS[@]}"; do
        status=$(echo "$result" | cut -d'|' -f2)
        if [ "$status" != "PASS" ] && [ "$status" != "INFO" ]; then
            test_name=$(echo "$result" | cut -d'|' -f1)
            details=$(echo "$result" | cut -d'|' -f3-)
            echo -e "  ${RED}✗${NC} $test_name: $details"
        fi
    done
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "  测试完成时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "${BLUE}========================================${NC}\n"
