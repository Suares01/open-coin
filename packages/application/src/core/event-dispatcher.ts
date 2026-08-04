import { ApplicationError } from "../ports/errors.js";
import type {
  ApplicationEventType,
  DomainEventEnvelope,
  DomainEventPublisher,
} from "../ports/events.js";
import type { Clock, IdGenerator } from "../ports/time.js";
import type { DomainFact } from "@open-coin/domain";

const EVENT_TYPES: readonly ApplicationEventType[] = [
  "FinancialBookCreated",
  "LedgerAccountCreated",
  "JournalEntryPosted",
  "JournalEntryReversed",
];

export class DomainEventDispatcher {
  constructor(
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly publisher: DomainEventPublisher,
  ) {}

  async dispatch(facts: readonly DomainFact[]): Promise<void> {
    for (const fact of facts) {
      const type = toEventType(fact.type);
      const payload = fact.payload;
      const bookId = getBookId(payload, fact.aggregateId);
      const event: DomainEventEnvelope = {
        eventId: this.ids.nextEventId(),
        type,
        occurredAt: this.clock.now(),
        aggregateId: fact.aggregateId,
        bookId,
        payload,
      };
      await this.publisher.publish(event);
    }
  }
}

function toEventType(type: string): ApplicationEventType {
  if (EVENT_TYPES.includes(type as ApplicationEventType)) {
    return type as ApplicationEventType;
  }

  throw new ApplicationError(
    "UNEXPECTED_ERROR",
    `Unsupported domain event type: ${type}`,
  );
}

function getBookId(payload: unknown, fallback: string): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "bookId" in payload &&
    typeof payload.bookId === "string"
  ) {
    return payload.bookId;
  }

  return fallback;
}
