export class FrameBudget {
  private warmup: number[] = [];
  private animationFrames = 0;
  private late = 0;
  private drawn = 0;
  private watchedAnimation = false;
  private last = 0;
  suggested = false;

  get warming() { return this.warmup.length < 3; }

  pause() { this.last = 0; }

  sample(time: number, work: number, animating: boolean) {
    if (this.warming) {
      this.warmup.push(work);
      if (!this.warming && this.warmup.filter(duration => duration >= 22).length >= 2) this.suggested = true;
    }
    if (this.watchedAnimation) return;
    if (!animating) {
      if (this.animationFrames > 0) this.watchedAnimation = true;
      this.pause();
      return;
    }
    if (this.last) {
      this.animationFrames++;
      if (time - this.last >= 25) this.late++;
      if (work >= 18) this.drawn++;
      if (this.animationFrames >= 16) {
        if (this.late >= 5 || this.drawn >= 8) this.suggested = true;
        this.animationFrames = this.late = this.drawn = 0;
      }
    }
    this.last = time;
  }

  finishAnimation() {
    if (this.last || this.animationFrames) this.watchedAnimation = true;
    this.pause();
  }
}
