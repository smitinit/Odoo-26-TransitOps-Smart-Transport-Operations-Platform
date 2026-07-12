# API Documentation

All API responses follow a standardized envelope:
```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```

## Authentication Endpoints

### Login
- **Purpose:** Authenticate and retrieve JWT tokens.
- **Method:** `POST`
- **URL:** `/api/v1/auth/login`
- **Request Body (Form Data):**
  - `username` (string, required): User's email
  - `password` (string, required): User's password
- **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbG...",
    "refresh_token": "eyJhbG...",
    "token_type": "bearer"
  }
  ```
- **Error (401 Unauthorized):** Incorrect email or password.

### Refresh Token
- **Purpose:** Obtain a new access token using a refresh token.
- **Method:** `POST`
- **URL:** `/api/v1/auth/refresh`
- **Request Body (JSON):**
  ```json
  {
    "refresh_token": "eyJhbG..."
  }
  ```
- **Response (200 OK):** Returns new `access_token` and `refresh_token`.

### Logout
- **Purpose:** Log out the user (stateless, informs client to clear tokens).
- **Method:** `POST`
- **URL:** `/api/v1/auth/logout`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Successfully logged out",
    "data": null
  }
  ```

## User Endpoints

### Get Current User
- **Purpose:** Retrieve profile of the currently authenticated user.
- **Method:** `GET`
- **URL:** `/api/v1/users/me`
- **Headers:** `Authorization: Bearer <access_token>`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Current user retrieved successfully",
    "data": {
      "id": "018f3a...",
      "email": "admin@transitops.com",
      "first_name": "System",
      "last_name": "Admin",
      "is_active": true,
      "is_superuser": true,
      "role_id": "018f3a..."
    }
  }
  ```
- **Error (401 Unauthorized):** Invalid or expired token.
