-- ============================================================
-- Emt7an Platform — Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TABLES
-- ============================================================

-- User profiles (extends Supabase Auth)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  phone TEXT,
  parent_phone TEXT,
  city TEXT,
  school TEXT,
  academic_year TEXT,
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exams created by teachers
CREATE TABLE public.exams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  shuffle_questions BOOLEAN DEFAULT FALSE,
  show_results BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions belonging to an exam
CREATE TABLE public.questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mcq', 'true_false', 'essay')),
  text TEXT NOT NULL,
  options JSONB,                -- MCQ: ["Option A", "Option B", ...]
  correct_answer TEXT NOT NULL, -- MCQ: "0"/"1"/..., T/F: "true"/"false", Essay: model answer
  points NUMERIC NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- Student submissions
CREATE TABLE public.submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  student_name TEXT NOT NULL,
  total_score NUMERIC DEFAULT 0,
  max_score NUMERIC DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'submitted' CHECK (status IN ('in_progress', 'submitted', 'graded'))
);

-- Individual answers per question
CREATE TABLE public.answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  student_answer TEXT DEFAULT '',
  is_correct BOOLEAN DEFAULT FALSE,
  score NUMERIC DEFAULT 0,
  max_score NUMERIC DEFAULT 0,
  feedback TEXT DEFAULT ''
);

-- Prevent duplicate submissions from the same student
CREATE UNIQUE INDEX unique_student_exam ON public.submissions(exam_id, student_id);

-- Index for fast exam code lookup
CREATE INDEX idx_exams_code ON public.exams(code);

-- ============================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Profiles -----------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Exams --------------------------------------------------
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can do everything with own exams"
  ON public.exams FOR ALL
  USING (teacher_id = auth.uid());

CREATE POLICY "Anyone can view active exams"
  ON public.exams FOR SELECT
  USING (is_active = TRUE);

-- Questions ----------------------------------------------
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage own exam questions"
  ON public.questions FOR ALL
  USING (
    exam_id IN (SELECT id FROM public.exams WHERE teacher_id = auth.uid())
  );

CREATE POLICY "Students can view questions of active exams"
  ON public.questions FOR SELECT
  USING (
    exam_id IN (SELECT id FROM public.exams WHERE is_active = TRUE)
  );

-- Submissions --------------------------------------------
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert own submissions"
  ON public.submissions FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can view own submissions"
  ON public.submissions FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can view submissions of own exams"
  ON public.submissions FOR SELECT
  USING (
    exam_id IN (SELECT id FROM public.exams WHERE teacher_id = auth.uid())
  );

CREATE POLICY "Teachers can update submissions of own exams"
  ON public.submissions FOR UPDATE
  USING (
    exam_id IN (SELECT id FROM public.exams WHERE teacher_id = auth.uid())
  );

-- Answers ------------------------------------------------
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own answers"
  ON public.answers FOR SELECT
  USING (
    submission_id IN (SELECT id FROM public.submissions WHERE student_id = auth.uid())
  );

