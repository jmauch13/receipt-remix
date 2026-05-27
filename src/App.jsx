import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  MessageCircle,
  Music,
  Sparkles,
  WandSparkles,
  ImagePlus,
  Loader2,
  Volume2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";

const vibes = [
  
  "Petty Pop",
  "Sad Girl Country",
  "Toxic Rap",
  "Late Night Blues",
  "Sunday Morning Gospel",
  "Soul Confession",
  "Heartbreak Piano",
  "Group Chat R&B",
  "Divorce Rock Anthem",

];

const steps = ["start", "paste", "vibe", "lyrics", "song", "video"];

export default function App() {
  const [stepIndex, setStepIndex] = useState(0);
  const [texts, setTexts] = useState("");
  const [songStyle, setSongStyle] = useState("Sunday Morning Gospel");
  const [lyrics, setLyrics] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGeneratingSong, setIsGeneratingSong] = useState(false);
  const [songUrl, setSongUrl] = useState("");
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [timedLyrics, setTimedLyrics] = useState([]);
  const [words, setWords] = useState([]);

  const currentStep = steps[stepIndex];

  const canGoNext = useMemo(() => {
    if (currentStep === "paste") return texts.trim().length > 10;
    if (currentStep === "lyrics") return lyrics.trim().length > 0;
    return true;
  }, [currentStep, texts, lyrics]);

  function nextStep() {
    if (!canGoNext) return;

    if (currentStep === "vibe" && !lyrics) {
      generateMockLyrics();
    }

    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  }

  function prevStep() {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  }

  async function generateMockLyrics() {
  try {
    setLyrics("Generating your dramatic little masterpiece...");

    const response = await fetch("/api/generate-lyrics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        texts,
        songStyle,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to generate lyrics");
    }

    setLyrics(data.lyrics);
  } catch (error) {
    console.error(error);
    setLyrics("Something went wrong generating lyrics. The drama is real, but the server said no.");
  }
}

  async function handleScreenshotUpload(event) {
    const files = Array.from(event.target.files || []);
if (!files.length) return;

  try {
    setIsExtracting(true);

    const formData = new FormData();
    files.forEach((file) => {
  formData.append("screenshots", file);
});

    const response = await fetch("/api/extract-texts", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to extract screenshot text");
    }

    setTexts(data.extractedText);
  } catch (error) {
    console.error(error);
    alert("Could not extract texts from that screenshot.");
  } finally {
    setIsExtracting(false);
    event.target.value = "";
  }
}

async function generateSongPlaceholder() {
  try {
    setIsGeneratingSong(true);
    setSongUrl("");
    setTimedLyrics([]);
    setVideoUrl("");

    const response = await fetch("/api/generate-song", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lyrics,
        songStyle,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to generate song");
    }

    setSongUrl(data.songUrl);

    const transcriptionData = await transcribeSong(data.songUrl);

setTimedLyrics(transcriptionData.segments || []);
setWords(transcriptionData.words || []);
  } catch (error) {
    console.error(error);
    alert("Could not generate song.");
  } finally {
    setIsGeneratingSong(false);
  }
}

async function transcribeSong(songUrlToUse) {
  const response = await fetch("/api/transcribe-song", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      songUrl: songUrlToUse,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed transcription");
  }

  return data.segments || [];
}

