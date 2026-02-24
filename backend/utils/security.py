import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Settings
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def _required_secret(secret_name: str, env_var: str) -> str:
    value = ""

    try:
        from services.secret_manager_service import SecretManagerService
        secret_manager = SecretManagerService()
        value = secret_manager.get_secret(secret_name) or ""
    except Exception as exc:
        print(f"Warning: Secret Manager unavailable for '{secret_name}': {exc}")

    if not value:
        value = os.getenv(env_var, "").strip()

    if not value:
        raise RuntimeError(
            f"Missing required secret '{secret_name}'. "
            f"Set Secret Manager value or environment variable {env_var}."
        )

    return value

SECRET_KEY: Optional[str] = None
ENCRYPTION_KEY_VALUE: Optional[str] = None
fernet: Optional[Fernet] = None

def get_secret_key() -> str:
    global SECRET_KEY
    if not SECRET_KEY:
        SECRET_KEY = _required_secret("jwt-secret", "JWT_SECRET_KEY")
    return SECRET_KEY

def get_fernet() -> Fernet:
    global ENCRYPTION_KEY_VALUE, fernet
    if fernet is None:
        ENCRYPTION_KEY_VALUE = _required_secret("encryption-key", "ENCRYPTION_KEY")
        encryption_key = ENCRYPTION_KEY_VALUE
        fernet = Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)
    return fernet

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, get_secret_key(), algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, get_secret_key(), algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def decode_token(token: str) -> dict:
    return verify_token(token)

def encrypt_credential(credential: str) -> str:
    return get_fernet().encrypt(credential.encode()).decode()

def decrypt_credential(encrypted_credential: str) -> str:
    return get_fernet().decrypt(encrypted_credential.encode()).decode()
