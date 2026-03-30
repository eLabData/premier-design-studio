"use client";

import { useCallback } from "react";
import { useEditorStore } from "@/lib/stores";
import {
  loadFFmpeg,
  getVideoInfo,
  trimVideo,
  mergeVideos,
  addOverlay,
  burnCaptions,
} from "@/lib/ffmpeg";
import type { VideoClip, VideoProject, VideoTrack } from "@/types/project";

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function captionsToSRT(
  captions: NonNullable<VideoProject["captions"]>
): string {
  return captions
    .map((cap, idx) => {
      const fmt = (t: number) => {
        const h = Math.floor(t / 3600);
        const m = Math.floor((t % 3600) / 60);
        const s = Math.floor(t % 60);
        const ms = Math.round((t % 1) * 1000);
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
      };
      return `${idx + 1}\n${fmt(cap.start_time)} --> ${fmt(cap.end_time)}\n${cap.text}\n`;
    })
    .join("\n");
}

export function useVideoEditor() {
  const store = useEditorStore();

  // Pre-load FFmpeg in the background so it is ready when the user needs it
  const preloadFFmpeg = useCallback(async () => {
    try {
      await loadFFmpeg();
    } catch {
      // non-fatal; will retry on actual use
    }
  }, []);

  /**
   * Import a video file as the main clip. Creates a project with a main track.
   */
  const importVideo = useCallback(
    async (file: File) => {
      store.setExportStatus("loading");
      try {
        const info = await getVideoInfo(file);
        const duration = info.duration || 10;

        const clipId = generateId();
        const trackId = generateId();
        const blobUrl = URL.createObjectURL(file);

        const clip: VideoClip = {
          id: clipId,
          source_url: blobUrl,
          start_time: 0,
          end_time: duration,
          trim_start: 0,
          trim_end: duration,
        };

        const track: VideoTrack = {
          id: trackId,
          type: "main",
          clips: [clip],
        };

        const project: VideoProject = {
          id: generateId(),
          name: file.name.replace(/\.[^.]+$/, ""),
          type: "video",
          status: "draft",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: "local",
          duration,
          width: info.width,
          height: info.height,
          fps: info.fps,
          tracks: [track],
          captions: [],
        };

        store.setProject(project);
        store.registerClipBlob(clipId, blobUrl);
        store.setExportStatus("idle");
      } catch (err) {
        console.error("Erro ao importar vídeo:", err);
        store.setExportStatus("error");
      }
    },
    [store]
  );

  /**
   * Add a clip file to an existing track at the given start position.
   */
  const addClipToTrack = useCallback(
    async (trackId: string, file: File, startTime: number) => {
      const info = await getVideoInfo(file);
      const duration = info.duration || 5;
      const clipId = generateId();
      const blobUrl = URL.createObjectURL(file);

      const clip: VideoClip = {
        id: clipId,
        source_url: blobUrl,
        start_time: startTime,
        end_time: startTime + duration,
        trim_start: 0,
        trim_end: duration,
      };

      store.addClipToTrack(trackId, clip);
      store.registerClipBlob(clipId, blobUrl);

      // Extend project duration if needed
      store.updateProject((p) => ({
        ...p,
        duration: Math.max(p.duration, startTime + duration),
        updated_at: new Date().toISOString(),
      }));
    },
    [store]
  );

  /**
   * Adjust the trim points of an existing clip.
   */
  const trimClip = useCallback(
    (clipId: string, newTrimStart: number, newTrimEnd: number) => {
      store.updateClip(clipId, (c) => ({
        ...c,
        trim_start: newTrimStart,
        trim_end: newTrimEnd,
        end_time: c.start_time + (newTrimEnd - newTrimStart),
      }));
    },
    [store]
  );

  /**
   * Split a clip at a given timeline time into two clips.
   */
  const splitClipAtTime = useCallback(
    (clipId: string, time: number) => {
      const { project } = store;
      if (!project) return;

      let foundClip: VideoClip | null = null;
      let foundTrackId: string | null = null;

      for (const track of project.tracks) {
        for (const clip of track.clips) {
          if (clip.id === clipId) {
            foundClip = clip;
            foundTrackId = track.id;
            break;
          }
        }
        if (foundClip) break;
      }

      if (!foundClip || !foundTrackId) return;
      if (time <= foundClip.start_time || time >= foundClip.end_time) return;

      const splitOffset = time - foundClip.start_time;
      const originalDuration = foundClip.end_time - foundClip.start_time;
      const trimMid = foundClip.trim_start + splitOffset;

      const leftClip: VideoClip = {
        ...foundClip,
        end_time: time,
        trim_end: trimMid,
      };

      const rightClip: VideoClip = {
        ...foundClip,
        id: generateId(),
        start_time: time,
        end_time: foundClip.end_time,
        trim_start: trimMid,
      };

      void originalDuration;

      store.updateTrack(foundTrackId, (t) => ({
        ...t,
        clips: t.clips.flatMap((c) =>
          c.id === clipId ? [leftClip, rightClip] : [c]
        ),
      }));
    },
    [store]
  );

  /**
   * Add a picture-in-picture overlay video.
   */
  const addOverlayVideo = useCallback(
    async (
      file: File,
      position: { x: number; y: number },
      timeRange: { start: number; end: number }
    ) => {
      const info = await getVideoInfo(file);
      const duration = info.duration || 5;
      const clipId = generateId();
      const blobUrl = URL.createObjectURL(file);

      const clip: VideoClip = {
        id: clipId,
        source_url: blobUrl,
        start_time: timeRange.start,
        end_time: timeRange.end || timeRange.start + duration,
        trim_start: 0,
        trim_end: duration,
        position,
        size: { width: 320, height: 180 },
        opacity: 1,
      };

      // Find or create overlay track
      const { project } = store;
      let overlayTrackId: string | null = null;

      if (project) {
        const existing = project.tracks.find((t) => t.type === "overlay");
        if (existing) {
          overlayTrackId = existing.id;
        } else {
          const newTrack: VideoTrack = {
            id: generateId(),
            type: "overlay",
            clips: [],
          };
          store.addTrack(newTrack);
          overlayTrackId = newTrack.id;
        }
      }

      if (overlayTrackId) {
        store.addClipToTrack(overlayTrackId, clip);
        store.registerClipBlob(clipId, blobUrl);
      }
    },
    [store]
  );

  /**
   * Remove a clip and revoke its blob URL.
   */
  const removeClip = useCallback(
    (clipId: string) => {
      const blobUrl = store.clipBlobMap[clipId];
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        store.unregisterClipBlob(clipId);
      }
      store.removeClip(clipId);
    },
    [store]
  );

  /**
   * Export the final video using FFmpeg. Handles trim + merge + overlay + captions.
   */
  const exportVideo = useCallback(async () => {
    const { project } = store;
    if (!project) return;

    store.setExportStatus("processing", 0);

    try {
      await loadFFmpeg();
      store.setExportStatus("processing", 10);

      // Collect main track clips
      const mainTrack = project.tracks.find((t) => t.type === "main");
      if (!mainTrack || mainTrack.clips.length === 0) {
        store.setExportStatus("error");
        return;
      }

      // Fetch blobs for each main clip
      const trimmedBlobs: Blob[] = [];
      for (let i = 0; i < mainTrack.clips.length; i++) {
        const clip = mainTrack.clips[i];
        store.setExportStatus(
          "processing",
          10 + Math.round((i / mainTrack.clips.length) * 40)
        );

        const response = await fetch(clip.source_url);
        const blob = await response.blob();

        const needsTrim =
          clip.trim_start > 0 ||
          clip.trim_end < clip.end_time - clip.start_time + clip.trim_start;

        if (needsTrim) {
          const trimmed = await trimVideo(blob, clip.trim_start, clip.trim_end);
          trimmedBlobs.push(trimmed);
        } else {
          trimmedBlobs.push(blob);
        }
      }

      store.setExportStatus("processing", 55);

      let finalBlob: Blob;
      if (trimmedBlobs.length === 1) {
        finalBlob = trimmedBlobs[0];
      } else {
        finalBlob = await mergeVideos(trimmedBlobs);
      }

      store.setExportStatus("processing", 70);

      // Apply overlays
      const overlayTrack = project.tracks.find((t) => t.type === "overlay");
      if (overlayTrack && overlayTrack.clips.length > 0) {
        for (const oClip of overlayTrack.clips) {
          const response = await fetch(oClip.source_url);
          const overlayBlob = await response.blob();
          finalBlob = await addOverlay(
            finalBlob,
            overlayBlob,
            oClip.position?.x ?? 10,
            oClip.position?.y ?? 10,
            oClip.start_time,
            oClip.end_time
          );
        }
      }

      store.setExportStatus("processing", 85);

      // Burn captions if any
      if (project.captions && project.captions.length > 0) {
        const srt = captionsToSRT(project.captions);
        finalBlob = await burnCaptions(finalBlob, srt);
      }

      store.setExportStatus("processing", 100);

      const url = URL.createObjectURL(finalBlob);
      store.setExportBlobUrl(url);
      store.setExportStatus("done", 100);

      // Trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name || "video"}_exportado.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Erro ao exportar vídeo:", err);
      store.setExportStatus("error");
    }
  }, [store]);

  return {
    preloadFFmpeg,
    importVideo,
    addClipToTrack,
    trimClip,
    splitClipAtTime,
    addOverlayVideo,
    removeClip,
    exportVideo,
  };
}
