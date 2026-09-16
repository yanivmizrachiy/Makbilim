import { describe, expect, it } from 'vitest';
import { didacticProfiles } from '../../src/didactics/profile';

const requiredFingerprintKeys = [
  'skill',
  'theoremIds',
  'topology',
  'givenType',
  'targetType',
  'reasoningSteps',
  'responseMode',
  'difficulty',
  'valueFamily',
  'symbolFamily',
  'wordingArchetype',
  'instructionVerb',
  'misconceptionTarget',
  'sourceArchetypeRefs',
  'transferDemand',
] as const;

describe('canonical didactic profiles', () => {
  it('covers exactly the 58 authored tasks with unique fingerprints', () => {
    expect(didacticProfiles).toHaveLength(58);
    expect(new Set(didacticProfiles.map(profile => profile.id)).size).toBe(58);
    expect(new Set(didacticProfiles.map(profile => profile.fingerprint)).size).toBe(58);
  });

  it('keeps every mandatory profile field populated', () => {
    for (const profile of didacticProfiles) {
      expect(profile.learningObjective.trim(), `learningObjective ${profile.id}`).not.toBe('');
      expect(profile.assessmentPurpose.trim(), `assessmentPurpose ${profile.id}`).not.toBe('');
      expect(profile.responseMode.trim(), `responseMode ${profile.id}`).not.toBe('');
      expect(profile.reasoningSteps, `reasoningSteps ${profile.id}`).toBeGreaterThan(0);
      expect(profile.misconceptionTarget.trim(), `misconceptionTarget ${profile.id}`).not.toBe('');
      expect(profile.evidenceOfLearning.trim(), `evidenceOfLearning ${profile.id}`).not.toBe('');
      expect(profile.wordingArchetype.trim(), `wordingArchetype ${profile.id}`).not.toBe('');
      expect(profile.instructionVerb.trim(), `instructionVerb ${profile.id}`).not.toBe('');
      expect(profile.sourceArchetypeRefs.length, `sourceArchetypeRefs ${profile.id}`).toBeGreaterThan(0);
      expect(profile.transferDemand, `transferDemand ${profile.id}`).toBeGreaterThan(0);
    }
  });

  it('fingerprints include every semantic component required by SPEC section 12', () => {
    for (const profile of didacticProfiles) {
      const fingerprint = JSON.parse(profile.fingerprint) as Record<string, unknown>;
      for (const key of requiredFingerprintKeys) {
        expect(fingerprint, `${profile.id} missing fingerprint key ${key}`).toHaveProperty(key);
      }
      expect(String(fingerprint.topology ?? '').trim(), `topology ${profile.id}`).not.toBe('');
      expect(String(fingerprint.givenType ?? '').trim(), `givenType ${profile.id}`).not.toBe('');
      expect(String(fingerprint.targetType ?? '').trim(), `targetType ${profile.id}`).not.toBe('');
      expect(String(fingerprint.valueFamily ?? '').trim(), `valueFamily ${profile.id}`).not.toBe('');
      expect(String(fingerprint.symbolFamily ?? '').trim(), `symbolFamily ${profile.id}`).not.toBe('');
      expect(Array.isArray(fingerprint.sourceArchetypeRefs), `sourceArchetypeRefs ${profile.id}`).toBe(true);
    }
  });
});
