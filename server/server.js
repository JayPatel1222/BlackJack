import http from "http";
import { Server } from "socket.io";
import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";
import { drawCards, getNewDeck } from "./card.js";
import path from 'path'; 
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename); 

// const networkInterfaces = os.networkInterfaces();
// const ipv4 = (networkInterfaces['Wi-Fi'] || networkInterfaces['en0']).filter(i => i.family === "IPv4")[0];
// const ip = ipv4.address;

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const PORT = process.env.PORT || 8080;

app.use(cors());

app.use(express.static(path.join(__dirname, 'public/blackjack/browser')));

app.get(/.*/, (_, res) => {
  res.sendFile(path.join(__dirname, "public/blackjack/browser/index.html"));
});

const MAX_USERS = 4;
let rooms = [];
const TWENTY_ONE = 21;
const DEALER_CARD_LIMIT = 17;

io.on("connection", (socket) => {
  // Handle the user joining / creating a room
  socket.on("userJoin", (user) => {
    try {
      const parsedUser = JSON.parse(user);
  
      if (user === undefined) return;
  
      const userObject = {
        name: parsedUser.name,
        userId: parsedUser.id,
      };
  
      // Create a room if none exists already
      if (rooms.length == 0) {
        const roomId = nanoid();
        createRoom(roomId);
  
        userObject.roomId = roomId;
        joinRoom(roomId, userObject);
  
        socket.join(userObject.roomId);
        emitUserJoined(roomId, userObject);
        emitAllUsersInRoom(roomId, getRoom(roomId).users);
        return;
      }
  
      // Check all rooms to see if any are currently available to join
      for (let r of rooms) {
        if (r.users.length < MAX_USERS && r.isJoinable) {
          userObject.roomId = r.roomId;
          joinRoom(r.roomId, userObject);
  
          socket.join(userObject.roomId);
          emitUserJoined(r.roomId, userObject);
          emitAllUsersInRoom(r.roomId, getRoom(r.roomId).users);
          return;
        }
      }
  
      // Create a new room (because no rooms are available)
      const roomId = nanoid();
      createRoom(roomId);
  
      userObject.roomId = roomId;
      joinRoom(roomId, userObject);
  
      socket.join(userObject.roomId);
      emitUserJoined(roomId, userObject);
      emitAllUsersInRoom(roomId, getRoom(roomId).users);
    } catch (e) {
      console.log(`SERVER ERROR on userJoin Listener: ${e}`);
    }
  });

  // Handles user leaving the lobby event
  socket.on("userLeft", (user) => {
    try {
      const parsedUser = JSON.parse(user);
  
      if (user === undefined) return;
  
      let isUserRemoved = removeUserFromRoom(parsedUser);
  
      if (isUserRemoved) {
        // getting the room to check if the room still exits after removing the user
        let room = getRoom(parsedUser.roomId);
        if (room !== undefined) {
          emitUserLeft(parsedUser.roomId, parsedUser);
        }
      }
    } catch (e) {
      console.log(`SERVER ERROR on userLeft Listener: ${e}`);
    }
  });

  // Handles game start event
  // Data is an object containing: { roomId: string, users: Player[] }
  socket.on("gameStart", async (data) => {
    try {
      initializeGame(data);
    } catch (e) {
      console.log(`SERVER ERROR on gameStart Listener: ${e}`);
    }
  });

  socket.on("onHit", async (playertState) => {   
    try {
      const currentState = await onHit(playertState);

      emitUpdatedGameState("drawnCard", currentState.user.roomId, currentState);
      updateTurn(currentState.user, currentState.players);
    } catch (e) {
      console.log(`SERVER ERROR on onHit Listener: ${e}`);
    }
  });

  socket.on("onStand", (player) => {
    try {
      let parsedPlayer = JSON.parse(player);
      parsedPlayer.isStand = true;
      updateTurn(parsedPlayer.player, parsedPlayer.players);
      emitMessage("onStand", parsedPlayer.player.roomId, parsedPlayer.player);
    } catch (e) {
      console.log(`SERVER ERROR on userLeft Listener: ${e}`);
    }
  });

  socket.on("restartGame", (data) => {
    try {
      initializeGame(data);
  
      const { roomId } = JSON.parse(data);
      io.to(roomId).emit("gameRestarted");
    } catch (e) {
      console.log(`SERVER ERROR on userLeft Listener: ${e}`);
    }
  })
});

/**
 * Creates a room.
 * @param {string} roomId The ID to use when creating the room.
 */
function createRoom(roomId) {
  rooms.push({
    roomId,
    isJoinable: true,
    users: [],
  });
}

/**
 * Joins an existing room with `roomId`
 * @param {string} roomId The roomId to join.
 * @param {object} user The user object.
 */
