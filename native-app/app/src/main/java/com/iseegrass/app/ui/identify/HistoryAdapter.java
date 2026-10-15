package com.iseegrass.app.ui.identify;

import android.app.AlertDialog;
import android.view.LayoutInflater;
import android.view.ViewGroup;
import android.widget.EditText;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.iseegrass.app.R;
import com.iseegrass.app.databinding.ItemIdentificationBinding;
import com.iseegrass.app.model.Identification;
import com.iseegrass.app.network.Constants;

import java.util.List;

/**
 * Adapter for the identification history list in IdentifyFragment and
 * AssessmentEditorActivity.
 */
public class HistoryAdapter extends RecyclerView.Adapter<HistoryAdapter.VH> {

    public interface OnDeleteClick {
        void onDelete(Identification item);
    }

    public interface OnTitleEdit {
        void onEdit(Identification item, String newTitle);
    }

    private final List<Identification> items;
    private final OnDeleteClick deleteListener;
    private final OnTitleEdit titleEditListener;

    public HistoryAdapter(List<Identification> items,
                          OnDeleteClick deleteListener,
                          OnTitleEdit titleEditListener) {
        this.items = items;
        this.deleteListener = deleteListener;
        this.titleEditListener = titleEditListener;
    }

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

        // Title (or fallback to species)
        String title = (item.getTitle() != null && !item.getTitle().isEmpty())
                ? item.getTitle()
                : item.getTopResult();
        holder.binding.tvTitle.setText(title);

        // Species
        holder.binding.tvSpecies.setText(
                holder.itemView.getContext().getString(
                        R.string.species_result, item.getTopResult()));

        // Confidence
        holder.binding.tvConfidence.setText(
                holder.itemView.getContext().getString(
                        R.string.confidence_result, item.getTopConfidence()));

        // Date
        holder.binding.tvDate.setText(item.getCreatedAt());

        // Thumbnail
        if (item.getImageFilename() != null && !item.getImageFilename().isEmpty()) {
            String imageUrl = Constants.BASE_URL
                    + "uploads/identifications/" + item.getImageFilename();
            Glide.with(holder.binding.ivThumbnail.getContext())
                    .load(imageUrl)
                    .centerCrop()
                    .placeholder(R.drawable.ic_identify)
                    .into(holder.binding.ivThumbnail);
        } else {
            holder.binding.ivThumbnail.setImageResource(R.drawable.ic_identify);
        }

        // Delete
        holder.binding.btnDelete.setOnClickListener(v -> deleteListener.onDelete(item));

        // Long click → rename title
        holder.itemView.setOnLongClickListener(v -> {
            EditText et = new EditText(v.getContext());
            et.setText(item.getTitle());
            new AlertDialog.Builder(v.getContext())
                    .setTitle(R.string.rename)
                    .setView(et)
                    .setPositiveButton(android.R.string.ok,
                            (d, w) -> titleEditListener.onEdit(item,
                                    et.getText().toString().trim()))
                    .setNegativeButton(android.R.string.cancel, null)
                    .show();
            return true;
        });
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static class VH extends RecyclerView.ViewHolder {
        final ItemIdentificationBinding binding;

        VH(@NonNull ItemIdentificationBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }
}
