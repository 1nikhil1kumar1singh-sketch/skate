"use client";

import { useState } from "react";
import { getHowToPlay } from "@/lib/howToPlay";

export function HowToPlay({ slug }: { slug: string }) {
  const guide = getHowToPlay(slug);
  const [open, setOpen] = useState(false);

  if (!guide) return null;

  return (
    <section className={`how-to ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="how-to__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>Quick play</span>
        <span className="how-to__chevron" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>
      {open ? (
        <div className="how-to__body">
          <p className="how-to__summary">{guide.summary}</p>
          <ol className="how-to__steps">
            {guide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
