use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CursorPoint {
    x: f64,
    y: f64,
}

#[tauri::command]
fn global_cursor_position() -> Result<CursorPoint, String> {
    #[cfg(target_os = "macos")]
    {
        use core_graphics::event::CGEvent;
        use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

        let source = CGEventSource::new(CGEventSourceStateID::HIDSystemState)
            .map_err(|_| "无法读取系统鼠标事件源".to_string())?;
        let event =
            CGEvent::new(source).map_err(|_| "无法读取系统光标位置".to_string())?;
        let point = event.location();
        Ok(CursorPoint {
            x: point.x,
            y: point.y,
        })
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("当前仅支持 macOS 全局光标位置".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![global_cursor_position])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
