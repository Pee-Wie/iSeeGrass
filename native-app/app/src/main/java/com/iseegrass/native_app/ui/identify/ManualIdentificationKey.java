package com.iseegrass.native_app.ui.identify;

import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Collections;
import java.util.Deque;
import java.util.List;

/** A conservative Indo-Pacific key limited to the ten selected chart species. */
public final class ManualIdentificationKey {

    public static final class Question {
        private final String prompt;
        private final List<String> answers;
        private final List<String> illustrations;
        private final boolean[] enabledAnswers;
        private final String availabilityMessage;
        private final int number;

        private Question(String prompt, int number, String[] answers, String[] illustrations,
                         String availabilityMessage, boolean[] enabledAnswers) {
            this.prompt = prompt;
            this.number = number;
            this.answers = Collections.unmodifiableList(Arrays.asList(answers));
            this.illustrations = Collections.unmodifiableList(Arrays.asList(illustrations));
            this.availabilityMessage = availabilityMessage;
            this.enabledAnswers = enabledAnswers.clone();
        }

        public String getPrompt() {
            return prompt;
        }

        public List<String> getAnswers() {
            return answers;
        }

        public String getIllustration(int index) {
            return illustrations.get(index);
        }

        public int getNumber() {
            return number;
        }

        public boolean isAnswerEnabled(int index) {
            return enabledAnswers[index];
        }

        public String getAvailabilityMessage() {
            return availabilityMessage;
        }
    }

    public static final class Outcome {
        private final String scientificName;
        private final String fieldNote;

        private Outcome(String scientificName, String fieldNote) {
            this.scientificName = scientificName;
            this.fieldNote = fieldNote;
        }

        public boolean hasMatch() {
            return scientificName != null;
        }

        public String getScientificName() {
            return scientificName;
        }

        public String getFieldNote() {
            return fieldNote;
        }
    }

    private static final String[] ROOT_ANSWERS = {
            "Strap-shaped leaves",
            "Branched leaves",
            "Oval or oblong leaves",
            "Fern-like leaves"
    };
    private static final String[] ROOT_ILLUSTRATIONS = {
            "strap", "branched", "oval", "fern"
    };

    private static final Outcome NO_MATCH = new Outcome(null,
            "The observed features do not match one of the ten species in this key. "
                    + "Do not force a result; use a local field guide or ask a specialist.");

    private final Deque<String> previousStages = new ArrayDeque<>();
    private String stage = "root";
    private Outcome outcome;

    public Question getQuestion() {
        if (outcome != null) {
            return null;
        }

        switch (stage) {
            case "root":
                return question("Which description best matches the leaf form?", 1,
                        ROOT_ANSWERS, ROOT_ILLUSTRATIONS);
            case "strap-profile":
                return question("Is the leaf flat or cylindrical in cross-section?", 2,
                        new String[]{
                                "Cylindrical leaf that tapers to a point",
                                "Flat, strap-shaped leaf"
                        },
                        new String[]{"cylindrical", "strap"});
            case "strap-traits":
                return question("Which combination of tip, veins, and attachment matches best?",
                        3,
                        new String[]{
                                "Rounded tip, 7–15 veins, and a clear leaf sheath",
                                "Serrated tip, broad blade (5–9 mm), 13–17 veins",
                                "One central vein and a three-toothed tip",
                                "Serrated blade with a robust rhizome showing leaf scars",
                                "Five lengthwise veins, cross-veins, and no upright shoot",
                                "None of these or unsure"
                        },
                        new String[]{
                                "rounded-tip", "serrated-tip", "trident-tip",
                                "rhizome", "cross-veins", "unsure"
                        });
            case "branched":
                return question("Which branch pattern do you see?", 2,
                        new String[]{
                                "Short and mostly straight",
                                "Long and spiralled"
                        },
                        new String[]{"branch-short", "branch-spiral"},
                        "Branched-leaf species are not included in the current assessment scope.",
                        new boolean[]{false, false});
            case "oval-surface":
                return question("Are there hairs on the leaf surface?", 2,
                        new String[]{
                                "No visible hairs",
                                "Hairs are visible",
                                "Unsure"
                        },
                        new String[]{"oval-smooth", "oval-hairy", "unsure"});
            case "oval-veins":
                return question("Count the cross-veins between the lengthwise veins.", 3,
                        new String[]{
                                "About eight or more cross-veins",
                                "Fewer than eight cross-veins",
                                "Unable to count confidently"
                        },
                        new String[]{"oval-many-veins", "oval-few-veins", "unsure"});
            case "fern-arrangement":
                return question("How are the small leaflets arranged on the stem?", 2,
                        new String[]{
                                "Opposite pairs along the stem",
                                "A fan of leaflets around the stem"
                        },
                        new String[]{"fern-pairs", "fern-fan"});
            default:
                throw new IllegalStateException("Unknown manual key stage: " + stage);
        }
    }

