/**
 * Timer module — supports per-question and overall countdown modes.
 */
class Timer {
  constructor() {
    this.remainingSeconds = 0;
    this.intervalId = null;
    this.onTick = null;
    this.onExpire = null;
    this.running = false;
  }

  /**
   * Start the timer.
   * @param {number} seconds — total seconds to count down
   * @param {function} onTick — called every second with remaining seconds
   * @param {function} onExpire — called when timer reaches 0
   */
  start(seconds, onTick, onExpire) {
    this.stop();
    this.remainingSeconds = seconds;
    this.onTick = onTick;
    this.onExpire = onExpire;
    this.running = true;

    if (this.onTick) this.onTick(this.remainingSeconds);

    this.intervalId = setInterval(() => {
      this.remainingSeconds--;
      if (this.onTick) this.onTick(this.remainingSeconds);

      if (this.remainingSeconds <= 0) {
        this.stop();
        if (this.onExpire) this.onExpire();
      }
    }, 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
  }

  pause() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
  }

  resume() {
    if (!this.running && this.remainingSeconds > 0) {
      this.running = true;
      this.intervalId = setInterval(() => {
        this.remainingSeconds--;
        if (this.onTick) this.onTick(this.remainingSeconds);

        if (this.remainingSeconds <= 0) {
          this.stop();
          if (this.onExpire) this.onExpire();
        }
      }, 1000);
    }
  }

  getRemaining() {
    return this.remainingSeconds;
  }

  /**
   * Format seconds as MM:SS or HH:MM:SS
   */
  static format(totalSeconds) {
    if (totalSeconds < 0) totalSeconds = 0;
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}
