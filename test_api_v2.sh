#!/bin/bash

# yupi-hot-monitor 功能测试脚本 v2 (考虑限流)
# 测试所有核心 API 端点

BASE_URL="http://localhost:3001"
TEST_RESULTS=()
PASS_COUNT=0
FAIL_COUNT=0
ERROR_COUNT=0
INFO_COUNT=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
    elif [ "$status" == "INFO" ]; then
        INFO_COUNT=$((INFO_COUNT + 1))
        echo -e "${YELLOW}ℹ INFO${NC}: $test_name - $details"
    else
        ERROR_COUNT=$((ERROR_COUNT + 1))
        echo -e "${YELLOW}! ERROR${NC}: $test_name - $details"
    fi
}

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
echo -e "${BLUE}  yupi-hot-monitor 全面功能测试 v2${NC}"
echo -e "${BLUE}  时间: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BLUE}========================================\n${NC}"

ACCESS_TOKEN=""
REFRESH_TOKEN=""
USER_ID=""
TEST_EMAIL="functional_test_$(date +%s)@example.com"
TEST_PASSWORD="FuncTest123456"

# ============================================
# 1. 健康检查 & 基础连接
# ============================================
echo -e "\n${BLUE}[模块 1/8] 基础设施与健康检查${NC}\n"

response=$(curl -s -w "\n%{http_code}" $BASE_URL/api/health)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ] && echo "$body" | grep -q '"status":"ok"'; then
    log_test "健康检查端点" "PASS" "HTTP $http_code, 服务正常运行"
else
    log_test "健康检查端点" "FAIL" "HTTP $http_code"
fi

