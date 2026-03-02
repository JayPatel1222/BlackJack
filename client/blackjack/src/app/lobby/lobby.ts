import { Component, OnDestroy, OnInit } from '@angular/core';
import { SocketService } from '../services/socket-service';
import { GameService } from '../services/game-service';
import { Player } from '../models/player';
import { Card } from '../models/card';
import { Router } from '@angular/router';
import { Dealer } from '../models/dealer';

@Component({
  selector: 'app-lobby',
  standalone: false,
  templateUrl: './lobby.html',
  styleUrl: './lobby.css',
})
export class Lobby implements OnInit, OnDestroy {
  constructor(
    private socketService: SocketService,
    public gameService: GameService,
    private router: Router,
  ) {}

  ngOnInit() {
    // Event listener for closing tab
    window.addEventListener("unload", () => {
      let user: Player | undefined = this.gameService.getPlayer();
      this.socketService.emit('userLeft', JSON.stringify(user));
    });

    // Listen for any new player that joins
    this.socketService.listenFor('userJoined', (data) => {
      const parsedUser = JSON.parse(data);

      this.gameService.addMessage({ message: `${parsedUser.name} has joined!`, type: 'POSITIVE' });

      if (parsedUser.userId === this.socketService.getId()) {
        this.gameService.setPlayer(parsedUser as Player);
      }
    });

    // Update the players array (aka the players in the current room)
    this.socketService.listenFor('getUsers', (data) => {
      const parsedRoomUsers = JSON.parse(data);
      this.gameService.setPlayers(parsedRoomUsers as Player[]);
    });

    //Listens for any user left the lobby to update the players list and message in the lobby
    this.socketService.listenFor('userLeft', (user) => {
      const parseduser = JSON.parse(user);
      this.gameService.addMessage({
        message: `${parseduser.name} has left the lobby`,
        type: 'NEGATIVE',
      });

      this.gameService.removePlayer(parseduser as Player);
    });

    // Listen for gameStart event
    this.socketService.listenFor('gameStart', () => {
      this.gameService.hasGameStarted = true;
    });

    // Listen for updates to the game state
    this.socketService.listenFor('updatedGameState', (state) => {
      const parsedState = JSON.parse(state);

      this.gameService.setPlayers(parsedState);
      // Logic to update game state
      if (parsedState.isStand) {
        this.gameService.addMessage({ message: `${parsedState.user?.name} STAND` });
      }
    });

    this.socketService.listenFor('dealerCards', (dealer) => {
      const parsedDealer = JSON.parse(dealer);
      this.gameService.setDealer(parsedDealer as Dealer);
    });

    this.socketService.listenFor('dealerDrawCard', (dealer) => {
      const parsedDealer = JSON.parse(dealer);
      this.gameService.setDealer(parsedDealer as Dealer);
    });

    this.socketService.listenFor('drawnCard', (card) => {
      const parsedCard = JSON.parse(card);

      this.gameService.updatePlayer(parsedCard.user as Player);
      if (parsedCard.isWinner != undefined && parsedCard.isWinner) {
        this.gameService.addMessage({ message: `${parsedCard.user?.name} WINS` });
      } else if (parsedCard.user.isBust) {
        this.gameService.addMessage({ message: `${parsedCard.user?.name} BUSTED`, type: 'NEGATIVE' });
      } else {
        this.gameService.addMessage({ message: `${parsedCard.user?.name} HITS` });
      }
    });

    this.socketService.listenFor('onStand', (player) => {
      const parsedPlayer = JSON.parse(player);
      this.gameService.addMessage({ message: `${parsedPlayer.name} STANDS` });
    });

    this.socketService.listenFor('dealerBust', () => {
      this.gameService.addMessage({ message: `DEALER BUSTS`, type: 'NEGATIVE' });
    });

    this.socketService.listenFor('winners', (data) => {
      const winningPlayers = JSON.parse(data);
      this.gameService.isRoundOver = true;

      this.gameService.setWinningPlayers(winningPlayers);
      this.gameService.addMessage({ message: `ROUND IS OVER, ${this.gameService.getWinningPlayers().length} PLAYER(S) WON`, type: 'POSITIVE' });
    });

    this.socketService.listenFor('gameRestarted', () => {
      this.gameService.isRoundOver = false;
      this.gameService.clearMessages();
      this.gameService.setWinningPlayers([]);
      this.gameService.addMessage({ message: 'A NEW ROUND HAS STARTED', type: 'POSITIVE' });
    });

    this.socketService.listenFor('nextUserTurnMessage', (name) => {
      const { name: username } = JSON.parse(name);
      this.gameService.addMessage({ message: `${username}'S TURN`, type: 'POSITIVE' });
    });
  }

  ngOnDestroy(): void {
    let user: Player | undefined = this.gameService.getPlayer();

    this.gameService.hasGameStarted = false;

    //emits the user when user lefts the lobby
    this.socketService.emit('userLeft', JSON.stringify(user));

    //removing all local listners onces the user left the lobby
    //to avoid duplicate entries and memory leak
    this.socketService.removeListener('userJoined');
    this.socketService.removeListener('getUsers');
    this.socketService.removeListener('userLeft');
    this.socketService.removeListener('gameStart');
    this.socketService.removeListener('updatedGameState');
    this.socketService.removeListener('dealerCards');
    this.socketService.removeListener('drawnCard');
    this.socketService.removeListener('onStand');
    this.socketService.removeListener('dealerDrawCard');
    this.socketService.removeListener('dealerBust');
    this.socketService.removeListener('winners');
    this.socketService.removeListener('gameRestarted');
    this.socketService.removeListener('nextUserTurnMessage');
    
    this.gameService.clearMessages();
    this.gameService.clearPlayerData();
  }

  onClickStartGame() {
    this.socketService.emit(
      'gameStart',
      JSON.stringify({
        roomId: this.gameService.getPlayer()?.roomId,
        users: this.gameService.getPlayers(),
      }),
    );
  }

  onHit() {
    let player = this.gameService.getPlayer();
    let handValue = 0;
    const deckId = player?.cards[0].deckId;

    for (let v of player?.cards!) {
      let value = Number(v.value);
      handValue += value;
    }

    this.socketService.emit(
      'onHit',
      JSON.stringify({
        players: this.gameService.getPlayers(),
        user: player,
        handValue,
        deckId,
        dealersCard: this.gameService.getDealer()?.cards,
      }),
    );
  }

  onStand() {
    let player = this.gameService.getPlayer();
    let players = this.gameService.getPlayers();

    players.forEach((p) => {
      if (p.userId == player?.userId) {
        p.isStand = true;
      }
    });
    
    this.socketService.emit(
      'onStand',
      JSON.stringify({
        player,
        players,
      }),
    );
  }

  onClickPlayAgain() {
    this.socketService.emit(
      'restartGame',
      JSON.stringify({
        roomId: this.gameService.getPlayer()?.roomId,
        users: this.gameService.getPlayers(),
      }),
    );
  }
}
