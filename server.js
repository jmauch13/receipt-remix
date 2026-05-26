import express from "express";
import cors from "cors";
import "dotenv/config";
import OpenAI from "openai";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import serveStatic from "serve-static";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rendersDir = path.join(__dirname, "renders");

if (!fs.existsSync(rendersDir)) {
  fs.mkdirSync(rendersDir);
}

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use("/renders", serveStatic(rendersDir));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
});

function cleanLyricsForVideo(lyrics) {
  return lyrics
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(verse|chorus|bridge|final chorus|outro|hook|pre-chorus|intro)\b:?$/i.test(line))
    .map((line) => line.replace(/^(me|them|friend|you|person \d+):\s*/i, ""))
    .filter(Boolean)
    .slice(0, 40);
}

function getStylePrompt(songStyle) {
  let stylePrompt = "";

  switch (songStyle) {
    case "Sunday Morning Gospel":
      stylePrompt =
        "upbeat Black church gospel choir, Sunday morning praise break, full gospel choir call and response, Hammond B3 organ, tambourine, hand claps, energetic drums, soulful lead vocalist, joyful church service, choir shouting responses, celebratory and full of spirit, NOT sad, NOT slow, NOT piano ballad, NOT musical theater";
      break;

    case "Late Night Blues":
      stylePrompt =
        "short smoky blues song, raw blues guitar, soulful vocal, intimate late-night bar feeling, not musical theater, not a jingle";
      break;

    case "Toxic Rap":
      stylePrompt =
        "short modern rap diss track, confident flow, punchy beat, viral TikTok sound, not musical theater, not spoken poetry";
      break;

    case "Group Chat R&B":
      stylePrompt =
        "short modern R&B song, smooth beat, emotional vocals, late-night texting vibe, not musical theater, not a jingle";
      break;

    case "Sad Girl Country":
      stylePrompt =
        "short modern country heartbreak song, acoustic guitar, emotional but not cheesy, natural vocals, not musical theater, not a jingle";
      break;

    case "Petty Pop":
      stylePrompt =
        "short modern petty pop song, catchy viral TikTok style, confident vocals, playful but not cheesy, not musical theater, not a jingle";
      break;

    case "Divorce Rock Anthem":
      stylePrompt =
        "short high-energy rock anthem, gritty electric guitars, big drums, emotional lead vocal, rebellious breakup energy, catchy chorus feel, dramatic but not musical theater, not a jingle";
      break;

    default:
      stylePrompt =
        "short viral social media song, catchy modern vocals, natural delivery, not musical theater, not a jingle";
  }

  stylePrompt +=
    ", use only the provided lyrics, do not add new lyrics, do not sing instructions, do not invent a chorus, end immediately after the final lyric, keep the song short and proportional to the lyrics";

  return stylePrompt;
}

app.post("/api/generate-lyrics", async (req, res) => {
  try {
    const { texts, songStyle } = req.body;

    if (!texts || !songStyle) {
      return res.status(400).json({ error: "Missing texts or songStyle" });
    }

    const response = await openai.responses.create({
      model: "gpt-5.2",
      instructions: `
You turn real text conversations into verbatim song lyrics.

IMPORTANT:
- Preserve the original wording as much as possible.
- Do NOT invent new storylines.
- Do NOT add random emotional lyrics.
- Use the actual text messages as the lyrics.
- Rearrange, repeat, and structure the texts rhythmically.
- Minimal filler words only if absolutely necessary.
- The humor and virality come from how real the texts sound.
- Short awkward lines are GOOD.
- Repetition is GOOD.
- Pauses like "..." are GOOD.
- Output should feel like a real text conversation being sung.
- Expand common texting abbreviations into natural sung language.
- Examples:
  - bc → because
  - idk → I don't know
  - lmao → laugh my ass off
  - omg → oh my god
  - rn → right now
  - imma → I'm gonna
  - u → you
  - ur → your
- Do not write emoji names like "laugh cry", "skull emoji", or "heart eyes".
- Either remove emojis or translate the emotion naturally.
- Examples:
  - 😂 → laughing / that’s funny / leave it out if not needed
  - 😭 → crying / I’m crying / leave it out if not needed
  - 💀 → I’m dead / leave it out if not needed
- Never spell out emojis literally.
- Keep the tone casual and conversational.
- Do NOT sound overly formal.
- KEEP speaker labels like "Me:" and "Them:" at the start of each line.
- Speaker labels are used for video bubble colors.
- Do NOT write speaker labels as part of the song melody later.

Formatting rules:
- Do NOT include section labels like Verse, Chorus, Bridge, Hook, or Outro.
- Output only singable text lines.
- Keep lines short.
- Preserve lowercase texting style if possible.
- Output ONLY the lyrics.
`,
      input: `
Song style: ${songStyle}

Text conversation:
${texts}
`,
    });

    res.json({ lyrics: response.output_text });
  } catch (error) {
    console.error("OpenAI lyrics error:");
    console.dir(error, { depth: null });

    res.status(500).json({
      error: "Failed to generate lyrics",
    });
  }
});