CREATE POLICY "Teachers can view answers of own exams"
  ON public.answers FOR SELECT
  USING (
    submission_id IN (
      SELECT s.id FROM public.submissions s
      JOIN public.exams e ON s.exam_id = e.id
      WHERE e.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update answers of own exams"
  ON public.answers FOR UPDATE
  USING (
    submission_id IN (
      SELECT s.id FROM public.submissions s
      JOIN public.exams e ON s.exam_id = e.id
      WHERE e.teacher_id = auth.uid()
    )
  );

-- ============================================================
-- 3. SERVER-SIDE GRADING FUNCTION
-- ============================================================
-- This function runs with elevated privileges (SECURITY DEFINER)
-- so students never see correct answers in the network tab.

CREATE OR REPLACE FUNCTION public.submit_and_grade_exam(
  p_exam_id UUID,
  p_student_name TEXT,
  p_answers JSONB  -- Array of { "question_id": "uuid", "answer": "string" }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_submission_id UUID;
  v_answer JSONB;
  v_question RECORD;
  v_score NUMERIC;
  v_is_correct BOOLEAN;
  v_feedback TEXT;
  v_total_score NUMERIC := 0;
  v_max_score NUMERIC := 0;
  v_results JSONB := '[]'::JSONB;
  -- essay grading vars
  v_model_words TEXT[];
  v_student_words TEXT[];
  v_match_count INTEGER;
  v_word TEXT;
  v_similarity NUMERIC;
  v_correct_display TEXT;
BEGIN
  v_student_id := auth.uid();

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check student hasn't already submitted
  IF EXISTS (
    SELECT 1 FROM submissions
    WHERE exam_id = p_exam_id AND student_id = v_student_id AND status = 'submitted'
  ) THEN
    RAISE EXCEPTION 'لقد قمت بتسليم هذا الامتحان مسبقاً';
  END IF;

  -- Check exam exists and is active
  IF NOT EXISTS (SELECT 1 FROM exams WHERE id = p_exam_id AND is_active = TRUE) THEN
    RAISE EXCEPTION 'الامتحان غير موجود أو غير متاح';
  END IF;

  -- Create submission
  INSERT INTO submissions (exam_id, student_id, student_name, status, submitted_at)
  VALUES (p_exam_id, v_student_id, p_student_name, 'submitted', NOW())
  RETURNING id INTO v_submission_id;

  -- Grade each answer
  FOR v_answer IN SELECT value FROM jsonb_array_elements(p_answers)
  LOOP
    SELECT * INTO v_question
    FROM questions
    WHERE id = (v_answer->>'question_id')::UUID AND exam_id = p_exam_id;

    IF v_question IS NULL THEN
      CONTINUE;
    END IF;

    v_max_score := v_max_score + v_question.points;
    v_score := 0;
    v_is_correct := FALSE;
    v_feedback := '';
    v_correct_display := NULL;

    IF v_question.type = 'mcq' THEN
      -- MCQ: compare selected option index
      v_is_correct := (v_answer->>'answer') = v_question.correct_answer;
      v_score := CASE WHEN v_is_correct THEN v_question.points ELSE 0 END;
      v_correct_display := v_question.options->>v_question.correct_answer::INT;
      v_feedback := CASE
        WHEN v_is_correct THEN 'إجابة صحيحة ✓'
        ELSE 'إجابة خاطئة. الإجابة الصحيحة: ' || COALESCE(v_correct_display, '')
      END;

    ELSIF v_question.type = 'true_false' THEN
      -- True/False: compare directly
      v_is_correct := (v_answer->>'answer') = v_question.correct_answer;
      v_score := CASE WHEN v_is_correct THEN v_question.points ELSE 0 END;
      v_correct_display := CASE WHEN v_question.correct_answer = 'true' THEN 'صح' ELSE 'خطأ' END;
      v_feedback := CASE
        WHEN v_is_correct THEN 'إجابة صحيحة ✓'
        ELSE 'إجابة خاطئة. الإجابة الصحيحة: ' || v_correct_display
      END;

    ELSIF v_question.type = 'essay' THEN
      -- Essay: word-overlap similarity
      v_model_words := ARRAY(
        SELECT unnest FROM unnest(
          string_to_array(
            lower(regexp_replace(v_question.correct_answer, '[^\u0600-\u06FFa-zA-Z0-9\s]', ' ', 'g')),
            ' '
          )
        ) WHERE length(unnest) > 2
      );

      v_student_words := ARRAY(
        SELECT unnest FROM unnest(
          string_to_array(
            lower(regexp_replace(COALESCE(v_answer->>'answer', ''), '[^\u0600-\u06FFa-zA-Z0-9\s]', ' ', 'g')),
            ' '
          )
        ) WHERE length(unnest) > 2
      );

      IF array_length(v_model_words, 1) IS NULL OR array_length(v_model_words, 1) = 0 THEN
        v_score := v_question.points;
        v_is_correct := TRUE;
        v_feedback := 'تم تقييم الإجابة.';
      ELSIF array_length(v_student_words, 1) IS NULL OR array_length(v_student_words, 1) = 0 THEN
        v_score := 0;
        v_is_correct := FALSE;
        v_feedback := 'لم يتم الإجابة على هذا السؤال.';
      ELSE
        v_match_count := 0;
        FOREACH v_word IN ARRAY v_student_words LOOP
          IF v_word = ANY(v_model_words) THEN
            v_match_count := v_match_count + 1;
          END IF;
        END LOOP;

        v_similarity := LEAST(1.0, v_match_count::NUMERIC / GREATEST(array_length(v_model_words, 1), 1));
        v_score := ROUND(v_similarity * v_question.points, 1);
        v_is_correct := v_similarity >= 0.5;

        v_feedback := CASE
          WHEN v_similarity >= 0.8 THEN 'إجابة ممتازة، تغطي معظم النقاط المطلوبة. ✓'
          WHEN v_similarity >= 0.5 THEN 'إجابة جيدة، لكن تحتاج لتغطية بعض النقاط الإضافية.'
          WHEN v_similarity >= 0.2 THEN 'إجابة جزئية، تحتاج لمزيد من التفصيل.'
          ELSE 'الإجابة لا تغطي النقاط المطلوبة بشكل كافٍ.'
        END;
      END IF;
    END IF;

    v_total_score := v_total_score + v_score;

    -- Insert answer record
    INSERT INTO answers (submission_id, question_id, student_answer, is_correct, score, max_score, feedback)
    VALUES (v_submission_id, v_question.id, COALESCE(v_answer->>'answer', ''), v_is_correct, v_score, v_question.points, v_feedback);

    -- Append to results
    v_results := v_results || jsonb_build_object(
      'question_id', v_question.id,
      'question_text', v_question.text,
      'question_type', v_question.type,
      'student_answer', COALESCE(v_answer->>'answer', ''),
      'is_correct', v_is_correct,
      'score', v_score,
      'max_score', v_question.points,
      'feedback', v_feedback,
      'correct_answer', CASE
        WHEN v_question.type = 'essay' THEN NULL
        ELSE v_correct_display
      END
    );
  END LOOP;

  -- Update submission totals
  UPDATE submissions
  SET total_score = v_total_score, max_score = v_max_score
  WHERE id = v_submission_id;

  RETURN jsonb_build_object(
    'submission_id', v_submission_id,
    'total_score', v_total_score,
    'max_score', v_max_score,
    'percentage', CASE WHEN v_max_score > 0 THEN ROUND((v_total_score / v_max_score) * 100, 1) ELSE 0 END,
    'answers', v_results
  );
END;
$$;

-- ============================================================
-- 4. HELPER FUNCTION: Fetch exam questions (without correct answers)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_exam_for_student(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exam RECORD;
  v_questions JSONB;
BEGIN
  SELECT * INTO v_exam FROM exams WHERE code = upper(p_code) AND is_active = TRUE;

  IF v_exam IS NULL THEN
    RETURN jsonb_build_object('error', 'كود الامتحان غير صحيح أو الامتحان غير متاح');
  END IF;

  -- Check if student already submitted
  IF EXISTS (
    SELECT 1 FROM submissions
    WHERE exam_id = v_exam.id AND student_id = auth.uid() AND status = 'submitted'
  ) THEN
    RETURN jsonb_build_object('error', 'لقد قمت بتسليم هذا الامتحان مسبقاً');
  END IF;

  -- Get questions WITHOUT correct_answer
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'type', q.type,
      'text', q.text,
      'options', q.options,
      'points', q.points,
      'order_index', q.order_index
    ) ORDER BY q.order_index
  )
  INTO v_questions
  FROM questions q
  WHERE q.exam_id = v_exam.id;

  RETURN jsonb_build_object(
    'exam', jsonb_build_object(
      'id', v_exam.id,
      'title', v_exam.title,
      'description', v_exam.description,
      'duration_minutes', v_exam.duration_minutes,
      'question_count', COALESCE(jsonb_array_length(v_questions), 0)
    ),
    'questions', COALESCE(v_questions, '[]'::JSONB)
  );
END;
$$;
