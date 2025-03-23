package com.testGame.gameAPI;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import javax.smartcardio.Card;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/game")
public class GameController {

    private String deckId;
    private List<GameCard> dealerCards = new ArrayList<>();
    private List<GameCard> playerCards = new ArrayList<>();

    @PostMapping("/setDeck")
    public ResponseEntity<String> setDeck(@RequestBody DeckResponse deckResponse) {
        this.deckId = deckResponse.getDeck_id();
        //For debugging: System.out.println("Received Deck ID" + deckId);
        return ResponseEntity.ok("Deck ID received successfully");
    }

    @PostMapping("/getDeck")
    public ResponseEntity<String> getDeck() {
        return ResponseEntity.ok(deckId != null ? deckId: "No Deck ID set");
    }

    @GetMapping("/draw")
    public ResponseEntity<?> drawCards() {
        int count = 4;
        if (deckId == null) {
            return ResponseEntity.badRequest().body("No deck ID set. Must generate a deck first.");
        }
        String url = "https://deckofcardsapi.com/api/deck/" + deckId + "/draw/?count=" + count;
        RestTemplate restTemplate = new RestTemplate();
        Map<String, Object> response = restTemplate.getForObject(url, Map.class);

        if (response == null || !((Boolean) response.get("success"))) {
            return ResponseEntity.badRequest().body("Failed to draw cards.");
        }
        List<Map<String, Object>> drawnCards = (List<Map<String, Object>>) response.get("cards");

        if (drawnCards.size() < count) {
            return ResponseEntity.badRequest().body("Not enough cards drawn.");
        }

        dealerCards.clear();
        playerCards.clear();

        playerCards.add(new GameCard(drawnCards.get(1)));
        playerCards.add(new GameCard(drawnCards.get(3)));


        dealerCards.add(new GameCard(drawnCards.get(0))); //hidden card
        dealerCards.add(new GameCard(drawnCards.get(2)));

        int playerScore = calculateHandValue(playerCards);
        int dealerScore = calculateHandValue(List.of(dealerCards.get(1)));

        // Structuring the response with assigned cards
        Map<String, Object> gameData = Map.of(
                "dealer", Map.of(
                        "hiddenCard", Map.of("image", "https://deckofcardsapi.com/static/img/back.png"),
                        "hiddenCardActual", dealerCards.get(0),
                        "visibleCard", dealerCards.get(1),
                        "score", dealerScore
                ),
                "player", Map.of(
                        "cards", playerCards,
                        "score", playerScore
                )
        );

        return ResponseEntity.ok(Map.of("success", true, "gameData", gameData));
    }


    @GetMapping("/hit")
    public ResponseEntity<?> hit() {
        if (deckId == null) {
            return ResponseEntity.badRequest().body("No deck ID set. Must generate a deck first.");
        }

        String url = "https://deckofcardsapi.com/api/deck/" + deckId + "/draw/?count=1";
        RestTemplate restTemplate = new RestTemplate();
        Map<String, Object> response = restTemplate.getForObject(url, Map.class);

        if (response == null || !((Boolean) response.get("success"))) {
            return ResponseEntity.badRequest().body("Failed to draw a card.");
        }

        List<Map<String, Object>> drawnCards = (List<Map<String, Object>>) response.get("cards");
        if(drawnCards.isEmpty()) {
            return ResponseEntity.badRequest().body("No cards available.");
        }

        playerCards.add(new GameCard(drawnCards.get(0)));

        int playerScore = calculateHandValue(playerCards);
        boolean playerBust = playerScore > 21;
        boolean roundOver = playerScore >= 21;

        return ResponseEntity.ok(Map.of(
                "success", true,
                "newCard", drawnCards.get(0),
                "playerScore", playerScore,
                "playerBust", playerBust,
                "roundOver", roundOver
        ));
    }
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

    @GetMapping("/dealerTurn")
    public ResponseEntity<?> dealerLogic() {
        List<GameCard> newCards = new ArrayList<>();


        String url = "https://deckofcardsapi.com/api/deck/" + deckId + "/draw/?count=1";
        RestTemplate restTemplate = new RestTemplate();

        while(calculateHandValue(dealerCards) < 17) {
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);

            if (response == null || !((Boolean) response.get("success"))) {
                return ResponseEntity.badRequest().body("Failed to draw a card.");
            }

            List<Map<String, Object>> drawnCards = (List<Map<String, Object>>) response.get("cards");
            if(drawnCards.isEmpty()) {
                return ResponseEntity.badRequest().body("No cards available.");
            }
            GameCard newCard = new GameCard(drawnCards.get(0));
            dealerCards.add(newCard);
            newCards.add(newCard);
        }

        boolean playerWin = calculateHandValue(dealerCards) < calculateHandValue(playerCards);

        if(calculateHandValue(dealerCards) > 21) {
            playerWin = true;
        }

        Map<String, Boolean> gameResults = new HashMap<>();
        gameResults.put("playerWin", playerWin);
        gameResults.put("dealerWin",
                (calculateHandValue(dealerCards) > calculateHandValue(playerCards)
                        && (calculateHandValue(dealerCards) <= 21))
                );
        gameResults.put("tie", calculateHandValue(playerCards) == calculateHandValue(dealerCards));

        return ResponseEntity.ok(Map.of(
                "success", true,
                "newCards", newCards,
                "dealerScore", calculateHandValue(dealerCards),
                "gameResults", gameResults
        ));
    }





    @GetMapping("/start")
    public String startGame() {

        return "Blackjack game started!";
    }
//
//    @GetMapping("/card")
//    public StringCard getCard() {
//        GameCard card = GameCard.of(Suit.Hearts, Face.Ace, "https://deckofcardsapi.com/static/img/AH.png");
//        return new StringCard(card.getFace(), card.getSuit(), card.getImageURL());
//    }




    public static class DeckResponse {
        private String deck_id;

        public String getDeck_id() {
            return deck_id;
        }
    }


}
