# Frontend Integration Guide

This document is specifically tailored for Frontend Developers (e.g., Next.js) integrating with the TransitOps backend.

## Authentication Flow

TransitOps uses a stateless JWT-based authentication system.

### 1. Login

- **Endpoint:** `POST /api/v1/auth/login`
- **Content-Type:** `application/x-www-form-urlencoded`
- **Payload:**
  - `username`: The user's email address.
  - `password`: The user's password.
- **Success Response:**
  ```json
  {
    "access_token": "eyJhbGci...",
    "refresh_token": "eyJhbGci...",
    "token_type": "bearer"
  }
  ```

### 2. Token Storage

- Store the `access_token` in memory or a short-lived secure storage.
- Store the `refresh_token` in an HTTP-only cookie (recommended) or Secure LocalStorage.
- Ensure tokens are cleared on logout.

### 3. Protected Routes

To access protected endpoints (e.g., `GET /api/v1/users/me`), attach the `access_token` in the HTTP Authorization header:
```http
Authorization: Bearer <access_token>
```

### 4. Refresh Token Flow

The `access_token` expires in 8 days. When you receive a `401 Unauthorized` (with "Could not validate credentials" message), you must refresh it.

- **Endpoint:** `POST /api/v1/auth/refresh`
- **Content-Type:** `application/json`
- **Payload:**
  ```json
  {
    "refresh_token": "<your_refresh_token>"
  }
  ```
- **Success Response:** Same as login (new access and refresh tokens).

### 5. Logout

- **Endpoint:** `POST /api/v1/auth/logout`
- The backend logout is stateless. Calling this endpoint simply confirms logout.
- **Critical Action:** You *must* delete the tokens from the frontend storage to actually log the user out.

## Standardized Responses

Every single API (except the OAuth2 login form) returns data in a consistent wrapper.

### Success Format
```json
{
  "success": true,
  "message": "Human readable success message",
  "data": { ... } // Could be an object, array, or null
}
```

### Error Format
```json
{
  "success": false,
  "message": "Human readable error message",
  "errors": [] // Optional array of field-level validation errors
}
```

### Common HTTP Status Codes
- `200 OK`: Success
- `400 Bad Request`: Validation failure (check `errors` array).
- `401 Unauthorized`: Token missing, invalid, or expired.
- `403 Forbidden`: Token is valid, but user lacks the RBAC permission required.
- `404 Not Found`: Resource does not exist.
- `409 Conflict`: Resource already exists (e.g., duplicate email).

## Fetching Current User

Once logged in, fetch the user profile to know their Role and Info.

- **Endpoint:** `GET /api/v1/users/me`
- **Headers:** `Authorization: Bearer <access_token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Current user retrieved successfully",
    "data": {
      "id": "...",
      "email": "...",
      "first_name": "...",
      "last_name": "...",
      "is_active": true,
      "is_superuser": false,
      "role_id": "..."
    }
  }
  ```
