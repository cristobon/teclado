import type { TimeSource } from '../playback/clock'

export class FakeTime implements TimeSource {
  constructor(public t = 0) {}
  now(): number {
    return this.t
  }
  advance(seconds: number): void {
    this.t += seconds
  }
}
