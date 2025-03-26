package com.testGame.gameAPI;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/game")
public class GameController {
    private String deckId;
    private int balance = 0;
    //private int bet  = 0;
    private List<GameCard> dealerHand = new ArrayList<>();
    private Map<String, PlayerHand> hands = new HashMap<>();


    //Game Intialized with /start, creates a stack of cards that is 8 shuffled standard decks.
    @GetMapping("/start")
    public ResponseEntity<Map<String, Integer>> startGame() {

        RestTemplate restTemplate = new RestTemplate();
        Map<String, Object> newDeck = restTemplate.getForObject(
                "https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=8",
                    Map.class);

        if (newDeck != null) { deckId = (String) newDeck.get("deck_id");}

        //temp set balance to 1000 since database to store balance is not functioning atm
        balance = 1000;
        return ResponseEntity.ok(Map.of(
                "balance", balance
        ));
    }



    /*
    Saves the inputted bet amount and
    Start of every ROUND, draws 4 cards from the stack, the 1st and 3rd go to the player(user),
    2cnd and 4th to the dealer.
     */
    @GetMapping("/draw")
    public ResponseEntity<?> drawCards(@RequestParam int bet) {
        if (deckId == null) {
            return ResponseEntity.badRequest().body("No deck ID set. Must generate a deck first.");
        }
        //this.bet = bet;
        balance -= bet;

        ResponseEntity<?> drawResponse = drawCardAndHandleDeck(4, new RestTemplate());
        if(drawResponse.getStatusCode().isError()) { return drawResponse; }

        Map<String, Object> result = (Map<String, Object>) drawResponse.getBody();
        List<Map<String, Object>> drawnCards = (List<Map<String, Object>>) result.get("drawnCards");

        dealerHand.clear();
        hands.clear();

        dealerHand.add(new GameCard(drawnCards.get(1)));
        dealerHand.add(new GameCard(drawnCards.get(3)));

        List<GameCard> playerHand = new ArrayList<>();
        playerHand.add(new GameCard(drawnCards.get(0)));
        playerHand.add(new GameCard(drawnCards.get(2)));

        hands.put("player1", new PlayerHand(false, bet, playerHand));


        boolean blackjackFound = calculateHandValue(dealerHand) == 21 || calculateHandValue(playerHand) == 21;

        boolean canSplit = playerHand.get(0).getValueAmount() == playerHand.get(1).getValueAmount();

        Map<String, Object> playerData = Map.of(
                "player1", Map.of(
                        "playerScore", calculateHandValue(playerHand),
                        "playerBust", false,
                        "canSplit", canSplit,
                        "playerCards", playerHand,
                        "playerWin", false,
                        "dealerWin", false,
                        "tie", false,
                        "canDouble", true,
                        "payout", 0
                )
        );

        Map<String, Object> dealerData = Map.of(
                    "dealer", Map.of(
                            "hiddenCard", Map.of("image", "https://deckofcardsapi.com/static/img/back.png"),
                            "hiddenCardActual", dealerHand.get(0),
                            "visibleCard", dealerHand.get(1),
                            "score", calculateHandValue(List.of(dealerHand.get(1)))
                    )
            );
        return ResponseEntity.ok(Map.of(
                "success", true,
                "playerData", playerData,
                "dealerData", dealerData,
                "blackjackFound", blackjackFound,
                "balance", balance
        ));
    }



    /*
    Blackjack handler, if player or dealer or both have blackjack
     */
    @GetMapping("/blackjack")
    public ResponseEntity<?> blackjackHandler() {
        PlayerHand playerHand = hands.get("player1");
        List<GameCard> playerCards = playerHand.getCards();

        int bet = playerHand.getBet();

        boolean dealerBlackjack = dealerHand.size() == 2 && calculateHandValue(dealerHand) == 21;
        boolean playerBlackjack = playerCards.size() == 2 && calculateHandValue(playerCards) == 21;
        boolean tie = false;

        int payout = 0;

        if(dealerBlackjack && playerBlackjack) {
            tie = true;
            balance += bet;
            payout = bet;
        } else if (playerBlackjack) {
            balance += (bet *5)/2;
            payout = (bet * 5)/2;
        }

        return ResponseEntity.ok(Map.of(
                "dealerBlackjack", dealerBlackjack,
                "playerBlackjack", playerBlackjack,
                "tie", tie,
                "balance", balance,
                "payout", payout
        ));
    }

