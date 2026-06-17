# Web Push 接口约定

前端默认依赖以下接口，接口实现位于 `src/core/push/webPush.ts`。

> 本仓库不包含 Push 服务端实现，需要单独部署。

## 获取 VAPID 公钥

```http
GET /api/push/vapid-public-key
```

响应：

```json
{
  "publicKey": "<VAPID_PUBLIC_KEY>"
}
```

## 上报订阅

```http
POST /api/push/subscriptions
```

请求体：

```json
{
  "userId": "string",
  "deviceId": "string",
  "appId": "string",
  "subscription": {
    "endpoint": "string",
    "keys": {
      "p256dh": "string",
      "auth": "string"
    }
  }
}
```

## 删除订阅

```http
DELETE /api/push/subscriptions
```

按 `endpoint` 删除订阅。请求体通常包含：

```json
{
  "endpoint": "string"
}
```

## 发送测试推送

```http
POST /api/push/test
```

响应：

```json
{
  "eventId": "string"
}
```

## 相关文件

- 前端 Push 能力：`src/core/push/webPush.ts`
- Service Worker 处理：`public/service-worker.js`
