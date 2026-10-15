package com.iseegrass.app.ui.identify;

import android.net.Uri;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.iseegrass.app.databinding.ItemPhotoBinding;

import java.util.ArrayList;
import java.util.List;

/**
 * RecyclerView adapter for the 3-column photo-collector grid.
 *
 * <p>Normal mode  — item click opens a detail/options dialog (delegated to the
 * fragment via {@link OnPhotoClickListener}).</p>
 * <p>Selection mode — item click toggles the selected state; long-press on any
 * item enters selection mode via {@link OnPhotoLongClickListener}.</p>
 */
public class PhotoAdapter extends RecyclerView.Adapter<PhotoAdapter.VH> {

    // ------------------------------------------------------------------ //
    //  Callback interfaces                                                //
    // ------------------------------------------------------------------ //

    public interface OnPhotoClickListener {
        void onPhotoClick(int position, PhotoItem item);
    }

    public interface OnPhotoLongClickListener {
        void onPhotoLongClick(int position, PhotoItem item);
    }

    // ------------------------------------------------------------------ //
    //  State                                                              //
    // ------------------------------------------------------------------ //

    private final List<PhotoItem> items;
    private boolean selectionMode = false;

    private OnPhotoClickListener clickListener;
    private OnPhotoLongClickListener longClickListener;

    // ------------------------------------------------------------------ //
    //  Constructors                                                       //
    // ------------------------------------------------------------------ //

    public PhotoAdapter() {
        this.items = new ArrayList<>();
    }

    public PhotoAdapter(List<PhotoItem> items) {
        this.items = items != null ? items : new ArrayList<>();
    }

    // ------------------------------------------------------------------ //
    //  Listener setters                                                   //
    // ------------------------------------------------------------------ //

    public void setOnPhotoClickListener(OnPhotoClickListener listener) {
        this.clickListener = listener;
    }

    public void setOnPhotoLongClickListener(OnPhotoLongClickListener listener) {
        this.longClickListener = listener;
    }

    // ------------------------------------------------------------------ //
    //  RecyclerView.Adapter                                               //
    // ------------------------------------------------------------------ //

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemPhotoBinding b = ItemPhotoBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new VH(b);
    }

    @Override
    public void onBindViewHolder(@NonNull VH holder, int position) {
        PhotoItem item = items.get(position);

        Glide.with(holder.binding.ivPhoto.getContext())
                .load(item.getImageUri())
                .centerCrop()
                .into(holder.binding.ivPhoto);

        // Show/hide checkbox and overlay based on selection mode
        int checkboxVisibility = selectionMode ? View.VISIBLE : View.GONE;
        holder.binding.cbSelect.setVisibility(checkboxVisibility);
        holder.binding.cbSelect.setChecked(item.isSelected());
        holder.binding.viewSelectedOverlay.setVisibility(
                item.isSelected() ? View.VISIBLE : View.GONE);

        holder.itemView.setOnClickListener(v -> {
            int pos = holder.getAdapterPosition();
            if (pos == RecyclerView.NO_ID) return;
            PhotoItem current = items.get(pos);
            if (selectionMode) {
                // Toggle selection
                current.setSelected(!current.isSelected());
                notifyItemChanged(pos);
            } else {
                if (clickListener != null) clickListener.onPhotoClick(pos, current);
            }
        });

        holder.itemView.setOnLongClickListener(v -> {
            int pos = holder.getAdapterPosition();
            if (pos == RecyclerView.NO_ID) return false;
            if (longClickListener != null) {
                longClickListener.onPhotoLongClick(pos, items.get(pos));
            }
            return true;
        });
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    // ------------------------------------------------------------------ //
    //  Public API                                                         //
    // ------------------------------------------------------------------ //

    /** Add a single photo to the grid. */
    public void addPhoto(PhotoItem item) {
        items.add(item);
        notifyItemInserted(items.size() - 1);
    }

    /** Remove the photo at the given adapter position. */
    public void removeItem(int position) {
        if (position < 0 || position >= items.size()) return;
        items.remove(position);
        notifyItemRemoved(position);
    }

    /** Returns all items currently in the adapter. */
    public List<PhotoItem> getItems() {
        return items;
    }

    /** Returns only the items whose selected flag is true. */
    public List<PhotoItem> getSelectedItems() {
        List<PhotoItem> selected = new ArrayList<>();
        for (PhotoItem item : items) {
            if (item.isSelected()) selected.add(item);
        }
        return selected;
    }

    /**
     * Enter or exit selection mode.
     * Exiting also clears all selection flags.
     */
    public void exitSelectionMode() {
        selectionMode = false;
        for (PhotoItem item : items) item.setSelected(false);
        notifyDataSetChanged();
    }

    /** Enter selection mode. */
    public void enterSelectionMode() {
        selectionMode = true;
        notifyDataSetChanged();
    }

    public boolean isInSelectionMode() {
        return selectionMode;
    }

    // ------------------------------------------------------------------ //
    //  ViewHolder                                                         //
    // ------------------------------------------------------------------ //

    static class VH extends RecyclerView.ViewHolder {
        final ItemPhotoBinding binding;

        VH(@NonNull ItemPhotoBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }
}
