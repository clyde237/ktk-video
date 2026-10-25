use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};

use serde::Serialize;
use tauri::{Manager, State};

#[derive(Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
enum MediaKind {
    Video,
    Audio,
}

#[derive(Clone, Copy)]
enum ConversionMode {
    Remux,
    Transcode,
}

struct MediaCache {
    directory: PathBuf,
    ffmpeg_directory: PathBuf,
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

fn collect_media_files(
    dir: &Path,
    recursive: bool,
    items: &mut Vec<MediaFileInfo>,
) -> std::io::Result<()> {
    for entry in fs::read_dir(dir)? {
        let Ok(entry) = entry else {
            continue;
        };

        let file_path = entry.path();
        let Ok(file_type) = entry.file_type() else {
            continue;
        };

        if file_type.is_dir() {
            if recursive {
                collect_media_files(&file_path, recursive, items)?;
            }
            continue;
        }

        if !file_type.is_file() {
            continue;
        }

        let extension = file_path
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.to_ascii_lowercase())
            .unwrap_or_default();

        let kind = if VIDEO_EXTENSIONS.contains(&extension.as_str()) {
            "video"
        } else if AUDIO_EXTENSIONS.contains(&extension.as_str()) {
            "audio"
        } else {
            continue;
        };

        let Ok(file_metadata) = entry.metadata() else {
            continue;
        };

        let name = file_path
            .file_stem()
            .and_then(|stem| stem.to_str())
            .unwrap_or("média")
            .to_string();

        items.push(MediaFileInfo {
            path: file_path.to_string_lossy().to_string(),
            name,
            kind: if kind == "video" { MediaKind::Video } else { MediaKind::Audio },
            extension,
            size: file_metadata.len(),
        });
    }

    Ok(())
}

#[tauri::command]
fn load_media_folder(
    app: tauri::AppHandle,
    path: String,
    recursive: bool,
) -> Result<Vec<MediaFileInfo>, String> {
    let directory = Path::new(&path);
    if !app.asset_protocol_scope().is_allowed(directory) {
        return Err("Le dossier doit être choisi dans le sélecteur de dossiers.".into());
    }

    let mut items: Vec<MediaFileInfo> = Vec::new();
    collect_media_files(directory, recursive, &mut items)
        .map_err(|_| format!("Impossible de lire le contenu du dossier : {path}"))?;

    items.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(items)
}

#[tauri::command]
fn save_playlists(app: tauri::AppHandle, data: String) -> Result<(), String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Chemin des données indisponible : {error}"))?;
    fs::create_dir_all(&directory)
        .map_err(|error| format!("Création du dossier impossible : {error}"))?;

    fs::write(directory.join("playlists.json"), data)
        .map_err(|error| format!("Écriture des playlists impossible : {error}"))
}

