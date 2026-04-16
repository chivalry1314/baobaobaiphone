# EdgeOne -> Feishu Deployment Notification (Cloud Functions)

This directory contains a ready-to-use EdgeOne Pages Cloud Function for forwarding deployment events to a Feishu custom bot.

## File Layout

- `cloud-functions/api/edgeone-pages-feishu.js`: webhook handler.

## 1. Deploy Function

Put the `cloud-functions` folder under your EdgeOne Pages project root, so this route is available:

- `POST /api/edgeone-pages-feishu`

For this repo, you can copy:

- source: `notifications/edgeone-feishu/cloud-functions`
- target: `<project-root>/cloud-functions`

Or run:

```powershell
powershell -ExecutionPolicy Bypass -File .\notifications\edgeone-feishu\sync-to-root.ps1
```

## 2. Configure EdgeOne Environment Variables

Set these variables in EdgeOne Pages project settings:

- `FEISHU_WEBHOOK_URL` (required): your Feishu custom bot webhook URL.
- `EO_WEBHOOK_TOKEN` (recommended): shared token used by EdgeOne Webhook `Authorization: Bearer ...`.
- `EO_EVENT_TYPES` (optional): comma-separated event list, default is `deployment.succeeded`.
  - example: `deployment.succeeded,deployment.failed`
- `FEISHU_BOT_SECRET` (optional): required only if your Feishu bot has signature validation enabled.

## 3. Configure EdgeOne Message Notification

In EdgeOne Pages `Message Notification`:

1. Add a `Webhook` channel.
2. Endpoint:
   - `https://<your-domain>/api/edgeone-pages-feishu`
3. Event types:
   - at least `deployment.succeeded`
4. Key:
   - set a token string, and keep it the same as `EO_WEBHOOK_TOKEN`.

## 4. Expected Behavior

- If event type is not in `EO_EVENT_TYPES`, function returns `200` with ignored flag.
- If forwarding to Feishu fails, function returns non-2xx so EdgeOne can retry.
- If `EO_WEBHOOK_TOKEN` is configured and token does not match, function returns `401`.

## 5. Quick Local Payload Example

```json
{
  "eventType": "deployment.succeeded",
  "projectName": "baobaobaiphone",
  "projectId": "proj_xxx",
  "deploymentId": "dep_xxx",
  "repoBranch": "develop",
  "timestamp": "2026-04-16T03:15:22.000Z"
}
```

## 6. Test Request Example

Use `POST` + `Content-Type: application/json` with a raw JSON object body:

```bash
curl -i -X POST "https://<your-domain>/api/edgeone-pages-feishu" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <EO_WEBHOOK_TOKEN>" \
  --data-raw '{"eventType":"deployment.succeeded","projectName":"baobaobaiphone","projectId":"proj_xxx","deploymentId":"dep_xxx","repoBranch":"develop","timestamp":"2026-04-16T03:15:22.000Z"}'
```

Do not wrap the whole JSON with extra quotes.

## 7. Troubleshooting

- `545 Unknown Status` on EdgeOne usually means function execution exception.
- This function now returns structured JSON for runtime errors, e.g.:
  - invalid JSON body
  - missing token
  - Feishu webhook request failure
  - invalid webhook URL format