    /*
    Hit handler, Must recieve the current hand that is in play
     */
    @GetMapping("/hit")
    public ResponseEntity<?> hit(String handName) {
        if (deckId == null) {
            return ResponseEntity.badRequest().body("No deck ID set. Must generate a deck first.");
        }

        ResponseEntity<?> drawResponse = drawCardAndHandleDeck(1, new RestTemplate());
        if(drawResponse.getStatusCode().isError()) { return drawResponse; }

        Map<String, Object> result = (Map<String, Object>) drawResponse.getBody();
        List<Map<String, Object>> drawnCards = (List<Map<String, Object>>) result.get("drawnCards");

        if(drawnCards.isEmpty()) {
            return ResponseEntity.badRequest().body("No cards available.");
        }

        PlayerHand playerHand = hands.get(handName);
        List<GameCard> currentCards = hands.get(handName).getCards();

        currentCards.add(new GameCard(drawnCards.get(0)));
        playerHand.setCards(currentCards);

        int playerScore = calculateHandValue(playerHand.getCards());
        playerHand.setHandOver(playerScore >= 21);

        boolean roundOver = true;

        for(PlayerHand hand: hands.values()) {
            if (!hand.getHandOver()) {
                roundOver = false;
                break;
            }
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "newCard", drawnCards.get(0),
                "playerScore", playerScore,
                "playerBust", playerScore > 21,
                "handOver", playerScore >= 21,
                "roundOver", roundOver
        ));
    }
    /*
    stand handler
     */
    @GetMapping("/stand")
    public ResponseEntity<?> stand(String handName) {

        PlayerHand playerHand = hands.get(handName);
        playerHand.setHandOver(true);
        boolean roundOver = true;

        for(PlayerHand hand: hands.values()) {
            if (!hand.getHandOver()) {
                roundOver = false;
                break;
            }
        }

        return ResponseEntity.ok(Map.of("Success", true, "roundOver", roundOver));
    }

    /*
    split
     */
    @GetMapping("/split")
    public ResponseEntity<?> split(@RequestParam String handName) {
        PlayerHand originalHand = hands.get(handName);
        List<GameCard> originalHandCards = originalHand.getCards();

        // Ensure splitting is allowed (only two cards and they must have the same value)
        if (originalHandCards.size() != 2 ||
                originalHandCards.get(0).getValueAmount() != originalHandCards.get(1).getValueAmount()) {
            return ResponseEntity.badRequest().body("Split not allowed.");
        }

        // Create new hand with the second card of the original hand
        List<GameCard> newHandCards = new ArrayList<>();
        newHandCards.add(originalHandCards.remove(1)); // Remove second card from original hand
        originalHand.setCards(originalHandCards);

        // The player must place another bet equal to the original bet
        balance -= originalHand.getBet();


        // Create a new hand entry
        String newHandName = "player" + (hands.size() + 1);
        hands.put(newHandName, new PlayerHand(false, originalHand.getBet(), newHandCards));

        return ResponseEntity.ok(Map.of(
                "originalHandCards", originalHandCards,
                "originalHandScore", calculateHandValue(originalHandCards),
                "newHandName", newHandName,
                "newHandCards", newHandCards,
                "newHandScore", calculateHandValue(newHandCards),
                "balance", balance // Update balance after split
        ));
    }
    /*
    Double, get 1 extra card, and end the hand, no matter the result.
     */
    @GetMapping("/double")
    public ResponseEntity<?> doubleUp(String handName) {
        ResponseEntity<?> drawResponse = drawCardAndHandleDeck(1, new RestTemplate());
        if(drawResponse.getStatusCode().isError()) { return drawResponse; }

        Map<String, Object> result = (Map<String, Object>) drawResponse.getBody();
        List<Map<String, Object>> drawnCards = (List<Map<String, Object>>) result.get("drawnCards");

        if(drawnCards.isEmpty()) {
            return ResponseEntity.badRequest().body("No cards available.");
        }


        PlayerHand playerHand = hands.get(handName);
        List<GameCard> currentCards = hands.get(handName).getCards();

        currentCards.add(new GameCard(drawnCards.get(0)));
        playerHand.setCards(currentCards);
        balance -= playerHand.getBet();
        playerHand.setBet(playerHand.getBet()*2);

        int playerScore = calculateHandValue(playerHand.getCards());
        playerHand.setHandOver(true);

        boolean roundOver = true;

        for(PlayerHand hand: hands.values()) {
            if (!hand.getHandOver()) {
                roundOver = false;
                break;
            }
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "newCard", drawnCards.get(0),
                "playerScore", playerScore,
                "handOver", true,
                "roundOver", roundOver,
                "balance", balance
        ));

    }

    @GetMapping("/dealerTurn")
    public ResponseEntity<?> dealerTurn() {
        for(PlayerHand hand: hands.values()) {
            if(!hand.getHandOver()) {
                return ResponseEntity.badRequest().body("Not all hands are Over");
            }
        }

        List<GameCard> newCards = new ArrayList<>();
        while(calculateHandValue(dealerHand) < 17) {
            ResponseEntity<?> drawResponse = drawCardAndHandleDeck(1, new RestTemplate());
            if(drawResponse.getStatusCode().isError()) return drawResponse;

            Map<String, Object> result = (Map<String, Object>) drawResponse.getBody();
            List<Map<String, Object>> drawnCards = (List<Map<String, Object>>) result.get("drawnCards");

            GameCard newCard = new GameCard(drawnCards.get(0));
            dealerHand.add(newCard);
            newCards.add(newCard);
        }


        //handle payout, and save results into results, need:
        //hand: player1
        //win: true
        //payout: 200
        Map<String, Object> results = new HashMap<>();
        for (Map.Entry<String, PlayerHand> entry : hands.entrySet()) {
            String handName = entry.getKey();
            PlayerHand hand = entry.getValue();
            int bet = hand.getBet();
            int handScore = calculateHandValue(hand.getCards());
            int dealerScore = calculateHandValue(dealerHand);
            if (handScore > 21) {
                results.put(handName, Map.of(
                        "win", false,
                        "tie", false,
                        "lose", true,
                        "payout", 0
                ));
            } else if (handScore == dealerScore) {
                results.put(handName, Map.of(
                        "win", false,
                        "tie", true,
                        "lose", false,
                        "payout", bet
                ));
                balance += bet;
            } else if (dealerScore > 21) {
                results.put(handName, Map.of(
                        "win", true,
                        "tie", false,
                        "lose", false,
                        "payout", bet * 2
                ));
                balance += bet*2;
            } else if (handScore > dealerScore){
                results.put(handName, Map.of(
                        "win", true,
                        "tie", false,
                        "lose", false,
                        "payout", bet * 2
                ));
                balance += bet*2;
            } else {
                results.put(handName, Map.of(
                        "win", false,
                        "tie", false,
                        "lose", true,
                        "payout", 0
                ));
            }
        }

        return ResponseEntity.ok(Map.of(
                "dealerHand", newCards,
                "dealerScore", calculateHandValue(dealerHand),
                "results", results,
                "balance", balance
        ));
    }

    //Helper methods private
    private boolean checkBlackjack(List<GameCard> hand) {
        return hand.size() == 2 && calculateHandValue(hand) == 21;
    }
    private int calculateHandValue(List<GameCard> hand) {
        int sum = 0;
        int aceCount = 0;


        for(GameCard card: hand) {
            int cardValue = card.getValueAmount();
            sum += cardValue;
            if(card.isAce()) {
                aceCount++;
            }
        }

        //if we have an ace and our value is 11 or less we can make the ace 10 without busting
        if(aceCount >= 1 && sum <= 11) {
            sum += 10;
        }
        return sum;
    }

    private ResponseEntity<?> drawCardAndHandleDeck(int count, RestTemplate restTemplate) {
        try {
            // Draw a card
            String url = "https://deckofcardsapi.com/api/deck/" + deckId + "/draw/?count=" + count;
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);

            // Check for successful response
            if (response == null || !((Boolean) response.get("success"))) {
                return ResponseEntity.badRequest().body("Failed to draw a card.");
            }

            // Check remaining cards and reshuffle if needed
            int remaining = (int) response.get("remaining");
            if (remaining <= 52) {
                Map<String, Object> newDeck = restTemplate.getForObject(
                        "https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=8",
                        Map.class);
                if (newDeck != null) {
                    deckId = (String) newDeck.get("deck_id");
                }
            }

            // Check if any cards were drawn
            List<Map<String, Object>> drawnCards = (List<Map<String, Object>>) response.get("cards");
            if (drawnCards.isEmpty()) {
                return ResponseEntity.badRequest().body("No cards available.");
            }

            // Return both the card data and the potentially updated deckId
            Map<String, Object> result = new HashMap<>();
            result.put("drawnCards", drawnCards);

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error processing card draw: " + e.getMessage());
        }
    }

}