#[tauri::command]
fn load_playlists(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Chemin des données indisponible : {error}"))?;
    let file = directory.join("playlists.json");

    match fs::read_to_string(file) {
        Ok(data) => Ok(Some(data)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(format!("Lecture des playlists impossible : {error}")),
    }
}

fn cache_output_path(extension: &str) -> Result<String, String> {
    let directory = std::env::temp_dir().join("ktk-video-subtitles");
    fs::create_dir_all(&directory).map_err(|error| {
        format!("Impossible de créer le dossier de sous-titres temporaire : {error}")
    })?;

    let path = directory.join(format!("{}.{extension}", uuid::Uuid::new_v4()));
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
fn find_subtitles(video_path: String) -> Vec<String> {
    let video = Path::new(&video_path);
    let Some(dir) = video.parent() else {
        return Vec::new();
    };

    let stem = video
        .file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or_default()
        .to_lowercase();

    let mut exact = Vec::new();
    let mut prefix = Vec::new();
    let mut others = Vec::new();

    let Ok(entries) = fs::read_dir(dir) else {
        return Vec::new();
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let is_srt = path
            .extension()
            .and_then(|extension| extension.to_str())
            .map(|extension| extension.eq_ignore_ascii_case("srt"))
            .unwrap_or(false);
        if !is_srt {
            continue;
        }

        let candidate_stem = path
            .file_stem()
            .and_then(|stem| stem.to_str())
            .unwrap_or_default()
            .to_lowercase();
        let full = path.to_string_lossy().to_string();

        if candidate_stem == stem {
            exact.push(full);
        } else if candidate_stem.starts_with(&format!("{stem}.")) {
            prefix.push(full);
        } else {
            others.push(full);
        }
    }

    exact.sort();
    prefix.sort();
    others.sort();
    exact.extend(prefix);
    exact.extend(others);
    exact
}

#[tauri::command]
fn extract_embedded_subtitle(path: String) -> Result<String, String> {
    if !Path::new(&path).is_file() {
        return Err("Fichier source introuvable.".into());
    }

    let output = cache_output_path("srt")?;
    let ffmpeg_directory = std::env::temp_dir().join("ktk-video-ffmpeg");
    let executable = ffmpeg_executable(&ffmpeg_directory)?;
    let result = Command::new(executable)
        .args([
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            &path,
            "-map",
            "0:s:0",
            &output,
        ])
        .output()
        .map_err(|error| format!("Impossible de démarrer FFmpeg : {error}"))?;

    if !result.status.success() {
        let cleanup_error = fs::remove_file(&output).err();
        let message = String::from_utf8_lossy(&result.stderr).trim().to_string();
        return Err(match cleanup_error {
            Some(cleanup_error) if cleanup_error.kind() != std::io::ErrorKind::NotFound => format!(
                "Aucune piste de sous-titres texte extractible. Impossible de nettoyer le fichier temporaire : {cleanup_error}"
            ),
            _ if !message.is_empty() => format!("Aucune piste de sous-titres texte extractible : {message}"),
            _ => "Aucune piste de sous-titres texte extractible.".to_string(),
        });
    }

    Ok(output)
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    const MAX_BYTES: u64 = 5 * 1024 * 1024;

    let file = Path::new(&path);
    if !file.is_file() {
        return Err("Fichier introuvable.".into());
    }

    let size = fs::metadata(file)
        .map_err(|error| format!("Accès impossible : {error}"))?
        .len();
    if size > MAX_BYTES {
        return Err("Fichier trop volumineux (5 Mo maximum pour des sous-titres).".into());
    }

    fs::read_to_string(file).map_err(|error| format!("Lecture impossible : {error}"))
}

fn output_extension(kind: &MediaKind, mode: ConversionMode) -> Result<&'static str, String> {
    match (kind, mode) {
        (MediaKind::Video, ConversionMode::Remux | ConversionMode::Transcode) => Ok("mp4"),
        (MediaKind::Audio, ConversionMode::Transcode) => Ok("m4a"),
        (MediaKind::Audio, ConversionMode::Remux) => {
            Err("Le remuxage est uniquement disponible pour les vidéos.".into())
        }
    }
}

fn output_path(
    directory: &Path,
    kind: &MediaKind,
    mode: ConversionMode,
) -> Result<PathBuf, String> {
    let extension = output_extension(kind, mode)?;
    Ok(directory.join(format!("{}.{}", uuid::Uuid::new_v4(), extension)))
}

fn executable_name() -> &'static str {
    if cfg!(windows) {
        "ffmpeg.exe"
    } else {
        "ffmpeg"
    }
}

