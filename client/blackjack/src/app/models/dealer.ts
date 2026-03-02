import { Card } from "./card";

export class Dealer {
  roomId?: string;
  isBust: boolean = false;
  isTurn: boolean = false;
  cards: Card[] = [];
}
