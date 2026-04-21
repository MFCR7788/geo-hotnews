#!/bin/bash

echo "🧪 测试新用户注册和登录功能"
echo "================================"

BASE_URL="http://localhost:3001/api"

# 使用随机邮箱避免冲突
RANDOM_EMAIL="test$(date +%s)@example.com"

echo ""
echo "1️⃣ 测试新用户注册"
echo "邮箱: $RANDOM_EMAIL"
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'"$RANDOM_EMAIL"'",
    "password": "123456",
    "name": "New Test User"
  }')

REGISTER_HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
REGISTER_BODY=$(echo "$REGISTER_RESPONSE" | sed '$d')

echo "注册 HTTP 状态码: $REGISTER_HTTP_CODE"
echo "注册响应: $REGISTER_BODY"

if [ "$REGISTER_HTTP_CODE" -eq 201 ]; then
  echo "✅ 注册成功!"
  
  ACCESS_TOKEN=$(echo "$REGISTER_BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
  REFRESH_TOKEN=$(echo "$REGISTER_BODY" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
  
  echo "Access Token: ${ACCESS_TOKEN:0:50}..."
  echo "Refresh Token: ${REFRESH_TOKEN:0:50}..."
  
  echo ""
  echo "================================"
  echo "2️⃣ 测试用户登录"
  LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "'"$RANDOM_EMAIL"'",
      "password": "123456"
    }')

  LOGIN_HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
  LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

  echo "登录 HTTP 状态码: $LOGIN_HTTP_CODE"
  echo "登录响应: $LOGIN_BODY"

  if [ "$LOGIN_HTTP_CODE" -eq 200 ]; then
    echo "✅ 登录成功!"
    
    ACCESS_TOKEN=$(echo "$LOGIN_BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$LOGIN_BODY" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
    
    echo ""
    echo "================================"
    echo "3️⃣ 测试获取用户信息"
    ME_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/auth/me" \
      -H "Authorization: Bearer $ACCESS_TOKEN")
    
    ME_HTTP_CODE=$(echo "$ME_RESPONSE" | tail -n1)
    ME_BODY=$(echo "$ME_RESPONSE" | sed '$d')
    
    echo "获取用户信息 HTTP 状态码: $ME_HTTP_CODE"
    echo "用户信息: $ME_BODY"
    
    if [ "$ME_HTTP_CODE" -eq 200 ]; then
      echo "✅ 获取用户信息成功!"
    fi
  else
    echo "❌ 登录失败"
  fi
else
  echo "❌ 注册失败"
fi

echo ""
echo "================================"
echo "🎉 测试完成!"
