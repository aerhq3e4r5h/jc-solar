/** Splits a headline into words that rise in one after another (inside an element with data-reveal="words"). */
export function Words({ text }: { text: string }) {
  return text.split(" ").map((w, i, all) => (
    <span key={i}>
      <span className="w" style={{ "--w": i } as React.CSSProperties}>
        {w}
      </span>
      {i < all.length - 1 ? " " : ""}
    </span>
  ));
}
