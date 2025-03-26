import React from 'react';

const CardsDisplay = ({
    cardsDealt,
    cards,
    dealerScore,
    dealerBust,
    showDealerCards,
    gameStarted,
    roundOver,
    hit,
    stand,
    doubleUp,
    split,
    activeHand,
    playerData,
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
      
    {/* Player's Hands */}
    <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "40px", margin: "20px 0" }}>
    {Object.entries(playerData).map(([playerId, player]) => (
    <div 
      key={playerId} 
      style={{ 
        textAlign: "center", 
        border: player.active ? "2px solid gold" : "none", 
        padding: "10px", 
        borderRadius: "5px", 
        width: "auto"
      }} 
    >
      <h3>
        {playerId == activeHand && <span style={{ color: 'green' }}>In Play </span>}
        (Score: {player.playerScore}) {player.playerBust && <span style={{ color: 'red' }}>Bust!</span>}
        {player.playerWin && <span style={{ color: 'green' }}>Player Won {player.payout}</span>} 
        {player.dealerWin && <span style={{ color: 'red' }}>Dealer Won {player.payout}</span>} 
        {player.tie && <span style={{ color: 'blue' }}>Push {player.payout}</span>}
      </h3>
      <div style={{ display: "flex", justifyContent: "center", gap: "5px" }}>
        {player.playerCards && player.playerCards.length > 0 ? (
          player.playerCards.map((card, index) => (
            <img key={index} src={card.image} alt="Card" style={{ width: "100px", margin: "5px" }} />
          ))
        ) : (
          <p>Cards Not Found.</p>
        )}
      </div>
    </div>
  ))}
</div>

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

          {playerData[activeHand]?.canDouble && (
            <button
                onClick={doubleUp}
                style={{ padding: "10px", margin: "10px", backgroundColor: "#3643F4", color: "white" }}
            >
                Double
            </button>
          )}

          {playerData[activeHand]?.canSplit && (
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