app.post("/api/extract-texts", upload.array("screenshots", 5), async (req, res) => {
  try {
    if (!req.files || !req.files.length) {
  return res.status(400).json({ error: "No screenshots uploaded" });
}

const imageContent = req.files.map((file, index) => ({
  type: "input_image",
  image_url: `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
}));

    const response = await openai.responses.create({
      model: "gpt-5.2",
      instructions: `
You extract text message conversations from screenshots.

Rules:
- Extract only the visible conversation text.
- Do not summarize.
- Do not invent missing messages.
- Preserve wording, slang, punctuation, typos, emojis, and casing.
- Format as clean dialogue lines.
- If speaker names are visible, use them.
- If not, use "Me:" and "Them:" based on bubble position when obvious.
- If unsure who said a line, just write the message without guessing.
- Output only the extracted conversation.
`,
      input: [
        {
          role: "user",
          content: [
  {
    type: "input_text",
    text: "Extract the text message conversation from these screenshots in order. Combine them into one clean conversation.",
  },
  ...imageContent,
],
        },
      ],
    });

    res.json({ extractedText: response.output_text });
  } catch (error) {
    console.error("Text extraction error:");
    console.dir(error, { depth: null });

    res.status(500).json({
      error: "Failed to extract texts from screenshot",
    });
  }
});

app.post("/api/generate-song", async (req, res) => {
  try {
    const { lyrics, songStyle } = req.body;

    if (!lyrics || !songStyle) {
      return res.status(400).json({
        error: "Missing lyrics or songStyle",
      });
    }

    function stripSpeakerLabels(rawLyrics) {
      return rawLyrics
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .filter(
          (line) =>
            !/^(verse|chorus|bridge|final chorus|outro|hook|pre-chorus|intro)\b:?$/i.test(
              line
            )
        )
        .map((line) =>
          line.replace(/^(me|them|friend|you|person \d+):\s*/i, "")
        )
        .join("\n");
    }

    const cleanLyrics = stripSpeakerLabels(lyrics);

    let stylePrompt = getStylePrompt(songStyle);

    stylePrompt += `
Fast pacing.
Energetic vocal delivery.
Do not stretch short lyrics.
No long intros.
No long outros.
No extended instrumental breaks.
No repeating lyrics unless naturally catchy.
Song should end naturally after the final lyric.
`;

    const lineCount = cleanLyrics
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean).length;

    const targetDuration = Math.min(75, Math.max(18, lineCount * 3.5));

    const createResponse = await axios.post(
      "https://api.kie.ai/api/v1/generate",
      {
        prompt: cleanLyrics,
        style: stylePrompt,
        title: "Receipt Remix",
        customMode: true,
        instrumental: false,
        duration: targetDuration,
        model: "V4_5",
        callbackUrl: "https://example.com/kie-callback",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.KIE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const taskId =
      createResponse.data?.data?.taskId ||
      createResponse.data?.taskId ||
      createResponse.data?.id;

    if (!taskId) {
      console.log("Kie create response:", createResponse.data);
      return res.status(500).json({
        error: "No task ID returned from Kie",
      });
    }

    let songData = null;

    for (let attempt = 0; attempt < 60; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const statusResponse = await axios.get(
        `https://api.kie.ai/api/v1/generate/record-info?taskId=${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.KIE_API_KEY}`,
          },
        }
      );

      const statusData = statusResponse.data;
      console.log("Kie status:", JSON.stringify(statusData, null, 2));

      const records =
        statusData?.data?.response?.sunoData ||
        statusData?.data?.sunoData ||
        statusData?.data?.songs ||
        statusData?.data?.records ||
        [];

      if (Array.isArray(records) && records.length > 0) {
        const finishedRecord = records.find(
          (record) =>
            record?.streamAudioUrl ||
            record?.sourceStreamAudioUrl ||
            record?.audioUrl ||
            record?.sourceAudioUrl
        );

        if (finishedRecord) {
          songData = finishedRecord;
          break;
        }
      }

      const status =
        statusData?.data?.status ||
        statusData?.status ||
        statusData?.data?.state;

      if (
        String(status).toLowerCase().includes("fail") ||
        String(status).toLowerCase().includes("error")
      ) {
        return res.status(500).json({
          error: "Kie song generation failed",
        });
      }
    }

    if (!songData) {
      return res.status(500).json({
        error: "Kie song generation timed out",
      });
    }

    const remoteAudioUrl =
      songData.audioUrl ||
      songData.audio_url ||
      songData.streamAudioUrl ||
      songData.stream_audio_url ||
      songData.sourceAudioUrl ||
      songData.source_audio_url ||
      songData.sourceStreamAudioUrl ||
      songData.source_stream_audio_url ||
      songData.url;

    if (!remoteAudioUrl) {
      console.log("Kie song data:", songData);
      return res.status(500).json({
        error: "No audio URL returned from Kie",
      });
    }

    const audioResponse = await axios({
      method: "GET",
      url: remoteAudioUrl,
      responseType: "arraybuffer",
    });

    const filename = `song-${Date.now()}.mp3`;
    const outputPath = path.join(rendersDir, filename);

    fs.writeFileSync(outputPath, Buffer.from(audioResponse.data));

    res.json({
      songUrl: `/renders/${filename}`,
      remoteAudioUrl,
      provider: "kie",
      targetDuration,
    });
  } catch (error) {
    console.error("Kie generate-song error:");
    console.dir(error?.response?.data || error, { depth: null });

    res.status(500).json({
      error: "Failed to generate song with Kie",
    });
  }
});

