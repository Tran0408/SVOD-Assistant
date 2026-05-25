export function AmbientBlobs() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[800px] overflow-hidden"
    >
      <div
        className="absolute -top-32 left-[20%] h-[360px] w-[360px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(94,106,210,0.22), transparent 70%)",
          filter: "blur(30px)",
        }}
      />
      <div
        className="absolute top-[20%] right-[10%] h-[320px] w-[320px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(123,97,255,0.18), transparent 70%)",
          filter: "blur(40px)",
        }}
      />
    </div>
  );
}