fn ffmpeg_executable(ffmpeg_directory: &Path) -> Result<PathBuf, String> {
    let cached = ffmpeg_directory.join(executable_name());
    if cached.is_file() && ffmpeg_works(&cached) {
        return Ok(cached);
    }

    if ffmpeg_works(Path::new("ffmpeg")) {
        return Ok(PathBuf::from("ffmpeg"));
    }

    if cached.exists() {
        return Err(format!(
            "Le FFmpeg en cache est inutilisable : {}.",
            cached.display()
        ));
    }

    fs::create_dir_all(ffmpeg_directory).map_err(|error| {
        format!(
            "Impossible de créer le dossier de données FFmpeg {} : {error}",
            ffmpeg_directory.display()
        )
    })?;

    let download_url = ffmpeg_sidecar::download::ffmpeg_download_url().map_err(|error| {
        format!("Aucun FFmpeg utilisable et téléchargement indisponible : {error}")
    })?;
    let archive_path = ffmpeg_directory.join(
        Path::new(download_url)
            .file_name()
            .ok_or_else(|| "L'URL de téléchargement FFmpeg est invalide.".to_string())?,
    );
    let archive = match ffmpeg_sidecar::download::download_ffmpeg_package(
        download_url,
        ffmpeg_directory,
    ) {
        Ok(archive) => archive,
        Err(error) => {
            if let Err(cleanup_error) = fs::remove_file(&archive_path) {
                if cleanup_error.kind() != std::io::ErrorKind::NotFound {
                    return Err(format!(
                        "Impossible de télécharger FFmpeg : {error}. Le nettoyage de l'archive a aussi échoué : {cleanup_error}"
                    ));
                }
            }
            return Err(format!("Impossible de télécharger FFmpeg : {error}"));
        }
    };

    if let Err(error) =
        ffmpeg_sidecar::download::unpack_ffmpeg_without_extras(&archive, ffmpeg_directory)
    {
        if let Err(cleanup_error) = fs::remove_file(&archive) {
            if cleanup_error.kind() != std::io::ErrorKind::NotFound {
                return Err(format!(
                    "Impossible d'installer FFmpeg : {error}. Le nettoyage de l'archive a aussi échoué : {cleanup_error}"
                ));
            }
        }
        return Err(format!("Impossible d'installer FFmpeg : {error}"));
    }

    let downloaded = ffmpeg_directory.join(executable_name());
    if !ffmpeg_works(&downloaded) {
        return Err(format!(
            "FFmpeg a été téléchargé, mais ne peut pas être exécuté depuis {}.",
            downloaded.display()
        ));
    }

    Ok(downloaded)
}

fn ffmpeg_works(executable: &Path) -> bool {
    Command::new(executable)
        .arg("-version")
        .output()
        .is_ok_and(|output| output.status.success())
}

fn run_conversion(
    executable: &Path,
    input: &Path,
    output: &Path,
    kind: &MediaKind,
    mode: ConversionMode,
) -> Result<(), String> {
    let mut command = Command::new(executable);
    command
        .args(["-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i"])
        .arg(input);

    match (kind, mode) {
        (MediaKind::Video, ConversionMode::Remux) => {
            command.args([
                "-map",
                "0:v:0?",
                "-map",
                "0:a:0?",
                "-c",
                "copy",
                "-sn",
                "-movflags",
                "+faststart",
            ]);
        }
        (MediaKind::Video, ConversionMode::Transcode) => {
            command.args([
                "-map",
                "0:v:0?",
                "-map",
                "0:a:0?",
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                "23",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                "-sn",
                "-movflags",
                "+faststart",
            ]);
        }
        (MediaKind::Audio, ConversionMode::Transcode) => {
            command.args([
                "-map",
                "0:a:0?",
                "-vn",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                "-movflags",
                "+faststart",
            ]);
        }
        (MediaKind::Audio, ConversionMode::Remux) => {
            return Err("Le remuxage est uniquement disponible pour les vidéos.".into());
        }
    }

    let result = command
        .arg(output)
        .output()
        .map_err(|error| format!("Impossible de démarrer FFmpeg : {error}"))?;
    if !result.status.success() {
        let details = String::from_utf8_lossy(&result.stderr);
        let details: String = details
            .chars()
            .rev()
            .take(600)
            .collect::<String>()
            .chars()
            .rev()
            .collect();
        let cleanup_error = match fs::remove_file(output) {
            Ok(()) => None,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
            Err(error) => Some(error),
        };
        let message = if details.trim().is_empty() {
            format!("FFmpeg a échoué avec le code {}.", result.status)
        } else {
            format!("FFmpeg a échoué : {}", details.trim())
        };
        return Err(match cleanup_error {
            Some(error) => {
                format!("{message} Impossible de supprimer le fichier temporaire : {error}")
            }
            None => message,
        });
    }

    let metadata = match fs::metadata(output) {
        Ok(metadata) => metadata,
        Err(error) => {
            let cleanup_error = fs::remove_file(output).err();
            return Err(match cleanup_error {
                Some(cleanup_error) if cleanup_error.kind() != std::io::ErrorKind::NotFound => {
                    format!(
                        "FFmpeg n'a pas créé le fichier attendu : {error}. Impossible de nettoyer le fichier temporaire : {cleanup_error}"
                    )
                }
                _ => format!("FFmpeg n'a pas créé le fichier attendu : {error}"),
            });
        }
    };
    if metadata.len() == 0 {
        fs::remove_file(output).map_err(|error| {
            format!("Le fichier converti est vide et n'a pas pu être supprimé : {error}")
        })?;
        return Err("FFmpeg a produit un fichier vide.".into());
    }

    Ok(())
}

