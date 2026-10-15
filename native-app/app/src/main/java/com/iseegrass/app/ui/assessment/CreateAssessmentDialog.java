package com.iseegrass.app.ui.assessment;

import android.app.Dialog;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.AutoCompleteTextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.DialogFragment;
import androidx.lifecycle.ViewModelProvider;

import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;
import com.iseegrass.app.R;
import com.iseegrass.app.viewmodel.AssessmentViewModel;

/**
 * Dialog for creating a new Assessment.
 *
 * <p>Shares the {@link AssessmentViewModel} from the parent Fragment so the
 * fragment can observe {@code actionState} and react (dismiss, reload list)
 * without coupling to this dialog directly.</p>
 */
public class CreateAssessmentDialog extends DialogFragment {

    public static final String TAG = "CreateAssessmentDialog";

    // Status display labels → API values
    private static final String[] STATUS_LABELS = {"Draft", "In Progress", "Finalized"};
    private static final String[] STATUS_VALUES = {"draft", "in_progress", "finalized"};

    private int selectedStatusIndex = 0;

    // ------------------------------------------------------------------ //
    //  Factory                                                            //
    // ------------------------------------------------------------------ //

    public static CreateAssessmentDialog newInstance() {
        return new CreateAssessmentDialog();
    }

    // ------------------------------------------------------------------ //
    //  onCreateDialog                                                     //
    // ------------------------------------------------------------------ //

    @NonNull
    @Override
    public Dialog onCreateDialog(@Nullable Bundle savedInstanceState) {
        // Inflate custom view
        View view = LayoutInflater.from(requireContext())
                .inflate(R.layout.dialog_create_assessment, null);

        TextInputLayout tilTitle   = view.findViewById(R.id.til_dialog_title);
        TextInputEditText etTitle  = view.findViewById(R.id.et_dialog_title);
        AutoCompleteTextView acvStatus = view.findViewById(R.id.acv_dialog_status);

        // Populate status dropdown
        ArrayAdapter<String> statusAdapter = new ArrayAdapter<>(
                requireContext(),
                android.R.layout.simple_dropdown_item_1line,
                STATUS_LABELS);
        acvStatus.setAdapter(statusAdapter);
        acvStatus.setText(STATUS_LABELS[selectedStatusIndex], false);
        acvStatus.setOnItemClickListener((parent, v, position, id) ->
                selectedStatusIndex = position);

        // Obtain shared ViewModel from parent fragment (or activity as fallback)
        AssessmentViewModel viewModel = obtainViewModel();

        return new AlertDialog.Builder(requireContext())
                .setTitle(R.string.new_assessment)
                .setView(view)
                .setPositiveButton(R.string.save, null) // set below to prevent auto-dismiss
                .setNegativeButton(R.string.cancel, null)
                .create();
    }

    @Override
    public void onStart() {
        super.onStart();
        // Override positive button to validate before dismissing
        AlertDialog dialog = (AlertDialog) getDialog();
        if (dialog == null) return;

        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            // Re-find views in the dialog's content
            TextInputLayout tilTitle =
                    dialog.findViewById(R.id.til_dialog_title);
            TextInputEditText etTitle =
                    dialog.findViewById(R.id.et_dialog_title);
            AutoCompleteTextView acvStatus =
                    dialog.findViewById(R.id.acv_dialog_status);

            if (etTitle == null || tilTitle == null) return;

            String title = etTitle.getText() != null
                    ? etTitle.getText().toString().trim() : "";

            if (title.isEmpty()) {
                tilTitle.setError(getString(R.string.title) + " is required");
                return;
            }
            tilTitle.setError(null);

            String status = STATUS_VALUES[selectedStatusIndex];

            AssessmentViewModel viewModel = obtainViewModel();
            viewModel.createAssessment(requireContext(), title, "", status);
            dismiss();
        });
    }

    // ------------------------------------------------------------------ //
    //  Helpers                                                            //
    // ------------------------------------------------------------------ //

    /**
     * Returns the {@link AssessmentViewModel} scoped to the parent Fragment
     * when available, otherwise falls back to the Activity scope so the
     * fragment can observe the same instance.
     */
    private AssessmentViewModel obtainViewModel() {
        if (getParentFragment() != null) {
            return new ViewModelProvider(getParentFragment())
                    .get(AssessmentViewModel.class);
        }
        return new ViewModelProvider(requireActivity())
                .get(AssessmentViewModel.class);
    }
}
