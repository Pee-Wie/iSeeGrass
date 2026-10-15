package com.iseegrass.app.model;

import com.google.gson.annotations.SerializedName;

import java.util.List;

public class HistoryResponse {

    @SerializedName("success")
    private boolean success;

    @SerializedName("data")
    private HistoryData data;

    public boolean     isSuccess() { return success; }
    public HistoryData getData()   { return data; }

    // ------------------------------------------------------------------ //
    //  Nested data envelope                                               //
    // ------------------------------------------------------------------ //

    public static class HistoryData {

        @SerializedName("records")
        private List<Identification> records;

        @SerializedName("total")
        private int total;

        public List<Identification> getRecords() { return records; }
        public int                  getTotal()   { return total; }
    }
}
