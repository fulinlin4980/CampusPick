

# 跑腿任务结算系统 (Mini-Program + Qt Backend)

## 🌟 项目简介

本项目是一个基于微信小程序的前端界面与 Qt HTTP Server 后端服务相结合的**跑腿任务结算与管理系统**。它主要面向任务发布者和跑腿员，实现了任务的发布、接单、交付凭证上传以及最终的确认结算流程。

**核心目标:** 简化任务交付和结算流程，确保图片凭证的准确性，并通过 Base64 编码方式优化前后端图片传输效率。

## 📦 项目模块与技术栈

| 模块                    | 技术栈                            | 描述                                                         |
| ----------------------- | --------------------------------- | ------------------------------------------------------------ |
| **前端 (Mini-Program)** | 微信小程序 (WXML, WXSS, JS)       | 用户界面，负责任务列表展示、详情查看和结算操作。             |
| **后端 (Server)**       | Qt HTTP Server (C++, QHttpServer) | 核心业务逻辑，包括数据库操作、用户认证、订单状态管理，以及文件 Base64 编码传输。 |
| **数据库**              | SQLite/MySQL (通过 Qt SQL 模块)   | 存储订单、用户和状态数据。                                   |

## ✨ 主要功能点

### 1. 任务流程管理

- **任务发布:** 用户发布新任务，设定佣金、描述和地点。
- **任务接单:** 跑腿员查看并接受任务。
- **任务交付:** 跑腿员完成任务后，更新状态为“已送达”。

### 2. 结算与凭证处理 (核心)

- **凭证上传:** 跑腿员在交付时上传图片凭证 (后端存储 URL)。
- **图片 Base64 传输:** 后端 `/orders/detail` 接口在查询到订单详情时，读取本地图片，将其 Base64 编码后，通过 JSON 字段 `photoBase64` 返回给前端。
- **结算确认:** 任务发布者进入结算页面，确认凭证和佣金无误后，点击“确认结算”，将订单状态变更为“已完成”。
- **图片预览:** 前端支持将接收到的 Base64 字符串解析并生成临时文件，实现本地图片预览功能。

### 3. 用户与认证

- 基于 Token 的身份验证机制 (`Authorization` Header)。
- 使用 `X-User-ID` 头部字段进行额外的权限校验。

## 🛠️ 部署指南

### A. 后端 (Qt HTTP Server) 部署

1. **环境准备:**
   - 安装 Qt SDK (包含 Qt Creator 和 C++ 编译器)。
   - 确保项目依赖的 Qt 模块（如 `Qt Network`, `Qt Sql`, `Qt Core`, `Qt Http Server` 等）已安装。
2. **代码配置:**
   - 定义静态文件基础 URL，例如 `STATIC_FILE_BASE_URL = "http://localhost:8080/uploads/"`。
   - 配置数据库连接（如 SQLite 或 MySQL）。
3. **文件存储:**
   - 创建本地文件上传目录（默认为 `./uploads`）。
   - 确保后端程序拥有对该目录的读写权限。
4. **运行服务:**
   - 编译并运行 Qt 后端应用。服务将运行在配置的端口（例如 `8080`）。

### B. 前端 (微信小程序) 部署

1. **环境准备:**

   - 安装微信开发者工具。

2. **项目配置:**

   - 打开 `/pages/settlement/settlement.js` 文件，确认 `BASE_URL` 配置指向您的 Qt 后端地址和端口：

     ```
     const BASE_URL = 'http://[您的后端IP或域名]:8080/v1'; 
     ```

   - 在微信开发者工具中，进入项目设置，添加后端域名到“request合法域名”列表。

3. **页面注册:**

   - 确保 `app.json` 中已注册所有页面，特别是结算页：

     ```
     "pages": [
         // ...
         "pages/settlement/settlement", 
         // ...
     ]
     ```

4. **调试运行:**

   - 在微信开发者工具中预览和调试小程序。

## 🔗 关键 API 接口

| 模块     | URL 路径            | 方法   | 描述                                                         |
| -------- | ------------------- | ------ | ------------------------------------------------------------ |
| 订单详情 | `/v1/orders/detail` | `POST` | 获取订单详细信息，**包含 Base64 编码的凭证图片**。请求体需包含 `{"orderId": "..."}`。 |
| 订单操作 | `/v1/orders/action` | `POST` | 执行订单状态变更操作（如接单、交付、**确认结算**）。请求体需包含 `{"orderId": "...", "action": "..."}`。 |
| 用户认证 | `/v1/auth/login`    | `POST` | 用户登录认证，获取 Token。                                   |

