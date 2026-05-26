import { Composition } from "remotion";
import { ReceiptVideo } from "./ReceiptVideo";

export const RemotionRoot = () => {
  return (
    <Composition
  id="ReceiptVideo"
  component={ReceiptVideo}
  durationInFrames={720}
  fps={24}
  width={720}
  height={1280}
  defaultProps={{
    lyrics: [],
    timedLyrics: [],
    songStyle: "Receipt Remix",
    audioUrl: "",
  }}
/>
  );
};