function joinRoom(roomId, user) {
  const room = rooms.filter((r) => r.roomId == roomId)[0];
  room.users.push(user);
}

/**
 * Removes the user who left from the room and removes the room itself no users in the room
 * @param {Object} user The user to be removed
 * @returns Boolean
 */
function removeUserFromRoom(user) {
  if (user == undefined) {
    return false;
  }
  const room = getRoom(user.roomId);

  if (room === undefined) return false;

  // update the users array by removing the user object from the array
  room.users = room.users.filter((u) => u.userId !== user.userId);

  //Check for the users array length, if the length of the
  // users array is 0 after removing user Obj from the array
  // update the rooms array by removing the room
  if (room.users.length == 0) {
    rooms = rooms.filter((r) => r.roomId !== user.roomId);
    return true;
  }

  return true;
}

/**
 * Get the room object associated with the specified `roomId`
 * @param {string} roomId
 * @returns The found room
 */
function getRoom(roomId) {
  const room = rooms.filter((r) => r.roomId == roomId)[0];
  return room;
}

//#region EVENT EMITTERS RELATED TO USERS AND ROOMS
/**
 * Emit a message containing an array with all users in the current room to the specified room with `roomId`
 * @param {string} roomId The room id
 * @param {Object[]} users The users array of the current room
 */
function emitAllUsersInRoom(roomId, users) {
  io.to(roomId).emit("getUsers", JSON.stringify(users));
}

/**
 * Emits a message containing an object with the users data to the room specified with `roomId`
 * @param {string} roomId The room id
 * @param {Object} user The user who joined
 */
function emitUserJoined(roomId, user) {
  io.to(roomId).emit("userJoined", JSON.stringify(user));
}

/**
 * Emits a message containing the users object which was removed from the room
 * @param {string} roomId room Id
 * @param {object} user User who left
 */
function emitUserLeft(roomId, user) {
  io.to(roomId).emit("userLeft", JSON.stringify(user));
}

function emitMessage(message, roomId, user) {
  io.to(roomId).emit(message, JSON.stringify(user));
}

async function initializeGame(data) {
  const parsedData = JSON.parse(data);

  const { roomId } = parsedData;
  const room = getRoom(roomId);
  
  if (room === undefined) return;
  
  // Mark the room as unjoinable
  room.isJoinable = false;

  // Generate a deck
  const deckId = await getNewDeck();

  const updatedUsersGameState = [];
  const cards = await drawCards(2, deckId);

  if (cards[0].value == 11 && cards[1].value == 11) {
    cards[1].value = 1;
  }

  // Deal 2 cards to each user
  for (const [i, u] of parsedData.users.entries()) {
    const cards = await drawCards(2, deckId);

    // Player drew 2 aces, second ace should have a value of 1
    if (cards[0].value == 11 && cards[1].value == 11) {
      cards[1].value = 1;
    }

    updatedUsersGameState.push({
      userId: u.userId,
      roomId: u.roomId,
      name: u.name,
      isBust: false,
      isTurn: i == 0 ? true : false,
      isStand: false,
      cards,
    });
  }
  const dealer = {
    roomId,
    isBust: false,
    isTurn: false,
    cards,
  };

  room.dealer = dealer;
  room.users = updatedUsersGameState;
  
  emitUpdatedGameState("updatedGameState", roomId, updatedUsersGameState);
  emitUpdatedGameState("dealerCards", roomId, dealer);
  emitUserTurnMessage(roomId, updatedUsersGameState[0].name);

  io.to(roomId).emit("gameStart");
}

async function onHit(player) {
  const parsedPlayer = JSON.parse(player);
  const players = parsedPlayer.players;

  if (parsedPlayer.handValue < TWENTY_ONE) {
    const card = await drawCards(1, parsedPlayer.deckId);
    const playerIndex = players.findIndex((p) => p.userId === parsedPlayer.user.userId);

    if (
      card[0].value == 11 &&
      parsedPlayer.handValue + card[0].value > TWENTY_ONE
    ) {
      card[0].value = 1;
    }

    if (card[0].value + parsedPlayer.handValue == TWENTY_ONE) {
      parsedPlayer.isWinner = true;
      parsedPlayer.user.isTurn = false;

      if (players[playerIndex + 1] !== undefined) {
        players[playerIndex + 1].isTurn = true;
      }

      updateRoomState(parsedPlayer.user, players);
    } else if (card[0].value + parsedPlayer.handValue > TWENTY_ONE) {
      parsedPlayer.user.isBust = true;
      parsedPlayer.user.isTurn = false;

      if (players[playerIndex + 1] !== undefined) {
        players[playerIndex + 1].isTurn = true;
      }

      updateRoomState(parsedPlayer.user, players);
    }
    parsedPlayer.user.cards.push(card[0]);
  } else {
    parsedPlayer.user.isBust = true;
    parsedPlayer.user.isTurn = false;

    if (players[playerIndex + 1] !== undefined) {
      players[playerIndex + 1].isTurn = true;
    }

    updateRoomState(parsedPlayer.user, players);
  }

  updateRoomState(parsedPlayer.user, players);
  return parsedPlayer;
}