# API说明

## 用户登录/注册

注册:

**请求行**                                                ``` POST /v1/auth/register```
**实例参数** 

```json
{	
"username": "user123", // 登录名 (如手机号)	
"password": "securepassword", // 明文密码	
"name": "新用户昵称" // 初始昵称	
}
```

**实例返回**  

```json
{
  "code": 0,
  "message": "注册成功",
  "data": { "userId": "uuid-abc-123", "token": "..." } 
}
```

登录:

**请求行**                                                 ```POST /v1/auth/loginr```
**实例参数** 

```json
{
  "username": "user123",
  "password": "securepassword"
}
```

**实例返回**  

```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "userId": "uuid-abc-123", // 用户ID
    "token": "JWT_TOKEN_FOR_REQUESTS", // 访问凭证
    "profile": { "name": "...", "balance": 0.00 }
  }
}
```



​                                                  

​                                                  

## 1.获取当前用户的个人信息

**请求行**`GET /v1/user/profile`

**实例参数**(无 Body/Query 参数，身份信息通过 Header 传递)

**实例返回**

```json
{
    "code": 0,
    "message": "Success",
    "data": 
    {
        "id": "user_self_001",
        "name": "张同学",
        "avatar": "https://picsum.photos/200/200",
        "balance": 15.50
    }
}
```

## 2. 获取订单大厅的待接订单

**请求行**  `GET /v1/orders/feed`

**实例参数** *(无)* 

**实例返回**  

```json
 {  
     "code": 0,  
     "message": "Success",  
     "data": 
     [ 
         {      
          "id": "order_001",
          "creatorId": "user_self_002",      
          "orderType": "express",      
          "pickupLocation": "菜鸟驿站",      
          "deliveryLocation": "兰园3栋",      
          "price": 5.0,      
          "status": "PENDING",      
          "createdAt": 1733230800000    
         }  
     ] 
 } 
```



## 3. 获取我的订单 (我发布的或我接单的)

**请求行**  `GET /v1/orders/mine?type=[published/accepted]` 

**实例参数** `Query: type=published`

**实例返回** 

```json
{  
    "code": 0,  
    "message": "Success",  
    "data": 
    [    
        {      
            "id": "order_002",      
            "creatorId": "user_self_001",      
            "runnerId": "runner_003",      
            "orderType": "food",      
            "status": "ACCEPTED",      
            "pickupCode": null,      
            "price": 4.5    
        }  
    ] 
}
```



## 4.发布新订单 

 **请求行** `POST /v1/orders/publish`

**实例参数**

```json
{  
    "creatorId": "user_self_001",  
    "orderType": "express",  
    "pickupCode": "3-2-2055",  
    "pickupLocation": "菜鸟驿站",  
    "deliveryLocation": "竹园1栋",  
    "price": 4.0,  
    "description": "请帮忙拿一下，急用！" 
}
```

 **实例返回** 

```json
 {  
     "code": 0,  
     "message": "订单发布成功",  
     "data": 
     { 
         "orderId": "new_order_007" 
     } 
 }
```

##  5. 订单状态变更操作

**请求行** `POST /v1/orders/action` 

**实例参数**

接单操作 (Action: `accept`)

```json
{
  "orderId": "order_001",
  "action": "accept", 
  "userId": "runner_003" 
}
```

确认送达操作 (Action: `deliver` & 需照片)**：**

```json
{  
    "orderId": "order_002",  
    "action": "deliver",  
    "userId": "runner_003",  
    "photoUrl": "https://img.oss.com/delivery/002.jpg" 
}
```

**实例返回**

```json
{  
    "code": 0,  
    "message": "订单操作成功，状态已更新为ACCEPTED" 
} 
```

 **Action 类型说明：** `accept`, `cancel`, `deliver`, `confirm`。 `deliver` 操作时，如果 `orderType` 为 `food` 或 `item`，需在请求参数中附加 `photoUrl`。







# 数据库表说明与设计

## 1. 用户表 (`users`)

该表用于存储用户的基本信息和账户余额。

