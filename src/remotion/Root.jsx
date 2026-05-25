import { Composition } from "remotion";
import { ReceiptVideo } from "./ReceiptVideo";

export const RemotionRoot = () => {
  return (
    <Composition
      id="ReceiptVideo"
      component={ReceiptVideo}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
      lyrics: [
        "where are you",
        "with friends",
        "why is your snap map at her house",
        "...",
        "WITH FRIENDS",
      ],
      songStyle: "Toxic Pop",
      audioUrl: "",
    }}
    />
  );
};