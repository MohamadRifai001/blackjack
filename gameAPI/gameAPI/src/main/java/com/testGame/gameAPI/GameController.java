package com.testGame.gameAPI;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

//@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/game")
public class GameController {

    private String deckId;
    private List<GameCard> dealerCards = new ArrayList<>();
    private List<GameCard> playerCards = new ArrayList<>();
    private Map<String, List<GameCard>> splitHands = new HashMap<>();
    private int balance;
    private int bet;
    private String activeHand = "main";
    private boolean isSplitRound = false;

    //-=-=-=-=-=-=-Game setup get the deckId and set it-=-=-=-=-=-=-=-=-=-

    @GetMapping("/start")
    public ResponseEntity<Map<String, Integer>> startGame() {
        balance = 1000;
        return ResponseEntity.ok(Map.of(
                "balance", balance
        ));
    }

    @PostMapping("/setDeck")
    public ResponseEntity<String> setDeck(@RequestBody DeckResponse deckResponse) {
        this.deckId = deckResponse.getDeck_id();
        return ResponseEntity.ok("Deck ID received successfully");
    }

    //-=-=-=-=-=-=-=-=-=-=-Draw Cards(Start of Every Round)-=-=-=-=-=-=-=-=-=-
    @GetMapping("/draw")
    public ResponseEntity<?> drawCards(@RequestParam int bet) {
        if (deckId == null) {
            return ResponseEntity.badRequest().body("No deck ID set. Must generate a deck first.");
        }
        activeHand="main";

        balance -= bet;
        this.bet = bet;

        ResponseEntity<?> drawResponse = drawCardAndHandleDeck(4, new RestTemplate());
        if(drawResponse.getStatusCode().isError()) { return drawResponse; }

        Map<String, Object> result = (Map<String, Object>) drawResponse.getBody();
        List<Map<String, Object>> drawnCards = (List<Map<String, Object>>) result.get("drawnCards");

        dealerCards.clear();
        playerCards.clear();
        dealerCards.add(new GameCard(drawnCards.get(1)));
        dealerCards.add(new GameCard(drawnCards.get(3)));
        playerCards.add(new GameCard(drawnCards.get(0)));
        playerCards.add(new GameCard(drawnCards.get(2)));


        return ResponseEntity.ok(Map.of("success", true, "gameData", getGameState()));
    }

    //-=-=-=-=-=-=-=-=-=-=-Game Actions:Hit, Stand, Split, Double(coming soon)-=-=-=-=-=-=-=-=-=-

    //playerBlackjack AutoWin 2.5x payout
    @GetMapping("/playerBlackjack")
    public ResponseEntity<?> playerBlackjack() {
        if(calculateHandValue(playerCards) != 21 && playerCards.size() == 2) {
            return ResponseEntity.badRequest().body("Player does not have a blackjack");
        }

        int payOut = (bet * 5)/2;
        balance += payOut;

        return ResponseEntity.ok(Map.of(
                "newBalance", balance,
                "dealerScore", calculateHandValue(dealerCards),
                "hiddenCard", dealerCards.get(0)
        ));
    }

