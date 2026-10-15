package com.iseegrass.app.model;

import com.google.gson.annotations.SerializedName;

import java.util.List;

public class IdentificationResult {

    @SerializedName("identification_id")
    private int identificationId;

    @SerializedName("model_type")
    private String modelType;

    @SerializedName("top_result")
    private String topResult;

    @SerializedName("top_confidence")
    private double topConfidence;

    @SerializedName("scores")
    private List<ScoreItem> scores;

    public int            getIdentificationId() { return identificationId; }
    public String         getModelType()        { return modelType; }
    public String         getTopResult()        { return topResult; }
    public double         getTopConfidence()    { return topConfidence; }
    public List<ScoreItem> getScores()          { return scores; }

    // ------------------------------------------------------------------ //
    //  Nested: individual score entry                                     //
    // ------------------------------------------------------------------ //

    public static class ScoreItem {

        @SerializedName("label")
        private String label;

        @SerializedName("confidence")
        private double confidence;

        public String getLabel()      { return label; }
        public double getConfidence() { return confidence; }
    }
}