app.post("/api/transcribe-song", async (req, res) => {
  try {
    const { songUrl } = req.body;

    if (!songUrl) {
      return res.status(400).json({ error: "Missing songUrl" });
    }

    const tempFile = path.join(rendersDir, `temp-${Date.now()}.mp3`);

    const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://receipt-remix.onrender.com"
    : `http://localhost:${PORT}`;

const fullSongUrl = songUrl.startsWith("http")
  ? songUrl
  : `${BASE_URL}${songUrl}`;

const response = await axios({
  method: "GET",
  url: fullSongUrl,
  responseType: "stream",
});

    const writer = fs.createWriteStream(tempFile);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFile),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    fs.unlinkSync(tempFile);

    res.json({
      segments: transcription.segments || [],
    });
  } catch (error) {
    console.error("Transcription error:");
    console.dir(error, { depth: null });

    res.status(500).json({
      error: "Failed to transcribe song",
    });
  }
});

app.post("/api/render-video", async (req, res) => {
  try {
    const { lyrics, songStyle, audioUrl, timedLyrics = [] } = req.body;

    if (!lyrics) {
      return res.status(400).json({ error: "Missing lyrics" });
    }

    if (!audioUrl) {
      return res.status(400).json({ error: "Missing audioUrl" });
    }

    if (!timedLyrics.length) {
      return res.status(400).json({
        error: "Missing timed lyrics. Generate and transcribe the song first.",
      });
    }

    const cleanLyrics = cleanLyricsForVideo(lyrics);

    const lastTimedLyric = timedLyrics[timedLyrics.length - 1];

    const FPS = 24;
    const calculatedDurationInFrames = Math.ceil((lastTimedLyric.end + 1.5) * FPS);
      

    const BASE_URL =
      process.env.NODE_ENV === "production"
        ? "https://receipt-remix.onrender.com"
        : `http://localhost:${PORT}`;

    const fullAudioUrl = audioUrl.startsWith("http")
      ? audioUrl
      : `${BASE_URL}${audioUrl}`;

    const entryPoint = path.join(__dirname, "src", "remotion", "index.jsx");

    const bundleLocation = await bundle({
      entryPoint,
      webpackOverride: (config) => config,
    });

    const inputProps = {
      lyrics: cleanLyrics,
      songStyle: songStyle || "Sunday Morning Gospel",
      audioUrl: fullAudioUrl,
      timedLyrics,
    };

    const compositions = await getCompositions(bundleLocation, {
      inputProps,
    });

    const composition = compositions.find((c) => c.id === "ReceiptVideo");

    if (!composition) {
      return res.status(500).json({
        error: "ReceiptVideo composition not found",
      });
    }

    const renderComposition = {
      ...composition,
      durationInFrames: calculatedDurationInFrames,
    };

    const fileName = `receipt-remix-${Date.now()}.mp4`;
    const outputLocation = path.join(rendersDir, fileName);

    console.log("Starting video render...");

await renderMedia({
  composition: renderComposition,
  serveUrl: bundleLocation,
  codec: "h264",
  outputLocation,
  inputProps,
  concurrency: 2,
  crf: 28,
  pixelFormat: "yuv420p",
  onProgress: ({ progress }) => {
    console.log(`Render progress: ${Math.round(progress * 100)}%`);
  },
});

console.log("Video render finished:", outputLocation);

    res.json({
      videoUrl: `/renders/${fileName}`,
    });
  } catch (error) {
    console.error("Video render error:");
    console.dir(error, { depth: null });

    res.status(500).json({
      error: "Failed to render video",
    });
  }
});

app.use(express.static(path.join(__dirname, "dist")));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});