    //Hit
    @GetMapping("/hit")
    public ResponseEntity<?> hit() {
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

        playerCards.add(new GameCard(drawnCards.get(0)));

        int playerScore = calculateHandValue(playerCards);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "newCard", drawnCards.get(0),
                "playerScore", playerScore,
                "playerBust", playerScore > 21,
                "roundOver", playerScore >= 21
        ));
    }

    @GetMapping("/hitSplit")
    public ResponseEntity<?> hitSplit(@RequestParam String hand) {
        if (!isSplitRound || !splitHands.containsKey(hand)) {
            return ResponseEntity.badRequest().body("Invalid hand for hitting");
        }

        ResponseEntity<?> drawResponse = drawCardAndHandleDeck(1, new RestTemplate());
        if(drawResponse.getStatusCode().isError()) return drawResponse;

        Map<String, Object> result = (Map<String, Object>) drawResponse.getBody();
        List<Map<String, Object>> drawnCards = (List<Map<String, Object>>) result.get("drawnCards");

        List<GameCard> currentHand = splitHands.get(hand);
        currentHand.add(new GameCard(drawnCards.get(0)));

        int score = calculateHandValue(currentHand);
        boolean bust = score > 21;

        // If bust or stand, move to next hand
        if (bust || hand.equals("hand2")) {
            activeHand = null;
        } else if (hand.equals("hand1")) {
            activeHand = "hand2";
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "hand", hand,
                "newCard", drawnCards.get(0),
                "score", score,
                "bust", bust,
                "activeHand", activeHand,
                "roundOver", activeHand == null
        ));
    }

    //-=-=-=-=-=-=-=-=-=-=-Stand(revealDealer and dealerTurn)-=-=-=-=-=-=-=-=-=-
    @GetMapping("/revealDealer")
    public ResponseEntity<?> revealDealerCard() {
        if(dealerCards.size() < 2) {
            return ResponseEntity.badRequest().body("Dealer Has less than 2 cards!");
        }
        return ResponseEntity.ok(Map.of(
                "hiddenCard", dealerCards.get(0),
                "dealerScore", calculateHandValue(dealerCards),
                "playerBust", calculateHandValue(playerCards) > 21
        ));
    }

    @GetMapping("/dealerTurn")
    public ResponseEntity<?> dealerLogic() {
        List<GameCard> newCards = new ArrayList<>();

        while(calculateHandValue(dealerCards) < 17) {
            ResponseEntity<?> drawResponse = drawCardAndHandleDeck(1, new RestTemplate());
            if(drawResponse.getStatusCode().isError()) return drawResponse;

            Map<String, Object> result = (Map<String, Object>) drawResponse.getBody();
            List<Map<String, Object>> drawnCards = (List<Map<String, Object>>) result.get("drawnCards");

            GameCard newCard = new GameCard(drawnCards.get(0));
            dealerCards.add(newCard);
            newCards.add(newCard);
        }

        int dealerScore = calculateHandValue(dealerCards);
        boolean dealerBust = dealerScore > 21;

        Map<String, Object> result = new HashMap<>();
        result.put("dealerScore", dealerScore);
        result.put("dealerBust", dealerBust);
        result.put("newCards", newCards);

        if (isSplitRound) {
            // Evaluate each hand against dealer
            int hand1Score = calculateHandValue(splitHands.get("hand1"));
            int hand2Score = calculateHandValue(splitHands.get("hand2"));

            boolean hand1Win = dealerBust || hand1Score > dealerScore;
            boolean hand2Win = dealerBust || hand2Score > dealerScore;
            boolean hand1Tie = hand1Score == dealerScore;
            boolean hand2Tie = hand2Score == dealerScore;

            if (hand1Win) balance += bet * 2;
            else if (hand1Tie) balance += bet;

            if (hand2Win) balance += bet * 2;
            else if (hand2Tie) balance += bet;

            result.put("hand1Win", hand1Win);
            result.put("hand2Win", hand2Win);
            result.put("hand1Tie", hand1Tie);
            result.put("hand2Tie", hand2Tie);
        } else {
            // Original single-hand logic
            int playerScore = calculateHandValue(playerCards);
            boolean playerWin = dealerBust || playerScore > dealerScore;
            boolean dealerWin = !dealerBust && dealerScore > playerScore;
            boolean tie = playerScore == dealerScore;

            if(playerWin) balance += bet*2;
            else if (tie) balance += bet;

            result.put("playerWin", playerWin);
            result.put("dealerWin", dealerWin);
            result.put("tie", tie);
        }

        result.put("balance", balance);
        isSplitRound = false;
        return ResponseEntity.ok(result);
    }

    //-=-=-=-=-=-=-=-=-=-=-Split-=-=-=-=-=-=-=-=-=-
    @GetMapping("/split")
    public ResponseEntity<?> split() {
        if (playerCards.size() != 2 || playerCards.get(0).getValueAmount() != playerCards.get(1).getValueAmount()) {
            return ResponseEntity.badRequest().body("Cannot split. Player must have two cards of the same value.");
        }

        // Create a second hand
        List<GameCard> hand1 = new ArrayList<>();
        List<GameCard> hand2 = new ArrayList<>();

        hand1.add(playerCards.get(0));
        hand2.add(playerCards.get(1));

        splitHands.put("hand1", hand1);
        splitHands.put("hand2", hand2);

        ResponseEntity<?> drawResponse = drawCardAndHandleDeck(2, new RestTemplate());
        if(drawResponse.getStatusCode().isError()) return drawResponse;

        Map<String, Object> result = (Map<String, Object>) drawResponse.getBody();
        List<Map<String, Object>> drawnCards = (List<Map<String, Object>>) result.get("drawnCards");

        hand1.add(new GameCard(drawnCards.get(0)));
        hand2.add(new GameCard(drawnCards.get(1)));


        // Deduct additional bet
        balance -= bet;


        Map<String, Object> response = Map.of(
                "hand1", Map.of("cards", hand1, "score", calculateHandValue(hand1)),
                "hand2", Map.of("cards", hand2, "score", calculateHandValue(hand2)),
                "balance", balance,
                "activeHand", activeHand
        );

        return ResponseEntity.ok(Map.of(
                "success", true,
                "splitData", response));
    }


    //-=-=-=-=-=-=-=-=-=-=-Helper Methods(Private)-=-=-=-=-=-=-=-=-=-
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
    private Map<String, Object> getGameState() {
        return Map.of(
                "dealer", Map.of(
                        "hiddenCard", Map.of("image", "https://deckofcardsapi.com/static/img/back.png"),
                        "hiddenCardActual", dealerCards.get(0),
                        "visibleCard", dealerCards.get(1),
                        "score", calculateHandValue(List.of(dealerCards.get(1)))
                ),
                "player", Map.of(
                        "cards", playerCards,
                        "score", calculateHandValue(playerCards),
                        "balance", balance
                )
        );
    }

    public ResponseEntity<?> drawCardAndHandleDeck(int count, RestTemplate restTemplate) {
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



    public static class DeckResponse {
        private String deck_id;

        public String getDeck_id() {
            return deck_id;
        }
    }


}
