package com.irisgame.controller;

import com.irisgame.model.MakeupSelection;
import com.irisgame.service.GameService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/game")
@CrossOrigin(origins = "*")
public class GameController {

    @Autowired
    private GameService gameService;

    @PostMapping("/evaluate")
    public Map<String, Object> evaluate(@RequestBody MakeupSelection selection) {
        return gameService.processEvaluation(selection);
    }

    @GetMapping("/looks")
    public Map<String, Object> getSavedLooks() {
        return gameService.fetchSavedLooks();
    }

    @DeleteMapping("/looks/{id}")
    public Map<String, Object> deleteLook(@PathVariable Long id) {
        return gameService.deleteLook(id);
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return gameService.checkHealth();
    }
}