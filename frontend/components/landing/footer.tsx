export function Footer() {
  return (
    <footer className="relative w-full border-t border-black/10 bg-white/40 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-6 py-10 md:flex-row md:items-center md:justify-between md:px-12">
        <span className="font-display text-[18px] font-bold tracking-tight text-black">
          SVOD
        </span>
        <p className="text-[12px] text-black/55">
          SVOD streaming dataset · Agentic graph analytics
        </p>
      </div>
    </footer>
  );
}
