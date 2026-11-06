#[tauri::command]
fn foundation_stiffness(input: molas_core::Input) -> Result<molas_core::Output, String> {
    molas_core::stiffness(&input)
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![foundation_stiffness])
        .run(tauri::generate_context!())
        .expect("Não foi possível iniciar o MolaStruct");
}