async function renderVideo() {
  try {
    setIsRenderingVideo(true);
    setVideoUrl("");

    const response = await fetch("/api/render-video", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    lyrics,
    songStyle,
    audioUrl: songUrl,
    timedLyrics,
    words,
  }),
});

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to render video");
    }

    setVideoUrl(data.videoUrl);
  } catch (error) {
    console.error(error);
    alert("Could not render video.");
  } finally {
    setIsRenderingVideo(false);
  }
}

  return (
  <main className="mobileShell">
    <div className="appFrame">
      <header className="topBar">
        <div>
          <p className="eyebrow">Text → Song → Video</p>
          <h1>Receipt Remix</h1>
        </div>

        <div className="sparkleBadge">
          <Sparkles size={16} />
        </div>
      </header>

      <ProgressDots stepIndex={stepIndex} />

      <section className="screenWrap">
        <AnimatePresence mode="wait">
          {currentStep === "start" && (
            <Screen key="start">
              <div className="centerHero">
                <div className="heroIcon">
                  <Music size={34} />
                </div>

                <h2>Turn messy texts into a viral song video.</h2>

                <p>
                  Paste the drama, pick the vibe, and create a text bubble lyric
                  video without opening CapCut. Because we are healing, not
                  manually keyframing.
                </p>

                <div className="miniPreview">
                  <div className="miniBubble left">You said you were busy...</div>
                  <div className="miniBubble right">At her birthday dinner?</div>
                  <div className="miniBubble left">It was networking.</div>
                  <div className="miniLyric">
                    Now my phone is singing what you wouldn&apos;t say 🎶
                  </div>
                </div>
              </div>
            </Screen>
          )}

          {currentStep === "paste" && (
            <Screen key="paste">
              <div className="screenTitle">
                <MessageCircle size={22} />
                <div>
                  <h2>Paste the texts</h2>
                  <p>Messy, funny, dramatic, unhinged. The app can handle it.</p>
                </div>
              </div>

              <label className="uploadButton">
                <ImagePlus size={18} />
                {isExtracting ? "Extracting texts..." : "Upload screenshot"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleScreenshotUpload}
                  disabled={isExtracting}
                />
              </label>

              <textarea
                value={texts}
                onChange={(e) => setTexts(e.target.value)}
                placeholder={`Example:\nYou: I thought we were good?\nThem: We are.\nYou: Then why did you like her picture at 2am?\nThem: It was an accident.`}
              />

              <p className="hint">
                Tip: Paste the best parts only. We need drama, not the entire
                Congressional hearing.
              </p>
            </Screen>
          )}

          {currentStep === "vibe" && (
            <Screen key="vibe">
              <div className="screenTitle">
                <Music size={22} />
                <div>
                  <h2>Pick the song vibe</h2>
                  <p>This decides the lyrics, attitude, and chaos level.</p>
                </div>
              </div>

              <div className="vibeGrid">
                {vibes.map((vibe) => (
                  <button
                    key={vibe}
                    className={songStyle === vibe ? "vibe active" : "vibe"}
                    onClick={() => setSongStyle(vibe)}
                  >
                    {vibe}
                  </button>
                ))}
              </div>

              <div className="selectedCard">
                <p>Selected vibe</p>
                <strong>{songStyle}</strong>
              </div>
            </Screen>
          )}

          {currentStep === "lyrics" && (
            <Screen key="lyrics">
              <div className="screenTitle">
                <WandSparkles size={22} />
                <div>
                  <h2>Arranged lyrics</h2>
                  <p>
                    Your texts, paced and repeated for the song — not rewritten
                    into AI soup.
                  </p>
                </div>
              </div>

              {!lyrics ? (
  <button className="primaryButton" onClick={generateMockLyrics}>
    Generate Lyrics
  </button>
) : (
  <textarea
    className="lyricsEditor"
    value={lyrics}
    onChange={(e) => setLyrics(e.target.value)}
  />
)}

              <button className="ghostButton" onClick={generateMockLyrics}>
                Re-arrange lyrics
              </button>
            </Screen>
          )}

          {currentStep === "song" && (
            <Screen key="song">
              <div className="screenTitle">
                <Volume2 size={22} />
                <div>
                  <h2>Song preview</h2>
                  <p>Generate the song first. Then we’ll turn it into a video.</p>
                </div>
              </div>

              <div className="songCard">
                <div>
                  <p className="songLabel">Selected vibe</p>
                  <h3>{songStyle}</h3>
                </div>

                <div className="songLyricPreview">
                  {lyrics
                    ? lyrics
                        .split("\n")
                        .filter(Boolean)
                        .slice(0, 6)
                        .map((line, index) => <span key={index}>{line}</span>)
                    : "No lyrics yet"}
                </div>

                {!songUrl ? (
                  <button
                    className="primaryButton"
                    onClick={generateSongPlaceholder}
                    disabled={isGeneratingSong || !lyrics}
                  >
                    {isGeneratingSong ? (
                      <>
                        <Loader2 className="spin" size={18} />
                        Generating song...
                      </>
                    ) : (
                      <>
                        <Music size={18} />
                        Generate Song
                      </>
                    )}
                  </button>
                ) : (
                  <div className="audioBox">
                    <p>Your song is ready</p>
                    <audio controls src={songUrl} />
                  </div>
                )}
              </div>
            </Screen>
          )}

          {currentStep === "video" && (
            <Screen key="video">
              <div className="screenTitle">
                <Sparkles size={22} />
                <div>
                  <h2>Generate video</h2>
                  <p>Now turn your arranged lyrics into a text bubble MP4.</p>
                </div>
              </div>

              <div className="phonePreview small">
                <div className="statusPill">Receipt Remix</div>

                <div className="bubbleStack">
                  <div className="textBubble left">
                    {lyrics
                      ? lyrics
                          .split("\n")
                          .filter(Boolean)[0]
                          ?.replace(/^(Me|Them):\s*/i, "")
                      : "your first line goes here"}
                  </div>

                  <div className="textBubble right">
                    {lyrics
                      ? lyrics
                          .split("\n")
                          .filter(Boolean)[1]
                          ?.replace(/^(Me|Them):\s*/i, "")
                      : "your second line goes here"}
                  </div>
                </div>

                <div className="lyricCaption">
                  One bubble at a time. Clean. Dramatic. Viral.
                </div>

                <div className="musicNote">♪</div>
              </div>

              {!videoUrl ? (
                <button
                className="primaryButton"
                onClick={renderVideo}
                disabled={isRenderingVideo || !lyrics || !songUrl || !timedLyrics.length}
              >
                {!songUrl
                  ? "Generate song first"
                  : !timedLyrics.length
                  ? "Transcribing song..."
                  : isRenderingVideo
                  ? "Rendering video..."
                  : "Render Video"}
              </button>
              ) : (
                <a
                  className="downloadButton"
                  href={videoUrl}
                  download
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download size={18} />
                  Download MP4
                </a>
              )}
            </Screen>
          )}
        </AnimatePresence>
      </section>

      <footer className="bottomNav">
        <button
          className="navButton secondary"
          onClick={prevStep}
          disabled={stepIndex === 0}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <button
          className="navButton primary"
          onClick={nextStep}
          disabled={!canGoNext || stepIndex === steps.length - 1}
        >
          {stepIndex === steps.length - 1 ? "Done" : "Next"}
          <ArrowRight size={18} />
        </button>
      </footer>
    </div>
  </main>
);

        
}

function Screen({ children }) {
  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.22 }}
    >
      {children}
    </motion.div>
  );
}

function ProgressDots({ stepIndex }) {
  return (
    <div className="progressDots">
      {steps.map((step, index) => (
        <span
          key={step}
          className={index <= stepIndex ? "dot active" : "dot"}
        />
      ))}
    </div>
  );
}