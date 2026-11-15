package com.irisgame.model;

public class ModelProfile {
    private String id;
    private String name;
    private String personality;

    public ModelProfile(String id, String name, String personality) {
        this.id = id;
        this.name = name;
        this.personality = personality;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getPersonality() { return personality; }
}