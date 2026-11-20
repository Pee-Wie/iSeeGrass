package com.iseegrass.native_app.ui.identify;

import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public class ManualIdentificationKeyTest {

    @Test
    public void rootHasFourIllustratedIndoPacificChoices() {
        ManualIdentificationKey key = new ManualIdentificationKey();

        assertEquals(4, key.getQuestion().getAnswers().size());
        assertEquals("Strap-shaped leaves", key.getQuestion().getAnswers().get(0));
        assertEquals("Branched leaves", key.getQuestion().getAnswers().get(1));
        assertEquals("Oval or oblong leaves", key.getQuestion().getAnswers().get(2));
        assertEquals("Fern-like leaves", key.getQuestion().getAnswers().get(3));
    }

    @Test
    public void nativeKeyHasEveryWebsiteIllustration() {
        String[] illustrations = {
                "strap", "branched", "oval", "fern", "cylindrical", "rounded-tip",
                "serrated-tip", "trident-tip", "rhizome", "cross-veins", "branch-short",
                "branch-spiral", "oval-smooth", "oval-hairy", "oval-many-veins",
                "oval-few-veins", "fern-pairs", "fern-fan", "unsure"
        };
        for (String illustration : illustrations) {
            assertTrue("Missing illustration: " + illustration,
                    ManualKeyIllustrations.hasIllustration(illustration));
        }

        ManualIdentificationKey key = new ManualIdentificationKey();
        key.selectAnswer(0);
        assertEquals("strap", key.getQuestion().getIllustration(1));
    }

    @Test
    public void resolvesOnlyTheTenSelectedSpecies() {
        assertMatch(new int[]{0, 0}, "Syringodium isoetifolium");
        assertMatch(new int[]{0, 1, 0}, "Cymodocea rotundata");
        assertMatch(new int[]{0, 1, 1}, "Cymodocea serrulata");
        assertMatch(new int[]{0, 1, 2}, "Halodule uninervis");
        assertMatch(new int[]{0, 1, 3}, "Thalassia hemprichii");
        assertMatch(new int[]{0, 1, 4}, "Zostera capricorni");
        assertMatch(new int[]{2, 0, 0}, "Halophila ovalis");
        assertMatch(new int[]{2, 0, 1}, "Halophila minor");
        assertMatch(new int[]{3, 0}, "Halophila spinulosa");
        assertMatch(new int[]{3, 1}, "Halophila tricostata");
    }

    @Test
    public void unsupportedBranchesDoNotReturnAnUnlistedSpecies() {
        ManualIdentificationKey key = new ManualIdentificationKey();
        key.selectAnswer(1);
        key.selectAnswer(1);

        assertFalse(key.getOutcome().hasMatch());
        assertTrue(key.getOutcome().getFieldNote().contains("ten species"));
    }

    @Test
    public void canGoBackAndChangeAChoice() {
        ManualIdentificationKey key = new ManualIdentificationKey();
        assertFalse(key.canGoBack());
        key.selectAnswer(0);
        assertTrue(key.canGoBack());
        key.selectAnswer(1);
        key.selectAnswer(0);

        assertEquals("Cymodocea rotundata", key.getOutcome().getScientificName());
        assertTrue(key.goBack());
        assertEquals(6, key.getQuestion().getAnswers().size());
        key.selectAnswer(4);
        assertEquals("Zostera capricorni", key.getOutcome().getScientificName());
        key.restart();
        assertFalse(key.canGoBack());
    }

    private void assertMatch(int[] answers, String expected) {
        ManualIdentificationKey key = new ManualIdentificationKey();
        for (int answer : answers) {
            key.selectAnswer(answer);
        }
        assertTrue(key.getOutcome().hasMatch());
        assertEquals(expected, key.getOutcome().getScientificName());
    }
}
