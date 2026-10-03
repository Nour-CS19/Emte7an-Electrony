CREATE OR REPLACE FUNCTION public.submit_and_grade_exam(
  p_exam_id UUID,
  p_student_name TEXT,
  p_answers JSONB
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

  IF EXISTS (
    SELECT 1 FROM submissions
    WHERE exam_id = p_exam_id AND student_id = v_student_id AND status = 'submitted'
  ) THEN
    RAISE EXCEPTION 'لقد قمت بتسليم هذا الامتحان مسبقاً';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM exams WHERE id = p_exam_id AND is_active = TRUE) THEN
    RAISE EXCEPTION 'الامتحان غير موجود أو غير متاح';
  END IF;

  INSERT INTO submissions (exam_id, student_id, student_name, status, submitted_at)
  VALUES (p_exam_id, v_student_id, p_student_name, 'submitted', NOW())
  RETURNING id INTO v_submission_id;

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
      v_is_correct := (v_answer->>'answer') = v_question.correct_answer 
                      OR (v_question.options->>(v_answer->>'answer')::INT) = v_question.correct_answer;
      
      v_score := CASE WHEN v_is_correct THEN v_question.points ELSE 0 END;
      
      v_correct_display := CASE 
        WHEN v_question.correct_answer ~ '^[0-9]+$' THEN v_question.options->>v_question.correct_answer::INT
        ELSE v_question.correct_answer
      END;
      
      v_feedback := CASE
        WHEN v_is_correct THEN 'إجابة صحيحة ✓'
        ELSE 'إجابة خاطئة. الإجابة الصحيحة: ' || COALESCE(v_correct_display, '')
      END;

    ELSIF v_question.type = 'true_false' THEN
      v_is_correct := (v_answer->>'answer') = v_question.correct_answer;
      v_score := CASE WHEN v_is_correct THEN v_question.points ELSE 0 END;
      v_correct_display := CASE WHEN v_question.correct_answer = 'true' THEN 'صح' ELSE 'خطأ' END;
      v_feedback := CASE
        WHEN v_is_correct THEN 'إجابة صحيحة ✓'
        ELSE 'إجابة خاطئة. الإجابة الصحيحة: ' || v_correct_display
      END;

    ELSIF v_question.type = 'essay' THEN
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

    INSERT INTO answers (submission_id, question_id, student_answer, score, is_correct, feedback)
    VALUES (v_submission_id, v_question.id, v_answer->>'answer', v_score, v_is_correct, v_feedback);
    
    v_results := v_results || jsonb_build_object(
      'question_id', v_question.id,
      'is_correct', v_is_correct,
      'score', v_score,
      'feedback', v_feedback
    );
  END LOOP;

  UPDATE submissions
  SET total_score = v_total_score, max_score = v_max_score
  WHERE id = v_submission_id;

  RETURN v_results;
END;
$$;
