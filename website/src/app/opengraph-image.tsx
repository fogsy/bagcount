import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "BoxingAI — AI boxing coach";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 72,
          background: "#0b0b0e",
          color: "#f5f5f7",
          fontSize: 64,
          fontWeight: 800,
          fontStyle: "italic",
        }}
      >
        <div style={{ color: "#3B82F6", fontSize: 28, letterSpacing: 4, marginBottom: 24 }}>
          BOXINGAI
        </div>
        <div>Throw it.</div>
        <div>Get scored.</div>
        <div style={{ color: "#3B82F6" }}>Level up.</div>
      </div>
    ),
    { ...size },
  );
}
