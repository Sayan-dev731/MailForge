# API Reference - MailForge AI 📡

This document provides complete API documentation for the MailForge AI backend.

---

## Base URL

```
Development: http://localhost:5000/api
Production:  https://your-domain.com/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

Tokens expire after 7 days. Obtain a token via the `/auth/login` endpoint.

---

## Response Format

All API responses follow this structure:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Endpoints

### 🔐 Authentication

#### Login / Register

```http
POST /auth/login
```

Creates a new user or authenticates an existing user. First login automatically creates the admin account.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "your_secure_password"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_1705123456789",
    "email": "admin@example.com"
  }
}
```

**Errors:**
- `400` - Invalid email or password format
- `401` - Invalid credentials

---

#### Get SMTP Settings

```http
GET /auth/smtp
```

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "smtp": {
    "email": "configured@gmail.com",
    "configured": true
  }
}
```

---

#### Save SMTP Settings

```http
POST /auth/smtp
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "smtpEmail": "your.email@gmail.com",
  "smtpPassword": "your_16_char_app_password"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "SMTP settings saved successfully"
}
```

**Notes:**
- Password is encrypted with AES-256 before storage
- Use Gmail App Password, not your regular password

---

### 📤 File Upload

#### Upload Recipient File

```http
POST /upload/file
```

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data:**
| Field | Type | Description |
|-------|------|-------------|
| `file` | File | Excel (.xlsx, .xls) or CSV (.csv) file |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "headers": ["Name", "Email", "Department", "Employee ID"],
    "rows": [
      {
        "Name": "John Doe",
        "Email": "john@example.com",
        "Department": "Engineering",
        "Employee ID": "E001"
      },
      {
        "Name": "Jane Smith",
        "Email": "jane@example.com",
        "Department": "Marketing",
        "Employee ID": "E002"
      }
    ],
    "totalRows": 150,
    "detection": {
      "nameColumn": "Name",
      "emailColumn": "Email",
      "confidence": 0.95,
      "method": "ai"
    }
  }
}
```

**Detection Methods:**
- `ai` - Google AI (Gemini) detected columns
- `rule` - Rule-based detection (fallback)
- `manual` - User must select columns manually

**Errors:**
- `400` - No file uploaded or invalid format
- `413` - File too large (max 10MB)
- `415` - Unsupported file type

---

### 📧 Campaigns

#### List All Campaigns

```http
GET /campaign
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max results (default: 50) |
| `offset` | number | Pagination offset |
| `status` | string | Filter by status |

**Response (200 OK):**
```json
{
  "success": true,
  "campaigns": [
    {
      "id": "campaign_1705123456789",
      "name": "January Newsletter",
      "status": "completed",
      "totalRecipients": 150,
      "sentCount": 148,
      "failedCount": 2,
      "createdAt": "2026-01-15T10:30:00.000Z",
      "completedAt": "2026-01-15T10:45:23.000Z"
    }
  ],
  "total": 12
}
```

---

#### Create Campaign

```http
POST /campaign
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Q1 Certificates Campaign",
  "subject": "Your Achievement Certificate - {{name}}",
  "body": "<p>Dear {{name}},</p><p>Please find your certificate attached.</p>",
  "recipients": [
    { "name": "John Doe", "email": "john@example.com" },
    { "name": "Jane Smith", "email": "jane@example.com" }
  ],
  "attachCertificate": true,
  "certificateConfig": {
    "eventName": "Annual Excellence Awards 2026",
    "achievementText": "Excellence in Performance",
    "template": "default",
    "nameConfig": {
      "fontSize": 48,
      "fontColor": "#1a1a1a",
      "positionX": 50,
      "positionY": 50
    }
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "campaign": {
    "id": "campaign_1705123456789",
    "name": "Q1 Certificates Campaign",
    "status": "draft",
    "totalRecipients": 2,
    "createdAt": "2026-01-15T15:30:00.000Z"
  }
}
```

---

#### Get Campaign Details

```http
GET /campaign/:id
```

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "campaign": {
    "id": "campaign_1705123456789",
    "name": "Q1 Certificates Campaign",
    "status": "completed",
    "subject": "Your Achievement Certificate - {{name}}",
    "body": "<p>Dear {{name}},</p>...",
    "recipients": [
      {
        "name": "John Doe",
        "email": "john@example.com",
        "status": "sent",
        "sentAt": "2026-01-15T15:31:00.000Z"
      },
      {
        "name": "Jane Smith",
        "email": "jane@example.com",
        "status": "sent",
        "sentAt": "2026-01-15T15:31:01.000Z"
      }
    ],
    "certificateConfig": { ... },
    "stats": {
      "total": 2,
      "sent": 2,
      "failed": 0,
      "pending": 0,
      "successRate": 100
    },
    "createdAt": "2026-01-15T15:30:00.000Z",
    "startedAt": "2026-01-15T15:31:00.000Z",
    "completedAt": "2026-01-15T15:31:02.000Z"
  }
}
```