async function onDealersTurn(currentDealer) {
  let dealer = currentDealer;
  let handValue = 0;
  
  for (let card of dealer.cards) {
    handValue += parseInt(card.value);
  }

  while (handValue < DEALER_CARD_LIMIT) {
    const card = await drawCards(1, dealer.cards[0].deckId);

    if (!card) {
      return;
    }

    if (card[0].value == 11 && handValue + card[0].value > TWENTY_ONE) {
      card[0].value = 1;
    }

    dealer.cards.push(card[0]);
    handValue = 0;

    for (let card of dealer.cards) {
      handValue += parseInt(card.value);
    }

    io.to(dealer.roomId).emit("dealerDrawCard", JSON.stringify(dealer));
  }

  // Dealer busts, everyone who has not busted wins
  if (handValue > 21) {
    // Send winner list
    const winningPlayers = getWinners(dealer.roomId, handValue);
    io.to(dealer.roomId).emit("dealerBust");
    io.to(dealer.roomId).emit("winners", JSON.stringify(winningPlayers));
    return;
  }

  // Send winner list (anyone who has a hand greater than the dealer = winner)
  const winningPlayers = getWinners(dealer.roomId, handValue);
  io.to(dealer.roomId).emit("winners", JSON.stringify(winningPlayers));  
}

function updateRoomState(currentPlayer, players) {
  for (let p of players) {
    if (p.userId == currentPlayer.userId) {
      p.cards = currentPlayer.cards;
      p.isBust = currentPlayer.isBust;
      p.isTurn = currentPlayer.isTurn;
      break;
    }
  }

  getRoom(currentPlayer.roomId).users = players;
}

function updateTurn(currentPlayer, players, isBusted = false) {
  const index = players.findIndex((p) => p.userId === currentPlayer.userId);
  const dealer = getRoom(currentPlayer.roomId).dealer;

  if (currentPlayer.isStand || isBusted || currentPlayer.isBust) {
    players[index].isTurn = false;

    if (players[index + 1] !== undefined) {
      players[index + 1].isTurn = true;
      emitUserTurnMessage(currentPlayer.roomId, players[index + 1].name);
    }

    if (!checkIsTurnLeft(currentPlayer, players)) {
      // No more players, dealers turn
      emitUpdatedGameState("updatedGameState", currentPlayer.roomId, players);
      emitUserTurnMessage(currentPlayer.roomId, "DEALER");
      onDealersTurn(dealer);
      return;
    }
  }

  if (!checkIsTurnLeft(currentPlayer, players)) {
    // No more players, dealers turn
    emitUpdatedGameState("updatedGameState", currentPlayer.roomId, players);
    emitUserTurnMessage(currentPlayer.roomId, "DEALER");
    onDealersTurn(dealer);
    return ;
  }

  if (isBusted && players[index + 1] !== undefined) {
    players[index + 1].isTurn = true;
  }
  
  emitUpdatedGameState("updatedGameState", currentPlayer.roomId, players);
}

//#endregion

//#region EVENT EMITTERS RELATED TO GAME STATE
function emitUpdatedGameState(event, roomId, currentGameState) {
  io.to(roomId).emit(event, JSON.stringify(currentGameState));
}

function checkIsTurnLeft(currentPlayer, players){
  return players.some((p) => p.isTurn);
}

function emitUserTurnMessage(roomId, name) {
  io.to(roomId).emit("nextUserTurnMessage", JSON.stringify({ name }));
}
//#endregion

function calculateHandValue(cards) {
  let handValue = 0;

  for (let card of cards) {
    handValue += parseInt(card.value);
  }

  return handValue;
}

function getWinners(roomId, dealerHandValue) {
  const room = getRoom(roomId);
  const players = room.users;

  const winningPlayers = [];

  // Get all players who are not busted (isBust = false)
  if (dealerHandValue > 21) {
    players.forEach(p => {
      if (!p.isBust) {
        winningPlayers.push(p);
      }
    });

    return winningPlayers;
  }

  players.forEach(p => {
    if (!p.isBust) {
      let playerHandValue = calculateHandValue(p.cards);
  
      if (playerHandValue >= dealerHandValue) {
        winningPlayers.push(p);
      }
    }
  });

  return winningPlayers;
}

server.listen(PORT, () =>
  console.log(`Server is running on ${PORT}\nNetwork: http://:${PORT}`),
);
