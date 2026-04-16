import { createHmac } from "node:crypto";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });
}

function normalizeEnvString(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1).trim();
    }
  }
  return trimmed;
}

function parseBearerToken(authHeader) {
  if (!authHeader) return "";
  const [scheme, token] = authHeader.trim().split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return "";
  return token;
}

function isTrackedEvent(eventType, configured) {
  const raw = configured || "deployment.succeeded";
  const allowed = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (allowed.length === 0) return eventType === "deployment.succeeded";
  return allowed.includes(eventType);
}

function formatTimestamp(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toISOString().replace("T", " ").replace("Z", " UTC");
}

function buildMessage(event) {
  const status =
    event.eventType === "deployment.succeeded"
      ? "SUCCESS"
      : event.eventType === "deployment.failed"
        ? "FAILED"
        : "UNKNOWN";

  const lines = [
    "[EdgeOne Deployment]",
    `Status: ${status}`,
    `Event: ${event.eventType || "-"}`,
    `Project: ${event.projectName || "-"}`,
    `Branch: ${event.repoBranch || "-"}`,
    `Deployment ID: ${event.deploymentId || "-"}`,
    `Project ID: ${event.projectId || "-"}`,
    `Time: ${formatTimestamp(event.timestamp)}`,
  ];
  return lines.join("\n");
}

function signFeishu(secret) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const stringToSign = `${timestamp}\n${secret}`;
  const sign = createHmac("sha256", stringToSign).update("").digest("base64");
  return { timestamp, sign };
}

function buildFeishuPayload(text, secret) {
  const payload = {
    msg_type: "text",
    content: { text },
  };

  if (!secret) return payload;
  return { ...signFeishu(secret), ...payload };
}

async function forwardToFeishu(event, env) {
  const webhookUrl = normalizeEnvString(env.FEISHU_WEBHOOK_URL);
  if (!webhookUrl) {
    return { ok: false, status: 500, message: "Missing FEISHU_WEBHOOK_URL" };
  }

  const webhookPattern =
    /^https:\/\/(open\.feishu\.cn|open\.larksuite\.com)\/open-apis\/bot\/v2\/hook\/[^/\s]+$/i;
  if (!webhookPattern.test(webhookUrl)) {
    return {
      ok: false,
      status: 500,
      message:
        "Invalid FEISHU_WEBHOOK_URL format, expected https://open.feishu.cn/open-apis/bot/v2/hook/<token>",
      detail: webhookUrl,
    };
  }

  try {
    const body = buildFeishuPayload(
      buildMessage(event),
      normalizeEnvString(env.FEISHU_BOT_SECRET),
    );
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    });

    const raw = await response.text();
    let parsed = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    const parsedCode =
      parsed && typeof parsed.code === "number"
        ? parsed.code
        : parsed && typeof parsed.StatusCode === "number"
          ? parsed.StatusCode
          : null;
    const parsedMsg =
      parsed && typeof parsed.msg === "string"
        ? parsed.msg
        : parsed && typeof parsed.StatusMessage === "string"
          ? parsed.StatusMessage
          : null;

    if (!response.ok) {
      return {
        ok: false,
        status: 502,
        message: `Feishu webhook HTTP ${response.status}`,
        detail: parsed || raw,
      };
    }

    if (parsedCode !== null && parsedCode !== 0) {
      return {
        ok: false,
        status: 502,
        message: `Feishu error code ${parsedCode}${parsedMsg ? `: ${parsedMsg}` : ""}`,
        detail: parsed || raw,
      };
    }

    return { ok: true, status: 200, detail: parsed || raw || "ok" };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      message: "Failed to call Feishu webhook",
      detail: String(error?.message || error),
    };
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const expectedToken = normalizeEnvString(env.EO_WEBHOOK_TOKEN);
    if (expectedToken) {
      const providedToken = parseBearerToken(
        request.headers.get("authorization"),
      );
      if (!providedToken || providedToken !== expectedToken) {
        return json({ ok: false, error: "Unauthorized" }, 401);
      }
    }

    const rawBody = await request.text();
    if (!rawBody) {
      return json({ ok: false, error: "Empty body" }, 400);
    }

    let event;
    try {
      event = JSON.parse(rawBody);
      if (typeof event === "string") {
        event = JSON.parse(event);
      }
    } catch {
      return json(
        {
          ok: false,
          error: "Invalid JSON body",
          hint: "Send raw JSON object with Content-Type: application/json",
        },
        400,
      );
    }

    const eventType = event?.eventType || "";
    if (!eventType) {
      return json({ ok: false, error: "Missing eventType" }, 400);
    }

    if (!isTrackedEvent(eventType, normalizeEnvString(env.EO_EVENT_TYPES))) {
      return json(
        { ok: true, ignored: true, reason: "event not tracked", eventType },
        200,
      );
    }

    const forwarded = await forwardToFeishu(event, env);
    if (!forwarded.ok) {
      return json(
        {
          ok: false,
          error: forwarded.message,
          detail: forwarded.detail || null,
        },
        forwarded.status || 502,
      );
    }

    return json({ ok: true, eventType }, 200);
  } catch (error) {
    return json(
      {
        ok: false,
        error: "Unhandled cloud function exception",
        detail: String(error?.message || error),
      },
      500,
    );
  }
}

