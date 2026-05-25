import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { Problem } from "@/components/landing/problem";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Solution } from "@/components/landing/solution";
import { Stack } from "@/components/landing/stack";
import { FinalCTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-white text-black">
      <LandingNav />
      <main className="relative flex-1">
        <Hero />
        <Problem />
        <HowItWorks />
        <Solution />
        <Stack />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