| **字段名 (Field)** | **数据类型 (Data Type)** | **约束 (Constraint)**  | **字段含义 (Description)**                   |
| ------------------ | ------------------------ | ---------------------- | -------------------------------------------- |
| `id`               | `VARCHAR(50)`            | PRIMARY KEY            | 用户唯一 ID（可使用微信 OpenID 或自定义 ID） |
| username           | VARCHAR(100)             | UNIQUE, NOT NULL       | -用户名，登录用，必须唯一                    |
| password           | VARCHAR(255)             | NOT NULL               | -加密后的密码                                |
| `name`             | `VARCHAR(100)`           | NOT NULL               | 用户昵称/姓名                                |
| `avatar`           | `VARCHAR(255)`           |                        | 用户头像 URL                                 |
| `balance`          | `DECIMAL(10, 2)`         | NOT NULL, DEFAULT 0.00 | 账户余额 (元)                                |
| `created_at`       | `TIMESTAMP`              | NOT NULL               | 记录创建时间                                 |
| `updated_at`       | `TIMESTAMP`              | NOT NULL               | 记录最后更新时间                             |



**建表 SQL (SQLite):**

```mysql
-- ============================================
-- 用户表 (users) - SQLite 版本
-- 字段说明：
--   id: 用户唯一ID（建议使用UUID）
--   username: 用户名（登录账号，唯一）
--   password: 加密后的密码
--   name: 用户昵称/显示名称
--   avatar: 用户头像URL
--   balance: 账户余额
--   created_at: 创建时间
--   updated_at: 最后更新时间
-- ============================================
-- 1. 先删除表（如果存在）-- 可选，开发时使用
DROP TABLE IF EXISTS users;

-- 2. 创建用户表
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar VARCHAR(255),
    balance REAL NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. 创建更新时间戳的触发器
-- SQLite 没有 ON UPDATE CURRENT_TIMESTAMP，需要触发器实现
-- ============================================
CREATE TRIGGER update_users_timestamp 
AFTER UPDATE ON users
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE users 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;
```

## 2. 订单表 (`orders`)

该表用于存储所有跑腿订单的详细信息，包含订单类型、取件码等敏感信息以及状态。

| **字段名 (Field)**  | **数据类型 (Data Type)**          | **约束 (Constraint)**      | **字段含义 (Description)**                                   |
| ------------------- | --------------------------------- | -------------------------- | ------------------------------------------------------------ |
| `id`                | `VARCHAR(50)`                     | PRIMARY KEY                | 订单唯一 ID                                                  |
| `creator_id`        | `VARCHAR(50)`                     | NOT NULL, FK to `users.id` | 订单发布者 ID                                                |
| `runner_id`         | `VARCHAR(50)`                     | NULL, FK to `users.id`     | 订单接单者 ID（待接单时为 NULL）                             |
| `order_type`        | `ENUM('express', 'food', 'item')` | NOT NULL                   | 任务类型：`快递`、`外卖`、`物品`                             |
| `pickup_location`   | `VARCHAR(150)`                    | NOT NULL                   | 取货地点（如食堂、驿站）                                     |
| `delivery_location` | `VARCHAR(150)`                    | NOT NULL                   | 送货地点（如宿舍楼）                                         |
| `price`             | `DECIMAL(10, 2)`                  | NOT NULL                   | 跑腿费用 (元)                                                |
| `description`       | `TEXT`                            |                            | 订单详细备注信息                                             |
| **`pickup_code`**   | `VARCHAR(100)`                    | NULL                       | **取件码/关键信息（仅`express`类型可能非空）**               |
| **`photo_url`**     | `VARCHAR(255)`                    | NULL                       | **送达照片 URL（用于`food`和`item`任务）**                   |
| `status`            | `ENUM(...)`                       | NOT NULL                   | 订单状态：`PENDING` (待接单), `ACCEPTED` (已接单), `DELIVERED` (已送达), `COMPLETED` (已完成), `CANCELLED` (已取消) |
| `cancel_reason`     | `VARCHAR(255)`                    | NULL                       | 订单取消原因                                                 |
| `created_at`        | `TIMESTAMP`                       | NOT NULL                   | 订单发布时间                                                 |
| `accepted_at`       | `TIMESTAMP`                       | NULL                       | 订单被接单的时间                                             |
| `completed_at`      | `TIMESTAMP`                       | NULL                       | 订单确认完成的时间                                           |

