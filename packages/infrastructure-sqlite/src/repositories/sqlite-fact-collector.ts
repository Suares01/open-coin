import type { DomainFactCollector } from "@open-coin/application";
import type { DomainFact } from "@open-coin/domain";

export class SqliteFactCollector implements DomainFactCollector {
  private pendingFacts: DomainFact[] = [];

  public record(facts: readonly DomainFact[]): void {
    this.pendingFacts.push(...facts);
  }

  public pull(): readonly DomainFact[] {
    const facts = this.pendingFacts;
    this.pendingFacts = [];
    return facts;
  }
}
