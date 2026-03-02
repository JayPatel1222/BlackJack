import { Injectable } from '@angular/core';
import { Player } from '../models/player';
import { Message } from '../models/message';
import { Dealer } from '../models/dealer';
import { Card } from '../models/card';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  MAX_PLAYERS = 4;

  private messages: Message[] = [];

  private player?: Player;
  private players: Player[] = [];
  private dealer?: Dealer;

  private winningPlayers: Player[] = [];

  hasGameStarted = false;
  isRoundOver = false;

  //#region PLAYER GETTER SETTERS
  setPlayer(player: Player) {
    this.player = player
  }

  clearPlayerData() {
    this.players = [];
    this.player = undefined;
    this.dealer = undefined;
    this.winningPlayers = [];
    this.hasGameStarted = false;
    this.isRoundOver = false;
  }

  getHandValue(cards: Card[]){
    let handValue = 0

    for(let c of cards){
      handValue += parseInt(c.value!)
    }

    return handValue
  }

  setDealer(dealer:Dealer){
    this.dealer = dealer
  }

  getDealer(){
    return this.dealer
  }

  updatePlayer(updatedPlayer: Player) {
  this.players = this.players.map(p =>
    p.userId === updatedPlayer.userId
      ? { ...updatedPlayer }
      : p
  );

  // also update current player reference if needed
  if (this.player?.userId === updatedPlayer.userId) {
    this.player = { ...updatedPlayer };
  }
}

  getPlayer() {
    return this.player;
  }

  addPlayer(player: Player) {
    this.players.push(player);
  }

  removePlayer(player: Player) {
    this.players = this.players.filter(p => p.userId !== player.userId);
  }

  getPlayers(): Player[] {
    return this.players;
  }

  setPlayers(players: Player[]) {
    this.players = players;

    this.player = players.filter(p => p.userId == this.getPlayer()?.userId)[0];
  }
  //#endregion

  //#region MESSAGE GETTERS SETTERS
  getMessages() {
    return this.messages;
  }

  addMessage(message: Message) {
    if (this.messages.length > 5) {
      this.messages.shift();
    }

    this.messages.push(message);
  }

  clearMessages() {
    this.messages = [];
  }
  //#endregion

  //#region WINNER GETTER SETTERS
  getWinningPlayers() {
    return this.winningPlayers;
  }

  setWinningPlayers(players: Player[]) {
    this.winningPlayers = players;
  }
  //#endregion
}
