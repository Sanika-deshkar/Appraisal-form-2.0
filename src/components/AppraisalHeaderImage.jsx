export default function AppraisalHeaderImage({ height = 72, style = {} }) {
  return (
    <img
      src="/image.png"
      alt="DYPIU"
      style={{
        height,
        width: "auto",
        maxWidth: "min(36vw, 320px)",
        objectFit: "contain",
        display: "block",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
