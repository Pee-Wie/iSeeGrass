package com.iseegrass.native_app.ui.identify;

import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;

import androidx.core.graphics.PathParser;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class ManualKeyIllustrations {

    private static final int LEAF_COLOR = 0xff9bcf77;
    private static final int RHIZOME_COLOR = 0xffc99f62;
    private static final Pattern ELEMENT = Pattern.compile("<(path|ellipse|circle)\\b([^>]*)/?>");
    private static final Map<String, String> ILLUSTRATIONS = createIllustrations();

    private ManualKeyIllustrations() {}

    static boolean hasIllustration(String name) {
        return ILLUSTRATIONS.containsKey(name);
    }

    static void draw(Canvas canvas, int width, int height, String name) {
        float size = Math.min(width, height);
        if (size <= 0) return;

        canvas.save();
        canvas.translate((width - size) / 2f, (height - size) / 2f);
        canvas.scale(size / 100f, size / 100f);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(RHIZOME_COLOR);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(3f);
        paint.setStrokeCap(Paint.Cap.ROUND);
        canvas.drawLine(17, 92, 82, 92, paint);

        String fragment = ILLUSTRATIONS.getOrDefault(name, ILLUSTRATIONS.get("unsure"));
        Matcher matcher = ELEMENT.matcher(fragment);
        while (matcher.find()) {
            String type = matcher.group(1);
            String attributes = matcher.group(2);
            boolean filled = "manual-key-svg__filled".equals(attribute(attributes, "class"));
            paint.setColor(LEAF_COLOR);
            paint.setStyle(filled ? Paint.Style.FILL_AND_STROKE : Paint.Style.STROKE);
            paint.setStrokeWidth(filled ? 2f : 3f);
            paint.setStrokeCap(Paint.Cap.ROUND);
            paint.setStrokeJoin(Paint.Join.ROUND);

            if ("path".equals(type)) {
                Path path = PathParser.createPathFromPathData(attribute(attributes, "d"));
                if (path != null) canvas.drawPath(path, paint);
            } else if ("ellipse".equals(type)) {
                drawEllipse(canvas, paint, attributes);
            } else {
                float cx = number(attributes, "cx");
                float cy = number(attributes, "cy");
                float radius = number(attributes, "r");
                canvas.drawCircle(cx, cy, radius, paint);
            }
        }

        canvas.restore();
    }

    private static void drawEllipse(Canvas canvas, Paint paint, String attributes) {
        float cx = number(attributes, "cx");
        float cy = number(attributes, "cy");
        float rx = number(attributes, "rx");
        float ry = number(attributes, "ry");
        canvas.save();
        String transform = attribute(attributes, "transform");
        if (transform != null && transform.startsWith("rotate(")) {
            String[] values = transform.substring(7, transform.length() - 1).trim().split("\\s+");
            if (values.length == 3) {
                canvas.rotate(Float.parseFloat(values[0]),
                        Float.parseFloat(values[1]), Float.parseFloat(values[2]));
            }
        }
        canvas.drawOval(new RectF(cx - rx, cy - ry, cx + rx, cy + ry), paint);
        canvas.restore();
    }

    private static String attribute(String attributes, String name) {
        Matcher matcher = Pattern.compile("(?:^|\\s)" + Pattern.quote(name)
                + "=\"([^\"]*)\"").matcher(attributes);
        return matcher.find() ? matcher.group(1) : null;
    }

    private static float number(String attributes, String name) {
        String value = attribute(attributes, name);
        return value != null ? Float.parseFloat(value) : 0f;
    }

    private static Map<String, String> createIllustrations() {
        Map<String, String> illustrations = new HashMap<>();
        illustrations.put("strap", "<path class=\"manual-key-svg__filled\" d=\"M38 92C34 64 18 41 17 12C31 33 42 64 44 92ZM44 92C41 62 33 33 36 7C47 30 49 62 48 92ZM49 92C49 62 47 33 52 9C60 35 58 66 54 92ZM55 92C59 62 67 34 72 12C74 43 65 70 60 92ZM61 92C70 66 81 44 86 19C88 50 75 77 66 92Z\"/>");
        illustrations.put("branched", "<path d=\"M49 92C47 73 49 55 50 36M49 72C37 64 29 54 21 42M50 78C63 69 72 57 80 43M49 57C40 47 36 36 34 23M51 53C60 42 65 31 68 18M22 43L13 31M22 43L31 32M80 44L88 31M80 44L70 33M34 24L27 15M34 24L42 15M68 19L61 10M68 19L76 11\"/>");
        illustrations.put("oval", "<path d=\"M49 92V53M49 72L29 59M49 67L69 53M49 57L39 42M49 57L59 40\"/><ellipse class=\"manual-key-svg__filled\" cx=\"26\" cy=\"48\" rx=\"10\" ry=\"20\" transform=\"rotate(-34 26 48)\"/><ellipse class=\"manual-key-svg__filled\" cx=\"72\" cy=\"42\" rx=\"10\" ry=\"20\" transform=\"rotate(32 72 42)\"/><ellipse class=\"manual-key-svg__filled\" cx=\"40\" cy=\"31\" rx=\"8\" ry=\"16\" transform=\"rotate(-22 40 31)\"/><ellipse class=\"manual-key-svg__filled\" cx=\"60\" cy=\"29\" rx=\"8\" ry=\"16\" transform=\"rotate(22 60 29)\"/>");
        illustrations.put("fern", "<path d=\"M49 92V9M49 76L30 63M49 68L68 55M49 58L30 45M49 49L68 36M49 39L31 26M49 30L67 17\"/><ellipse class=\"manual-key-svg__filled\" cx=\"25\" cy=\"61\" rx=\"8\" ry=\"4\" transform=\"rotate(24 25 61)\"/><ellipse class=\"manual-key-svg__filled\" cx=\"73\" cy=\"53\" rx=\"8\" ry=\"4\" transform=\"rotate(-24 73 53)\"/><ellipse class=\"manual-key-svg__filled\" cx=\"25\" cy=\"43\" rx=\"8\" ry=\"4\" transform=\"rotate(24 25 43)\"/><ellipse class=\"manual-key-svg__filled\" cx=\"73\" cy=\"35\" rx=\"8\" ry=\"4\" transform=\"rotate(-24 73 35)\"/><ellipse class=\"manual-key-svg__filled\" cx=\"26\" cy=\"24\" rx=\"8\" ry=\"4\" transform=\"rotate(24 26 24)\"/><ellipse class=\"manual-key-svg__filled\" cx=\"72\" cy=\"16\" rx=\"8\" ry=\"4\" transform=\"rotate(-24 72 16)\"/>");
        illustrations.put("cylindrical", "<path d=\"M34 92C34 65 39 35 48 9M49 92C49 63 50 34 52 9M64 92C62 63 64 34 72 9\"/><circle class=\"manual-key-svg__filled\" cx=\"48\" cy=\"9\" r=\"3\"/><circle class=\"manual-key-svg__filled\" cx=\"52\" cy=\"9\" r=\"3\"/><circle class=\"manual-key-svg__filled\" cx=\"72\" cy=\"9\" r=\"3\"/>");
        illustrations.put("rounded-tip", "<path class=\"manual-key-svg__filled\" d=\"M29 92C29 59 30 32 33 15C34 8 44 8 45 15C48 35 48 65 47 92ZM55 92C54 61 56 33 59 15C60 8 70 8 71 15C74 36 73 66 72 92Z\"/>");
        illustrations.put("serrated-tip", "<path class=\"manual-key-svg__filled\" d=\"M31 92L33 19L37 24L40 13L44 23L48 10L52 22L56 12L60 24L64 16L66 92Z\"/>");
        illustrations.put("trident-tip", "<path class=\"manual-key-svg__filled\" d=\"M34 92L39 21L46 29L50 9L55 29L63 20L67 92Z\"/><path d=\"M39 21L34 13M39 21L45 14M63 20L59 12M63 20L69 13\"/>");
        illustrations.put("rhizome", "<path d=\"M15 80H84M30 80V22M48 80V12M66 80V27M30 68H34M48 68H52M66 68H70M48 50H52\"/>");
        illustrations.put("cross-veins", "<path class=\"manual-key-svg__filled\" d=\"M21 92C24 64 29 35 37 12C45 34 45 63 43 92ZM44 92C46 60 51 32 58 10C67 38 67 64 66 92ZM66 92C69 64 74 40 81 20C84 49 82 73 80 92Z\"/><path d=\"M32 36L70 36M30 53L70 53M28 70L69 70M26 86L68 86M40 25L62 25\"/>");
        illustrations.put("branch-short", "<path d=\"M49 92L44 45L25 26M44 45L63 27M42 59L26 43M42 59L60 42\"/>");
        illustrations.put("branch-spiral", "<path d=\"M49 92C27 71 75 62 47 47C19 31 68 26 49 9M35 65C20 51 24 43 33 39M61 49C76 36 69 28 62 25\"/>");
        illustrations.put("oval-smooth", "<ellipse class=\"manual-key-svg__filled\" cx=\"49\" cy=\"32\" rx=\"18\" ry=\"27\"/><path d=\"M49 58V92M49 36L25 51M49 40L74 55\"/>");
        illustrations.put("oval-hairy", "<ellipse class=\"manual-key-svg__filled\" cx=\"49\" cy=\"32\" rx=\"18\" ry=\"27\"/><path d=\"M49 58V92M49 36L25 51M49 40L74 55M30 16L23 10M35 9L31 2M42 5L41 0M56 5L57 0M64 10L69 4M69 18L77 13\"/>");
        illustrations.put("oval-many-veins", "<ellipse class=\"manual-key-svg__filled\" cx=\"49\" cy=\"42\" rx=\"25\" ry=\"34\"/><path d=\"M49 75V8M32 20L65 60M28 32L68 52M28 46L68 34M34 62L64 20\"/>");
        illustrations.put("oval-few-veins", "<ellipse class=\"manual-key-svg__filled\" cx=\"49\" cy=\"42\" rx=\"25\" ry=\"34\"/><path d=\"M49 75V8M29 31L68 49M31 54L65 29\"/>");
        illustrations.put("fern-pairs", "<path d=\"M49 92V8M49 70L26 59M49 70L72 59M49 51L26 40M49 51L72 40M49 32L29 21M49 32L69 21\"/><ellipse class=\"manual-key-svg__filled\" cx=\"24\" cy=\"58\" rx=\"8\" ry=\"4\"/><ellipse class=\"manual-key-svg__filled\" cx=\"74\" cy=\"58\" rx=\"8\" ry=\"4\"/><ellipse class=\"manual-key-svg__filled\" cx=\"24\" cy=\"39\" rx=\"8\" ry=\"4\"/><ellipse class=\"manual-key-svg__filled\" cx=\"74\" cy=\"39\" rx=\"8\" ry=\"4\"/>");
        illustrations.put("fern-fan", "<path d=\"M49 92V44M49 66L22 36M49 66L34 28M49 66L49 22M49 66L64 28M49 66L77 36\"/><ellipse class=\"manual-key-svg__filled\" cx=\"21\" cy=\"33\" rx=\"9\" ry=\"4\"/><ellipse class=\"manual-key-svg__filled\" cx=\"33\" cy=\"25\" rx=\"9\" ry=\"4\"/><ellipse class=\"manual-key-svg__filled\" cx=\"49\" cy=\"19\" rx=\"9\" ry=\"4\"/><ellipse class=\"manual-key-svg__filled\" cx=\"65\" cy=\"25\" rx=\"9\" ry=\"4\"/><ellipse class=\"manual-key-svg__filled\" cx=\"78\" cy=\"33\" rx=\"9\" ry=\"4\"/>");
        illustrations.put("unsure", "<circle cx=\"49\" cy=\"45\" r=\"31\"/><path d=\"M39 36C40 22 61 22 62 36C63 44 49 46 49 56M49 68V69\"/>");
        return illustrations;
    }
}
