use std::{fs, path::Path};

use serde::Serialize;
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
enum MediaKind {
    Video,
    Audio,
}

#[derive(Serialize)]
struct MediaFileInfo {
    path: String,
    name: String,
    kind: MediaKind,
    extension: String,
    size: u64,
}

const VIDEO_EXTENSIONS: &[&str] = &[
    "mp4", "mkv", "webm", "avi", "mov", "m4v", "ogv", "mpg", "mpeg", "3gp", "ts",
];
const AUDIO_EXTENSIONS: &[&str] = &[
    "mp3", "flac", "ogg", "oga", "wav", "m4a", "aac", "opus", "wma", "aiff",
];

fn media_file_info(file_path: &Path) -> Result<MediaFileInfo, String> {
    let metadata = fs::metadata(file_path).map_err(|error| {
        format!(
            "Impossible d'accéder au fichier {} : {error}",
            file_path.display()
        )
    })?;

    if !metadata.is_file() {
        return Err("Le chemin indiqué n'est pas un fichier.".into());
    }

    let extension = file_path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(str::to_ascii_lowercase)
        .unwrap_or_default();

    let kind = if VIDEO_EXTENSIONS.contains(&extension.as_str()) {
        MediaKind::Video
    } else if AUDIO_EXTENSIONS.contains(&extension.as_str()) {
        MediaKind::Audio
    } else {
        return Err(format!("Format .{extension} non pris en charge."));
    };

    let name = file_path
        .file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or("média")
        .to_string();

    Ok(MediaFileInfo {
        path: file_path.to_string_lossy().into_owned(),
        name,
        kind,
        extension,
        size: metadata.len(),
    })
}

#[tauri::command]
fn load_media_file(app: tauri::AppHandle, path: String) -> Result<MediaFileInfo, String> {
    if !app.asset_protocol_scope().is_allowed(&path) {
        return Err("Le fichier doit être choisi dans le sélecteur de fichiers.".into());
    }

    media_file_info(Path::new(&path))
}

fn media_folder_info(directory: &Path) -> Result<Vec<MediaFileInfo>, String> {
    let metadata = fs::metadata(directory).map_err(|error| {
        format!(
            "Impossible d'accéder au dossier {} : {error}",
            directory.display()
        )
    })?;

    if !metadata.is_dir() {
        return Err("Le chemin indiqué n'est pas un dossier.".into());
    }

    let entries = fs::read_dir(directory).map_err(|error| {
        format!(
            "Impossible de lire le contenu du dossier {} : {error}",
            directory.display()
        )
    })?;
    let mut items: Vec<MediaFileInfo> = Vec::new();

    for entry in entries {
        let Ok(entry) = entry else {
            continue;
        };
        let file_path = entry.path();

        if !file_path.is_file() {
            continue;
        }

        if let Ok(media) = media_file_info(&file_path) {
            items.push(media);
        }
    }

    items.sort_by_cached_key(|item| (item.name.to_lowercase(), item.name.clone()));
    Ok(items)
}

#[tauri::command]
fn load_media_folder(app: tauri::AppHandle, path: String) -> Result<Vec<MediaFileInfo>, String> {
    let directory = Path::new(&path);
    if !app.asset_protocol_scope().is_allowed(directory) {
        return Err("Le dossier doit être choisi dans le sélecteur de dossiers.".into());
    }

    media_folder_info(directory)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![load_media_file, load_media_folder])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use std::{
        fs,
        time::{SystemTime, UNIX_EPOCH},
    };

    use super::{media_file_info, media_folder_info};

    fn test_directory() -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock must be after Unix epoch")
            .as_nanos();

        std::env::temp_dir().join(format!("ktk-video-test-{}-{unique}", std::process::id()))
    }

    #[test]
    fn loads_supported_media_and_normalizes_extension() {
        let directory = test_directory();
        fs::create_dir(&directory).expect("test directory should be created");

        let path = directory.join("Example.MP4");
        fs::write(&path, b"video").expect("test media should be created");

        let media = media_file_info(&path).expect("supported media should load");

        assert_eq!(media.name, "Example");
        assert!(matches!(media.kind, super::MediaKind::Video));
        assert_eq!(media.extension, "mp4");
        assert_eq!(media.size, 5);
        assert_eq!(
            serde_json::to_value(&media.kind).expect("media kind should serialize"),
            "video"
        );

        fs::remove_dir_all(directory).expect("test directory should be removed");
    }

    #[test]
    fn rejects_directories_and_unsupported_extensions() {
        let directory = test_directory();
        fs::create_dir(&directory).expect("test directory should be created");

        assert!(media_file_info(&directory).is_err());

        let unsupported = directory.join("document.txt");
        fs::write(&unsupported, b"text").expect("test file should be created");
        assert!(media_file_info(&unsupported).is_err());

        let audio = directory.join("track.FLAC");
        fs::write(&audio, b"audio").expect("test audio should be created");
        let media = media_file_info(&audio).expect("supported audio should load");
        assert!(matches!(media.kind, super::MediaKind::Audio));
        assert_eq!(media.extension, "flac");

        fs::remove_dir_all(directory).expect("test directory should be removed");
    }

    #[test]
    fn loads_only_direct_media_files_and_sorts_by_name() {
        let directory = test_directory();
        fs::create_dir(&directory).expect("test directory should be created");

        fs::write(directory.join("Zulu.MP4"), b"video").expect("video should be created");
        fs::write(directory.join("alpha.mp3"), b"audio").expect("audio should be created");
        fs::write(directory.join("cover.png"), b"image").expect("image should be created");
        fs::write(directory.join("notes.txt"), b"text").expect("text file should be created");

        let nested = directory.join("nested");
        fs::create_dir(&nested).expect("nested directory should be created");
        fs::write(nested.join("nested.mp4"), b"video").expect("nested media should be created");

        let items = media_folder_info(&directory).expect("media folder should load");

        assert_eq!(items.len(), 2);
        assert_eq!(items[0].name, "alpha");
        assert_eq!(items[1].name, "Zulu");

        fs::remove_dir_all(directory).expect("test directory should be removed");
    }

    #[test]
    fn returns_empty_for_media_free_folder_and_rejects_file_path() {
        let directory = test_directory();
        fs::create_dir(&directory).expect("test directory should be created");
        assert!(
            media_folder_info(&directory)
                .expect("empty media folder should load")
                .is_empty()
        );

        let file = directory.join("file.mp4");
        fs::write(&file, b"video").expect("test file should be created");

        assert!(media_folder_info(&file).is_err());

        fs::remove_dir_all(directory).expect("test directory should be removed");
    }
}
