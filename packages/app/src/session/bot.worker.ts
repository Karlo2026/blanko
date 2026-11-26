// Web Worker: Bots rechnen hier, damit die Oberfläche flüssig bleibt.
import { createBotAnswerer, type BotRequest } from '@blanko/bots';

const answer = createBotAnswerer();

addEventListener('message', (event: MessageEvent<BotRequest>) => {
  postMessage(answer(event.data));
});
