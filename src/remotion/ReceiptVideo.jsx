import {
  AbsoluteFill,
  Audio,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

function normalizeSpeaker(value) {
  const speaker = String(value || "").toLowerCase().trim();

  if (["me", "my", "mine", "i", "you"].includes(speaker)) {
    return "me";
  }

  return "them";
}

function getSpeakerFromText(line) {
  const match = String(line || "").match(
    /^(me|my|mine|i|you|them|they|friend|person \d+):\s*/i
  );

  if (!match) return "them";

  return normalizeSpeaker(match[1]);
}

function cleanLine(line) {
  return String(line || "")
    .trim()
    .replace(/^(me|my|mine|i|you|them|they|friend|person \d+):\s*/i, "");
}

function isSectionLabel(line) {
  return /^(verse|chorus|bridge|final chorus|outro|hook|pre-chorus|intro)\b:?$/i.test(
    String(line || "").trim()
  );
}

function buildScenes({ lyrics = [], timedLyrics = [], bubbles = [], durationInFrames, fps }) {
  // Best source: already-built bubble objects
  const source = bubbles.length ? bubbles : timedLyrics.length ? timedLyrics : lyrics;

  const scenes = source
    .map((item) => {
      if (typeof item === "string") {
        if (!item.trim() || isSectionLabel(item)) return null;

        return {
          speaker: getSpeakerFromText(item),
          text: cleanLine(item),
          start: null,
          end: null,
        };
      }

      const rawText = item.text || item.line || item.lyric || "";
      if (!rawText.trim() || isSectionLabel(rawText)) return null;

      return {
        speaker: item.speaker
          ? normalizeSpeaker(item.speaker)
          : getSpeakerFromText(rawText),
        text: cleanLine(rawText),
        start: typeof item.start === "number" ? item.start : null,
        end: typeof item.end === "number" ? item.end : null,
      };
    })
    .filter(Boolean)
    .filter((scene) => scene.text);

  const safeScenes = scenes.length
    ? scenes
    : [
        { speaker: "them", text: "where are you", start: 0, end: 2 },
        { speaker: "me", text: "with friends", start: 2, end: 4 },
      ];

  // If scenes already have timing, use it.
  if (safeScenes.some((scene) => scene.start !== null && scene.end !== null)) {
    return safeScenes.map((scene, index) => {
      const fallbackStart = index * 2.5;
      const fallbackEnd = fallbackStart + 2.5;

      return {
        ...scene,
        startFrame: Math.floor((scene.start ?? fallbackStart) * fps),
        endFrame: Math.floor((scene.end ?? fallbackEnd) * fps),
      };
    });
  }

  // Fallback: evenly spread scenes across video.
  const framesPerScene = Math.max(
    fps * 2,
    Math.floor(durationInFrames / safeScenes.length)
  );

  return safeScenes.map((scene, index) => ({
    ...scene,
    startFrame: index * framesPerScene,
    endFrame:
      index === safeScenes.length - 1
        ? durationInFrames
        : (index + 1) * framesPerScene,
  }));
}

export const ReceiptVideo = ({
  lyrics = [],
  timedLyrics = [],
  bubbles = [],
  songStyle = "Receipt Remix",
  audioUrl = "",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const scenes = buildScenes({
    lyrics,
    timedLyrics,
    bubbles,
    durationInFrames,
    fps,
  });

  const foundIndex = scenes.findIndex(
    (scene) => frame >= scene.startFrame && frame < scene.endFrame
  );

  const activeIndex = foundIndex >= 0 ? foundIndex : Math.max(0, scenes.length - 1);
  const activeScene = scenes[activeIndex] || scenes[0];

  const activeLine = activeScene?.text || "";
  const sceneFrame = Math.max(0, frame - (activeScene?.startFrame || 0));
  const isRight = activeScene?.speaker === "me";

  const pop = spring({
    fps,
    frame: sceneFrame,
    config: {
      damping: 13,
      stiffness: 160,
    },
  });

  const opacity = interpolate(sceneFrame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const y = interpolate(sceneFrame, [0, 12], [42, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fontSize =
    activeLine.length > 110
      ? 38
      : activeLine.length > 90
      ? 44
      : activeLine.length > 55
      ? 54
      : 66;

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at top, rgba(255,79,184,0.22), transparent 36%), linear-gradient(180deg, #07070d 0%, #11111b 100%)",
        fontFamily: "Inter, Arial, sans-serif",
        color: "white",
        overflow: "hidden",
      }}
    >
      {audioUrl ? <Audio src={audioUrl} /> : null}

      <div
        style={{
          position: "absolute",
          top: 86,
          left: 0,
          width: "100%",
          textAlign: "center",
          fontSize: 34,
          fontWeight: 900,
          letterSpacing: 1,
          color: "#ff8fd2",
        }}
      >
        Receipt Remix
      </div>

      <div
        style={{
          position: "absolute",
          top: 142,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "14px 26px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
          fontSize: 28,
          fontWeight: 800,
          color: "#d8d8ea",
        }}
      >
        {songStyle}
      </div>

      <div
        style={{
          position: "absolute",
          inset: "270px 84px 260px",
          display: "flex",
          alignItems: "center",
          justifyContent: isRight ? "flex-end" : "flex-start",
        }}
      >
        <div
          style={{
            opacity,
            transform: `translateY(${y}px) scale(${pop})`,
            transformOrigin: isRight ? "right center" : "left center",
            maxWidth: "86%",
            padding: "42px 46px",
            borderRadius: 46,
            borderBottomRightRadius: isRight ? 12 : 46,
            borderBottomLeftRadius: isRight ? 46 : 12,
            background: isRight ? "#007AFF" : "#E5E5EA",
            color: isRight ? "#FFFFFF" : "#000000",
            fontSize,
            lineHeight: 1.08,
            fontWeight: 950,
            letterSpacing: -1.2,
            boxShadow: "0 30px 90px rgba(0,0,0,0.45)",
            whiteSpace: "pre-wrap",
          }}
        >
          {activeLine}
        </div>
      </div>
    </AbsoluteFill>
  );
};