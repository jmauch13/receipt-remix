import { Composition } from "remotion";
import { ReceiptVideo } from "./ReceiptVideo";

export const RemotionRoot = () => {
  const fps = 30;

  return (
    <Composition
      id="ReceiptVideo"
      component={ReceiptVideo}
      durationInFrames={3000}
      fps={fps}
      width={720}
      height={1280}
      defaultProps={{
        lyrics: [],
        timedLyrics: [],
        bubbles: [],
        songStyle: "Receipt Remix",
        audioUrl: "",
        durationSeconds: 100,
      }}
    />
  );
};