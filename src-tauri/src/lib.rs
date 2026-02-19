use tauri_plugin_shell::process::CommandChild;

/// 백엔드 sidecar 프로세스. 앱 종료 시 kill.
#[allow(dead_code)]
struct BackendProcess(pub Option<CommandChild>);

impl Drop for BackendProcess {
    fn drop(&mut self) {
        if let Some(c) = self.0.take() {
            let _ = c.kill();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            #[cfg(debug_assertions)]
            let _ = &app;
            #[cfg(not(debug_assertions))]
            {
                use tauri::Manager;
                use tauri_plugin_shell::ShellExt;
                if let Ok(data_dir) = app.path().app_data_dir() {
                    let _ = std::fs::create_dir_all(&data_dir);
                    let data_dir_str = data_dir.to_string_lossy().to_string();
                    let chroma_dir = data_dir.join("chroma");
                    let _ = std::fs::create_dir_all(&chroma_dir);
                    let db_path = data_dir.join("lih.db");

                    if let Ok(sidecar) = app.shell().sidecar("lih-backend") {
                        let child = sidecar
                            .env("DATA_DIR", &data_dir_str)
                            .env("CHROMA_PERSIST_DIR", chroma_dir.to_string_lossy().to_string())
                            .env("SQLITE_DB_PATH", db_path.to_string_lossy().to_string())
                            .env("HOST", "127.0.0.1")
                            .env("PORT", "8000")
                            .spawn();
                        if let Ok((_rx, child)) = child {
                            app.manage(BackendProcess(Some(child)));
                        }
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
