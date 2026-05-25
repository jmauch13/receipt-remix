import {
  AbsoluteFill,
  Audio,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

function getSpeaker(line) {
  const match = String(line || "").match(
    /^(me|my|mine|i|you|them|they|friend|person \d+):\s*/i
  );

  if (!match) return "them";

  const speaker = match[1].toLowerCase();

  if (["me", "my", "mine", "i", "you"].includes(speaker)) {
    return "me";
  }

  return "them";
}

function cleanLine(line) {
  return String(line || "")
    .trim()
    .replace(/^(me|my|mine|i|you|them|they|friend|person \d+):\s*/i, "");
}

function groupLyricsBySpeaker(lines) {
  const groups = [];

  for (const rawLine of lines) {
    const line = String(rawLine || "").trim();
    if (!line) continue;

    if (
      /^(verse|chorus|bridge|final chorus|outro|hook|pre-chorus|intro)\b:?$/i.test(
        line
      )
    ) {
      continue;
    }

    const speaker = getSpeaker(line);
    const text = cleanLine(line);

    if (!text) continue;

    const lastGroup = groups[groups.length - 1];

    if (
      lastGroup &&
      lastGroup.speaker === speaker &&
      lastGroup.lines.length < 2
    ) {
      lastGroup.lines.push(text);
    } else {
      groups.push({
        speaker,
        lines: [text],
      });
    }
  }

  return groups.map((group) => ({
    speaker: group.speaker,
    text: group.lines.join("\n"),
  }));
}

function buildScenes({ lyrics = [], timedLyrics = [], durationInFrames, fps }) {
  const groupedScenes = groupLyricsBySpeaker(lyrics);

  const safeScenes = groupedScenes.length
    ? groupedScenes
    : [
        { speaker: "them", text: "where are you" },
        { speaker: "me", text: "with friends" },
      ];

  const audioStart = timedLyrics[0]?.start || 0;
  const audioEnd =
    timedLyrics[timedLyrics.length - 1]?.end || durationInFrames / fps;

  const totalFrames = Math.max(
    fps * 2,
    Math.floor((audioEnd - audioStart) * fps)
  );

  const totalCharacters = safeScenes.reduce(
    (sum, scene) => sum + scene.text.length,
    0
  );

  let runningFrame = Math.floor(audioStart * fps);

  return safeScenes.map((scene, index) => {
    const weight = totalCharacters
      ? scene.text.length / totalCharacters
      : 1 / safeScenes.length;

    const sceneFrames =
      index === safeScenes.length - 1
        ? Math.max(fps, Math.floor(audioEnd * fps) - runningFrame)
        : Math.max(fps * 1.2, Math.floor(totalFrames * weight));

    const startFrame = runningFrame;
    const endFrame = runningFrame + sceneFrames;

    runningFrame = endFrame;

    return {
      text: scene.text,
      speaker: scene.speaker,
      startFrame,
      endFrame,
    };
  });
}

export const ReceiptVideo = ({
  lyrics = [],
  timedLyrics = [],
  songStyle = "Receipt Remix",
  audioUrl = "",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const scenes = buildScenes({
    lyrics,
    timedLyrics,
    durationInFrames,
    fps,
  });

  const foundIndex = scenes.findIndex(
    (scene) => frame >= scene.startFrame && frame < scene.endFrame
  );

  const activeIndex =
    foundIndex >= 0 ? foundIndex : Math.max(0, scenes.length - 1);

  const activeScene = scenes[activeIndex] || scenes[0];

  const activeLine = activeScene?.text || "";
  const sceneFrame = Math.max(0, frame - (activeScene?.startFrame || 0));
  const sceneDuration = Math.max(
    fps,
    (activeScene?.endFrame || durationInFrames) - (activeScene?.startFrame || 0)
  );

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
    activeLine.length > 110 ? 38 : activeLine.length > 90 ? 44 : activeLine.length > 55 ? 54 : 66;

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
            color: isRight ? "#ffffff" : "#000000",
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

      <div
        style={{
          position: "absolute",
          bottom: 92,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 12,
        }}
      >
        {scenes.slice(0, 8).map((_, index) => (
          <div
            key={index}
            style={{
              width: index === activeIndex ? 42 : 16,
              height: 14,
              borderRadius: 999,
              background: index === activeIndex ? "#ff4fb8" : "#333344",
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};