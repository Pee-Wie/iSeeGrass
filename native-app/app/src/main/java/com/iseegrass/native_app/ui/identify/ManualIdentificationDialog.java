package com.iseegrass.native_app.ui.identify;

import android.content.Context;
import android.content.res.ColorStateList;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.widget.GridLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.appcompat.app.AlertDialog;
import androidx.core.content.ContextCompat;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.card.MaterialCardView;
import com.iseegrass.native_app.R;

public final class ManualIdentificationDialog {

    public interface Listener {
        void onManualResult(ManualIdentificationKey.Outcome outcome);
    }

    private final Context context;
    private final Listener listener;
    private final ManualIdentificationKey key = new ManualIdentificationKey();
    private final LinearLayout questionContent;
    private final MaterialButton backButton;
    private final MaterialButton restartButton;
    private AlertDialog dialog;

    public ManualIdentificationDialog(Context context, Listener listener) {
        this.context = context;
        this.listener = listener;
        int padding = dp(18);

        LinearLayout content = new LinearLayout(context);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(padding, dp(8), padding, padding);

        ScrollView scrollView = new ScrollView(context);
        scrollView.setFillViewport(true);
        questionContent = new LinearLayout(context);
        questionContent.setOrientation(LinearLayout.VERTICAL);
        scrollView.addView(questionContent);
        content.addView(scrollView, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1));

        LinearLayout actions = new LinearLayout(context);
        actions.setGravity(Gravity.CENTER);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        content.addView(actions, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        backButton = addActionButton(actions, "Back", v -> {
            key.goBack();
            render();
        });
        restartButton = addActionButton(actions, "Start over", v -> {
            key.restart();
            render();
        });

        this.content = content;
    }

    private final LinearLayout content;

    public void show() {
        dialog = new AlertDialog.Builder(context)
                .setTitle("Indo-Pacific manual key")
                .setView(content)
                .setNegativeButton(android.R.string.cancel, null)
                .create();
        dialog.show();
        Window window = dialog.getWindow();
        if (window != null) {
            window.setLayout((int) (context.getResources().getDisplayMetrics().widthPixels * 0.94f),
                    (int) (context.getResources().getDisplayMetrics().heightPixels * 0.82f));
        }
        render();
    }

    private void render() {
        questionContent.removeAllViews();
        ManualIdentificationKey.Outcome outcome = key.getOutcome();
        if (outcome != null) {
            renderOutcome(outcome);
            updateNavigationButtons();
            return;
        }

        ManualIdentificationKey.Question question = key.getQuestion();
        addText("Step " + question.getNumber() + "  ·  Indo-Pacific", 13, true,
                ContextCompat.getColor(context, R.color.light_green_accent));
        addText(question.getPrompt(), 19, true, Color.WHITE);
        addText("Choose the closest visible trait. Illustrations are schematic; if unsure, stop.",
                13, false, Color.LTGRAY);

        GridLayout choices = new GridLayout(context);
        choices.setColumnCount(2);
        choices.setUseDefaultMargins(false);
        questionContent.addView(choices, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        for (int i = 0; i < question.getAnswers().size(); i++) {
            final int answerIndex = i;
            MaterialCardView card = new MaterialCardView(context);
            card.setRadius(dp(12));
            card.setCardElevation(dp(2));
            card.setUseCompatPadding(true);
            card.setCardBackgroundColor(Color.rgb(45, 59, 48));
            card.setStrokeWidth(dp(1));
            card.setStrokeColor(Color.rgb(100, 145, 105));

            LinearLayout cardContent = new LinearLayout(context);
            cardContent.setGravity(Gravity.CENTER);
            cardContent.setOrientation(LinearLayout.VERTICAL);
            cardContent.setPadding(dp(8), dp(10), dp(8), dp(10));

            IllustrationView illustration = new IllustrationView(
                    context, question.getIllustration(i));
            cardContent.addView(illustration, new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, dp(78)));

            TextView label = new TextView(context);
            label.setGravity(Gravity.CENTER);
            label.setText(question.getAnswers().get(i));
            label.setTextColor(Color.WHITE);
            label.setTextSize(13);
            label.setLineSpacing(dp(2), 1f);
            LinearLayout.LayoutParams labelParams = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            labelParams.topMargin = dp(6);
            cardContent.addView(label, labelParams);
            card.addView(cardContent);

            card.setClickable(true);
            card.setFocusable(true);
            card.setOnClickListener(v -> {
                key.selectAnswer(answerIndex);
                render();
            });

            GridLayout.LayoutParams cardParams = new GridLayout.LayoutParams(
                    GridLayout.spec(i / 2, 1f), GridLayout.spec(i % 2, 1f));
            cardParams.width = 0;
            cardParams.setMargins(dp(4), dp(4), dp(4), dp(4));
            choices.addView(card, cardParams);
        }
        updateNavigationButtons();
    }

