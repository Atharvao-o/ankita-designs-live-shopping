from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleLoginRequest(BaseModel):
    id_token: str


class OtpRequest(BaseModel):
    phone: str


class OtpVerifyRequest(BaseModel):
    phone: str
    challenge_id: str
    code: str


class OtpRegisterRequest(BaseModel):
    phone: str
    name: str | None = None


class OtpRegisterVerifyRequest(BaseModel):
    phone: str
    challenge_id: str
    code: str
    name: str


class OtpRequestResponse(BaseModel):
    ok: bool
    challengeId: str
    expiresInSeconds: int
    message: str
    devOtp: str | None = None


class VendorEmailOtpRequest(BaseModel):
    email: str


class VendorEmailOtpVerifyRequest(BaseModel):
    email: str
    challenge_id: str
    code: str


class VendorEmailOtpRequestResponse(BaseModel):
    ok: bool
    challengeId: str
    expiresInSeconds: int
    resendAfterSeconds: int
    message: str
    devOtp: str | None = None


class VendorEmailOtpVerifyResponse(BaseModel):
    ok: bool
    verificationToken: str
    verifiedEmail: str
    validForSeconds: int
    message: str


class RegisterRequest(BaseModel):
    name: str | None = None
    email: str
    password: str
    role: str
    phone: str = ""
    owner_name: str | None = None
    business_name: str | None = None
    business_category: str | None = None
    instagram: str | None = None
    website: str | None = None
    whatsapp: str | None = None
    business_description: str | None = None
    gst_number: str | None = None
    fssai_number: str | None = None
    pan_number: str | None = None
    upi_id: str | None = None
    bank_account_number: str | None = None
    ifsc: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    product_categories: list[str] = []
    address: str | None = None
    email_verification_token: str | None = None


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    role: str
    avatar: str | None = None


class AuthResponse(BaseModel):
    token: str
    user: UserResponse
    vendor: dict | None = None
    message: str | None = None
