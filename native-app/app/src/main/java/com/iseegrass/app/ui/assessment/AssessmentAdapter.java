package com.iseegrass.app.ui.assessment;

import android.content.res.ColorStateList;
import android.view.LayoutInflater;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.ItemTouchHelper;
import androidx.recyclerview.widget.RecyclerView;

import com.iseegrass.app.R;
import com.iseegrass.app.databinding.ItemAssessmentBinding;
import com.iseegrass.app.model.Assessment;

import java.util.ArrayList;
import java.util.List;

/**
 * RecyclerView adapter for the assessment list.
 *
 * <p>Supports:
 * <ul>
 *   <li>Item click via {@link OnItemClick}</li>
 *   <li>Delete button click via {@link OnDeleteClick}</li>
 *   <li>Swipe-to-delete notification via {@link OnSwipeDelete} (called from
 *       an {@link ItemTouchHelper} set up in the fragment)</li>
 *   <li>{@link #setData(List)} to replace the full list at once</li>
 *   <li>{@link #addItem(int, Assessment)} / {@link #removeItem(int)} for undo support</li>
 * </ul>
 * </p>
 */
public class AssessmentAdapter extends RecyclerView.Adapter<AssessmentAdapter.VH> {

    // ------------------------------------------------------------------ //
    //  Callback interfaces                                                //
    // ------------------------------------------------------------------ //

    public interface OnItemClick {
        void onClick(Assessment assessment);
    }

    public interface OnDeleteClick {
        void onDelete(Assessment assessment);
    }

    /** Called by the fragment's ItemTouchHelper when a swipe is committed. */
    public interface OnSwipeDelete {
        void onSwipeDelete(Assessment assessment, int position);
    }

    // ------------------------------------------------------------------ //
    //  State                                                              //
    // ------------------------------------------------------------------ //

    private final List<Assessment> items = new ArrayList<>();
    private final OnItemClick clickListener;
    private final OnDeleteClick deleteListener;
    private OnSwipeDelete swipeDeleteListener;

    // ------------------------------------------------------------------ //
    //  Constructor                                                        //
    // ------------------------------------------------------------------ //

    public AssessmentAdapter(OnItemClick clickListener,
                             OnDeleteClick deleteListener) {
        this.clickListener  = clickListener;
        this.deleteListener = deleteListener;
    }

    public void setOnSwipeDeleteListener(OnSwipeDelete listener) {
        this.swipeDeleteListener = listener;
    }

    // ------------------------------------------------------------------ //
    //  Data mutations                                                     //
    // ------------------------------------------------------------------ //

    /** Replace the entire dataset. */
    public void setData(List<Assessment> newItems) {
        items.clear();
        if (newItems != null) items.addAll(newItems);
        notifyDataSetChanged();
    }

    /** Remove item at position (used immediately on swipe; paired with undo). */
    public void removeItem(int position) {
        if (position < 0 || position >= items.size()) return;
        items.remove(position);
        notifyItemRemoved(position);
    }

    /** Re-insert an item at a specific position (used for undo). */
    public void addItem(int position, Assessment item) {
        items.add(position, item);
        notifyItemInserted(position);
    }

    /** Return a snapshot copy — safe to retain for undo. */
    public Assessment getItem(int position) {
        return items.get(position);
    }

    /** Callback bridge for the ItemTouchHelper attached in the fragment. */
    public void onItemSwiped(int position) {
        if (position < 0 || position >= items.size()) return;
        Assessment swipedItem = items.get(position);
        removeItem(position);
        if (swipeDeleteListener != null) {
            swipeDeleteListener.onSwipeDelete(swipedItem, position);
        }
    }

    // ------------------------------------------------------------------ //
    //  RecyclerView.Adapter                                               //
    // ------------------------------------------------------------------ //

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemAssessmentBinding b = ItemAssessmentBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new VH(b);
    }

    @Override
    public void onBindViewHolder(@NonNull VH holder, int position) {
        Assessment item = items.get(position);

        holder.binding.tvTitle.setText(item.getTitle());
        // Prefer updatedAt, fall back to createdAt
        holder.binding.tvDate.setText(
                item.getUpdatedAt() != null && !item.getUpdatedAt().isEmpty()
                        ? item.getUpdatedAt()
                        : item.getCreatedAt());

        // Status chip
        String status = item.getStatus() != null ? item.getStatus() : "draft";
        holder.binding.chipStatus.setText(humanStatus(status));

        int colorRes;
        switch (status) {
            case "in_progress": colorRes = R.color.status_in_progress; break;
            case "finalized":   colorRes = R.color.status_finalized;   break;
            default:            colorRes = R.color.status_draft;       break;
        }
        int color = ContextCompat.getColor(holder.itemView.getContext(), colorRes);
        holder.binding.chipStatus.setChipBackgroundColor(ColorStateList.valueOf(color));

        holder.itemView.setOnClickListener(v -> clickListener.onClick(item));
        holder.binding.btnDelete.setOnClickListener(v -> deleteListener.onDelete(item));
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    // ------------------------------------------------------------------ //
    //  Helpers                                                            //
    // ------------------------------------------------------------------ //

    private String humanStatus(String status) {
        switch (status) {
            case "in_progress": return "In Progress";
            case "finalized":   return "Finalized";
            default:            return "Draft";
        }
    }

    // ------------------------------------------------------------------ //
    //  ViewHolder                                                         //
    // ------------------------------------------------------------------ //

    static class VH extends RecyclerView.ViewHolder {
        final ItemAssessmentBinding binding;

        VH(@NonNull ItemAssessmentBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }
}
