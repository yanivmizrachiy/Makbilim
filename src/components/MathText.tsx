import React from 'react';

const mathToken = /(\([^)]*[A-Za-z0-9][^)]*\)°?|∠[A-Za-zΑ-Ωα-ω]+(?:\s*=\s*\d+°)?|[A-Za-zℓ][A-Za-z0-9₁₂₃]*\s*∥\s*[A-Za-zℓ][A-Za-z0-9₁₂₃]*|\b[xy]\b|\d+°|[α-ωΑ-Ω])/g;

export function MathText({ text }: { text: string }) {
  const parts = text.split(mathToken).filter(part => part.length > 0);
  return (
    <>
      {parts.map((part, index) => {
        const isMath = mathToken.test(part);
        mathToken.lastIndex = 0;
        return isMath
          ? <bdi className="math" dir="ltr" key={index}>{part}</bdi>
          : <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}
