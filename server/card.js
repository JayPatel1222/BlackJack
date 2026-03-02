const CARD_API_URL = 'https://deckofcardsapi.com/api';

/**
 * Calls the Card Deck API to get a single shuffled deck of cards.
 * @returns Returns the Deck ID. Request failure returns null.
 */
export async function getNewDeck() {
  try {
    const res = await fetch(`${CARD_API_URL}/deck/new/shuffle/?deck_count=1`);
  
    const data = await res.json();
  
    if (!data.success) {
      return null;
    }
  
    return data.deck_id;
  } catch (e) {
    console.log(`Unexpected Error: ${e}`);
    return null;
  }
}

/**
 * Calls the Card Deck API to draw `count` number of cards from the specified deck.
 * @param {number} count The number of cards to draw. 
 * @param {string} deckId The deck ID to draw the cards from. 
 * @returns Returns an array containing the cards drawn. Request failures return null.
 */
export async function drawCards(count, deckId) {
  try {
    const res = await fetch(`${CARD_API_URL}/deck/${deckId}/draw/?count=${count}`);

    const data = await res.json();

    if (!data.success) {
      return null;
    }

    // Map the value of QUEEN, KING, JACK to 10 and ACE to 11
    data.cards.forEach(c => {
      switch (c.value) {
        case "KING":
        case "QUEEN":
        case "JACK":
          c.value = '10';
          break;
        case "ACE":
          c.value = '11'
      }
    });

    const cards = data.cards.map(c => ({
      value: parseInt(c.value),
      img: c.images.png,
      deckId
    }));

    return cards;
  } catch (e) {
    console.log(`Unexpected Error: ${e}`);
    return null;
  }
}