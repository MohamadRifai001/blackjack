import React, { useState } from "react";

const GameInfoPanel = ({ balance, betAmount }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(true); // Start open by default

  return (
    <>
      {/* Toggle Button (stays visible) */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        style={{
          position: "fixed",
          left: isMenuOpen ? "250px" : "0", // Moves with the menu
          top: "10px",
          zIndex: 1000,
          background: "#4CAF50",
          color: "white",
          border: "none",
          padding: "10px 15px",
          cursor: "pointer",
          borderRadius: "0 5px 5px 0",
          transition: "left 0.3s ease",
        }}
      >
        {isMenuOpen ? "◄" : "►"}
      </button>

      {/* Collapsible Menu Panel */}
      <div
        style={{
          position: "fixed",
          left: isMenuOpen ? "0" : "-250px", // Slides in/out
          top: "0",
          width: "250px",
          height: "100vh",
          background: "#2c3e50",
          color: "white",
          padding: "20px",
          boxShadow: "2px 0 10px rgba(0,0,0,0.2)",
          transition: "left 0.3s ease",
          zIndex: 999,
        }}
      >
        <h2 style={{ borderBottom: "1px solid #fff", paddingBottom: "10px" }}>
          Balance: {balance}
        </h2>
        <h2 style={{ borderBottom: "1px solid #fff", paddingBottom: "10px" }}>
          Bet: {betAmount}
        </h2>
      </div>
    </>
  );
};

export default GameInfoPanel;