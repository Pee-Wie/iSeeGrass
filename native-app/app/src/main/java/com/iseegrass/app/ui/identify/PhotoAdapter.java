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
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Adapter for the 3-column photo collector grid in IdentifyFragment.
 */
public class PhotoAdapter extends RecyclerView.Adapter<PhotoAdapter.VH> {

    public interface OnPhotoClick {
        void onClick(int position, Uri uri);
    }

    public interface OnPhotoLongClick {
        void onLongClick(int position, Uri uri);
    }

    private final List<Uri> uris;
    private final List<String> titles;
    private final OnPhotoClick clickListener;
    private final OnPhotoLongClick longClickListener;

    private boolean selectionMode = false;
    private final Set<Integer> selectedPositions = new HashSet<>();

    public PhotoAdapter(List<Uri> uris,
                        List<String> titles,
                        OnPhotoClick clickListener,
                        OnPhotoLongClick longClickListener) {
        this.uris = uris;
        this.titles = titles;
        this.clickListener = clickListener;
        this.longClickListener = longClickListener;
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemPhotoBinding b = ItemPhotoBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new VH(b);
    }

    @Override
    public void onBindViewHolder(@NonNull VH holder, int position) {
        Uri uri = uris.get(position);

        Glide.with(holder.binding.ivPhoto.getContext())
                .load(uri)
                .centerCrop()
                .into(holder.binding.ivPhoto);

        // Selection mode UI
        holder.binding.cbSelect.setVisibility(selectionMode ? View.VISIBLE : View.GONE);
        boolean selected = selectedPositions.contains(position);
        holder.binding.cbSelect.setChecked(selected);
        holder.binding.viewSelectedOverlay.setVisibility(selected ? View.VISIBLE : View.GONE);

        holder.itemView.setOnClickListener(v -> {
            int pos = holder.getAdapterPosition();
            if (pos != RecyclerView.NO_ID) clickListener.onClick(pos, uris.get(pos));
        });

        holder.itemView.setOnLongClickListener(v -> {
            int pos = holder.getAdapterPosition();
            if (pos != RecyclerView.NO_ID) longClickListener.onLongClick(pos, uris.get(pos));
            return true;
        });
    }

    @Override
    public int getItemCount() {
        return uris.size();
    }

    // ------------------------------------------------------------------ //
    //  Selection helpers                                                  //
    // ------------------------------------------------------------------ //

    public void toggleSelection(int position) {
        if (selectedPositions.contains(position)) {
            selectedPositions.remove(position);
        } else {
            selectedPositions.add(position);
        }
        notifyItemChanged(position);
    }

    public void clearSelections() {
        selectedPositions.clear();
        notifyDataSetChanged();
    }

    public Set<Integer> getSelectedPositions() {
        return selectedPositions;
    }

    public void setSelectionMode(boolean mode) {
        this.selectionMode = mode;
        notifyDataSetChanged();
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
