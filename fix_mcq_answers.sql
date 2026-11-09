-- Fix corrupted EDX MCQ answers in questions_data caused by mark scheme variant mismatch
BEGIN;

-- Paper: edx-ial_25oct_qp_u1a.pdf (Mark Scheme: edx-ial_25oct_ms_u1a.pdf)
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_25oct_u1a_q1';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_25oct_u1a_q2';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_25oct_u1a_q3';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_25oct_u1a_q4';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_25oct_u1a_q5';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_25oct_u1a_q6';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_25oct_u1a_q7';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_25oct_u1a_q8';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_25oct_u1a_q9';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_25oct_u1a_q10';

-- Paper: edx-ial_26jan_qp_u1a.pdf (Mark Scheme: edx-ial_26jan_ms_u1a.pdf)
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_26jan_u1a_q1';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jan_u1a_q2';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_26jan_u1a_q3';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jan_u1a_q4';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jan_u1a_q5';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jan_u1a_q6';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jan_u1a_q7';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_26jan_u1a_q8';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jan_u1a_q9';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jan_u1a_q10';

-- Paper: edx-ial_26jun_qp_u1a.pdf (Mark Scheme: edx-ial_26jun_ms_u1a.pdf)
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jun_u1a_q1';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jun_u1a_q2';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jun_u1a_q3';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jun_u1a_q4';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jun_u1a_q5';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_26jun_u1a_q6';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jun_u1a_q7';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_26jun_u1a_q8';
UPDATE public.questions_data SET ms_details = 'Answer: A' WHERE id = 'edx-ial_26jun_u1a_q9';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jun_u1a_q10';

-- Paper: edx-ial_25oct_qp_u2a.pdf (Mark Scheme: edx-ial_25oct_ms_u2a.pdf)
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_25oct_u2a_q1';
UPDATE public.questions_data SET ms_details = 'Answer: A' WHERE id = 'edx-ial_25oct_u2a_q2';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_25oct_u2a_q3';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_25oct_u2a_q4';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_25oct_u2a_q5';
UPDATE public.questions_data SET ms_details = 'Answer: A' WHERE id = 'edx-ial_25oct_u2a_q6';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_25oct_u2a_q7';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_25oct_u2a_q8';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_25oct_u2a_q9';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_25oct_u2a_q10';

-- Paper: edx-ial_26jan_qp_u2a.pdf (Mark Scheme: edx-ial_26jan_ms_u2a.pdf)
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jan_u2a_q1';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jan_u2a_q2';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_26jan_u2a_q3';
UPDATE public.questions_data SET ms_details = 'Answer: A' WHERE id = 'edx-ial_26jan_u2a_q4';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jan_u2a_q5';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_26jan_u2a_q6';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jan_u2a_q7';
UPDATE public.questions_data SET ms_details = 'Answer: A' WHERE id = 'edx-ial_26jan_u2a_q8';
UPDATE public.questions_data SET ms_details = 'Answer: A' WHERE id = 'edx-ial_26jan_u2a_q9';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jan_u2a_q10';

-- Paper: edx-ial_26jun_qp_u2a.pdf (Mark Scheme: edx-ial_26jun_ms_u2a.pdf)
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_26jun_u2a_q1';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jun_u2a_q2';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jun_u2a_q3';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_26jun_u2a_q4';
UPDATE public.questions_data SET ms_details = 'Answer: A' WHERE id = 'edx-ial_26jun_u2a_q5';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jun_u2a_q6';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jun_u2a_q7';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jun_u2a_q8';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_26jun_u2a_q9';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jun_u2a_q10';

-- Paper: edx-ial_25oct_qp_u4a.pdf (Mark Scheme: edx-ial_25oct_ms_u4a.pdf)
UPDATE public.questions_data SET ms_details = 'Answer: A' WHERE id = 'edx-ial_25oct_u4a_q1';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_25oct_u4a_q2';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_25oct_u4a_q3';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_25oct_u4a_q4';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_25oct_u4a_q5';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_25oct_u4a_q6';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_25oct_u4a_q7';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_25oct_u4a_q8';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_25oct_u4a_q9';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_25oct_u4a_q10';

-- Paper: edx-ial_26jan_qp_u4.pdf (Mark Scheme: edx-ial_26jan_ms_u4.pdf)
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jan_u4_q1';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jan_u4_q2';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_26jan_u4_q3';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jan_u4_q4';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_26jan_u4_q5';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jan_u4_q6';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_26jan_u4_q7';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jan_u4_q8';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jan_u4_q9';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_26jan_u4_q10';

-- Paper: edx-ial_26jun_qp_u4a.pdf (Mark Scheme: edx-ial_26jun_ms_u4a.pdf)
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_26jun_u4a_q1';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jun_u4a_q2';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jun_u4a_q3';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jun_u4a_q4';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jun_u4a_q5';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jun_u4a_q6';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jun_u4a_q7';
UPDATE public.questions_data SET ms_details = 'Answer: A' WHERE id = 'edx-ial_26jun_u4a_q8';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_26jun_u4a_q9';
UPDATE public.questions_data SET ms_details = 'Answer: A' WHERE id = 'edx-ial_26jun_u4a_q10';

-- Paper: edx-ial_22jan_qp_u5_unused.pdf (Mark Scheme: edx-ial_22jan_ms_u5_unused.pdf)
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_22jan_u5_unused_q1';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_22jan_u5_unused_q2';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_22jan_u5_unused_q3';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_22jan_u5_unused_q4';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_22jan_u5_unused_q5';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_22jan_u5_unused_q6';
UPDATE public.questions_data SET ms_details = 'Answer: A' WHERE id = 'edx-ial_22jan_u5_unused_q7';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_22jan_u5_unused_q8';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_22jan_u5_unused_q9';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_22jan_u5_unused_q10';

-- Paper: edx-ial_26jan_qp_u5.pdf (Mark Scheme: edx-ial_26jan_ms_u5.pdf)
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_26jan_u5_q1';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jan_u5_q2';
UPDATE public.questions_data SET ms_details = 'Answer: A' WHERE id = 'edx-ial_26jan_u5_q3';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jan_u5_q4';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jan_u5_q5';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jan_u5_q6';
UPDATE public.questions_data SET ms_details = 'Answer: A' WHERE id = 'edx-ial_26jan_u5_q7';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jan_u5_q8';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_26jan_u5_q9';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_26jan_u5_q10';

-- Paper: edx-ial_26jun_qp_u5a.pdf (Mark Scheme: edx-ial_26jun_ms_u5a.pdf)
UPDATE public.questions_data SET ms_details = 'Answer: A' WHERE id = 'edx-ial_26jun_u5a_q1';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jun_u5a_q2';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jun_u5a_q3';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jun_u5a_q4';
UPDATE public.questions_data SET ms_details = 'Answer: C' WHERE id = 'edx-ial_26jun_u5a_q5';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jun_u5a_q6';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jun_u5a_q7';
UPDATE public.questions_data SET ms_details = 'Answer: D' WHERE id = 'edx-ial_26jun_u5a_q8';
UPDATE public.questions_data SET ms_details = 'Answer: B' WHERE id = 'edx-ial_26jun_u5a_q9';
UPDATE public.questions_data SET ms_details = 'Answer: A' WHERE id = 'edx-ial_26jun_u5a_q10';

COMMIT;
-- Done! All corrupted MCQ answers updated.