    private void updateNavigationButtons() {
        boolean canNavigate = key.canGoBack();
        backButton.setEnabled(canNavigate);
        restartButton.setEnabled(canNavigate);
        int actionColor = canNavigate
                ? ContextCompat.getColor(context, R.color.light_green_accent)
                : Color.rgb(77, 91, 77);
        int textColor = canNavigate ? Color.BLACK : Color.rgb(155, 165, 155);
        backButton.setBackgroundTintList(ColorStateList.valueOf(actionColor));
        restartButton.setBackgroundTintList(ColorStateList.valueOf(actionColor));
        backButton.setTextColor(textColor);
        restartButton.setTextColor(textColor);
    }

    private void renderOutcome(ManualIdentificationKey.Outcome outcome) {
        if (outcome.hasMatch()) {
            addText("Manual key candidate", 13, true,
                    ContextCompat.getColor(context, R.color.light_green_accent));
            addText(outcome.getScientificName(), 22, true, Color.WHITE);
            addText(outcome.getFieldNote(), 15, false, Color.WHITE);
            addText("No model confidence is available for a manual result. "
                    + "Confirm the identification using a regional field guide.",
                    13, false, Color.LTGRAY);
            MaterialButton useResult = createButton("Save this manual identification");
            useResult.setOnClickListener(v -> {
                if (listener != null) {
                    listener.onManualResult(outcome);
                }
                dialog.dismiss();
            });
            questionContent.addView(useResult, fullWidthParams());
        } else {
            addText("No supported match", 19, true, Color.WHITE);
            addText(outcome.getFieldNote(), 15, false, Color.LTGRAY);
        }
    }

    private MaterialButton addActionButton(LinearLayout parent, String label,
                                          View.OnClickListener listener) {
        MaterialButton button = createButton(label);
        button.setTextSize(12);
        button.setOnClickListener(listener);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
        params.setMargins(dp(3), dp(10), dp(3), 0);
        parent.addView(button, params);
        return button;
    }

    private MaterialButton createButton(String label) {
        MaterialButton button = new MaterialButton(context);
        button.setText(label);
        button.setTextColor(Color.BLACK);
        button.setBackgroundTintList(ColorStateList.valueOf(
                ContextCompat.getColor(context, R.color.light_green_accent)));
        button.setMinHeight(dp(48));
        button.setInsetTop(0);
        button.setInsetBottom(0);
        return button;
    }

    private void addText(String text, int sizeSp, boolean bold, int color) {
        TextView view = new TextView(context);
        view.setText(text);
        view.setTextSize(sizeSp);
        view.setTextColor(color);
        if (bold) {
            view.setTypeface(null, android.graphics.Typeface.BOLD);
        }
        view.setLineSpacing(dp(2), 1f);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        params.bottomMargin = dp(10);
        questionContent.addView(view, params);
    }

    private LinearLayout.LayoutParams fullWidthParams() {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        params.topMargin = dp(10);
        return params;
    }

    private int dp(int value) {
        return Math.round(value * context.getResources().getDisplayMetrics().density);
    }

    private static final class IllustrationView extends View {
        private final String type;
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final int leafColor = Color.rgb(155, 207, 119);
        private final int leafHighlight = leafColor;
        private final int veinColor = leafColor;

        IllustrationView(Context context, String type) {
            super(context);
            this.type = type;
        }

        @Override
        protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            ManualKeyIllustrations.draw(canvas, getWidth(), getHeight(), type);
        }

        private boolean isWebsiteRootIllustration() {
            return "strap".equals(type) || "branched".equals(type)
                    || "oval".equals(type) || "fern".equals(type);
        }

