package com.testGame.gameAPI;

import java.util.ArrayList;
import java.util.List;

public class PlayerHand {
    private boolean handOver;
    private int bet;
    private List<GameCard> cards = new ArrayList<>();

    public PlayerHand(boolean handOver, int bet, List<GameCard> cards) {
        this.handOver = handOver;
        this.cards = cards;
        this.bet = bet;
    }

    //getters
    public boolean getHandOver() {
        return handOver;
    }
    public List<GameCard> getCards() {
        return cards;
    }
    public int getBet() {
        return bet;
    }

    //setters
    public void setCards(List<GameCard> cards) {
        this.cards = cards;
    }
    public void setHandOver(boolean handOver) {
        this.handOver = handOver;
    }
    public void setBet(int bet) {
        this.bet = bet;
    }

}
