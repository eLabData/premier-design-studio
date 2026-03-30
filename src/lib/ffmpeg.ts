import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  fps: number;
}

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<void> | null = null;

export async function loadFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;

  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpegInstance!.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
      });
    })();
  }

  await loadPromise;
  return ffmpegInstance!;
}

export async function getVideoInfo(file: File | Blob): Promise<VideoInfo> {
  const ff = await loadFFmpeg();

  const inputName = "probe_input.mp4";
  await ff.writeFile(inputName, await fetchFile(file));

  let output = "";

  const logLines: string[] = [];
  ff.on("log", ({ message }) => {
    logLines.push(message);
  });

  // Run ffprobe-equivalent via ffmpeg stderr
  try {
    await ff.exec(["-i", inputName, "-f", "null", "-"]);
  } catch {
    // ffmpeg exits with error code when no output is specified — that's expected
  }

  // unsub not available in this version — logger runs for the lifetime of the call
  output = logLines.join("\n");

  await ff.deleteFile(inputName);

  // Parse duration
  const durationMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  let duration = 0;
  if (durationMatch) {
    duration =
      parseInt(durationMatch[1]) * 3600 +
      parseInt(durationMatch[2]) * 60 +
      parseFloat(durationMatch[3]);
  }

  // Parse video stream dimensions
  const sizeMatch = output.match(/(\d{2,5})x(\d{2,5})/);
  const width = sizeMatch ? parseInt(sizeMatch[1]) : 1920;
  const height = sizeMatch ? parseInt(sizeMatch[2]) : 1080;

  // Parse fps
  const fpsMatch = output.match(/(\d+(?:\.\d+)?)\s*fps/);
  const fps = fpsMatch ? parseFloat(fpsMatch[1]) : 30;

  return { duration, width, height, fps };
}

export async function trimVideo(
  file: File | Blob,
  startTime: number,
  endTime: number
): Promise<Blob> {
  const ff = await loadFFmpeg();

  await ff.writeFile("trim_input.mp4", await fetchFile(file));

  await ff.exec([
    "-i",
    "trim_input.mp4",
    "-ss",
    String(startTime),
    "-to",
    String(endTime),
    "-c",
    "copy",
    "trim_output.mp4",
  ]);

  const data = await ff.readFile("trim_output.mp4");
  await ff.deleteFile("trim_input.mp4");
  await ff.deleteFile("trim_output.mp4");

  return new Blob([data as unknown as BlobPart], { type: "video/mp4" });
}

export async function mergeVideos(files: (File | Blob)[]): Promise<Blob> {
  const ff = await loadFFmpeg();

  const inputNames: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const name = `merge_input_${i}.mp4`;
    await ff.writeFile(name, await fetchFile(files[i]));
    inputNames.push(name);
  }

  // Build concat list
  const concatContent = inputNames
    .map((name) => `file '${name}'`)
    .join("\n");
  const encoder = new TextEncoder();
  await ff.writeFile("concat_list.txt", encoder.encode(concatContent));

  await ff.exec([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    "concat_list.txt",
    "-c",
    "copy",
    "merge_output.mp4",
  ]);

  const data = await ff.readFile("merge_output.mp4");

  for (const name of inputNames) {
    await ff.deleteFile(name);
  }
  await ff.deleteFile("concat_list.txt");
  await ff.deleteFile("merge_output.mp4");

  return new Blob([data as unknown as BlobPart], { type: "video/mp4" });
}

export async function addOverlay(
  mainVideo: File | Blob,
  overlayVideo: File | Blob,
  x: number,
  y: number,
  startTime: number,
  endTime: number
): Promise<Blob> {
  const ff = await loadFFmpeg();

  await ff.writeFile("overlay_main.mp4", await fetchFile(mainVideo));
  await ff.writeFile("overlay_pip.mp4", await fetchFile(overlayVideo));

  const enableFilter =
    startTime > 0 || endTime > 0
      ? `enable='between(t,${startTime},${endTime})'`
      : "";

  const overlayFilter = `[1:v]scale=320:180${enableFilter ? "," + enableFilter : ""}[pip];[0:v][pip]overlay=${x}:${y}`;

  await ff.exec([
    "-i",
    "overlay_main.mp4",
    "-i",
    "overlay_pip.mp4",
    "-filter_complex",
    overlayFilter,
    "-c:a",
    "copy",
    "overlay_output.mp4",
  ]);

  const data = await ff.readFile("overlay_output.mp4");
  await ff.deleteFile("overlay_main.mp4");
  await ff.deleteFile("overlay_pip.mp4");
  await ff.deleteFile("overlay_output.mp4");

  return new Blob([data as unknown as BlobPart], { type: "video/mp4" });
}

export async function burnCaptions(
  videoFile: File | Blob,
  srtContent: string
): Promise<Blob> {
  const ff = await loadFFmpeg();

  await ff.writeFile("captions_input.mp4", await fetchFile(videoFile));
  const encoder = new TextEncoder();
  await ff.writeFile("captions.srt", encoder.encode(srtContent));

  await ff.exec([
    "-i",
    "captions_input.mp4",
    "-vf",
    "subtitles=captions.srt",
    "-c:a",
    "copy",
    "captions_output.mp4",
  ]);

  const data = await ff.readFile("captions_output.mp4");
  await ff.deleteFile("captions_input.mp4");
  await ff.deleteFile("captions.srt");
  await ff.deleteFile("captions_output.mp4");

  return new Blob([data as unknown as BlobPart], { type: "video/mp4" });
}

export async function extractAudio(videoFile: File | Blob): Promise<Blob> {
  const ff = await loadFFmpeg();

  await ff.writeFile("audio_input.mp4", await fetchFile(videoFile));

  await ff.exec([
    "-i",
    "audio_input.mp4",
    "-vn",
    "-acodec",
    "libmp3lame",
    "-q:a",
    "2",
    "audio_output.mp3",
  ]);

  const data = await ff.readFile("audio_output.mp3");
  await ff.deleteFile("audio_input.mp4");
  await ff.deleteFile("audio_output.mp3");

  return new Blob([data as unknown as BlobPart], { type: "audio/mpeg" });
}
