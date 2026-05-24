from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8000
    frontend_origin: str = "http://localhost:5173"

    supabase_url: str = ""
    supabase_service_role_key: str = ""

    meta_app_secret: str = ""
    meta_verify_token: str = "insulation_hiring_verify_token"
    meta_page_access_token: str = ""
    meta_page_id: str = ""
    public_apply_base: str = "http://localhost:5174"

    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""

    resend_api_key: str = ""
    resend_from_email: str = ""


settings = Settings()
