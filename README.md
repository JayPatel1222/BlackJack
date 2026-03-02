## Running the App
IDEs used: **Visual Studio Code**

1) Open the console and cd into the `server` directory and run `npm install`.
2) Run `npm start` (inside of the `server` directory) to start the server.

## Business Rules:
Minimum 1 players in a room to start a game with a maximum of 4 players per room / table.
- The user must provide a username before they can join a room

Joining a game
- Joining a game will attempt to put the player in any table that is available
- If there are no available tables, it will create a new table and put the player there

Starting a game
- Any player can start the game as long as there is at least 1 player in the room
- Each player is dealt 2 cards
- The first player in the lobby plays first with the dealer playing last

Each player will play until they either bust (hand value > 21) or decide to stand. 

Once all players have had their turn, the dealer will play.
- The dealer must hit until their hand value is 17 or greater

If the dealer busts, any player who has not busted wins.
- Otherwise players with a hand greater than or equal to the dealers is considered a winner

Any action related to the game will be logged as a message for all the other players to see. Actions include:
- Joining a room
- Leaving a room
- Hitting
- Standing
- Bust
- Winning 

## Blackjack Rules
-	Jack, King and Queen have values of 10
-	Ace has a value of 11 unless 11 puts the player’s hand value above 21, in this case the value of the ace would be 1
-	Hit will deal the player a new card
-	Stand will end the players turn
-   The dealer plays once all players have had their turn and must hit until their hand is 17 or greater
-   If the dealer busts, any player who has not busted wins.
-   If the dealer does not bust, players with a hand greater than or equal to the dealers hand is considered a winner.


## Tech Stack
- Angular 20
- Node
- Express
- Socket IO
- JavaScript + TypeScript
- Nanoid
- Bootstrap