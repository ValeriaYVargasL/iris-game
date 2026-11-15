package com.irisgame.service;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.irisgame.model.MakeupSelection;

@Service
public class GameService {

    @Value("${python.engine.url}")
    private String pythonEngineUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @SuppressWarnings("unchecked")
    public Map<String, Object> processEvaluation(MakeupSelection selection) {
        String targetUrl = pythonEngineUrl + "/evaluate";
        return restTemplate.postForObject(targetUrl, selection, Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> fetchSavedLooks() {
        String targetUrl = pythonEngineUrl + "/looks";
        return restTemplate.getForObject(targetUrl, Map.class);
    }

    public Map<String, Object> deleteLook(Long id) {
        String targetUrl = pythonEngineUrl + "/looks/" + id;
        restTemplate.delete(targetUrl);
        return Map.of("status", "deleted", "id", id);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> checkHealth() {
        String targetUrl = pythonEngineUrl + "/health";
        return restTemplate.getForObject(targetUrl, Map.class);
    }
}