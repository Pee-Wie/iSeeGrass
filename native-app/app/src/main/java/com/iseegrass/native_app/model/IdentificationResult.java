package com.iseegrass.native_app.model;

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
    private Double topConfidence;

    @SerializedName("identification_method")
    private String identificationMethod;

    @SerializedName("scores")
    private List<ScoreItem> scores;

    public int            getIdentificationId() { return identificationId; }
    public String         getModelType()        { return modelType; }
    public String         getTopResult()        { return topResult; }
    public Double         getTopConfidence()    { return topConfidence; }
    public String         getIdentificationMethod() { return identificationMethod; }
    public List<ScoreItem> getScores()         { return scores; }

    /** Convenience constructor for building a result from a history record. */
    public IdentificationResult(int id, String topResult, Double topConfidence) {
        this.identificationId = id;
        this.topResult        = topResult;
        this.topConfidence    = topConfidence;
    }

    public IdentificationResult(int id, String topResult, double topConfidence) {
        this(id, topResult, Double.valueOf(topConfidence));
    }

    public IdentificationResult(int id, String topResult, Double topConfidence,
                                String identificationMethod) {
        this(id, topResult, topConfidence);
        this.identificationMethod = identificationMethod;
    }

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
