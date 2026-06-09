-- Early-close deadline for a question, set when all but one player has answered.
-- NULL means the question runs its full QUESTION_TIME_MS.
ALTER TABLE questions ADD COLUMN closes_at timestamptz;
