"use client";

import { cn } from "@roleproof/ui/lib/utils";
import { FileText, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const roles = ["Backend", "Frontend", "Full-stack", "Data"] as const;
type Role = (typeof roles)[number];

const levels = ["Intern", "Junior", "Mid", "Senior", "Staff"] as const;
type Level = (typeof levels)[number];

type Difficulty = "Easy" | "Medium" | "Hard";

const difficultyFor: Record<Level, Difficulty> = {
  Intern: "Easy",
  Junior: "Easy",
  Mid: "Medium",
  Senior: "Hard",
  Staff: "Hard",
};

const roleQuestions: Record<Role, Record<Difficulty, string>> = {
  Backend: {
    Easy: "What's the difference between a SQL join and running two separate queries? When would you pick each?",
    Medium: "An endpoint got slow right after a release. Walk me through how you'd find out why.",
    Hard: "Design payment processing that survives duplicate webhooks. Where can it still go wrong?",
  },
  Frontend: {
    Easy: "What happens between typing a URL and seeing the page?",
    Medium: "A list of 5,000 rows lags every time someone types in the filter. How do you fix it?",
    Hard: "You're splitting a large app into separately deployed parts. How do you keep shared state and design consistent?",
  },
  "Full-stack": {
    Easy: "Explain what a REST API is to someone who has only built static sites.",
    Medium: "Users see old data right after saving a form. Where could the problem be, front to back?",
    Hard: "Plan a zero-downtime migration that renames a column both the web and mobile apps use.",
  },
  Data: {
    Easy: "What's the difference between a left join and an inner join? Give a case where it matters.",
    Medium: "A daily pipeline sometimes double-counts orders. How do you track it down?",
    Hard: "Design a pipeline that handles late-arriving events without rebuilding a whole day of data.",
  },
};

const resumeQuestions: Record<Role, string> = {
  Backend: "Your resume says you moved jobs from cron to a queue. What happened to jobs that failed halfway?",
  Frontend: "Your resume says you cut bundle size by 30%. What exactly did you remove or split?",
  "Full-stack": "Your resume mentions building login from scratch. How did you handle expired sessions?",
  Data: "Your resume lists Airflow. How did you backfill a DAG after a schema change?",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[8rem_1fr] sm:items-center sm:gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm transition-all",
            value === o
              ? "border-primary bg-primary text-primary-foreground"
              : "hover:border-wash/40 hover:bg-wash/6",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Attachment({
  name,
  detail,
  attached,
  onToggle,
}: {
  name: string;
  detail: string;
  attached: boolean;
  onToggle: () => void;
}) {
  if (!attached) {
    return (
      <button
        onClick={onToggle}
        className="w-full rounded-2xl border border-dashed px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-wash/40 hover:bg-wash/5"
      >
        + Attach an example
      </button>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border bg-background px-4 py-2.5 text-sm animate-in fade-in zoom-in-95 duration-200">
      <span className="flex min-w-0 items-center gap-2">
        <FileText className="size-4 shrink-0 text-brand-ink" />
        <span className="truncate">{name}</span>
        <span className="hidden text-muted-foreground sm:inline">· {detail}</span>
      </span>
      <button onClick={onToggle} aria-label={`Remove ${name}`} className="text-muted-foreground hover:text-foreground">
        <X className="size-4" />
      </button>
    </div>
  );
}

export function SetupDemo() {
  const [role, setRole] = useState<Role>("Backend");
  const [level, setLevel] = useState<Level>("Mid");
  const [resume, setResume] = useState(true);
  const [jd, setJd] = useState(false);

  const difficulty = difficultyFor[level];
  const basedOn = [`${level} ${role.toLowerCase()} role`, resume && "your resume", jd && "the job description"]
    .filter(Boolean)
    .join(", ");

  return (
    <figure className="rounded-3xl border bg-card p-6 sm:p-8">
      <div className="flex flex-col gap-5">
        <Row label="Role">
          <Segmented label="Role" options={roles} value={role} onChange={setRole} />
        </Row>
        <Row label="Level">
          <Segmented label="Level" options={levels} value={level} onChange={setLevel} />
        </Row>
        <Row label="Resume">
          <Attachment
            name="resume.pdf"
            detail="2 pages"
            attached={resume}
            onToggle={() => setResume(!resume)}
          />
        </Row>
        <Row label="Job description">
          <Attachment
            name="job-description.pdf"
            detail="or paste the text"
            attached={jd}
            onToggle={() => setJd(!jd)}
          />
        </Row>
      </div>

      <div className="mt-10 border-t pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span className="text-muted-foreground">First questions</span>
          <span className="flex items-center gap-3">
            <span className="flex gap-1" aria-hidden>
              {(["Easy", "Medium", "Hard"] as const).map((d, i) => (
                <span
                  key={d}
                  className={cn(
                    "h-1.5 w-7 rounded-full transition-colors duration-500",
                    i <= ["Easy", "Medium", "Hard"].indexOf(difficulty) ? "bg-terracotta" : "bg-wash/15",
                  )}
                />
              ))}
            </span>
            <span>
              Difficulty: <span className="font-medium">{difficulty}</span>
            </span>
          </span>
        </div>
        <ol key={`${role}-${level}-${resume}`} className="mt-6 flex flex-col gap-6 animate-in fade-in duration-300">
          <li className="font-serif text-xl leading-relaxed">“{roleQuestions[role][difficulty]}”</li>
          {resume && (
            <li>
              <div className="font-mono text-xs text-brand-ink">from resume.pdf</div>
              <p className="mt-1.5 font-serif text-xl leading-relaxed">“{resumeQuestions[role]}”</p>
            </li>
          )}
        </ol>
        {jd && (
          <p className="mt-6 text-sm text-muted-foreground">
            Topics are weighted toward what the job description asks for.
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <figcaption className="text-xs text-muted-foreground">Example. Based on: {basedOn}.</figcaption>
          <Link
            href="/login"
            className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground transition-transform hover:scale-[1.03] active:scale-95"
          >
            Start interview
          </Link>
        </div>
      </div>
    </figure>
  );
}
