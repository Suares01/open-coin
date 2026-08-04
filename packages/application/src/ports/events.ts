import type { DomainFact } from "@open-coin/domain";

export type ApplicationEventType =
  | "FinancialBookCreated"
  | "LedgerAccountCreated"
  | "JournalEntryPosted"
  | "JournalEntryReversed";

export interface DomainEventEnvelope {
  readonly eventId: string;
  readonly type: ApplicationEventType;
  readonly occurredAt: string;
  readonly aggregateId: string;
  readonly bookId: string;
  readonly payload: unknown;
}

export interface DomainEventPublisher {
  publish(event: DomainEventEnvelope): Promise<void> | void;
}

export type PublishableDomainFact = DomainFact<
  ApplicationEventType,
  unknown
>;
