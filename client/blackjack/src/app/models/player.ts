import { Card } from "./card";

export class Player {
    userId?: string;
    roomId?: string;
    name?: string;
    isBust: boolean = false;
    isTurn: boolean = false;
    isStand: boolean = false;
    cards: Card[] = [];

}
