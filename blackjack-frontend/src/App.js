//import logo from './logo.svg';
import './App.css';
import { useState, useEffect } from "react";
import axios from "axios";



function App() {
  const [message, setMessage] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [cardsDealt, setCardsDealt] = useState(false);
  const [cards, setCards] = useState({
    dealer: { hiddenCard: {}, visibleCard: {}, cards: []},
    player: { cards: []}
  });
  const [roundOver, setRoundOver] = useState(false);
  const [playerScore, setPlayerScore] = useState(0);
  const [dealerScore, setDealerScore] = useState(0);
  const [playerBust, setPlayerBust] = useState(false);
  const [dealerBust, setDealerBust] = useState(false);
  const [showDealerCards, setShowDealerCards] = useState(false);
  const [playerWin, setPlayerWin] = useState(false);
  const [dealerWin, setDealerWin] = useState(false);
  const [tie, setTie] = useState(false);

  const startGame = () => {

    axios.get("http://localhost:8080/api/game/start")
        .then(response => {
          setMessage(response.data);
          setGameStarted(true);
          //fetchCard();
          fetchDeck();
        })
        .catch(error => console.error(error));
  }

  const fetchDeck = () => {
    axios.get("https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=8")
      .then(response => {
        const newDeckId = response.data.deck_id;
        //console.log("New Deck ID:", newDeckId)
        sendDeckToBackend(newDeckId);
      })
      .catch(error => console.error("Error fetching deck: ", error));
  }

  const sendDeckToBackend = (deckId) => {
    axios.post("http://localhost:8080/api/game/setDeck", {deck_id: deckId}, 
      { headers: { "Content-Type" : "application/json" }}
    )
    .then(response => console.log("Backend Reponse:", response.data))
    .catch(error => console.error("Error sending deck: ", error))
  }
  const clearPastRound = () => {
    setCardsDealt(true);
    setRoundOver(false);
    setPlayerBust(false);
    setDealerBust(false);
    setPlayerWin(false);
    setDealerWin(false);
    setTie(false);
    setShowDealerCards(false);
  }

  const drawCards = () => {
    axios.get("http://localhost:8080/api/game/draw")
        .then(response => {
            //console.log("Drawn Cards:", response.data);
            setCards(response.data.gameData); // Update to store the gameData properly
            setPlayerScore(response.data.gameData.player.score);
            setDealerScore(response.data.gameData.dealer.score);
            clearPastRound()
        })
        .catch(error => console.error("Error drawing cards:", error));
  }

  const hit = () => {
    axios.get("http://localhost:8080/api/game/hit") // Fetch one card
        .then(response => {
            console.log("Hit Card:", response.data);
            
            if (!response.data.newCard) {
                console.error("Invalid API response:", response.data);
                return;
            }

            setCards(prevCards => ({
              ...prevCards,
              player: {
                  ...prevCards.player,
                  cards: prevCards.player?.cards ? [...prevCards.player.cards, response.data.newCard] : [response.data.newCard]
              }
          }));
            setPlayerScore(response.data.playerScore);
            setPlayerBust(response.data.playerBust);
            if(response.data.roundOver) {
              stand()
            }
        })
        .catch(error => console.error("Error hitting:", error));
};


  const stand = () => {
    axios.get("http://localhost:8080/api/game/revealDealer")
    .then(response => {
      console.log("Dealer's revealed Card:", response.data);
      setCards(prevCards => ({
        ...prevCards,
        dealer: {
            ...prevCards.dealer,
            hiddenCard: response.data.hiddenCard // Update to show actual card
        }
    }));
      setDealerScore(response.data.dealerScore);
      if(!response.data.playerBust) {
        dealerTurn()
      } else {
        setDealerWin(true);
      }
      setShowDealerCards(true);
      setRoundOver(true);
    })
    .catch(error => console.error("Error revealing the dealer's card:", error))

  }

  const dealerTurn = () => {
    axios.get("http://localhost:8080/api/game/dealerTurn")
      .then(response => {
        console.log("Dealer has taken his turn:", response.data);
        setCards(prevCards => ({
          ...prevCards,
          dealer: {
            ...prevCards.dealer,
            cards: [...(prevCards.dealer.cards || []), ...response.data.newCards]
          }
        }));
        setDealerScore(response.data.dealerScore);

        setPlayerWin(response.data.gameResults.playerWin);
        setDealerWin(response.data.gameResults.dealerWin);
        setTie(response.data.gameResults.tie);

      })
      .catch(error => console.error("Error during dealers turn"))
  }

  /*const fetchCard = () => {
    axios.get("http://localhost:8080/api/game/card")
      .then(response => setCard(response.data))
      .catch(error => console.error(error))
  }*/

      return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            {!gameStarted && <h1>Blackjack Game</h1>}
            
            {!gameStarted && (
                <button
                    onClick={startGame}
                    style={{
                        padding: "10px 20px",
                        fontSize: "16px",
                        cursor: "pointer",
                        backgroundColor: "#4CAF50",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        marginTop: "20px"
                    }}
                >
                    Start Game
                </button>
            )}

            {gameStarted && !cardsDealt && !roundOver && (
              <button 
              onClick={drawCards} 
              style={{ padding: "10px", margin: "10px", backgroundColor: "#4CAF50", color: "white" }}>
              Deal Cards
              </button>
            )}

            {roundOver && (
              <button 
              onClick={drawCards} 
              style={{ padding: "10px", margin: "10px", backgroundColor: "#4CAF50", color: "white" }}>
              Deal Cards
              </button>
            )}

            {playerWin && <h2><span style={{ color: 'green' }}>Player Win</span></h2>}
            {dealerWin && <h2><span style={{ color: 'red' }}>Dealer Win</span></h2>}
            {tie && <h2><span style={{ color: 'blue' }}>Tie</span></h2>}

            {cardsDealt && cards && (
              <div>
                <h2>Dealer's Hand (Score: {dealerScore})</h2>
                <div style={{ display: "flex", justifyContent: "center" }}>
                {/* Dealer's Hidden Card */}

                <img 
                  src={showDealerCards ? cards.dealer.hiddenCardActual.image : cards.dealer.hiddenCard.image} 
                  alt="Hidden Card" 
                  style={{ width: "100px", margin: "5px" }} 
                  />

                <img src={cards.dealer.visibleCard.image} alt="Dealer's Card" style={{ width: "100px", margin: "5px" }} />
                
                {cards.dealer?.cards && Array.isArray(cards.dealer.cards) ? (
                cards.dealer.cards.map((card, index) => (
                    <img key={index} src={card.image} alt="Dealer's Card" style={{ width: "100px", margin: "5px" }} />
                ))
                ) : (
                <p></p>
                )}

              </div>
                       
                <h2>Your Hand (Score: {playerScore}) {playerBust && <span style={{ color: 'red' }}>Bust!</span>}</h2>
                <div style={{ display: "flex", justifyContent: "center" }}>
                {cards.player?.cards && Array.isArray(cards.player.cards) ? (
                cards.player.cards.map((card, index) => (
                    <img key={index} src={card.image} alt="Player's Card" style={{ width: "100px", margin: "5px" }} />
                ))
                ) : (
                <p>No cards drawn yet.</p>
                )}
              </div>

        {gameStarted && cardsDealt && !roundOver && (
            <div>
              <button 
                onClick={hit} 
                style={{ padding: "10px", margin: "10px", backgroundColor: "#2196F3", color: "white" }}>
                Hit
              </button>
              <button 
              onClick={stand} 
              style={{ padding: "10px", margin: "10px", backgroundColor: "#F44336", color: "white" }}>
              Stand
            </button>
          </div>
)}
    </div>
)}

        </div>
    );

}
export default App;

/* {card && (
          <div style={{ marginTop: "20px"}}>
            <p style={{ fontSize: "18px" }}>{card.rank} of {card.suit}</p>
            <img src={card.imageUrl} alt={`${card.rank} of ${card.suit}`} style={{ width: "150px", height: "auto" }} />
          </div>
        )} 
          */

/*function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}*/
