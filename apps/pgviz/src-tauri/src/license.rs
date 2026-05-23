use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

const LICENSE_FILE: &str = "license.json";

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LicenseInfo {
    pub key: String,
    pub activated_at: i64,
    pub product_id: String,
}

fn license_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut path = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    path.push(LICENSE_FILE);
    Ok(path)
}

pub fn load_license(app: &tauri::AppHandle) -> Result<Option<LicenseInfo>, String> {
    let path = license_path(app)?;
    if !path.exists() {
        return Ok(None);
    }
    let json = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&json).map_err(|e| e.to_string())
}

pub fn save_license(
    app: &tauri::AppHandle,
    license: &LicenseInfo,
) -> Result<(), String> {
    let path = license_path(app)?;
    let json = serde_json::to_string(license).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())
}

pub fn clear_license(app: &tauri::AppHandle) -> Result<(), String> {
    let path = license_path(app)?;
    let _ = fs::remove_file(&path);
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
struct LemonSqueezyActivateResponse {
    activated: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    license_key: Option<serde_json::Value>,
}

/// Validate a license key against the Lemon Squeezy License API.
/// For dev/testing, any key starting with "DEV-" is accepted.
pub async fn validate_license_key(key: &str) -> Result<bool, String> {
    // Dev bypass
    if key.trim().starts_with("DEV-") {
        return Ok(true);
    }

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.lemonsqueezy.com/v1/licenses/activate")
        .header("Accept", "application/json")
        .form(&[
            ("license_key", key.trim()),
            // You will need to set your actual instance name or product ID here.
            // For now we validate format only and defer real activation.
            ("instance_name", "pgviz-desktop"),
        ])
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    if !status.is_success() {
        return Err(format!("License validation failed: {}", body));
    }

    let parsed: LemonSqueezyActivateResponse =
        serde_json::from_str(&body).map_err(|e| format!("Invalid response: {}", e))?;

    if parsed.activated {
        Ok(true)
    } else {
        Err(parsed
            .error
            .unwrap_or_else(|| "License key is invalid or already in use.".to_string()))
    }
}

#[tauri::command]
pub async fn activate_license(
    app: tauri::AppHandle,
    key: String,
    product_id: String,
) -> Result<(), String> {
    let valid = validate_license_key(&key).await?;
    if !valid {
        return Err("License key is invalid or already in use.".to_string());
    }

    let license = LicenseInfo {
        key,
        activated_at: chrono::Utc::now().timestamp(),
        product_id,
    };

    save_license(&app, &license)
}

#[tauri::command]
pub fn get_license(app: tauri::AppHandle) -> Result<Option<LicenseInfo>, String> {
    load_license(&app)
}

#[tauri::command]
pub fn deactivate_license(app: tauri::AppHandle) -> Result<(), String> {
    clear_license(&app)
}