async fn convert_media(
    app: tauri::AppHandle,
    cache: State<'_, MediaCache>,
    path: String,
    mode: ConversionMode,
) -> Result<String, String> {
    if !app.asset_protocol_scope().is_allowed(&path) {
        return Err("Le fichier doit être choisi dans le sélecteur de fichiers.".into());
    }

    let info = media_file_info(Path::new(&path))?;
    let output = output_path(&cache.directory, &info.kind, mode)?;
    let input_path = PathBuf::from(path);
    let ffmpeg_directory = cache.ffmpeg_directory.clone();
    let output_for_worker = output.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let executable = ffmpeg_executable(&ffmpeg_directory)?;
        run_conversion(
            &executable,
            &input_path,
            &output_for_worker,
            &info.kind,
            mode,
        )?;
        Ok::<_, String>(output_for_worker)
    })
    .await
    .map_err(|error| format!("La tâche FFmpeg s'est interrompue : {error}"))??;

    Ok(output.to_string_lossy().into_owned())
}

#[tauri::command]
async fn remux_media(
    app: tauri::AppHandle,
    cache: State<'_, MediaCache>,
    path: String,
) -> Result<String, String> {
    convert_media(app, cache, path, ConversionMode::Remux).await
}

#[tauri::command]
async fn transcode_media(
    app: tauri::AppHandle,
    cache: State<'_, MediaCache>,
    path: String,
) -> Result<String, String> {
    convert_media(app, cache, path, ConversionMode::Transcode).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data_directory = app.path().app_local_data_dir()?;
            let cache_directory = app
                .path()
                .app_cache_dir()?
                .join("media")
                .join(uuid::Uuid::new_v4().to_string());
            let ffmpeg_directory = app_data_directory.join("ffmpeg");

            fs::create_dir_all(&cache_directory)?;
            app.asset_protocol_scope()
                .allow_directory(&cache_directory, true)?;
            app.manage(MediaCache {
                directory: cache_directory,
                ffmpeg_directory,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_media_file,
            load_media_folder,
            remux_media,
            transcode_media,
            save_playlists,
            load_playlists,
            find_subtitles,
            extract_embedded_subtitle,
            read_text_file
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    app.run(|app, event| {
        if let tauri::RunEvent::Exit = event {
            let cache = app.state::<MediaCache>();
            if let Err(error) = fs::remove_dir_all(&cache.directory) {
                if error.kind() != std::io::ErrorKind::NotFound {
                    eprintln!(
                        "Impossible de supprimer le cache média {} : {error}",
                        cache.directory.display()
                    );
                }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use std::{
        fs,
        time::{SystemTime, UNIX_EPOCH},
    };

    use super::{
        collect_media_files, find_subtitles, output_extension, output_path, run_conversion,
        ConversionMode, MediaKind, media_file_info,
    };

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
    fn loads_direct_or_recursive_media_files() {
        let directory = test_directory();
        fs::create_dir(&directory).expect("test directory should be created");

        fs::write(directory.join("Zulu.MP4"), b"video").expect("video should be created");
        fs::write(directory.join("alpha.mp3"), b"audio").expect("audio should be created");
        fs::write(directory.join("cover.png"), b"image").expect("image should be created");
        fs::write(directory.join("notes.txt"), b"text").expect("text file should be created");

        let nested = directory.join("nested");
        fs::create_dir(&nested).expect("nested directory should be created");
        fs::write(nested.join("nested.mp4"), b"video").expect("nested media should be created");

        let mut direct_items = Vec::new();
        collect_media_files(&directory, false, &mut direct_items).expect("direct scan should succeed");
        direct_items.sort_by_cached_key(|item| (item.name.to_lowercase(), item.name.clone()));

        assert_eq!(direct_items.len(), 2);
        assert_eq!(direct_items[0].name, "alpha");
        assert_eq!(direct_items[1].name, "Zulu");

        let mut recursive_items = Vec::new();
        collect_media_files(&directory, true, &mut recursive_items).expect("recursive scan should succeed");
        assert_eq!(recursive_items.len(), 3);

        fs::remove_dir_all(directory).expect("test directory should be removed");
    }

    #[test]
    fn finds_subtitles_sorted_by_relevance() {
        let directory = test_directory();
        fs::create_dir(&directory).expect("test directory should be created");

        let video = directory.join("film.mkv");
        fs::write(&video, b"video").expect("video should be created");
        fs::write(directory.join("film.srt"), b"sub").expect("sub should be created");
        fs::write(directory.join("film.fr.srt"), b"sub").expect("sub should be created");
        fs::write(directory.join("autre.srt"), b"sub").expect("sub should be created");
        fs::write(directory.join("ignore.txt"), b"text").expect("txt should be created");

        let found = find_subtitles(video.to_string_lossy().to_string());
        assert_eq!(found.len(), 3);

        let names: Vec<String> = found
            .iter()
            .map(|p| std::path::Path::new(p).file_name().unwrap().to_string_lossy().to_string())
            .collect();

        // Exact ("film.srt") en premier, puis préfixe ("film.fr.srt"), puis autres ("autre.srt")
        assert_eq!(names[0], "film.srt");
        assert_eq!(names[1], "film.fr.srt");
        assert_eq!(names[2], "autre.srt");

        fs::remove_dir_all(directory).expect("test directory should be removed");
    }

    #[test]
    fn selects_browser_friendly_extensions_for_conversions() {
        assert_eq!(
            output_extension(&MediaKind::Video, ConversionMode::Remux),
            Ok("mp4")
        );
        assert_eq!(
            output_extension(&MediaKind::Video, ConversionMode::Transcode),
            Ok("mp4")
        );
        assert_eq!(
            output_extension(&MediaKind::Audio, ConversionMode::Transcode),
            Ok("m4a")
        );
        assert!(output_extension(&MediaKind::Audio, ConversionMode::Remux).is_err());
    }

    #[test]
    #[ignore = "requires system FFmpeg with libx264 and AAC encoders"]
    fn remuxes_and_transcodes_sample_media() {
        use std::{path::Path, process::Command};

        let directory = test_directory();
        fs::create_dir(&directory).expect("test directory should be created");
        let source = directory.join("sample.mkv");

        let generated = Command::new("ffmpeg")
            .args([
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "lavfi",
                "-i",
                "color=c=blue:s=32x32:d=0.25",
                "-f",
                "lavfi",
                "-i",
                "sine=frequency=1000:duration=0.25",
                "-c:v",
                "mpeg4",
                "-c:a",
                "aac",
                "-shortest",
                "-y",
            ])
            .arg(&source)
            .status()
            .expect("system FFmpeg should be available");
        assert!(generated.success(), "sample media should be generated");

        let remuxed = output_path(&directory, &MediaKind::Video, ConversionMode::Remux)
            .expect("remux output path should be generated");
        run_conversion(
            Path::new("ffmpeg"),
            &source,
            &remuxed,
            &MediaKind::Video,
            ConversionMode::Remux,
        )
        .expect("sample video should be remuxed");

        let transcoded = output_path(&directory, &MediaKind::Video, ConversionMode::Transcode)
            .expect("transcode output path should be generated");
        run_conversion(
            Path::new("ffmpeg"),
            &source,
            &transcoded,
            &MediaKind::Video,
            ConversionMode::Transcode,
        )
        .expect("sample video should be transcoded");

        let audio_source = directory.join("sample.wav");
        let generated_audio = Command::new("ffmpeg")
            .args([
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "lavfi",
                "-i",
                "sine=frequency=440:duration=0.25",
                "-y",
            ])
            .arg(&audio_source)
            .status()
            .expect("system FFmpeg should be available");
        assert!(
            generated_audio.success(),
            "sample audio should be generated"
        );

        let transcoded_audio =
            output_path(&directory, &MediaKind::Audio, ConversionMode::Transcode)
                .expect("audio output path should be generated");
        run_conversion(
            Path::new("ffmpeg"),
            &audio_source,
            &transcoded_audio,
            &MediaKind::Audio,
            ConversionMode::Transcode,
        )
        .expect("sample audio should be transcoded");

        fs::remove_dir_all(directory).expect("test directory should be removed");
    }
}
