use tauri_plugin_shell::process::{CommandChild, CommandEvent};

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

                    eprintln!("[LIH] Starting sidecar, DATA_DIR={}", data_dir_str);

                    match app.shell().sidecar("lih-backend") {
                        Ok(sidecar) => {
                            let cmd = sidecar
                                .env("DATA_DIR", &data_dir_str)
                                .env("CHROMA_PERSIST_DIR", chroma_dir.to_string_lossy().to_string())
                                .env("SQLITE_DB_PATH", db_path.to_string_lossy().to_string())
                                .env("HOST", "127.0.0.1")
                                .env("PORT", "8000");

                            match cmd.spawn() {
                                Ok((mut rx, child)) => {
                                    eprintln!("[LIH] Sidecar spawned (pid={})", child.pid());
                                    app.manage(BackendProcess(Some(child)));
                                    // 별도 스레드에서 sidecar stdout/stderr 로깅
                                    tauri::async_runtime::spawn(async move {
                                        while let Some(event) = rx.recv().await {
                                            match event {
                                                CommandEvent::Stdout(line) => {
                                                    eprintln!("[sidecar:out] {}", String::from_utf8_lossy(&line));
                                                }
                                                CommandEvent::Stderr(line) => {
                                                    eprintln!("[sidecar:err] {}", String::from_utf8_lossy(&line));
                                                }
                                                CommandEvent::Terminated(payload) => {
                                                    eprintln!("[sidecar:exit] code={:?} signal={:?}", payload.code, payload.signal);
                                                }
                                                _ => {}
                                            }
                                        }
                                    });
                                }
                                Err(e) => eprintln!("[LIH] Sidecar spawn FAILED: {}", e),
                            }
                        }
                        Err(e) => eprintln!("[LIH] Sidecar init FAILED: {}", e),
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
