import { useState, useEffect, act } from "react";
import axios from "axios";
import GameInfoPanel from './components/GameInfoPanel';
import CardsDisplay from './components/CardsDisplay';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [cardsDealt, setCardsDealt] = useState(false);

  const [cards, setCards] = useState({
    dealer: { hiddenCard: {}, visibleCard: {}, cards: []},
  });
  const [playerData, setPlayerData] = useState({
    player1: {
      playerScore: 0,
      playerBust: false,
      canSplit: false,
      playerCards: [],
      playerWin: false,
      dealerWin: false,
      tie: false,
      canDouble: false,
      payout: 0,
    },
  });

  const [roundOver, setRoundOver] = useState(false);
  const [dealerScore, setDealerScore] = useState(0);
  const [dealerBust, setDealerBust] = useState(false);
  const [showDealerCards, setShowDealerCards] = useState(false);
  const [betInput, setBetInput] = useState('');
  const [betAmount, setBetAmount] = useState(0);
  const [betDisplay, setBetDisplay] = useState(false);
  const [balance, setBalance] = useState(0);
  const [activeHand, setActiveHand] = useState("player1");

  const startGame = () => {
    axios.get("http://localhost:8080/api/game/start")
      .then(response => {
        setBalance(response.data.balance);
        setGameStarted(true);
        setBetDisplay(true);
      })
      .catch(error => console.error(error));
  }

  const clearPastRound = () => {
    setActiveHand("player1");
    setBetDisplay(false);
    setCardsDealt(true);
    setRoundOver(false);
    setDealerBust(false);
    setShowDealerCards(false);
  }

  const drawCards = (betAmount) => {
    axios.get(`http://localhost:8080/api/game/draw?bet=${betAmount}`)
        .then(response => {
            clearPastRound();
            setPlayerData(response.data.playerData);
            setCards(response.data.dealerData);
            setDealerScore(response.data.dealerData.dealer.score);
            setBalance(response.data.balance);
            if(response.data.blackjackFound) {
              handleBlackjack();
            }
        })
        .catch(error => console.error("Error drawing cards:", error));
  }

  const handleBlackjack = () => {
    axios.get("http://localhost:8080/api/game/blackjack")
      .then(response => {
        if(response.data.tie) {
          updatePlayerData("player1", "tie", true);
          setDealerScore(21);
        } 
        else if(response.data.dealerBlackjack) {
          updatePlayerData("player1", "dealerWin", true);
          setDealerScore(21);
        }
        else if(response.data.playerBlackjack) {
          updatePlayerData("player1", "playerWin", true);
          updatePlayerData("player1", "playerScore", 21);
        }
        setRoundOver(true);
        setShowDealerCards(true);
        setBetDisplay(true);
        updatePlayerData("player1", "payout", response.data.payout);
        setBalance(response.data.balance);
      })
  }

  const hit = () => {
    axios.get(`http://localhost:8080/api/game/hit?handName=${activeHand}`)
      .then(response => {
        const newCard = response.data.newCard;
        addCardToPlayer(activeHand, newCard)
        updatePlayerData(activeHand, "playerScore", response.data.playerScore);
        updatePlayerData(activeHand, "playerBust", response.data.playerBust);
        updatePlayerData(activeHand, "canSplit", false);
        updatePlayerData(activeHand, "canDouble", false);
        if(response.data.handOver && !response.data.roundOver) {
          nextHand();
        } else if (response.data.roundOver) {
          stand();
        }
      })
      .catch(error => console.error("Error hitting:", error));
  }

  const stand = () => {
    axios.get(`http://localhost:8080/api/game/stand?handName=${activeHand}`)
      .then(response => {
        if (response.data.roundOver) {
          dealerTurn();
        } 
        else {
          nextHand();
        }
      })
      .catch(error => console.error("Error standing:", error));
  }

  const dealerTurn = () => {
    axios.get("http://localhost:8080/api/game/dealerTurn")
      .then(response => {
        setCards(prevCards => ({
          ...prevCards,
          dealer: {
            ...prevCards.dealer,
            cards: response.data.dealerHand
          }
        }));
        setDealerScore(response.data.dealerScore);
        setShowDealerCards(true);
        setRoundOver(true);
        setBetDisplay(true);
        
        const results = response.data.results;
        setPlayerData(prev => {
          const newData = {...prev};
          Object.entries(results).forEach(([key, result]) => {
            if (newData[key]) {
              newData[key] = {
                ...newData[key],
                playerWin: result.win,
                dealerWin: result.lose,
                tie: result.tie,
                payout: result.payout,
              };
            }
          });
          return newData;
        });

        setBalance(response.data.balance);
        
      })
      .catch(error => console.error("Error during dealer's turn:", error));
  }

  const split = () => {
    axios.get(`http://localhost:8080/api/game/split?handName=${activeHand}`)
      .then(response => {
        setPlayerData((prevData) => ({
          ...prevData,
          [activeHand]: {
            ...prevData[activeHand],
            playerCards: response.data.originalHandCards,
            playerScore: response.data.originalHandScore,
          },
        }));
        updatePlayerData(activeHand, "canSplit", false);
        setBalance(response.data.balance);
        addHand(response.data.newHandName, response.data.newHandCards, response.data.newHandScore);
      })
      .catch(error => console.error("Error splitting:", error));
  };

  const doubleUp = () => {
    axios.get(`http://localhost:8080/api/game/double?handName=${activeHand}`)
    .then(response => {
      addCardToPlayer(activeHand, response.data.newCard);
      updatePlayerData(activeHand, "playerScore", response.data.playerScore);
      setBalance(response.data.balance);
      if(response.data.handOver && !response.data.roundOver) {
        nextHand();
      } else if (response.data.roundOver) {
        stand();
      }
    })
  }

  const handleBetChange = (e) => {
    const value = e.target.value.trim();
    if (value === "" || !isNaN(value)) {
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


  const nextHand = () => {
    const playerNames = Object.keys(playerData); // Get all player names
    const currentIndex = playerNames.indexOf(activeHand);

    // Check if we're not at the last player
    if (currentIndex < playerNames.length - 1) {
      setActiveHand(playerNames[currentIndex + 1]); // Move to the next player
    }
  };


  const addHand = (handName, handCards, handScore) => {
    // Check if the player already exists
    if (!playerData[handName]) {
      setPlayerData((prevData) => ({
        ...prevData,
        [handName]: {
          playerScore: handScore,
          playerBust: false,
          canSplit: false,
          playerCards: handCards,
          playerWin: false,
          dealerWin: false,
          tie: false,
          canDouble: true,
          payout: 0,
        },
      }));
    }
  };
  const addCardToPlayer = (handName, card) => {
    setPlayerData((prevData) => ({
      ...prevData,
      [handName]: {
        ...prevData[handName],
        playerCards: [...prevData[handName].playerCards, card],
      },
    }));
  };


  const updatePlayerData = (handName, field, value) => {
    setPlayerData((prevData) => ({
      ...prevData,
      [handName]: {
        ...prevData[handName],
        [field]: value
      }
    }))
  }


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
            onClick={handleBet}
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

      <CardsDisplay 
        cardsDealt={cardsDealt}
        cards={cards}
        dealerScore={dealerScore}
        dealerBust={dealerBust}
        showDealerCards={showDealerCards}
        gameStarted={gameStarted}
        roundOver={roundOver}
        hit={hit}
        stand={stand}
        split={split}
        doubleUp={doubleUp}
        activeHand={activeHand}
        playerData={playerData}
      />

      <GameInfoPanel balance={balance} betAmount={betAmount} />
    </div>
  );
}

export default App;