    public Outcome getOutcome() {
        return outcome;
    }

    public boolean canGoBack() {
        return !previousStages.isEmpty();
    }

    public void selectAnswer(int answerIndex) {
        Question question = getQuestion();
        if (question == null || answerIndex < 0 || answerIndex >= question.getAnswers().size()) {
            throw new IllegalArgumentException("Answer is not available for the current question");
        }
        if (!question.isAnswerEnabled(answerIndex)) {
            throw new IllegalArgumentException("Answer is not available in the current assessment scope");
        }

        String currentStage = stage;
        previousStages.push(currentStage);

        switch (currentStage) {
            case "root":
                stage = new String[]{
                        "strap-profile", "branched", "oval-surface", "fern-arrangement"
                }[answerIndex];
                break;
            case "strap-profile":
                if (answerIndex == 0) {
                    outcome = match("Syringodium isoetifolium",
                            "Its leaves are cylindrical in cross-section and taper to a point.");
                } else {
                    stage = "strap-traits";
                }
                break;
            case "strap-traits":
                outcome = new Outcome(new String[]{
                        "Cymodocea rotundata",
                        "Cymodocea serrulata",
                        "Halodule uninervis",
                        "Thalassia hemprichii",
                        "Zostera capricorni",
                        null
                }[answerIndex], new String[]{
                        "Rounded leaf tip, 7–15 veins, and a well-developed leaf sheath.",
                        "Serrated leaf tip, broad blade, and 13–17 longitudinal veins.",
                        "A central vein and a three-toothed leaf tip.",
                        "Serrated strap leaves and a robust rhizome with leaf scars.",
                        "Five longitudinal veins, cross-veins, and growth directly from the rhizome.",
                        NO_MATCH.getFieldNote()
                }[answerIndex]);
                break;
            case "branched":
                outcome = NO_MATCH;
                break;
            case "oval-surface":
                if (answerIndex == 0) {
                    stage = "oval-veins";
                } else {
                    outcome = NO_MATCH;
                }
                break;
            case "oval-veins":
                if (answerIndex == 0) {
                    outcome = match("Halophila ovalis",
                            "The leaf surface is hairless and has about eight or more cross-veins.");
                } else if (answerIndex == 1) {
                    outcome = match("Halophila minor",
                            "The leaf surface is hairless and has fewer than eight cross-veins.");
                } else {
                    outcome = NO_MATCH;
                }
                break;
            case "fern-arrangement":
                if (answerIndex == 0) {
                    outcome = match("Halophila spinulosa",
                            "The fern-like leaflets are arranged in opposite pairs.");
                } else if (answerIndex == 1) {
                    outcome = match("Halophila tricostata",
                            "The fern-like leaflets form a fan around the stem.");
                }
                break;
            default:
                throw new IllegalStateException("Unknown manual key stage: " + currentStage);
        }
    }

    public boolean goBack() {
        if (previousStages.isEmpty()) {
            return false;
        }
        stage = previousStages.pop();
        outcome = null;
        return true;
    }

    public void restart() {
        stage = "root";
        outcome = null;
        previousStages.clear();
    }

    private static Question question(String prompt, int number,
                                     String[] answers, String[] illustrations) {
        boolean[] enabledAnswers = new boolean[answers.length];
        Arrays.fill(enabledAnswers, true);
        return new Question(prompt, number, answers, illustrations, null, enabledAnswers);
    }

    private static Question question(String prompt, int number, String[] answers,
                                     String[] illustrations, String availabilityMessage,
                                     boolean[] enabledAnswers) {
        if (answers.length != illustrations.length || answers.length != enabledAnswers.length) {
            throw new IllegalArgumentException("Question choices must have matching metadata");
        }
        return new Question(prompt, number, answers, illustrations,
                availabilityMessage, enabledAnswers);
    }

    private static Outcome match(String scientificName, String fieldNote) {
        return new Outcome(scientificName, fieldNote);
    }
}