        private void drawWebsiteRootIllustration(Canvas canvas) {
            float size = Math.min(getWidth(), getHeight());
            canvas.save();
            canvas.translate((getWidth() - size) / 2f, (getHeight() - size) / 2f);
            canvas.scale(size / 100f, size / 100f);

            paint.setColor(Color.rgb(201, 159, 98));
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(3f);
            paint.setStrokeCap(Paint.Cap.ROUND);
            canvas.drawLine(17, 92, 82, 92, paint);

            paint.setColor(leafColor);
            paint.setStrokeWidth(3f);
            paint.setStrokeJoin(Paint.Join.ROUND);
            if ("strap".equals(type)) {
                drawWebsiteStrapLeaves(canvas);
            } else if ("branched".equals(type)) {
                Path branches = new Path();
                branches.moveTo(49, 92);
                branches.cubicTo(47, 73, 49, 55, 50, 36);
                branches.moveTo(49, 72);
                branches.cubicTo(37, 64, 29, 54, 21, 42);
                branches.moveTo(50, 78);
                branches.cubicTo(63, 69, 72, 57, 80, 43);
                branches.moveTo(49, 57);
                branches.cubicTo(40, 47, 36, 36, 34, 23);
                branches.moveTo(51, 53);
                branches.cubicTo(60, 42, 65, 31, 68, 18);
                branches.moveTo(22, 43);
                branches.lineTo(13, 31);
                branches.moveTo(22, 43);
                branches.lineTo(31, 32);
                branches.moveTo(80, 44);
                branches.lineTo(88, 31);
                branches.moveTo(80, 44);
                branches.lineTo(70, 33);
                branches.moveTo(34, 24);
                branches.lineTo(27, 15);
                branches.moveTo(34, 24);
                branches.lineTo(42, 15);
                branches.moveTo(68, 19);
                branches.lineTo(61, 10);
                branches.moveTo(68, 19);
                branches.lineTo(76, 11);
                canvas.drawPath(branches, paint);
            } else if ("oval".equals(type)) {
                Path branches = new Path();
                branches.moveTo(49, 92);
                branches.lineTo(49, 53);
                branches.moveTo(49, 72);
                branches.lineTo(29, 59);
                branches.moveTo(49, 67);
                branches.lineTo(69, 53);
                branches.moveTo(49, 57);
                branches.lineTo(39, 42);
                branches.moveTo(49, 57);
                branches.lineTo(59, 40);
                canvas.drawPath(branches, paint);
                drawWebsiteFilledOval(canvas, 26, 48, 10, 20, -34);
                drawWebsiteFilledOval(canvas, 72, 42, 10, 20, 32);
                drawWebsiteFilledOval(canvas, 40, 31, 8, 16, -22);
                drawWebsiteFilledOval(canvas, 60, 29, 8, 16, 22);
            } else {
                Path branches = new Path();
                branches.moveTo(49, 92);
                branches.lineTo(49, 9);
                branches.moveTo(49, 76);
                branches.lineTo(30, 63);
                branches.moveTo(49, 68);
                branches.lineTo(68, 55);
                branches.moveTo(49, 58);
                branches.lineTo(30, 45);
                branches.moveTo(49, 49);
                branches.lineTo(68, 36);
                branches.moveTo(49, 39);
                branches.lineTo(31, 26);
                branches.moveTo(49, 30);
                branches.lineTo(67, 17);
                canvas.drawPath(branches, paint);
                drawWebsiteFilledOval(canvas, 25, 61, 8, 4, 24);
                drawWebsiteFilledOval(canvas, 73, 53, 8, 4, -24);
                drawWebsiteFilledOval(canvas, 25, 43, 8, 4, 24);
                drawWebsiteFilledOval(canvas, 73, 35, 8, 4, -24);
                drawWebsiteFilledOval(canvas, 26, 24, 8, 4, 24);
                drawWebsiteFilledOval(canvas, 72, 16, 8, 4, -24);
            }

            paint.setStyle(Paint.Style.FILL);
            paint.setStrokeCap(Paint.Cap.BUTT);
            canvas.restore();
        }

        private void drawWebsiteStrapLeaves(Canvas canvas) {
            Path leaves = new Path();
            leaves.moveTo(38, 92);
            leaves.cubicTo(34, 64, 18, 41, 17, 12);
            leaves.cubicTo(31, 33, 42, 64, 44, 92);
            leaves.close();
            leaves.moveTo(44, 92);
            leaves.cubicTo(41, 62, 33, 33, 36, 7);
            leaves.cubicTo(47, 30, 49, 62, 48, 92);
            leaves.close();
            leaves.moveTo(49, 92);
            leaves.cubicTo(49, 62, 47, 33, 52, 9);
            leaves.cubicTo(60, 35, 58, 66, 54, 92);
            leaves.close();
            leaves.moveTo(55, 92);
            leaves.cubicTo(59, 62, 67, 34, 72, 12);
            leaves.cubicTo(74, 43, 65, 70, 60, 92);
            leaves.close();
            leaves.moveTo(61, 92);
            leaves.cubicTo(70, 66, 81, 44, 86, 19);
            leaves.cubicTo(88, 50, 75, 77, 66, 92);
            leaves.close();

            paint.setColor(leafColor);
            paint.setStyle(Paint.Style.FILL);
            canvas.drawPath(leaves, paint);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(2f);
            canvas.drawPath(leaves, paint);
        }

