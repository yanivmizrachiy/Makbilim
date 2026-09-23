/**
 * Semantic angle roles — the ONE place that decides how an angle's pedagogical role is drawn.
 *
 * Pages declare WHAT an angle is; this table decides HOW it looks, so the same role looks the
 * same on every page. Meaning never depends on colour alone: each role also differs in arc
 * FORM (single / double / dashed), so it survives grayscale printing and forced-colors mode.
 *
 * Use explicit tone/arcStyle instead of a role ONLY when the arc form itself is part of the
 * task text (e.g. unit 1: "the pair marked with a double arc").
 */

export type AngleRole = 'given' | 'target' | 'marked' | 'auxiliary';
export type AngleTone = 'primary' | 'secondary' | 'neutral';
export type AngleArcStyle = 'single' | 'double' | 'dashed';

export type AngleStyle = { tone: AngleTone; arcStyle: AngleArcStyle };

export const ANGLE_ROLE_STYLE: Readonly<Record<AngleRole, AngleStyle & { meaning: string }>> = {
  given: { tone: 'primary', arcStyle: 'single', meaning: 'נתון — זווית שגודלה ידוע' },
  marked: { tone: 'primary', arcStyle: 'single', meaning: 'זווית מסומנת שיש לזהות את הקשר אליה' },
  target: { tone: 'secondary', arcStyle: 'double', meaning: 'זווית היעד — הזווית שיש לחשב או למצוא' },
  auxiliary: { tone: 'neutral', arcStyle: 'dashed', meaning: 'זווית עזר בדרך לפתרון' },
};

export function resolveAngleStyle(mark: {
  role?: AngleRole | undefined;
  tone?: AngleTone | undefined;
  arcStyle?: AngleArcStyle | undefined;
}): AngleStyle {
  if (mark.role) {
    if (mark.tone !== undefined || mark.arcStyle !== undefined) {
      throw new Error(`Angle mark with role "${mark.role}" must not also set tone/arcStyle — the role decides the style.`);
    }
    const { tone, arcStyle } = ANGLE_ROLE_STYLE[mark.role];
    return { tone, arcStyle };
  }
  return { tone: mark.tone ?? 'primary', arcStyle: mark.arcStyle ?? 'single' };
}
