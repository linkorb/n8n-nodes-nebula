# Nebula Credentials

This package provides two credential types for authenticating with Nebula:

## Nebula API

**Used by:** [Nebula HITL Request](../nodes/NebulaHitlRequest/README.md), [Nebula Action](../nodes/NebulaAction/README.md)

This credential authenticates **outbound requests from n8n to your Nebula instance**. It uses HTTP Basic Authentication.

### Setup

1. In n8n, go to **Credentials → Add Credential**
2. Search for "Nebula API"
3. Fill in the required fields:

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| **Base URL** | Yes | Your Nebula instance base URL (no trailing paths) | `https://nebula.example.com` |
| **Username** | Yes | Username for API authentication | `n8n-service` |
| **Password** | Yes | Password for API authentication | `your-secure-password` |
| **Metadata** | No | Additional JSON metadata for all requests | `{"tenantId": "abc123"}` |

### Base URL

The Base URL should be your Nebula instance's root URL without any API paths:

✅ Correct: `https://nebula.example.com`  
❌ Incorrect: `https://nebula.example.com/api/v1`  
❌ Incorrect: `https://nebula.example.com/`

### Metadata

The metadata field allows you to include additional JSON data with every request. This is useful for:

- Multi-tenant environments (tenant ID)
- Environment identification
- Custom tracking data

Example:
```json
{
  "tenantId": "abc123",
  "environment": "production",
  "source": "n8n-automation"
}
```

### Credential Testing

When you save the credential, n8n tests it by calling:

```
GET {baseUrl}/api/v1/action/actions
```

If this endpoint requires authentication and returns successfully, the credential is valid.

---

## Nebula Trigger Auth

**Used by:** [Nebula Trigger](../nodes/NebulaTrigger/README.md)

This credential authenticates **inbound webhook requests to the Nebula Trigger node**. It validates that callers provide the correct bearer token.

> **Note:** This is distinctly different from the Nebula API credential. The Nebula API authenticates n8n calling Nebula, while Nebula Trigger Auth authenticates external systems calling n8n.

### Setup

1. In n8n, go to **Credentials → Add Credential**
2. Search for "Nebula Trigger Auth"
3. Fill in the required field:

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| **Token** | Yes | Bearer token that callers must provide | `my-secure-webhook-token` |

### How It Works

When configured on a Nebula Trigger node, incoming webhook requests must include the token in the Authorization header:

```
Authorization: Bearer my-secure-webhook-token
```

Requests without a valid token will be rejected.

### Generating a Secure Token

Use a cryptographically secure random string. You can generate one using:

```bash
# Using openssl
openssl rand -hex 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using Python
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Credential Comparison

| Aspect | Nebula API | Nebula Trigger Auth |
|--------|------------|---------------------|
| **Direction** | n8n → Nebula | External → n8n |
| **Auth Type** | HTTP Basic Auth | Bearer Token |
| **Used By** | HITL Request, Action nodes | Trigger node |
| **Purpose** | Call Nebula APIs | Protect webhook endpoints |

## Security Best Practices

1. **Use strong passwords/tokens**: Generate cryptographically secure values
2. **Rotate credentials regularly**: Update credentials periodically
3. **Use HTTPS**: Always use HTTPS URLs for Base URL and webhook endpoints
4. **Limit permissions**: Use service accounts with minimal required permissions
5. **Monitor usage**: Watch for unusual API activity
