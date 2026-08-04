import type { Clock } from "@open-coin/application";

export class FixedClock implements Clock {
  constructor(
    private readonly instant: string,
    private readonly date: string,
  ) {}

  now(): string {
    return this.instant;
  }

  localDate(timezone: string): string {
    void timezone;
    return this.date;
  }
}
