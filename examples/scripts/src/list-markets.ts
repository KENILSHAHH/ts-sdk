import { createPublicClient } from '@polymarket/client';

const client = createPublicClient();

const page = await client
  .listMarkets({
    closed: false,
    pageSize: 5,
  })
  .firstPage();

for (const market of page.items) {
  console.log(
    `${market.id}: ${market.question ?? market.slug ?? 'Untitled market'}`,
  );
}
