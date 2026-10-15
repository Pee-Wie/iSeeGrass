package com.iseegrass.app.ui.identify;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.iseegrass.app.R;
import com.iseegrass.app.databinding.ItemIdentificationBinding;
import com.iseegrass.app.model.Identification;
import com.iseegrass.app.network.Constants;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * RecyclerView adapter for the identification history list.
 *
 * <p>Supports single-item deletion via an {@link OnDeleteListener} callback,
 * and optional bulk-selection mode that highlights rows and tracks selected ids.</p>
 *
 * <p>Thumbnail images are loaded from
 * {@code BASE_URL + "public/uploads/identifications/{filename}"} via Glide.</p>
 */
public class IdentificationAdapter
        extends RecyclerView.Adapter<IdentificationAdapter.VH> {

    // ------------------------------------------------------------------ //
    //  Callback interface                                                 //
    // ------------------------------------------------------------------ //

    public interface OnDeleteListener {
        void onDelete(Identification item);
    }

    // ------------------------------------------------------------------ //
    //  State                                                              //
    // ------------------------------------------------------------------ //

    private final List<Identification> items = new ArrayList<>();
    private final List<Integer> selectedIds = new ArrayList<>();
    private boolean bulkMode = false;

    private OnDeleteListener deleteListener;

    // ------------------------------------------------------------------ //
    //  Constructor                                                        //
    // ------------------------------------------------------------------ //

    public IdentificationAdapter() { }

    public void setOnDeleteListener(OnDeleteListener listener) {
        this.deleteListener = listener;
    }

    // ------------------------------------------------------------------ //
    //  Data update                                                        //
    // ------------------------------------------------------------------ //

    public void setData(List<Identification> newItems) {
        items.clear();
        selectedIds.clear();
        if (newItems != null) items.addAll(newItems);
        notifyDataSetChanged();
    }

    // ------------------------------------------------------------------ //
    //  RecyclerView.Adapter                                               //
    // ------------------------------------------------------------------ //

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemIdentificationBinding b = ItemIdentificationBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new VH(b);
    }

    @Override
    public void onBindViewHolder(@NonNull VH holder, int position) {
        Identification item = items.get(position);

        // Title: prefer user-set title, fall back to top species result
        String displayTitle = (item.getTitle() != null && !item.getTitle().isEmpty())
                ? item.getTitle()
                : item.getTopResult();
        holder.binding.tvTitle.setText(displayTitle);

        // Species
        holder.binding.tvSpecies.setText(
                holder.itemView.getContext()
                        .getString(R.string.species_result, item.getTopResult()));

        // Confidence formatted as percentage
        holder.binding.tvConfidence.setText(
                String.format(Locale.US, "%.1f%%", item.getTopConfidence()));

        // Date
        holder.binding.tvDate.setText(item.getCreatedAt());

        // Thumbnail from remote storage
        if (item.getImageFilename() != null && !item.getImageFilename().isEmpty()) {
            // Awardspace path: public/uploads/identifications/{filename}
            String imageUrl = Constants.BASE_URL
                    + "public/uploads/identifications/" + item.getImageFilename();
            Glide.with(holder.binding.ivThumbnail.getContext())
                    .load(imageUrl)
                    .centerCrop()
                    .placeholder(R.drawable.ic_identify)
                    .into(holder.binding.ivThumbnail);
        } else {
            holder.binding.ivThumbnail.setImageResource(R.drawable.ic_identify);
        }

        // Delete button
        holder.binding.btnDelete.setOnClickListener(v -> {
            if (deleteListener != null) deleteListener.onDelete(item);
        });

        // Bulk selection: show checkbox, handle click toggle
        if (bulkMode) {
            // item_identification.xml doesn't have a checkbox — overlay a checked state
            // via card stroke color as a visual cue, and handle click to toggle id list.
            boolean isSelected = selectedIds.contains(item.getId());
            // Dim card if not selected, highlight if selected
            holder.itemView.setAlpha(isSelected ? 1.0f : 0.6f);
            holder.itemView.setOnClickListener(v -> {
                int pos = holder.getAdapterPosition();
                if (pos == RecyclerView.NO_ID) return;
                Identification cur = items.get(pos);
                if (selectedIds.contains(cur.getId())) {
                    selectedIds.remove(Integer.valueOf(cur.getId()));
                } else {
                    selectedIds.add(cur.getId());
                }
                notifyItemChanged(pos);
            });
        } else {
            holder.itemView.setAlpha(1.0f);
            holder.itemView.setOnClickListener(null);
        }
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    // ------------------------------------------------------------------ //
    //  Public API                                                         //
    // ------------------------------------------------------------------ //

    /**
     * Toggle bulk-selection mode on/off.
     * Clearing mode also clears the selected-id set.
     */
    public void toggleBulkMode() {
        bulkMode = !bulkMode;
        if (!bulkMode) selectedIds.clear();
        notifyDataSetChanged();
    }

    public boolean isBulkMode() {
        return bulkMode;
    }

    /** Returns the list of identification ids currently selected in bulk mode. */
    public List<Integer> getSelectedIds() {
        return new ArrayList<>(selectedIds);
    }

    // ------------------------------------------------------------------ //
    //  ViewHolder                                                         //
    // ------------------------------------------------------------------ //

    static class VH extends RecyclerView.ViewHolder {
        final ItemIdentificationBinding binding;

        VH(@NonNull ItemIdentificationBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }
}