        private void drawWebsiteFilledOval(Canvas canvas, float cx, float cy,
                                           float rx, float ry, float rotation) {
            canvas.save();
            canvas.rotate(rotation, cx, cy);
            paint.setColor(leafColor);
            paint.setStyle(Paint.Style.FILL);
            canvas.drawOval(new RectF(cx - rx, cy - ry, cx + rx, cy + ry), paint);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(2f);
            canvas.drawOval(new RectF(cx - rx, cy - ry, cx + rx, cy + ry), paint);
            canvas.restore();
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(3f);
        }

        private void drawBranches(Canvas canvas, float cx, float cy, boolean spiral) {
            paint.setColor(leafHighlight);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeCap(Paint.Cap.ROUND);
            paint.setStrokeWidth(dp(3));
            for (int i = -1; i <= 1; i++) {
                Path path = new Path();
                float x = cx + i * dp(10);
                path.moveTo(x, cy);
                if (spiral) {
                    path.cubicTo(x - dp(18), cy - dp(14), x + dp(18), cy - dp(25),
                            x, cy - dp(45));
                } else {
                    path.cubicTo(x + dp(i * 5), cy - dp(15), x + dp(i * 12),
                            cy - dp(28), x + dp(i * 15), cy - dp(42));
                }
                paint.setColor(leafHighlight);
                paint.setStyle(Paint.Style.STROKE);
                canvas.drawPath(path, paint);
                for (int side = -1; side <= 1; side += 2) {
                    float nodeX = x + dp(i * 7);
                    float nodeY = cy - dp(20 + Math.abs(i * 3));
                    drawBlade(canvas, nodeX, nodeY,
                            nodeX + side * dp(12), nodeY - dp(9), dp(4),
                            side == -1 ? leafColor : leafHighlight);
                }
            }
            paint.setStrokeCap(Paint.Cap.BUTT);
            paint.setStyle(Paint.Style.FILL);
        }

        private void drawFern(Canvas canvas, float cx, float cy, boolean fan) {
            paint.setColor(leafHighlight);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeCap(Paint.Cap.ROUND);
            paint.setStrokeWidth(dp(2));
            canvas.drawLine(cx, cy, cx, cy - dp(50), paint);
            paint.setStyle(Paint.Style.FILL);
            for (int i = 1; i <= 5; i++) {
                float y = cy - dp(7 + i * 8);
                for (int side = -1; side <= 1; side += 2) {
                    float spread = fan ? 10 + i * 2 : 9 + i;
                    float endX = cx + side * dp((int) spread);
                    float endY = y - dp(fan ? 13 : 9);
                    drawBlade(canvas, cx, y, endX, endY, dp(3),
                            (i + side) % 2 == 0 ? leafColor : leafHighlight);
                }
            }
        }

        private void drawOvalLeaves(Canvas canvas, float cx, float cy,
                                    int crossVeins, boolean hairy) {
            for (int i = -1; i <= 1; i++) {
                float x = cx + dp(i * 19);
                float top = cy - dp(42 - Math.abs(i * 4));
                drawBlade(canvas, x, cy - dp(2), x + dp(i * 3), top, dp(9),
                        i == 0 ? leafColor : leafHighlight);
                if (crossVeins > 0) {
                    paint.setColor(veinColor);
                    paint.setStrokeWidth(dp(1));
                    for (int v = 1; v <= crossVeins; v++) {
                        float y = top + dp(5 + v * 3);
                        if (y < cy - dp(5)) {
                            float offset = (y - top) * 0.22f;
                            canvas.drawLine(x - dp(5) + offset, y,
                                    x + dp(5) + offset, y + dp(2), paint);
                        }
                    }
                }
                if (hairy) {
                    paint.setColor(leafColor);
                    paint.setStrokeWidth(dp(1));
                    for (int hair = -2; hair <= 2; hair++) {
                        float y = top + dp(12 + hair * 4);
                        canvas.drawLine(x + dp(7), y, x + dp(10), y - dp(3), paint);
                    }
                }
            }
            paint.setStyle(Paint.Style.FILL);
        }