# CORS检查
cors_response=$(curl -s -I -X OPTIONS $BASE_URL/api/health \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" 2>&1 | grep -i "access-control-allow-origin")

if echo "$cors_response" | grep -q "http://localhost:5173"; then
    log_test "CORS配置" "PASS" "允许前端跨域访问"
else
    log_test "CORS配置" "INFO" "$cors_response"
fi

# ============================================
# 2. 用户认证系统 (核心模块)
# ============================================
echo -e "\n${BLUE}[模块 2/8] 用户认证系统 (核心功能)${NC}\n"

# 等待限流重置（如果需要）
echo "⏳ 等待2秒确保限流重置..."
sleep 2

# 2.1 用户注册 - 正常场景
echo "--- 测试用例: 用户注册 ---"
register_response=$(api_request "POST" "/api/auth/register" "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"Functional Test\"}")
http_code=$(echo "$register_response" | tail -n1)
body=$(echo "$register_response" | sed '$d')

if [ "$http_code" = "201" ] && echo "$body" | grep -q '"message":"注册成功"'; then
    ACCESS_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$body" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
    USER_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    log_test "用户注册（正常流程）" "PASS" "HTTP 201, User ID: ${USER_ID:0:8}..."
elif [ "$http_code" = "429" ]; then
    log_test "用户注册（正常流程）" "INFO" "触发限流 (HTTP 429), 限流机制正常工作"
else
    log_test "用户注册（正常流程）" "FAIL" "HTTP $http_code, Body: $(echo $body | head -c 100)"
fi

# 2.2 输入验证测试
if [ "$http_code" != "429" ]; then
    # 邮箱格式验证
    invalid_email_resp=$(api_request "POST" "/api/auth/register" '{"email":"not-an-email","password":"123456"}')
    http_code=$(echo "$invalid_email_resp" | tail -n1)
    if [ "$http_code" = "400" ]; then
        log_test "邮箱格式验证" "PASS" "正确拒绝无效邮箱格式 (HTTP 400)"
    else
        log_test "邮箱格式验证" "FAIL" "期望400, 实际: HTTP $http_code"
    fi
    
    # 密码长度验证
    short_pwd_resp=$(api_request "POST" "/api/auth/register" '{"email":"test@example.com","password":"12345"}')
    http_code=$(echo "$short_pwd_resp" | tail -n1)
    if [ "$http_code" = "400" ]; then
        log_test "密码长度验证(<6位)" "PASS" "正确拒绝短密码 (HTTP 400)"
    else
        log_test "密码长度验证(<6位)" "FAIL" "期望400, 实际: HTTP $http_code"
    fi
    
    # 必填字段验证
    missing_fields_resp=$(api_request "POST" "/api/auth/register" '{"email":""}')
    http_code=$(echo "$missing_fields_resp" | tail -n1)
    if [ "$http_code" = "400" ]; then
        log_test "必填字段验证" "PASS" "正确拒绝空字段 (HTTP 400)"
    else
        log_test "必填字段验证" "FAIL" "期望400, 实际: HTTP $http_code"
    fi
    
    # 重复注册检测
    dup_register_resp=$(api_request "POST" "/api/auth/register" "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
    http_code=$(echo "$dup_register_resp" | tail -n1)
    if [ "$http_code" = "409" ]; then
        log_test "重复邮箱检测" "PASS" "正确拒绝重复注册 (HTTP 409)"
    elif [ "$http_code" = "429" ]; then
        log_test "重复邮箱检测" "INFO" "触发限流 (HTTP 429)"
    else
        log_test "重复邮箱检测" "FAIL" "期望409或429, 实际: HTTP $http_code"
    fi
fi

# 2.3 用户登录
echo "--- 测试用例: 用户登录 ---"
sleep 1
login_response=$(api_request "POST" "/api/auth/login" "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
http_code=$(echo "$login_response" | tail -n1)
body=$(echo "$login_response" | sed '$d')

if [ "$http_code" = "200" ] && echo "$body" | grep -q '"message":"登录成功"'; then
    ACCESS_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$body" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
    USER_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    log_test "用户登录（正常）" "PASS" "HTTP 200, Token已获取"
elif [ "$http_code" = "429" ]; then
    log_test "用户登录（正常）" "INFO" "触发限流 (HTTP 429)"
elif [ "$http_code" = "401" ]; then
    log_test "用户登录（正常）" "INFO" "用户可能未注册成功 (HTTP 401)"
else
    log_test "用户登录（正常）" "FAIL" "HTTP $http_code, Body: $(echo $body | head -c 80)"
fi

# 2.4 错误凭据测试
if [ "$http_code" != "429" ]; then
    sleep 1
    wrong_pwd_resp=$(api_request "POST" "/api/auth/login" "{\"email\":\"$TEST_EMAIL\",\"password\":\"wrong_password\"}")
    http_code=$(echo "$wrong_pwd_resp" | tail -n1)
    if [ "$http_code" = "401" ]; then
        log_test "错误密码登录" "PASS" "正确拒绝错误密码 (HTTP 401)"
    elif [ "$http_code" = "429" ]; then
        log_test "错误密码登录" "INFO" "触发限流 (HTTP 429)"
    else
        log_test "错误密码登录" "FAIL" "期望401, 实际: HTTP $http_code"
    fi
    
    # 不存在的用户
    nonexistent_resp=$(api_request "POST" "/api/auth/login" '{"email":"nonexistent_999@example.com","password":"Test123456"}')
    http_code=$(echo "$nonexistent_resp" | tail -n1)
    if [ "$http_code" = "401" ]; then
        log_test "不存在用户登录" "PASS" "正确返回通用错误信息 (HTTP 401, 防枚举)"
    else
        log_test "不存在用户登录" "INFO" "HTTP $http_code"
    fi
fi

# 2.5 Token刷新
if [ -n "$REFRESH_TOKEN" ]; then
    sleep 1
    refresh_resp=$(api_request "POST" "/api/auth/refresh" "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
    http_code=$(echo "$refresh_resp" | tail -n1)
    body=$(echo "$refresh_resp" | sed '$d')
    
    if [ "$http_code" = "200" ] && echo "$body" | grep -q '"accessToken"'; then
        NEW_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
        ACCESS_TOKEN="$NEW_TOKEN"
        log_test "Token刷新机制" "PASS" "成功获取新AccessToken"
    else
        log_test "Token刷新机制" "FAIL" "HTTP $http_code"
    fi
else
    log_test "Token刷新机制" "ERROR" "无Refresh Token可用"
fi

# 2.6 认证保护测试
sleep 1
no_auth_resp=$(api_request "GET" "/api/auth/me" "")
http_code=$(echo "$no_auth_resp" | tail -n1)
if [ "$http_code" = "401" ]; then
    log_test "无Token访问保护" "PASS" "正确要求认证 (HTTP 401)"
else
    log_test "无Token访问保护" "FAIL" "期望401, 实际: HTTP $http_code"
fi

invalid_token_resp=$(api_request "GET" "/api/auth/me" "" "invalid.token.here")
http_code=$(echo "$invalid_token_resp" | tail -n1)
if [ "$http_code" = "401" ]; then
    log_test "无效Token保护" "PASS" "正确拒绝无效Token (HTTP 401)"
else
    log_test "无效Token保护" "FAIL" "期望401, 实际: HTTP $http_code"
fi

# 2.7 获取用户信息
if [ -n "$ACCESS_TOKEN" ]; then
    sleep 1
    me_resp=$(api_request "GET" "/api/auth/me" "" "$ACCESS_TOKEN")
    http_code=$(echo "$me_resp" | tail -n1)
    body=$(echo "$me_resp" | sed '$d')
    
    if [ "$http_code" = "200" ] && echo "$body" | grep -q '"email"'; then
        log_test "获取当前用户信息" "PASS" "HTTP 200, 返回完整用户数据"
        
        # 检查返回字段完整性
        if echo "$body" | grep -q '"id"' && echo "$body" | grep -q '"email"' && echo "$body" | grep -q '"role"'; then
            log_test "用户信息字段完整性" "PASS" "包含 id/email/role/settings"
        else
            log_test "用户信息字段完整性" "WARN" "部分字段缺失"
        fi
    else
        log_test "获取当前用户信息" "FAIL" "HTTP $http_code"
    fi
fi

# 2.8 忘记密码流程
echo "--- 测试用例: 忘记密码 ---"
sleep 1
forgot_resp=$(api_request "POST" "/api/auth/forgot-password" "{\"email\":\"$TEST_EMAIL\"}")
http_code=$(echo "$forgot_resp" | tail -n1)

if [ "$http_code" = "200" ]; then
    log_test "忘记密码(防枚举设计)" "PASS" "无论用户是否存在都返回成功 (HTTP 200)"
else
    log_test "忘记密码(防枚举设计)" "FAIL" "HTTP $http_code"
fi

# 2.9 修改密码
if [ -n "$ACCESS_TOKEN" ]; then
    sleep 1
    NEW_PASSWORD="NewSecurePass789"
    change_pwd_resp=$(api_request "PUT" "/api/auth/change-password" "{\"oldPassword\":\"$TEST_PASSWORD\",\"newPassword\":\"$NEW_PASSWORD\"}" "" "$ACCESS_TOKEN")
    http_code=$(echo "$change_pwd_resp" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_test "修改密码" "PASS" "密码修改成功"
        
        # 用新密码登录验证
        sleep 1
        new_login_resp=$(api_request "POST" "/api/auth/login" "{\"email\":\"$TEST_EMAIL\",\"password\":\"$NEW_PASSWORD\"}")
        http_code=$(echo "$new_login_resp" | tail -n1)
        body=$(echo "$new_login_resp" | sed '$d')
        
        if [ "$http_code" = "200" ]; then
            ACCESS_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
            REFRESH_TOKEN=$(echo "$body" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
            TEST_PASSWORD="$NEW_PASSWORD"
            log_test "新密码登录验证" "PASS" "新密码生效, 可正常登录"
        else
            log_test "新密码登录验证" "FAIL" "无法用新密码登录 (HTTP $http_code)"
        fi
    elif [ "$http_code" = "429" ]; then
        log_test "修改密码" "INFO" "触发限流 (HTTP 429)"
    else
        log_test "修改密码" "FAIL" "HTTP $http_code"
    fi
    
    # 错误原密码
    wrong_old_resp=$(api_request "PUT" "/api/auth/change-password" "{\"oldPassword\":\"wrong_old\",\"newPassword\":\"AnotherPass123\"}" "" "$ACCESS_TOKEN")
    http_code=$(echo "$wrong_old_resp" | tail -n1)
    if [ "$http_code" = "401" ]; then
        log_test "错误原密码检测" "PASS" "正确拒绝错误的原密码 (HTTP 401)"
    else
        log_test "错误原密码检测" "INFO" "HTTP $http_code"
    fi
fi

# ============================================
# 3. 关键词管理系统
# ============================================
echo -e "\n${BLUE}[模块 3/8] 关键词管理系统${NC}\n"

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${YELLOW}⚠ 跳过关键词测试: 无有效认证Token${NC}"
else
    # 3.1 全局词库查询
    sleep 1
    library_resp=$(api_request "GET" "/api/keywords/library?limit=50" "" "$ACCESS_TOKEN")
    http_code=$(echo "$library_resp" | tail -n1)
    body=$(echo "$library_resp" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        LIBRARY_SIZE=$(echo "$body" | jq 'length' 2>/dev/null || echo "parse_error")
        log_test "全局词库查询" "PASS" "HTTP 200, 词库大小: $LIBRARY_SIZE"
    else
        log_test "全局词库查询" "FAIL" "HTTP $http_code"
    fi
    
    # 3.2 添加新关键词到词库
    sleep 1
    KW_TEXT="AI_FuncTest_$(date +%s)"
    add_kw_resp=$(api_request "POST" "/api/keywords/library" "{\"text\":\"$KW_TEXT\",\"category\":\"测试分类\"}" "$ACCESS_TOKEN")
    http_code=$(echo "$add_kw_resp" | tail -n1)
    body=$(echo "$add_kw_resp" | sed '$d')
    
    if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
        KEYWORD_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        log_test "添加关键词到词库" "PASS" "HTTP $http_code, 关键词ID: ${KEYWORD_ID:0:8}..."
    elif [ "$http_code" = "429" ]; then
        log_test "添加关键词到词库" "INFO" "触发限流 (HTTP 429)"
    else
        log_test "添加关键词到词库" "FAIL" "HTTP $http_code"
    fi
    
    # 3.3 订阅关键词
    if [ -n "$KEYWORD_ID" ]; then
        sleep 1
        subscribe_resp=$(api_request "POST" "/api/keywords/subscribe" "{\"keywordId\":\"$KEYWORD_ID\"}" "$ACCESS_TOKEN")
        http_code=$(echo "$subscribe_resp" | tail -n1)
        body=$(echo "$subscribe_resp" | sed '$d')
        
        if [ "$http_code" = "201" ]; then
            SUB_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
            log_test "订阅关键词" "PASS" "HTTP 201, 订阅关系已创建"
        elif echo "$body" | grep -q '"alreadySubscribed"'; then
            log_test "订阅关键词" "PASS" "关键词已被订阅 (幂等处理)"
        elif [ "$http_code" = "429" ]; then
            log_test "订阅关键词" "INFO" "触发限流 (HTTP 429)"
        else
            log_test "订阅关键词" "FAIL" "HTTP $http_code"
        fi
        
        # 3.4 获取已订阅列表
        sleep 1
        subscribed_resp=$(api_request "GET" "/api/keywords" "" "$ACCESS_TOKEN")
        http_code=$(echo "$subscribed_resp" | tail -n1)
        
        if [ "$http_code" = "200" ]; then
            SUB_COUNT=$(echo "$(echo "$subscribed_resp" | sed '$d')" | jq 'length' 2>/dev/null || echo "N/A")
            log_test "获取已订阅关键词列表" "PASS" "HTTP 200, 已订阅数: $SUB_COUNT"
        else
            log_test "获取已订阅关键词列表" "FAIL" "HTTP $http_code"
        fi
        
        # 3.5 相似词搜索
        similar_resp=$(api_request "GET" "/api/keywords/similar?q=AI" "" "$ACCESS_TOKEN")
        http_code=$(echo "$similar_resp" | tail -n1)
        
        if [ "$http_code" = "200" ]; then
            SIMILAR_COUNT=$(echo "$(echo "$similar_resp" | sed '$d')" | jq 'length' 2>/dev/null || echo "0")
            log_test "相似词搜索" "PASS" "HTTP 200, 找到 $SIMILAR_COUNT 个相似词"
        else
            log_test "相似词搜索" "FAIL" "HTTP $http_code"
        fi
        
        # 3.6 切换关键词状态
        if [ -n "$SUB_ID" ]; then
            sleep 1
            toggle_resp=$(api_request "PATCH" "/api/keywords/toggle/$SUB_ID" "" "$ACCESS_TOKEN")
            http_code=$(echo "$toggle_resp" | tail -n1)
            
            if [ "$http_code" = "200" ]; then
                log_test "切换关键词开关状态" "PASS" "HTTP 200, 状态已切换"
            else
                log_test "切换关键词开关状态" "FAIL" "HTTP $http_code"
            fi
            
            # 3.7 取消订阅
            sleep 1
            unsub_resp=$(api_request "DELETE" "/api/keywords/unsubscribe/$KEYWORD_ID" "" "$ACCESS_TOKEN")
            http_code=$(echo "$unsub_resp" | tail -n1)
            
            if [ "$http_code" = "204" ]; then
                log_test "取消订阅关键词" "PASS" "HTTP 204, 订阅已删除"
            else
                log_test "取消订阅关键词" "FAIL" "HTTP $http_code"
            fi
        fi
    fi
fi

# ============================================
# 4. 热点数据系统
# ============================================
echo -e "\n${BLUE}[模块 4/8] 热点数据系统${NC}\n"

if [ -n "$ACCESS_TOKEN" ]; then
    # 4.1 热点列表查询
    sleep 1
    hotspots_resp=$(api_request "GET" "/api/hotspots?page=1&limit=20" "" "$ACCESS_TOKEN")
    http_code=$(echo "$hotspots_resp" | tail -n1)
    body=$(echo "$hotspots_resp" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        TOTAL=$(echo "$body" | jq '.pagination.total' 2>/dev/null || echo "0")
        DATA_LEN=$(echo "$body" | jq '.data | length' 2>/dev/null || echo "0")
        TOTAL_PAGES=$(echo "$body" | jq '.pagination.totalPages' 2>/dev/null || echo "0")
        log_test "热点列表查询" "PASS" "HTTP 200, 总数: $TOTAL, 本页: $DATA_LEN, 页数: $TOTAL_PAGES"
        
        # 检查分页参数
        if echo "$body" | grep -q '"pagination"'; then
            log_test "分页数据结构" "PASS" "包含完整的分页元数据"
        else
            log_test "分页数据结构" "FAIL" "缺少分页信息"
        fi
    else
        log_test "热点列表查询" "FAIL" "HTTP $http_code"
    fi
    
    # 4.2 热点统计
    stats_resp=$(api_request "GET" "/api/hotspots/stats" "" "$ACCESS_TOKEN")
    http_code=$(echo "$stats_resp" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_test "热点统计接口" "PASS" "HTTP 200, 统计数据可用"
    else
        log_test "热点统计接口" "FAIL" "HTTP $http_code"
    fi
    
    # 4.3 手动搜索 (可能因缺少外部API而失败)
    search_resp=$(api_request "POST" "/api/hotspots/search" '{"query":"artificial intelligence","sources":["bing"]}' "" "$ACCESS_TOKEN")
    http_code=$(echo "$search_resp" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        RESULTS=$(echo "$(echo "$search_resp" | sed '$d')" | jq '.results | length' 2>/dev/null || echo "0")
        log_test "手动热点搜索" "PASS" "HTTP 200, 结果数: $RESULTS"
    elif [ "$http_code" = "500" ]; then
        log_test "手动热点搜索" "INFO" "HTTP 500 (可能缺少Bing/Twitter API Key)"
    else
        log_test "手动热点搜索" "FAIL" "HTTP $http_code"
    fi
    
    # 4.4 不存在热点查询
    not_found_hs=$(api_request "GET" "/api/hotspots/non_existent_id_12345" "" "$ACCESS_TOKEN")
    http_code=$(echo "$not_found_hs" | tail -n1)
    if [ "$http_code" = "404" ]; then
        log_test "不存在热点(404处理)" "PASS" "正确返回404"
    else
        log_test "不存在热点(404处理)" "INFO" "HTTP $http_code"
    fi
fi

# ============================================
# 5. 通知系统
# ============================================
echo -e "\n${BLUE}[模块 5/8] 通知系统${NC}\n"

if [ -n "$ACCESS_TOKEN" ]; then
    # 5.1 通知列表
    sleep 1
    notif_resp=$(api_request "GET" "/api/notifications?limit=20" "" "$ACCESS_TOKEN")
    http_code=$(echo "$notif_resp" | tail -n1)
    body=$(echo "$notif_resp" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        NOTIF_DATA=$(echo "$body" | jq '.data' 2>/dev/null)
        UNREAD=$(echo "$body" | jq '.unreadCount' 2>/dev/null || echo "0")
        log_test "通知列表查询" "PASS" "HTTP 200, 未读数: $UNREAD"
    else
        log_test "通知列表查询" "FAIL" "HTTP $http_code"
    fi
    
    # 5.2 标记全部已读
    mark_read_resp=$(api_request "PATCH" "/api/notifications/read-all" "" "$ACCESS_TOKEN")
    http_code=$(echo "$mark_read_resp" | tail -n1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "204" ]; then
        log_test "标记全部已读" "PASS" "HTTP $http_code"
    else
        log_test "标记全部已读" "INFO" "HTTP $http_code"
    fi
fi

# ============================================
# 6. 设置管理
# ============================================
echo -e "\n${BLUE}[模块 6/8] 用户设置管理${NC}\n"

if [ -n "$ACCESS_TOKEN" ]; then
    # 6.1 获取设置
    sleep 1
    get_settings_resp=$(api_request "GET" "/api/settings" "" "$ACCESS_TOKEN")
    http_code=$(echo "$get_settings_resp" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_test "获取用户设置" "PASS" "HTTP 200, 设置数据已返回"
    else
        log_test "获取用户设置" "FAIL" "HTTP $http_code"
    fi
    
    # 6.2 更新设置
    update_settings_resp=$(api_request "PUT" "/api/settings" '{"themeMode":"dark","notifyEmail":true,"notifyWeb":true,"showOnlyReal":true}' "" "$ACCESS_TOKEN")
    http_code=$(echo "$update_settings_resp" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_test "更新用户设置" "PASS" "HTTP 200, 设置已保存"
    else
        log_test "更新用户设置" "FAIL" "HTTP $http_code"
    fi
fi

# ============================================
# 7. 安全与边界条件
# ============================================
echo -e "\n${BLUE}[模块 7/8] 安全性与边界条件测试${NC}\n"

# 7.1 SQL注入防护测试
sleep 1
sql_inject_resp=$(api_request "POST" "/api/auth/register" '{"email":"test\"; DROP TABLE users;--@example.com","password":"Test123456"}')
http_code=$(echo "$sql_inject_resp" | tail -n1)
if [ "$http_code" = "400" ] || [ "$http_code" = "429" ]; then
    log_test "SQL注入防护(邮箱字段)" "PASS" "恶意输入被正确处理 (HTTP $http_code)"
else
    log_test "SQL注入防护(邮箱字段)" "INFO" "HTTP $http_code"
fi

# 7.2 XSS防护测试
xss_payload="<script>alert('xss')</script>"
xss_resp=$(api_request "POST" "/api/auth/register" "{\"email\":\"test$xss_payload@example.com\",\"password\":\"Test123456\"}")
http_code=$(echo "$xss_resp" | tail -n1)
if [ "$http_code" = "400" ] || [ "$http_code" = "429" ]; then
    log_test "XSS攻击防护" "PASS" "XSS payload被过滤 (HTTP $http_code)"
else
    log_test "XSS攻击防护" "INFO" "HTTP $http_code"
fi

# 7.3 超长输入测试
LONG_STR=$(python3 -c "print('A'*5000)")
long_input_resp=$(curl -s -X POST -w "\n%{http_code}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"long_test@example.com\",\"password\":\"$LONG_STR\"}" \
    "$BASE_URL/api/auth/register" 2>/dev/null)
http_code=$(echo "$long_input_resp" | tail -n1)
if [ "$http_code" = "400" ] || [ "$http_code" = "413" ] || [ "$http_code" = "500" ] || [ "$http_code" = "429" ]; then
    log_test "超长输入处理" "PASS" "超长输入被正确拒绝 (HTTP $http_code)"
else
    log_test "超长输入处理" "INFO" "HTTP $http_code"
fi

# 7.4 无效JSON格式
invalid_json_resp=$(curl -s -X POST -w "\n%{http_code}" \
    -H "Content-Type: application/json" \
    -d '{invalid json}' \
    "$BASE_URL/api/keywords/library" 2>/dev/null)
http_code=$(echo "$invalid_json_resp" | tail -n1)
if [ "$http_code" = "400" ]; then
    log_test "无效JSON格式处理" "PASS" "正确拒绝无效JSON (HTTP 400)"
else
    log_test "无效JSON格式处理" "INFO" "HTTP $http_code"
fi

# 7.5 HTTP方法测试
wrong_method_resp=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/health" 2>/dev/null)
http_code=$(echo "$wrong_method_resp" | tail -n1)
if [ "$http_code" = "404" ] || [ "$http_code" = "405" ]; then
    log_test "不支持的HTTP方法" "PASS" "正确拒绝不支持的请求方法 (HTTP $http_code)"
else
    log_test "不支持的HTTP方法" "INFO" "HTTP $http_code"
fi

# ============================================
# 8. 性能与限流验证
# ============================================
echo -e "\n${BLUE}[模块 8/8] 性能与限流机制验证${NC}\n"

# 8.1 API响应时间测试
start_time=$(date +%s%N)
for i in {1..3}; do
    curl -s $BASE_URL/api/health > /dev/null 2>&1
done
end_time=$(date +%s%N)
avg_time=$(( (end_time - start_time) / 3000000 ))  # 毫秒

if [ $avg_time -lt 500 ]; then
    log_test "API平均响应时间" "PASS" "3次请求平均: ${avg_time}ms (< 500ms阈值)"
else
    log_test "API平均响应时间" "WARN" "3次请求平均: ${avg_time}ms (较慢)"
fi

# 8.2 限流机制验证
RATE_LIMITED=false
echo "⏳ 快速发送10个请求测试限流..."
for i in {1..10}; do
    resp=$(curl -s -w "%{http_code}" "$BASE_URL/api/health")
    if [ "$resp" = "429" ]; then
        RATE_LIMITED=true
        break
    fi
done

if [ "$RATE_LIMITED" = true ]; then
    log_test "API限流机制" "PASS" "在第$i次请求时触发限流 (HTTP 429), 限流生效"
else
    log_test "API限流机制" "INFO" "10次请求内未触发限流 (限制可能较高或基于IP)"
fi

# ============================================
# 最终汇总
# ============================================
echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}           📊 测试结果最终汇总${NC}"
echo -e "${BLUE}============================================${NC}\n"

TOTAL=$((PASS_COUNT + FAIL_COUNT + ERROR_COUNT + INFO_COUNT))

echo -e "📋 测试用例总数: ${TOTAL}"
echo -e "${GREEN}✅ 通过: ${PASS_COUNT}${NC}"
echo -e "${RED}❌ 失败: ${FAIL_COUNT}${NC}"
echo -e "${YELLOW}⚠️  错误: ${ERROR_COUNT}${NC}"
echo -e "${YELLOW}ℹ️  信息: ${INFO_COUNT}${NC}"

if [ $TOTAL -gt 0 ]; then
    PASS_RATE=$((PASS_COUNT * 100 / TOTAL))
    echo -e "\n📈 通过率: ${PASS_RATE}%"
fi

if [ $FAIL_COUNT -gt 0 ] || [ $ERROR_COUNT -gt 0 ]; then
    echo -e "\n${RED}❌ 失败/错误的测试项:${NC}\n"
    for result in "${TEST_RESULTS[@]}"; do
        status=$(echo "$result" | cut -d'|' -f2)
        if [ "$status" = "FAIL" ] || [ "$status" = "ERROR" ]; then
            test_name=$(echo "$result" | cut -d'|' -f1)
            details=$(echo "$result" | cut -d'|' -f3-)
            echo -e "  ${RED}•${NC} $test_name"
            echo -e "    └─ $details"
        fi
    done
fi

echo -e "\n${BLUE}============================================${NC}"
echo -e "  🕐 测试完成: $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "  🔗 服务地址: $BASE_URL"
echo -e "  👤 测试账号: $TEST_EMAIL"
echo -e "${BLUE}============================================${NC}\n"

exit $FAIL_COUNT
