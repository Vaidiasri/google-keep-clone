# Documentation: Advanced IAM & PBAC Research

Bhai, is file mein hamne abhi tak jo bhi research aur planning kari hai PBAC (Policy-Based Access Control) aur Cloud IAM ke baare mein, uska poora summary hai.

---

## 1. Cloud IAM Architectures (Comparison)

Hamne teenon bade cloud providers ka architecture deeply study kiya hai:

- **GCP (Resource-Centric):** "Who can do what on which resource". Binding logic aur hierarchy management iska core hai.
- **AWS (Identity-Centric):** Highly granular JSON policies aur "Explicit Deny" model.
- **Azure (Scope-Centric):** Management groups aur subscription base hierarchy.

### Deep Dives:

- [GCP Architecture](file:///C:/Users/ghild/.gemini/antigravity/brain/a3fce1d6-f094-4e16-9a02-1cfcebd54755/GCP_IAM_Architecture.md)
- [AWS Architecture](file:///C:/Users/ghild/.gemini/antigravity/brain/a3fce1d6-f094-4e16-9a02-1cfcebd54755/AWS_IAM_Architecture.md)
- [Azure Architecture](file:///C:/Users/ghild/.gemini/antigravity/brain/a3fce1d6-f094-4e16-9a02-1cfcebd54755/Azure_IAM_Architecture.md)
- [Full Comparison](file:///C:/Users/ghild/.gemini/antigravity/brain/a3fce1d6-f094-4e16-9a02-1cfcebd54755/Cloud_IAM_Comparison.md)

---

## 2. Etag & Concurrency Control

**Etag** (Entity Tag) ek version marker hai jo "Lost Update Problem" ko solve karta hai.

- Ye ensure karta hai ki agar do log ek hi resource ko edit kar rahe hain, toh sirf updated version hi save ho.
- Iska use hum **Caching Invalidation** ke liye bhi karenge.

[Etag Explanation](file:///C:/Users/ghild/.gemini/antigravity/brain/a3fce1d6-f094-4e16-9a02-1cfcebd54755/IAM_Etag_Explanation.md)

---

## 3. Our Project: PBAC Implementation Plan

Humne plan kiya hai ki hum apne FastAPI Todo App mein enterprise-grade security laayenge:

1.  **Policy Engine:** Ek central logic jo attributes (owner, role, time) ke base par decision lega.
2.  **Two-Layer Caching:**
    - **Identity Cache:** User roles ko memory mein rakhenge.
    - **Resource Cache:** Resource metadata ko fast access ke liye cache karenge.
3.  **Concurrency:** Header-based Etag validation (`If-Match`).

[Final Implementation Plan](file:///C:/Users/ghild/.gemini/antigravity/brain/a3fce1d6-f094-4e16-9a02-1cfcebd54755/implementation_plan.md)

---

## 4. Security Highlights

- **Cache-Control: private:** Taaki data sirf browser mein rahe, proxies par nahi.
- **Encrypted Connections:** HTTPS mandatory for security.
- **No Sensitive Caching:** OTP/Passwords ko kabhi bhi cache nahi kiya jayega.

Bhai, ye document aapke project ki authorization architecture ka source of truth hai.
