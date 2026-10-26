import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { ClaimCheck } from "@/components/landing/claim-check";
import { Navbar } from "@/components/landing/navbar";
import { RepoDemo } from "@/components/landing/repo-demo";
import { RotatingWord } from "@/components/landing/rotating-word";
import { SetupDemo } from "@/components/landing/setup-demo";
import { VoiceDemo } from "@/components/landing/voice-demo";
import { Logo } from "@/components/logo";

const steps = [
  {
    title: "Set it up",
    body: "Pick the role and level. Then add your resume, the job description or a GitHub repo, whatever you have.",
  },
  {
    title: "Answer out loud",
    body: "It asks one question at a time and listens. A vague answer gets a follow-up. A good one gets a harder question.",
  },
  {
    title: "Read the report",
    body: "Where you were strong, where you hand-waved, and what to practice before the next session.",
  },
];

const types = [
  ["Project deep-dive", "Questions about a repo you built and the choices in it."],
  ["Backend concepts", "Databases, caching, queues and APIs, at your level."],
  ["System design", "One open problem, followed into scale and failure."],
  ["DSA", "Coding problems, with hints when you're stuck."],
  ["Behavioral", "What actually happened, not the rehearsed version."],
  ["Resume screen", "Every line on your resume, checked."],
];

const paths = [
  {
    href: "#setup",
    title: "From the job you want",
    body: "Choose a role and level, and add your resume or the job description. Questions match the level, and your resume gets checked line by line.",
    cta: "See the setup",
  },
  {
    href: "#repo",
    title: "From your own repo",
    body: "Paste a GitHub link. It reads the code and interviews you on that project only: the files you wrote and the choices in them.",
    cta: "See a repo interview",
  },
];

function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-4xl px-6 ${className}`}>{children}</div>;
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">{children}</h2>;
}

function Lead({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 mb-12 max-w-xl leading-relaxed text-muted-foreground">{children}</p>;
}

const primaryButton =
  "inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground transition-transform hover:scale-[1.03] active:scale-95";

export default function Home() {
  return (
    <div className="min-h-svh overflow-x-clip">
      <div className="relative">
        {/* Mauve disc with a terracotta dot circling it */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-24 -right-32 size-[26rem] sm:top-28 sm:right-[max(-6rem,calc(50%-36rem))] sm:size-[30rem]"
        >
          <div className="size-full rounded-full bg-card/70 dark:bg-mauve/15" />
          <div className="orbit absolute inset-0">
            <div className="absolute top-0 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-terracotta" />
          </div>
          <div className="absolute inset-[18%] rounded-full border border-plum/15 dark:border-mauve/20" />
        </div>

        <Navbar />

        <Container className="relative pt-20 pb-24 sm:pt-28">
          <h1 className="min-h-[3.3em] max-w-3xl font-serif text-5xl leading-[1.05] tracking-tight sm:min-h-[2.2em] sm:text-7xl">
            A mock interview that <RotatingWord />
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
            An AI interviewer that reads your resume, the job description and your own GitHub
            repos. Pick a role and level, then answer out loud. Every next question builds on what
            you just said.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link href="/login" className={primaryButton}>
              Start an interview
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#listen"
              className="text-sm underline decoration-terracotta decoration-2 underline-offset-[6px] transition-colors hover:text-brand-ink"
            >
              Hear a sample first
            </a>
          </div>
        </Container>
      </div>

      <main>
        <Container>
          <div id="listen" className="scroll-mt-6">
            <VoiceDemo />
          </div>
        </Container>

        <Container className="py-28">
          <Heading>Two ways to start</Heading>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {paths.map((p, i) => (
              <a
                key={p.href}
                href={p.href}
                className="group flex flex-col rounded-3xl border p-7 transition-colors duration-300 hover:border-wash/40 hover:bg-wash/6"
              >
                <span className="font-serif text-3xl text-brand-ink italic">0{i + 1}</span>
                <h3 className="mt-6 text-lg font-medium">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm">
                  {p.cta}
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </a>
            ))}
          </div>
        </Container>

        <section id="setup" className="scroll-mt-6 border-t">
          <Container className="py-28">
            <Heading>Set up for the job you want.</Heading>
            <Lead>
              Pick a role and a level, and the difficulty follows: an intern gets fundamentals, a
              senior gets design trade-offs. Add your resume and the job description, and the
              questions get personal. Try changing the options.
            </Lead>
            <SetupDemo />
          </Container>
        </section>

        <section id="repo" className="scroll-mt-6 border-t">
          <Container className="py-28">
            <Heading>
              Or get interviewed on <em className="text-brand-ink">your code.</em>
            </Heading>
            <Lead>
              Add a repository and every question comes from it: the files you wrote, the decisions
              in them and the parts you might have skipped. Answer out loud or by typing, your call.
            </Lead>
            <RepoDemo />
          </Container>
        </section>

        <section className="bg-band text-band-foreground">
          <Container className="py-28">
            <h2 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
              It knows when you're <em className="text-mauve">bluffing.</em>
            </h2>
            <p className="mt-5 mb-12 max-w-xl leading-relaxed text-band-foreground/70">
              In a repo interview it keeps reading your code while you answer. Say you added
              exponential backoff, and it opens the file to check.
            </p>
            <ClaimCheck />
          </Container>
        </section>

        <Container className="py-28">
          <Heading>How it works</Heading>
          <ol className="relative mt-14 flex flex-col gap-12 before:absolute before:top-3 before:bottom-3 before:left-[0.9rem] before:w-px before:bg-plum/30">
            {steps.map((step, i) => (
              <li key={step.title} className="group relative grid grid-cols-[2rem_1fr] gap-x-6">
                <span className="relative z-10 grid size-8 place-items-center rounded-full border border-plum/40 bg-background font-serif text-lg text-brand-ink italic transition-colors duration-300 group-hover:bg-terracotta group-hover:text-white">
                  {i + 1}
                </span>
                <div className="pt-0.5">
                  <h3 className="text-lg font-medium">{step.title}</h3>
                  <p className="mt-1.5 max-w-lg leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>

        <section className="border-t">
          <Container className="py-28">
            <Heading>Pick the round</Heading>
            <ul className="mt-12 grid sm:grid-cols-2 sm:gap-x-12">
              {types.map(([name, desc]) => (
                <li key={name} className="group border-b py-5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-lg font-medium transition-transform duration-300 group-hover:translate-x-1">
                      {name}
                    </span>
                    <ArrowUpRight className="size-4 text-brand-ink opacity-0 transition-all duration-300 group-hover:opacity-100" />
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        <section className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-band text-band-foreground">
            <div aria-hidden className="absolute -top-24 -right-24 size-72 rounded-full bg-mauve/25" />
            <div aria-hidden className="absolute -bottom-10 left-1/3 size-24 rounded-full bg-terracotta/80" />
            <div className="relative px-8 py-20 sm:px-16 sm:py-24">
              <p className="max-w-xl font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
                Get asked the hard follow-up here, <em className="text-mauve">before</em> someone
                asks it for real.
              </p>
              <Link
                href="/login"
                className="mt-10 inline-flex items-center gap-2 rounded-full bg-mauve px-6 py-3 text-sm font-medium text-plum transition-transform hover:scale-[1.03] active:scale-95"
              >
                Start an interview
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <Container className="flex items-center justify-between py-8 text-sm text-muted-foreground">
          <Logo />
          <span>© {new Date().getFullYear()}</span>
        </Container>
      </footer>
    </div>
  );
}
