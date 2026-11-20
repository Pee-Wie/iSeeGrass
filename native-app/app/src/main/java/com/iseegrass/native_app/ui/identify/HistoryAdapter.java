package com.iseegrass.native_app.ui.identify;

import android.app.AlertDialog;
import android.net.Uri;
import android.view.LayoutInflater;
import android.view.ViewGroup;
import android.widget.EditText;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.iseegrass.native_app.R;
import com.iseegrass.native_app.databinding.ItemIdentificationBinding;
import com.iseegrass.native_app.model.Identification;
import com.iseegrass.native_app.network.Constants;

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

        // Manual key results have no model confidence score.
        holder.binding.tvConfidence.setText(item.isManual()
                ? "Manual key"
                : item.getTopConfidence() == null
                        ? "—"
                        : holder.itemView.getContext().getString(
                                R.string.confidence_result, item.getTopConfidence()));

        // Date
        holder.binding.tvDate.setText(item.getCreatedAt());

        // Thumbnail
        String imageUrl = resolveImageUrl(item);
        if (imageUrl != null) {
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

    private String resolveImageUrl(Identification item) {
        String imageUrl = item.getImageUrl();
        if (imageUrl != null && !imageUrl.trim().isEmpty()) {
            imageUrl = imageUrl.trim();
            if (imageUrl.startsWith("https://") || imageUrl.startsWith("http://")) return imageUrl;
            return Constants.BASE_URL + imageUrl.replaceFirst("^/+", "");
        }
        String filename = item.getImageFilename();
        return filename == null || filename.isEmpty()
                ? null
                : Constants.BASE_URL + "public/uploads/identifications/" + Uri.encode(filename);
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