**Recipient Status Values:**
- `pending` - Not yet processed
- `sending` - Currently being sent
- `sent` - Successfully delivered
- `failed` - Delivery failed (includes error message)

---

#### Update Campaign

```http
PUT /campaign/:id
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:** (partial updates supported)
```json
{
  "name": "Updated Campaign Name",
  "subject": "New Subject Line"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "campaign": { ... }
}
```

---

#### Delete Campaign

```http
DELETE /campaign/:id
```

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Campaign deleted successfully"
}
```

---

### 📮 Email Sending

#### Send Campaign Emails

```http
POST /email/send
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "campaignId": "campaign_1705123456789"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Campaign sending started",
  "campaignId": "campaign_1705123456789"
}
```

**Note:** Email sending is asynchronous. Poll the campaign status endpoint to track progress.

---

#### Get Sending Status

```http
GET /email/status/:campaignId
```

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "status": {
    "campaignId": "campaign_1705123456789",
    "status": "sending",
    "progress": {
      "total": 150,
      "sent": 75,
      "failed": 2,
      "pending": 73,
      "percentage": 51.33
    },
    "currentRecipient": "john@example.com",
    "estimatedTimeRemaining": "1m 15s"
  }
}
```

---

### 🎓 Certificates

#### Preview Certificate

```http
POST /certificate/preview
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "recipientName": "John Doe",
  "eventName": "Annual Excellence Awards 2026",
  "achievementText": "Excellence in Performance",
  "template": "default",
  "nameConfig": {
    "fontSize": 48,
    "fontColor": "#1a1a1a",
    "positionX": 50,
    "positionY": 50
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "previewUrl": "/certificates/preview_1705123456789.pdf",
  "expiresIn": "10 minutes"
}
```

---

#### Generate Certificate

```http
POST /certificate/generate
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "recipientName": "John Doe",
  "eventName": "Annual Excellence Awards 2026",
  "achievementText": "Excellence in Performance",
  "template": "default",
  "nameConfig": {
    "fontSize": 48,
    "fontColor": "#1a1a1a"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "certificate": {
    "id": "cert_1705123456789",
    "filename": "certificate_john_doe.pdf",
    "path": "/certificates/certificate_john_doe.pdf",
    "size": 45678
  }
}
```

---

### 🏥 Health Check

#### Check API Status

```http
GET /health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "message": "MailForge AI Backend is running",
  "timestamp": "2026-01-15T15:30:00.000Z",
  "version": "1.0.0"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `400` | Bad Request - Invalid input |
| `401` | Unauthorized - Invalid or missing token |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource doesn't exist |
| `413` | Payload Too Large - File exceeds limit |
| `415` | Unsupported Media Type - Invalid file format |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error - Server issue |

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/auth/login` | 5 requests/minute |
| `/email/send` | 1 request/second per recipient |
| Other endpoints | 100 requests/minute |

---

## Webhooks (Planned v2.0)

Future versions will support webhooks for:
- Email delivery status
- Campaign completion
- Error notifications

---

## SDK Examples

### JavaScript (Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Login
const { data } = await api.post('/auth/login', {
  email: 'admin@example.com',
  password: 'password'
});

// Upload file
const formData = new FormData();
formData.append('file', file);
const upload = await api.post('/upload/file', formData);

// Create campaign
const campaign = await api.post('/campaign', {
  name: 'My Campaign',
  subject: 'Hello {{name}}',
  recipients: upload.data.data.rows
});

// Send emails
await api.post('/email/send', {
  campaignId: campaign.data.campaign.id
});
```

### cURL

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Get campaigns
curl http://localhost:5000/api/campaign \
  -H "Authorization: Bearer YOUR_TOKEN"

# Upload file
curl -X POST http://localhost:5000/api/upload/file \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@recipients.xlsx"
```

---

**API Version:** 1.0.0
**Last Updated:** January 2026
