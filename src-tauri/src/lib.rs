use std::{fs, path::Path};

use serde::Serialize;

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

#[tauri::command]
fn load_media_file(path: String) -> Result<MediaFileInfo, String> {
    let file_path = Path::new(&path);
    let metadata = fs::metadata(file_path)
        .map_err(|error| format!("Impossible d'accéder au fichier : {error}"))?;

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
        path,
        name,
        kind,
        extension,
        size: metadata.len(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![load_media_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use std::{
        fs,
        time::{SystemTime, UNIX_EPOCH},
    };

    use super::load_media_file;

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

        let media = load_media_file(path.to_string_lossy().into_owned())
            .expect("supported media should load");

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

        assert!(load_media_file(directory.to_string_lossy().into_owned()).is_err());

        let unsupported = directory.join("document.txt");
        fs::write(&unsupported, b"text").expect("test file should be created");
        assert!(load_media_file(unsupported.to_string_lossy().into_owned()).is_err());

        let audio = directory.join("track.FLAC");
        fs::write(&audio, b"audio").expect("test audio should be created");
        let media = load_media_file(audio.to_string_lossy().into_owned())
            .expect("supported audio should load");
        assert!(matches!(media.kind, super::MediaKind::Audio));
        assert_eq!(media.extension, "flac");

        fs::remove_dir_all(directory).expect("test directory should be removed");
    }
}
