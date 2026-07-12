# Swagger Verification

FastAPI automatically generates an interactive Swagger UI. Because we used `OAuth2PasswordBearer`, the Swagger UI natively supports authentication.

## How to Test

1. **Start the Server:**
   ```bash
   uvicorn main:app --reload
   ```
2. **Open Swagger UI:**
   Navigate your browser to: [http://localhost:8000/docs](http://localhost:8000/docs)
3. **Login / Authorize:**
   - Click the green **"Authorize"** button at the top right of the page.
   - Enter the seeded admin credentials:
     - **Username:** `admin@transitops.com`
     - **Password:** `Admin@123`
   - Click **Authorize**. Swagger will automatically store the returned `access_token`.
4. **Access Protected Route:**
   - Scroll down to `GET /api/v1/users/me`
   - Click **Try it out** -> **Execute**.
   - You should receive a `200 OK` response displaying the Admin user's profile.
   - If you attempt to execute it without authorizing first, you will receive a `401 Unauthorized` error.
