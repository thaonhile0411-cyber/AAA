"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { countWords, highlightSegments } from "./bank";
import { PromptGraphic } from "./PromptGraphic";
import type { WritingPrompt } from "./types";
import styles from "./writing.module.css";

const supportTabs = [
  { id: "combined", label: "Suggestions & Vocabulary" },
  { id: "outline", label: "Outline Suggestions" },
  { id: "vocab", label: "Vocab Keys" },
  { id: "sample", label: "Sample Essays" },
] as const;
type SupportTab = (typeof supportTabs)[number]["id"];

export default function WritingWorkspace({
  prompt,
}: {
  prompt: WritingPrompt;
}) {
  const [active, setActive] = useState<SupportTab>("combined");
  const [expanded, setExpanded] = useState(true);
  const [highlights, setHighlights] = useState(true);
  const [draft, setDraft] = useState("");
  const [saveState, setSaveState] = useState("Loading draft…");
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const dialog = useRef<HTMLDialogElement>(null);
  const chartButton = useRef<HTMLButtonElement>(null);
  const storageKey = `aaa:writing:draft:${prompt.id}`;
  const words = countWords(draft);
  const minimum = prompt.task === 1 ? 150 : 250;

  useEffect(() => {
    let restored = "";
    let message = "Drafts save in this browser only.";
    try {
      restored = localStorage.getItem(storageKey) ?? "";
      if (restored) message = "Draft restored from this browser.";
    } catch {
      message =
        "Browser storage is unavailable. Download your draft to keep it.";
    }
    // Loading an external browser store after hydration keeps server and client output identical.
    const frame = requestAnimationFrame(() => {
      setDraft(restored);
      setSaveState(message);
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [storageKey]);

  function updateDraft(value: string) {
    setDraft(value);
    // Save on input so navigating away immediately cannot discard the final keystrokes.
    try {
      localStorage.setItem(storageKey, value);
      setSaveState("Saved in this browser · not synced to your account");
    } catch {
      setSaveState(
        "Could not save in this browser. Download your draft to keep it.",
      );
    }
  }

  function download() {
    const blob = new Blob([`${prompt.title}\n\n${draft}`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${prompt.id}-draft.txt`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openGraphic() {
    setZoom(1);
    dialog.current?.showModal();
  }

  return (
    <div className={styles.page} lang="en">
      <Link href="/writing" className={styles.backLink}>
        ← Back to question bank
      </Link>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>
            WRITING TASK {prompt.task} · {prompt.type.toUpperCase()}
          </p>
          <h1>{prompt.title}</h1>
          <div className={styles.tags}>
            <span>{prompt.topic}</span>
            <span>Target band {prompt.band}+</span>
            <span>{prompt.task === 1 ? 20 : 40} minutes</span>
          </div>
        </div>
      </header>
      <div className={styles.workspace}>
        <div className={styles.materials}>
          <section className={styles.panel} aria-labelledby="prompt-title">
            <div className={styles.panelTitle}>
              <Icon name="fileText" />
              <h2 id="prompt-title">Your writing prompt</h2>
            </div>
            <p className={styles.instruction}>
              You should spend about {prompt.task === 1 ? 20 : 40} minutes on
              this task.
            </p>
            <p className={styles.question}>{prompt.question}</p>
            <p className={styles.instruction}>
              Write at least {minimum} words.
            </p>
            {prompt.graphic && (
              <figure className={styles.figure}>
                <button
                  ref={chartButton}
                  onClick={openGraphic}
                  className={styles.chartButton}
                  aria-label={`Enlarge ${prompt.graphic.type.toLowerCase()}: ${prompt.title}`}
                >
                  <PromptGraphic prompt={prompt} />
                  <span>Click to enlarge & zoom ↗</span>
                </button>
                <figcaption>{prompt.graphic.description}</figcaption>
              </figure>
            )}
          </section>
          <section className={styles.panel} aria-labelledby="support-title">
            <div className={styles.panelTitle}>
              <Icon name="sparkle" />
              <h2 id="support-title">Writing companion</h2>
              <button
                className={styles.textButton}
                aria-expanded={expanded}
                aria-controls="writing-support"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "Collapse" : "Expand"} {expanded ? "−" : "+"}
              </button>
            </div>
            <div
              className={styles.tabs}
              role="tablist"
              aria-label="Writing support"
            >
              {supportTabs.map((tab, index) => (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  role="tab"
                  type="button"
                  aria-selected={active === tab.id}
                  aria-controls="writing-support"
                  tabIndex={active === tab.id ? 0 : -1}
                  onClick={() => {
                    setActive(tab.id);
                    setExpanded(true);
                  }}
                  onKeyDown={(event) => {
                    let next = index;
                    if (event.key === "ArrowRight")
                      next = (index + 1) % supportTabs.length;
                    else if (event.key === "ArrowLeft")
                      next =
                        (index + supportTabs.length - 1) % supportTabs.length;
                    else if (event.key === "Home") next = 0;
                    else if (event.key === "End") next = supportTabs.length - 1;
                    else return;
                    event.preventDefault();
                    setActive(supportTabs[next].id);
                    setExpanded(true);
                    document
                      .getElementById(`tab-${supportTabs[next].id}`)
                      ?.focus();
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div
              id="writing-support"
              role="tabpanel"
              aria-labelledby={`tab-${active}`}
              hidden={!expanded}
              tabIndex={0}
              className={styles.supportContent}
            >
              {(active === "combined" || active === "outline") && (
                <section>
                  <h3>Outline suggestions</h3>
                  <p className={styles.instruction}>
                    Use this structure as a starting point, then develop your
                    own ideas.
                  </p>
                  <ol className={styles.outline}>
                    {prompt.outline.map((section) => (
                      <li key={section.heading}>
                        <strong>{section.heading}</strong>
                        <p>{section.suggestion}</p>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
              {(active === "combined" || active === "vocab") && (
                <section>
                  <h3>
                    Vocab keys{" "}
                    <span className={styles.count}>5 expressions</span>
                  </h3>
                  <dl className={styles.vocabulary}>
                    {prompt.vocabulary.map((item) => (
                      <div key={item.term}>
                        <dt>{item.term}</dt>
                        <dd>
                          {item.meaning}
                          <p>“{item.example}”</p>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
              {active === "sample" && (
                <section>
                  <div className={styles.sampleHeading}>
                    <h3>Band {prompt.band}+ model response</h3>
                    <label>
                      <input
                        type="checkbox"
                        checked={highlights}
                        onChange={(e) => setHighlights(e.target.checked)}
                      />{" "}
                      Show highlights
                    </label>
                  </div>
                  <p className={styles.instruction}>
                    Original teaching sample ·{" "}
                    {countWords(prompt.sample.join(" "))} words · target band,
                    not examiner assessed.
                  </p>
                  <div className={styles.legend}>
                    <span>
                      <mark className={styles.vocabularyMark}>
                        Band 7.0+ vocabulary
                      </mark>
                    </span>
                    <span>
                      <mark className={styles.cohesionMark}>
                        Cohesive devices
                      </mark>
                    </span>
                  </div>
                  <div className={styles.sample}>
                    {prompt.sample.map((paragraph, i) => (
                      <p key={i}>
                        {highlights
                          ? highlightSegments(
                              paragraph,
                              prompt.vocabulary.map((v) => v.term),
                              prompt.cohesiveDevices,
                            ).map((segment, j) =>
                              segment.kind ? (
                                <mark
                                  key={j}
                                  className={
                                    segment.kind === "vocabulary"
                                      ? styles.vocabularyMark
                                      : styles.cohesionMark
                                  }
                                  title={
                                    segment.kind === "vocabulary"
                                      ? prompt.vocabulary.find(
                                          (v) =>
                                            v.term.toLowerCase() ===
                                            segment.text.toLowerCase(),
                                        )?.meaning
                                      : "Cohesive device"
                                  }
                                >
                                  {segment.text}
                                </mark>
                              ) : (
                                segment.text
                              ),
                            )
                          : paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </section>
        </div>
        <section
          className={`${styles.panel} ${styles.editor}`}
          aria-labelledby="draft-title"
        >
          <div className={styles.panelTitle}>
            <Icon name="edit" />
            <h2 id="draft-title">Your draft</h2>
            <span className={styles.pill}>Practice space</span>
          </div>
          <p className={styles.instruction}>
            Make the ideas your own. Start with a sentence.
          </p>
          <label className={styles.srOnly} htmlFor="writing-draft">
            Your response to {prompt.title}
          </label>
          <textarea
            id="writing-draft"
            value={draft}
            disabled={!ready}
            onChange={(e) => updateDraft(e.target.value)}
            placeholder={
              prompt.task === 1
                ? "The diagram illustrates…"
                : "Start writing your response here…"
            }
            spellCheck
            aria-describedby="draft-count draft-save"
          />
          <div className={styles.editorMeta}>
            <span
              id="draft-count"
              className={words >= minimum ? styles.met : ""}
            >
              {words} / {minimum} words{" "}
              {words >= minimum ? "· Minimum reached" : "· Minimum recommended"}
            </span>
            <button
              className={styles.textButton}
              onClick={download}
              disabled={!draft}
            >
              Download draft <Icon name="arrow" size={15} />
            </button>
          </div>
          <p className={styles.saveState} id="draft-save" role="status">
            {saveState}
          </p>
        </section>
      </div>
      {prompt.graphic && (
        <dialog
          ref={dialog}
          className={styles.dialog}
          aria-labelledby="graphic-title"
          onClose={() => chartButton.current?.focus()}
          onClick={(event) => {
            if (event.target === event.currentTarget) dialog.current?.close();
          }}
        >
          <div className={styles.dialogContent}>
            <div className={styles.dialogHeader}>
              <h2 id="graphic-title">{prompt.title}</h2>
              <button
                autoFocus
                aria-label="Close graphic"
                onClick={() => dialog.current?.close()}
              >
                <Icon name="x" />
              </button>
            </div>
            <div className={styles.zoomControls}>
              <button
                aria-label="Zoom out"
                disabled={zoom <= 0.5}
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              >
                −
              </button>
              <output aria-live="polite">{Math.round(zoom * 100)}%</output>
              <button
                aria-label="Zoom in"
                disabled={zoom >= 3}
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              >
                +
              </button>
              <button onClick={() => setZoom(1)}>Reset zoom</button>
            </div>
            <div
              className={styles.zoomViewport}
              tabIndex={0}
              aria-label="Scrollable chart"
            >
              <div style={{ width: `${zoom * 100}%`, margin: "auto" }}>
                <PromptGraphic prompt={prompt} />
              </div>
            </div>
            <p className={styles.instruction}>
              Scroll to explore the enlarged graphic. Press Escape to close.
            </p>
          </div>
        </dialog>
      )}
    </div>
  );
}
