Reviews section — testimonial portraits
=======================================

Drop the card portraits here as 216 x 256 (WxH) WebP files. The Reviews carousel
references these paths (see index.html, .reviews__card):

  james.webp          — James O'Connor  (real review, front card on load)
  anastasia.webp      — Anastasia Litvinenko (real review)
  placeholder-3.webp  — Elena Rostova / replace with the real review + photo
  placeholder-4.webp  — placeholder card, replace in code
  placeholder-5.webp  — placeholder card, replace in code

Until a file exists, the card shows a plain #2a2a2a box (the broken <img> is
hidden by js/script.js → initReviews). Photos are rendered grayscale to match
the mockup, so any colour source works.
