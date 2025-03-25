import React from 'react';

const CardsDisplay = ({
  cardsDealt,
  cards,
  dealerScore,
  dealerBust,
  showDealerCards,
  playerScore,
  playerBust,
  gameStarted,
  roundOver,
  canSplit,
  hit,
  stand,
  split,
  splitHands,
  activeHand
}) => {
  if (!cardsDealt || !cards) return null;

  return (
    <div>
      {/* Dealer's Hand */}
      <h2>Dealer's Hand (Score: {dealerScore}) {dealerBust && <span style={{ color: 'red' }}>Bust!</span>}</h2>
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
      
      {/* Player's Hand(s) */}
      {splitHands ? (
        <div style={{ display: "flex", justifyContent: "center", gap: "40px", margin: "20px 0" }}>
          <div 
            style={{ 
              textAlign: "center",
              border: activeHand === 'hand1' ? '2px solid gold' : 'none',
              padding: '10px',
              borderRadius: '5px'
            }}
          >
            <h3>Hand 1 (Score: {splitHands.hand1.score}) {splitHands.hand1.bust && <span style={{ color: 'red' }}>Bust!</span>}</h3>
            <div style={{ display: "flex", justifyContent: "center" }}>
              {splitHands.hand1.cards.map((card, index) => (
                <img key={index} src={card.image} alt="Card" style={{ width: "100px", margin: "5px" }} />
              ))}
            </div>
          </div>

          <div 
            style={{ 
              textAlign: "center",
              border: activeHand === 'hand2' ? '2px solid gold' : 'none',
              padding: '10px',
              borderRadius: '5px'
            }}
          >
            <h3>Hand 2 (Score: {splitHands.hand2.score}) {splitHands.hand2.bust && <span style={{ color: 'red' }}>Bust!</span>}</h3>
            <div style={{ display: "flex", justifyContent: "center" }}>
              {splitHands.hand2.cards.map((card, index) => (
                <img key={index} src={card.image} alt="Card" style={{ width: "100px", margin: "5px" }} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
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
        </div>
      )}

      {/* Game Controls */}
      {gameStarted && cardsDealt && !roundOver && (
        <div>
          <button 
            onClick={hit} 
            style={{ padding: "10px", margin: "10px", backgroundColor: "#2196F3", color: "white" }}
          >
            Hit
          </button>
          <button 
            onClick={stand} 
            style={{ padding: "10px", margin: "10px", backgroundColor: "#F44336", color: "white" }}
          >
            Stand
          </button>
          {canSplit && !splitHands && (
            <button 
              onClick={split} 
              style={{ padding: "10px", margin: "10px", backgroundColor: "#FF9800", color: "white" }}
            >
              Split
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CardsDisplay;