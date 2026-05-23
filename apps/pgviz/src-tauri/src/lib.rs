mod commands;
mod db;
mod license;
mod store;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(
            tauri_plugin_updater::Builder::new()
                .build(),
        )
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri::menu::{
                    Menu, MenuItem, PredefinedMenuItem, Submenu,
                };
                use tauri::Emitter;

                let new_connection = MenuItem::with_id(
                    app.handle(),
                    "new-connection",
                    "New Connection...",
                    true,
                    Some("CmdOrCtrl+N"),
                )?;
                let disconnect = MenuItem::with_id(
                    app.handle(),
                    "disconnect",
                    "Disconnect",
                    true,
                    Some("CmdOrCtrl+Shift+D"),
                )?;
                let preferences = MenuItem::with_id(
                    app.handle(),
                    "preferences",
                    "Preferences...",
                    true,
                    Some("CmdOrCtrl+,"),
                )?;
                let refresh_schema = MenuItem::with_id(
                    app.handle(),
                    "refresh-schema",
                    "Refresh Schema",
                    true,
                    Some("CmdOrCtrl+R"),
                )?;
                let toggle_theme = MenuItem::with_id(
                    app.handle(),
                    "toggle-theme",
                    "Toggle Theme",
                    true,
                    Some("CmdOrCtrl+Shift+L"),
                )?;

                let connection_menu = Submenu::with_items(
                    app.handle(),
                    "Connection",
                    true,
                    &[
                        &new_connection,
                        &disconnect,
                        &PredefinedMenuItem::separator(app.handle())?,
                        &preferences,
                        &PredefinedMenuItem::separator(app.handle())?,
                        &PredefinedMenuItem::quit(app.handle(), None)?,
                    ],
                )?;

                let view_menu = Submenu::with_items(
                    app.handle(),
                    "View",
                    true,
                    &[
                        &refresh_schema,
                        &PredefinedMenuItem::separator(app.handle())?,
                        &toggle_theme,
                    ],
                )?;

                let help_menu = Submenu::with_items(
                    app.handle(),
                    "Help",
                    true,
                    &[
                        &MenuItem::with_id(
                            app.handle(),
                            "about",
                            "About pgviz",
                            true,
                            None::<&str>,
                        )?,
                    ],
                )?;

                let menu = Menu::with_items(
                    app.handle(),
                    &[&connection_menu, &view_menu, &help_menu],
                )?;
                app.set_menu(menu)?;

                app.on_menu_event(|app, event| {
                    match event.id().0.as_str() {
                        "new-connection" => {
                            let _ = app.emit("navigate", "/connections/new");
                        }
                        "disconnect" => {
                            let _ = app.emit("disconnect", ());
                        }
                        "preferences" => {
                            let _ = app.emit("navigate", "/settings");
                        }
                        "refresh-schema" => {
                            let _ = app.emit("refresh-schema", ());
                        }
                        "toggle-theme" => {
                            let _ = app.emit("toggle-theme", ());
                        }
                        "about" => {
                            let _ = app.emit("show-about", ());
                        }
                        _ => {}
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_schema,
            commands::list_schemas,
            commands::query_table,
            commands::execute_sql,
            commands::explain_sql,
            commands::get_metadata,
            commands::list_extensions,
            commands::install_extension,
            commands::drop_extension,
            store::get_databases,
            store::add_database,
            store::remove_database,
            license::activate_license,
            license::get_license,
            license::deactivate_license,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
