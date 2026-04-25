use std::io::{BufReader, Read};
use std::fs::File;

use digest::Digest;
use hex::encode;

#[tauri::command]
fn compute_hash(file_path: String, algorithm: String) -> Result<String, String> {
    let file = File::open(&file_path).map_err(|e| e.to_string())?;
    let mut reader = BufReader::with_capacity(1024 * 1024, file);
    let mut buf = [0u8; 65536];

    match algorithm.as_str() {
        "md5" => {
            let mut hasher = md5::Md5::new();
            loop {
                let n = reader.read(&mut buf).map_err(|e| e.to_string())?;
                if n == 0 { break; }
                hasher.update(&buf[..n]);
            }
            Ok(encode(hasher.finalize()))
        }
        "sha1" => {
            let mut hasher = sha1::Sha1::new();
            loop {
                let n = reader.read(&mut buf).map_err(|e| e.to_string())?;
                if n == 0 { break; }
                hasher.update(&buf[..n]);
            }
            Ok(encode(hasher.finalize()))
        }
        "sha224" => {
            let mut hasher = sha2::Sha224::new();
            loop {
                let n = reader.read(&mut buf).map_err(|e| e.to_string())?;
                if n == 0 { break; }
                hasher.update(&buf[..n]);
            }
            Ok(encode(hasher.finalize()))
        }
        "sha256" => {
            let mut hasher = sha2::Sha256::new();
            loop {
                let n = reader.read(&mut buf).map_err(|e| e.to_string())?;
                if n == 0 { break; }
                hasher.update(&buf[..n]);
            }
            Ok(encode(hasher.finalize()))
        }
        "sha384" => {
            let mut hasher = sha2::Sha384::new();
            loop {
                let n = reader.read(&mut buf).map_err(|e| e.to_string())?;
                if n == 0 { break; }
                hasher.update(&buf[..n]);
            }
            Ok(encode(hasher.finalize()))
        }
        "sha512" => {
            let mut hasher = sha2::Sha512::new();
            loop {
                let n = reader.read(&mut buf).map_err(|e| e.to_string())?;
                if n == 0 { break; }
                hasher.update(&buf[..n]);
            }
            Ok(encode(hasher.finalize()))
        }
        "sha3_256" => {
            let mut hasher = sha3::Sha3_256::new();
            loop {
                let n = reader.read(&mut buf).map_err(|e| e.to_string())?;
                if n == 0 { break; }
                hasher.update(&buf[..n]);
            }
            Ok(encode(hasher.finalize()))
        }
        "sha3_512" => {
            let mut hasher = sha3::Sha3_512::new();
            loop {
                let n = reader.read(&mut buf).map_err(|e| e.to_string())?;
                if n == 0 { break; }
                hasher.update(&buf[..n]);
            }
            Ok(encode(hasher.finalize()))
        }
        "blake2b" => {
            use blake2::Blake2b512;
            let mut hasher = Blake2b512::new();
            loop {
                let n = reader.read(&mut buf).map_err(|e| e.to_string())?;
                if n == 0 { break; }
                hasher.update(&buf[..n]);
            }
            Ok(encode(hasher.finalize()))
        }
        "blake2s" => {
            use blake2::Blake2s256;
            let mut hasher = Blake2s256::new();
            loop {
                let n = reader.read(&mut buf).map_err(|e| e.to_string())?;
                if n == 0 { break; }
                hasher.update(&buf[..n]);
            }
            Ok(encode(hasher.finalize()))
        }
        "blake3" => {
            let mut hasher = blake3::Hasher::new();
            loop {
                let n = reader.read(&mut buf).map_err(|e| e.to_string())?;
                if n == 0 { break; }
                hasher.update(&buf[..n]);
            }
            Ok(hasher.finalize().to_hex().to_string())
        }
        "crc32" => {
            let mut hasher = crc32fast::Hasher::new();
            loop {
                let n = reader.read(&mut buf).map_err(|e| e.to_string())?;
                if n == 0 { break; }
                hasher.update(&buf[..n]);
            }
            Ok(format!("{:08x}", hasher.finalize()))
        }
        "adler32" => {
            let mut adler = adler::Adler32::new();
            loop {
                let n = reader.read(&mut buf).map_err(|e| e.to_string())?;
                if n == 0 { break; }
                adler.write_slice(&buf[..n]);
            }
            Ok(format!("{:08x}", adler.checksum()))
        }
        "ripemd160" => {
            let mut hasher = ripemd::Ripemd160::new();
            loop {
                let n = reader.read(&mut buf).map_err(|e| e.to_string())?;
                if n == 0 { break; }
                hasher.update(&buf[..n]);
            }
            Ok(encode(hasher.finalize()))
        }
        "whirlpool" => {
            let mut hasher = whirlpool::Whirlpool::new();
            loop {
                let n = reader.read(&mut buf).map_err(|e| e.to_string())?;
                if n == 0 { break; }
                hasher.update(&buf[..n]);
            }
            Ok(encode(hasher.finalize()))
        }
        _ => Err(format!("Unknown algorithm: {}", algorithm)),
    }
}

#[tauri::command]
fn get_file_size(file_path: String) -> Result<u64, String> {
    std::fs::metadata(&file_path)
        .map(|m| m.len())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn open_settings(app: tauri::AppHandle) {
    use tauri::Manager;
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.show();
        let _ = win.set_focus();
        return;
    }
    let _ = tauri::WebviewWindowBuilder::new(
        &app,
        "settings",
        tauri::WebviewUrl::App("settings.html".into()),
    )
    .title("Algorithm Settings")
    .inner_size(360.0, 200.0)
    .resizable(false)
    .center()
    .build();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![compute_hash, open_settings, get_file_size])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