        private void drawNarrowLeaf(Canvas canvas, float cx, float cy, boolean round) {
            for (int i = -2; i <= 2; i++) {
                float baseX = cx + dp(i * 7);
                float topX = baseX + dp(i * 4);
                if (round) {
                    Path leaf = new Path();
                    leaf.moveTo(baseX, cy);
                    leaf.cubicTo(baseX - dp(3), cy - dp(20), topX - dp(2),
                            cy - dp(39), topX, cy - dp(49));
                    leaf.cubicTo(topX + dp(2), cy - dp(39), baseX + dp(3),
                            cy - dp(20), baseX, cy);
                    paint.setColor(leafColor);
                    canvas.drawPath(leaf, paint);
                    paint.setColor(veinColor);
                    paint.setStrokeWidth(dp(1));
                    canvas.drawLine(baseX, cy - dp(4), topX, cy - dp(43), paint);
                } else {
                    drawBlade(canvas, baseX, cy, topX, cy - dp(48), dp(4),
                            i % 2 == 0 ? leafColor : leafHighlight);
                }
            }
            paint.setStyle(Paint.Style.FILL);
        }

        private void drawBlade(Canvas canvas, float baseX, float baseY,
                               float tipX, float tipY, float halfWidth, int color) {
            float dx = tipX - baseX;
            float dy = tipY - baseY;
            float length = (float) Math.hypot(dx, dy);
            if (length == 0f) {
                return;
            }

            float middleX = (baseX + tipX) / 2f;
            float middleY = (baseY + tipY) / 2f;
            float normalX = -dy / length * halfWidth;
            float normalY = dx / length * halfWidth;
            Path blade = new Path();
            blade.moveTo(baseX, baseY);
            blade.quadTo(middleX + normalX, middleY + normalY, tipX, tipY);
            blade.quadTo(middleX - normalX, middleY - normalY, baseX, baseY);
            blade.close();

            paint.setStyle(Paint.Style.FILL);
            paint.setColor(color);
            canvas.drawPath(blade, paint);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeCap(Paint.Cap.ROUND);
            paint.setStrokeWidth(dp(1));
            paint.setColor(veinColor);
            canvas.drawLine(baseX, baseY, tipX, tipY, paint);
            paint.setStrokeCap(Paint.Cap.BUTT);
            paint.setStyle(Paint.Style.FILL);
        }

        private void drawUnsure(Canvas canvas, float cx, float cy) {
            paint.setColor(leafColor);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(dp(2));
            canvas.drawCircle(cx, cy - dp(25), dp(17), paint);
            paint.setStyle(Paint.Style.FILL);
            paint.setTextAlign(Paint.Align.CENTER);
            paint.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
            paint.setTextSize(dp(24));
            canvas.drawText("?", cx, cy - dp(17), paint);
            paint.setTypeface(android.graphics.Typeface.DEFAULT);
            paint.setTextAlign(Paint.Align.LEFT);
        }

        private void drawTip(Canvas canvas, float cx, float y, String style) {
            paint.setColor(leafColor);
            paint.setStrokeWidth(dp(3));
            if ("trident".equals(style)) {
                canvas.drawLine(cx, y, cx - dp(7), y - dp(8), paint);
                canvas.drawLine(cx, y, cx, y - dp(9), paint);
                canvas.drawLine(cx, y, cx + dp(7), y - dp(8), paint);
            } else if ("serrated".equals(style)) {
                for (int i = -2; i <= 2; i++) {
                    float x = cx + dp(i * 4);
                    canvas.drawLine(x, y, x + dp(2), y - dp(4), paint);
                }
            } else {
                canvas.drawCircle(cx, y - dp(2), dp(4), paint);
            }
        }

        private void drawRhizomeScars(Canvas canvas, float cx, float cy) {
            paint.setColor(Color.rgb(217, 180, 119));
            paint.setStrokeWidth(dp(2));
            for (int i = -2; i <= 2; i++) {
                canvas.drawLine(cx + dp(i * 10), cy - dp(3),
                        cx + dp(i * 10), cy + dp(3), paint);
            }
        }

        private void drawVeins(Canvas canvas, float cx, float y) {
            paint.setColor(veinColor);
            paint.setStrokeWidth(dp(1));
            for (int i = -2; i <= 2; i++) {
                canvas.drawLine(cx + dp(i * 2), y, cx + dp(i * 2), y - dp(18), paint);
            }
            for (int i = 0; i < 3; i++) {
                float crossY = y - dp(7 + i * 5);
                canvas.drawLine(cx - dp(5), crossY, cx + dp(5), crossY + dp(1), paint);
            }
        }

        private int dp(int value) {
            return Math.round(value * getResources().getDisplayMetrics().density);
        }
    }
}