**建表 SQL (SQLite):**

```mysql
-- 先删除表（如果存在）
DROP TABLE IF EXISTS orders;

-- 再创建新表
CREATE TABLE orders (
    id VARCHAR(50) PRIMARY KEY,
    creator_id VARCHAR(50) NOT NULL,
    runner_id VARCHAR(50) NULL,
    
    order_type VARCHAR(20) NOT NULL 
        CHECK (order_type IN ('express', 'food', 'item')),
    
    pickup_location VARCHAR(150) NOT NULL,
    delivery_location VARCHAR(150) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    
    pickup_code VARCHAR(100) NULL,
    photo_url VARCHAR(255) NULL,
    
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'ACCEPTED', 'DELIVERING', 'COMPLETED', 'CANCELLED')),
    
    cancel_reason VARCHAR(255) NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    -- 外键约束
    FOREIGN KEY (creator_id) REFERENCES users(id)
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    
    FOREIGN KEY (runner_id) REFERENCES users(id)
        ON DELETE SET NULL 
        ON UPDATE CASCADE
);
CREATE INDEX idx_orders_creator ON orders (creator_id, status);
CREATE INDEX idx_orders_runner ON orders (runner_id, status);
CREATE INDEX idx_orders_feed ON orders (status, created_at);
```

## 3. 交易记录表 (`transactions`)

这个表是金融类应用中**至关重要**的一部分，用于精确记录用户余额、订单支付、提现、充值等所有涉及资金变动的操作，保障财务数据可追溯且准确。

| **字段名 (Field)** | **数据类型 (Data Type)**               | **约束 (Constraint)**      | **字段含义 (Description)**                                   |
| ------------------ | -------------------------------------- | -------------------------- | ------------------------------------------------------------ |
| `id`               | `VARCHAR(50)`                          | PRIMARY KEY                | 交易记录唯一 ID                                              |
| `user_id`          | `VARCHAR(50)`                          | NOT NULL, FK to `users.id` | 发生交易的用户 ID                                            |
| `order_id`         | `VARCHAR(50)`                          | NULL, FK to `orders.id`    | 关联的订单 ID (如订单支付、跑腿费结算)                       |
| `type`             | `ENUM(...)`                            | NOT NULL                   | 交易类型：`PAYMENT`(支付订单), `INCOME`(跑腿收入), `DEPOSIT`(充值), `WITHDRAWAL`(提现) |
| `amount`           | `DECIMAL(10, 2)`                       | NOT NULL                   | 交易金额 (通常为正值)                                        |
| `direction`        | `ENUM('IN', 'OUT')`                    | NOT NULL                   | 资金流向：`IN`(收入/充值) 或 `OUT`(支出/提现)                |
| `status`           | `ENUM('SUCCESS', 'PENDING', 'FAILED')` | NOT NULL                   | 交易状态                                                     |
| `external_id`      | `VARCHAR(100)`                         | NULL                       | 外部支付系统（如微信支付）的交易单号                         |
| `created_at`       | `TIMESTAMP`                            | NOT NULL                   | 交易创建时间                                                 |

**建表 SQL (MySQL):** 

```mysql
CREATE TABLE transactions (
    id VARCHAR(50) PRIMARY KEY COMMENT '交易记录唯一ID',
    user_id VARCHAR(50) NOT NULL COMMENT '发生交易的用户ID',
    order_id VARCHAR(50) NULL COMMENT '关联的订单ID',
    
    type ENUM('PAYMENT', 'INCOME', 'DEPOSIT', 'WITHDRAWAL', 'FEE') NOT NULL COMMENT '交易类型: 支付、收入、充值、提现、手续费',
    amount DECIMAL(10, 2) NOT NULL COMMENT '交易金额',
    direction ENUM('IN', 'OUT') NOT NULL COMMENT '资金流向: IN(入账), OUT(出账)',
    status ENUM('SUCCESS', 'PENDING', 'FAILED') NOT NULL DEFAULT 'PENDING' COMMENT '交易状态',
    
    external_id VARCHAR(100) NULL COMMENT '外部支付系统交易单号',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '交易创建时间',
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='交易记录表 (资金流水)';

-- 常用查询的索引优化
CREATE INDEX idx_transactions_user ON transactions (user_id);
CREATE INDEX idx_transactions_order ON transactions (order_id);

```

```

```