// The update module only queries the signed OpenStruct catalog and installs on request.
mod update;

#[tauri::command]
fn foundation_stiffness(input: molas_core::Input) -> Result<molas_core::Output, String> {
    molas_core::stiffness(&input)
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(update::Updater::default())
        .invoke_handler(tauri::generate_handler![
            foundation_stiffness,
            update::update_check,
            update::update_download,
            update::update_cancel,
            update::update_discard,
            update::update_apply,
            update::update_open_launcher,
        ])
        .run(tauri::generate_context!())
        .expect("Não foi possível iniciar o MolaStruct");
}
