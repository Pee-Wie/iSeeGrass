package com.iseegrass.app.ui.identify;

import android.view.LayoutInflater;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.iseegrass.app.databinding.ItemScoreBinding;
import com.iseegrass.app.model.IdentificationResult.ScoreItem;

import java.util.List;
import java.util.Locale;

/**
 * Adapter for the score breakdown list inside the identification result card.
 */
public class ScoreAdapter extends RecyclerView.Adapter<ScoreAdapter.VH> {

    private final List<ScoreItem> scores;

    public ScoreAdapter(List<ScoreItem> scores) {
        this.scores = scores;
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemScoreBinding b = ItemScoreBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new VH(b);
    }

    @Override
    public void onBindViewHolder(@NonNull VH holder, int position) {
        ScoreItem item = scores.get(position);

        holder.binding.tvSpeciesLabel.setText(item.getLabel());

        int progress = (int) Math.round(item.getConfidence());
        holder.binding.progressConfidence.setProgress(progress);

        holder.binding.tvConfidencePct.setText(
                String.format(Locale.US, "%.1f%%", item.getConfidence()));
    }

    @Override
    public int getItemCount() {
        return scores != null ? scores.size() : 0;
    }

    static class VH extends RecyclerView.ViewHolder {
        final ItemScoreBinding binding;

        VH(@NonNull ItemScoreBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }
}
