import requests
import pyotp
import sys

BASE_URL = "http://localhost:8000"


def test_flow():
    # 1. Register/Create User (Simulating Admin creating user or open register)
    # Using open register for simplicity of script
    email = f"test_user_{pyotp.random_base32()}@example.com"
    password = "password123"

    print(f"1. Registering User: {email}")
    res = requests.post(
        f"{BASE_URL}/register",
        json={"email": email, "password": password, "name": "Test User"},
    )

    if res.status_code != 200:
        print(f"Register Failed: {res.text}")
        return

    # 2. Login (Expect MFA Setup Required)
    print("2. Logging In...")
    res = requests.post(
        f"{BASE_URL}/login", json={"email": email, "password": password}
    )

    data = res.json()
    if not data.get("mfa_setup_required"):
        print(f"Unexpected Login Response (Expected Setup Required): {data}")
        return

    temp_token = data.get("temp_token")
    print("   -> Received Temp Token & Setup Required")

    # 3. Setup MFA
    print("3. Setting up MFA...")
    headers = {"Authorization": f"Bearer {temp_token}"}
    res = requests.post(f"{BASE_URL}/auth/mfa/setup", headers=headers)

    setup_data = res.json()
    secret = setup_data.get("secret")
    print(f"   -> Received Secret: {secret}")

    # 4. Verify MFA
    print("4. Verifying MFA...")
    totp = pyotp.TOTP(secret)
    otp = totp.now()

    res = requests.post(
        f"{BASE_URL}/auth/mfa/verify",
        headers=headers,
        json={"otp": otp, "temp_token": temp_token},
    )

    if res.status_code == 200:
        print("   -> MFA Verification SUCCESS!")
        print("   -> Access Token Received")
    else:
        print(f"   -> Verification FAILED: {res.text}")
        return

    # 5. Access Protected Route
    access_token = res.json().get("token")
    headers = {"Authorization": f"Bearer {access_token}"}
    print("5. Accessing Protected Route (/todos)...")
    res = requests.get(f"{BASE_URL}/todos", headers=headers)

    if res.status_code == 200:
        print("   -> Access GRANTED!")
    else:
        print(f"   -> Access DENIED: {res.status_code}")


if __name__ == "__main__":
    try:
        test_flow()
    except Exception as e:
        print(f"Test Failed: {e}")
        print("Make sure server is running on localhost:8000")
