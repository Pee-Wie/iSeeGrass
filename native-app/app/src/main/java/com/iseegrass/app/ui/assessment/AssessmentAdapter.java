package com.iseegrass.app.ui.assessment;

import android.content.res.ColorStateList;
import android.view.LayoutInflater;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.iseegrass.app.R;
import com.iseegrass.app.databinding.ItemAssessmentBinding;
import com.iseegrass.app.model.Assessment;

import java.util.List;

/**
 * RecyclerView adapter for the assessment list.
 */
public class AssessmentAdapter extends RecyclerView.Adapter<AssessmentAdapter.VH> {

    public interface OnItemClick {
        void onClick(Assessment assessment);
    }

    public interface OnDeleteClick {
        void onDelete(Assessment assessment);
    }

    private final List<Assessment> items;
    private final OnItemClick clickListener;
    private final OnDeleteClick deleteListener;

    public AssessmentAdapter(List<Assessment> items,
                             OnItemClick clickListener,
                             OnDeleteClick deleteListener) {
        this.items = items;
        this.clickListener = clickListener;
        this.deleteListener = deleteListener;
    }

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
        holder.binding.tvDate.setText(item.getUpdatedAt() != null
                ? item.getUpdatedAt() : item.getCreatedAt());

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

    private String humanStatus(String status) {
        switch (status) {
            case "in_progress": return "In Progress";
            case "finalized":   return "Finalized";
            default:            return "Draft";
        }
    }

    static class VH extends RecyclerView.ViewHolder {
        final ItemAssessmentBinding binding;

        VH(@NonNull ItemAssessmentBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }
}
