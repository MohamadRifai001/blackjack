//import logo from './logo.svg';
import './App.css';
import { useState, useEffect } from "react";
import axios from "axios";
import GameInfoPanel from './components/GameInfoPanel';
import CardsDisplay from './components/CardsDisplay';



function App() {
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
  const [betInput, setBetInput] = useState('');
  const [betAmount, setBetAmount] = useState(0);
  const [betDisplay, setBetDisplay] = useState(false);
  const [balance, setBalance] = useState(0);
  const [canSplit, setCanSplit] = useState(false);
  const [splitHands, setSplitHands] = useState(null);
  const [activeHand, setActiveHand] = useState(null);

  const startGame = () => {

    axios.get("http://localhost:8080/api/game/start")
        .then(response => {
          setBalance(response.data.balance)
          setGameStarted(true);
          setBetDisplay(true);
          setBetAmount(0);
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
    setBetDisplay(false);
    setCardsDealt(true);
    setRoundOver(false);
    setPlayerBust(false);
    setDealerBust(false);
    setPlayerWin(false);
    setDealerWin(false);
    setTie(false);
    setShowDealerCards(false);
    setCanSplit(false);
    setSplitHands(false);
    setActiveHand(null);
  }

  const getCardNumericValue = (card) => {
    if (["KING", "QUEEN", "JACK"].includes(card.value)) return 10;
    if (card.value === "ACE") return 1; 
    return parseInt(card.value, 10);
  };

  const drawCards = (betAmount) => {
    axios.get(`http://localhost:8080/api/game/draw?bet=${betAmount}`)
        .then(response => {
            //console.log("Drawn Cards:", response.data);
            setCards(response.data.gameData); // Update to store the gameData properly
            clearPastRound();
            setPlayerScore(response.data.gameData.player.score);
            setDealerScore(response.data.gameData.dealer.score);
            setBalance(response.data.gameData.player.balance);
            if(response.data.gameData.player.score == 21) {
              playerBlackjack();
            }
            //console.log("length:", response.data.gameData.player.cards.length);
            //console.log("card1:", getCardNumericValue(response.data.gameData.player.cards[0]));
            //console.log("card2:", getCardNumericValue(response.data.gameData.player.cards[1]));
            if (
              response.data.gameData.player.cards.length === 2 &&
              getCardNumericValue(response.data.gameData.player.cards[0]) 
              === getCardNumericValue(response.data.gameData.player.cards[1])
            ) {
              //console.log("canSplit:", true);
              setCanSplit(true); // Set state to show split button
            } else {
              setCanSplit(false);
            }
        })
        .catch(error => console.error("Error drawing cards:", error));
  }

  const hit = () => {
    if (activeHand) {
      // Handle split hand hit
      axios.get(`http://localhost:8080/api/game/hitSplit?hand=${activeHand}`)
        .then(response => {
          const updatedHands = {...splitHands};
          updatedHands[activeHand].cards.push(response.data.newCard);
          updatedHands[activeHand].score = response.data.score;
          
          setSplitHands(updatedHands);
          setActiveHand(response.data.activeHand);
          
          if (response.data.roundOver) {
            stand();
          }
        })
        .catch(error => console.error("Error hitting split hand:", error));
    } else {
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
    }
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
      setBetDisplay(true);
      setBetAmount(0);
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
        setDealerBust(response.data.dealerBust);
        setPlayerWin(response.data.playerWin);
        setDealerWin(response.data.dealerWin);
        setTie(response.data.tie);
        setBalance(response.data.balance);
      })
      .catch(error => console.error("Error during dealers turn"))
  }

  const playerBlackjack = () => {
    axios.get("http://localhost:8080/api/game/playerBlackjack")
    .then(response => {
      console.log("Dealer's revealed Card:", response.data);
      setCards(prevCards => ({
        ...prevCards,
        dealer: {
            ...prevCards.dealer,
            hiddenCard: response.data.hiddenCard
        }
    }));
      setBetDisplay(true);
      setBetAmount(0);
      setDealerScore(response.data.dealerScore);
      setPlayerWin(true);
      setShowDealerCards(true);
      setRoundOver(true);
      setBalance(response.data.newBalance);
    })
  }
  const handleBetChange = (e) => {
    const value = e.target.value.trim(); // Remove whitespace
    if (value === "" || !isNaN(value)) { // Only update if empty or valid number
      setBetInput(value);
    }
  };

  const handleBet = () => {
    const trimmedInput = betInput.trim();
    if (!trimmedInput) {
      alert("Please enter a bet amount.");
      return;
    }
  
    const parsedBetAmount = parseInt(trimmedInput, 10);
    if (!isNaN(parsedBetAmount) && parsedBetAmount > 0 && parsedBetAmount <= balance) {
      setBetAmount(parsedBetAmount);
      drawCards(parsedBetAmount);
    } else {
      alert("Please enter a valid positive number.(or you don't have enough money)");
      console.log("Current betInput:", betInput); // Debugging
    }
  };

  const split = () => {
    axios.get("http://localhost:8080/api/game/split")
      .then(response => {
        console.log("Split Result:", response.data);
        setSplitHands(response.data.splitData); 
        setActiveHand(response.data.splitData.activeHand);
        setCanSplit(false); 
        setCards({
          dealer: cards.dealer,
          player: { cards: [] }
        });
      })
      .catch(error => console.error("Error splitting:", error));
  };


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

      {betDisplay && (
        <div>
          {/* Textbox for user input */}
          <input
          type="number"
          min="1"
          placeholder="Enter bet amount"
          style={{
          padding: "10px",
          fontSize: "16px",
          border: "2px solid #4CAF50",
          borderRadius: "5px",
          marginTop: "20px",
          width: "200px"
          }}
          onChange={handleBetChange}
          value={betInput}
          />
          <button
            onClick={handleBet}  // ✅ Fixed: No parentheses here!
            style={{ 
            padding: "10px", 
            margin: "10px", 
            width: "100px", 
            backgroundColor: "#4CAF50", 
            color: "white" 
          }}
        >
        Deal Cards
        </button>
      </div>
      )}


      {playerWin && <h2><span style={{ color: 'green' }}>Player Win</span></h2>}
      {dealerWin && <h2><span style={{ color: 'red' }}>Dealer Win</span></h2>}
      {tie && <h2><span style={{ color: 'blue' }}>Tie</span></h2>}

      <CardsDisplay 
      cardsDealt={cardsDealt}
      cards={cards}
      dealerScore={dealerScore}
      dealerBust={dealerBust}
      showDealerCards={showDealerCards}
      playerScore={playerScore}
      playerBust={playerBust}
      gameStarted={gameStarted}
      roundOver={roundOver}
      canSplit={canSplit}
      hit={hit}
      stand={stand}
      split={split}
      splitHands={splitHands}
      activeHand={activeHand}
    />

      <GameInfoPanel balance={balance} betAmount={betAmount} />
    </div>
  );

}
export default App;

