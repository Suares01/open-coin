import {
  CreateFinancialBook,
  DomainEventDispatcher,
} from "@open-coin/application";
import {
  CollectingDomainEventPublisher,
  FixedClock,
  InMemoryStore,
  InMemoryTransactionManager,
  SequentialIdGenerator,
} from "../index.js";

export function createHarness() {
  const store = new InMemoryStore();
  const ids = new SequentialIdGenerator();
  const publisher = new CollectingDomainEventPublisher();
  const transactionManager = new InMemoryTransactionManager(store);
  const dispatcher = new DomainEventDispatcher(
    new FixedClock("2026-08-04T12:00:00.000Z", "2026-08-04"),
    ids,
    publisher,
  );

  return { store, ids, publisher, transactionManager, dispatcher };
}

export const validBookCommand = {
  name: "Personal book",
  baseCurrency: "BRL",
  timezone: "America/Sao_Paulo",
} as const;

export async function createBook(harness: ReturnType<typeof createHarness>) {
  const result = await new CreateFinancialBook(
    harness.transactionManager,
    harness.dispatcher,
    harness.ids,
  ).execute(validBookCommand);
  if (!result.ok) {
    throw new Error(`Book fixture failed: ${result.error.code}`);
  }
  harness.publisher.clear();
  return result.value;
}
