package com.testGame.gameAPI;

import java.util.Map;

/*
representation of a card from a standard deck which contains
a number: 2-10, ace, king, queen, jack.
and one of four suits: spades, clubs, hearts, and diamonds.

responsiblities: getters for number, and suit of a card,
getter for the "value" of the card(for example the value of a jack is 10)
 */
public class GameCard {
    private String suit;
    private String value;
    private String image;

    public GameCard(Map<String, Object> cardData) {
        this.suit = (String) cardData.get("suit");
        this.value = (String) cardData.get("value");
        this.image = (String) cardData.get("image");
    }

    public String getSuit() {
        return suit;
    }

    public String getValue() {
        return value;
    }

    public String getImage() {
        return image;
    }
    /*
    returns the int value based on the face of a card 2-10 for the cards 2-10, and 10 for
    jack and above. returns 1 for ace.
     */

    public int getValueAmount() {
        try {
            int numericValue = Integer.parseInt(value);
            if (numericValue >= 2 && numericValue <= 10) {
                return numericValue;
            }
        } catch (NumberFormatException e){
            //not numeric
        }
        if("ACE".equals(value)) {
            return 1;
        }
        return 10;
    }

    public Boolean isAce() {
        return "ACE".equals(value);
    }


    /*
    returns a string representation of the card, face then suit seperated by a space.
     */
    /*@Override
    public String toString() {
        return faceString() + " " + suitString();
    }

    @Override
    public boolean equals(Object other) {
        if (other instanceof GameCard otherCard) {
            return(this.suit == otherCard.suit && this.face == otherCard.face);
        } else {
            return false;
        }
    }*/
}
