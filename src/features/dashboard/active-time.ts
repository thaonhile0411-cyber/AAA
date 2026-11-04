/** A suspended/background timer never credits the gap when it resumes. */
export class ActiveClock {
  private previous: number;
  private lastInput: number;
  constructor(
    now: number,
    private idleMs = 60000,
  ) {
    this.previous = now;
    this.lastInput = now;
  }
  input(now: number) {
    this.lastInput = now;
  }
  tick(now: number, visible: boolean, focused: boolean) {
    const elapsed = now - this.previous;
    const active = Math.max(
      0,
      Math.min(now, this.lastInput + this.idleMs) - this.previous,
    );
    this.previous = now;
    return visible && focused && elapsed <= 2500 ? active : 0;
  }
}
