import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Button, Badge, Spinner } from '../components/ui';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { Clock, Send, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import 'react-quill-new/dist/quill.snow.css';
import DOMPurify from 'dompurify';

const TakeExam = () => {
  const { code } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const toast = useToast();

  const [exam, setExam] = useState(location.state?.exam || null);
  const [questions, setQuestions] = useState(location.state?.questions || []);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(!location.state);
  const [cheatingWarnings, setCheatingWarnings] = useState(0);

  const timerRef = useRef(null);
  const hasSubmittedRef = useRef(false);

  // Fetch exam if navigated directly (no state)
  useEffect(() => {
    if (!exam) {
      fetchExam();
    } else {
      setTimeLeft(exam.duration_minutes * 60);
    }
  }, []);

  const fetchExam = async () => {
    try {
      const { data, error } = await supabase.rpc('get_exam_for_student', {
        p_code: code,
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        navigate('/student');
        return;
      }

      setExam(data.exam);

      // Load from localStorage if exists
      const savedAnswers = localStorage.getItem(`exam_answers_${data.exam.id}`);
      if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
      
      const savedWarnings = localStorage.getItem(`exam_warnings_${data.exam.id}`);
      if (savedWarnings) setCheatingWarnings(parseInt(savedWarnings, 10));

      const savedTime = localStorage.getItem(`exam_time_${data.exam.id}`);
      
      // Shuffle questions, or load saved shuffled order if possible (to avoid re-shuffle on refresh)
      // For simplicity, we just use the data.questions order if they refresh, 
      // but ideally we should preserve order. 
      // We will just shuffle if there are no saved answers to prevent reshuffling midway.
      let finalQuestions = [...(data.questions || [])];
      if (!savedAnswers) {
        finalQuestions = finalQuestions.sort(() => Math.random() - 0.5);
      }
      setQuestions(finalQuestions);
      
      if (savedTime) {
        setTimeLeft(parseInt(savedTime, 10));
      } else {
        setTimeLeft(data.exam.duration_minutes * 60);
      }
    } catch (err) {
      toast.error('حدث خطأ في تحميل الامتحان');
      navigate('/student');
    } finally {
      setLoading(false);
    }
  };

  // Timer
  useEffect(() => {
    if (timeLeft <= 0 || results) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Auto-submit when time is up
          if (!hasSubmittedRef.current) {
            handleSubmit(true);
          }
          return 0;
        }
        const newTime = prev - 1;
        if (exam?.id) localStorage.setItem(`exam_time_${exam.id}`, newTime);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timeLeft > 0 && !results]);

  // Anti-cheat mechanisms
  useEffect(() => {
    if (results || loading) return;

    // Detect tab switching
    const handleVisibilityChange = () => {
      if (document.hidden && !hasSubmittedRef.current) {
        setCheatingWarnings(prev => {
          const newCount = prev + 1;
          if (exam?.id) localStorage.setItem(`exam_warnings_${exam.id}`, newCount);
          toast.error(`تحذير (${newCount}/3): يرجى عدم الخروج من صفحة الامتحان!`);
          if (newCount >= 3) {
            toast.error('تم إنهاء الامتحان بسبب محاولات الغش المتكررة.');
            handleSubmit(true);
          }
          return newCount;
        });
      }
    };

    // Prevent copy/paste
    const preventCopyPaste = (e) => e.preventDefault();
    const preventContextMenu = (e) => e.preventDefault();
    const preventKeydowns = (e) => {
      // Prevent Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+P (Print)
      if (e.ctrlKey && ['c', 'v', 'x', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }

      // Detect Screenshot attempts
      const isPrintScreen = e.key === 'PrintScreen' || e.keyCode === 44;
      const isMacScreenshot = e.metaKey && e.shiftKey && ['3', '4', '5', 's'].includes(e.key.toLowerCase());
      const isWinSnippingTool = e.metaKey && e.shiftKey && e.key.toLowerCase() === 's'; // Windows Key + Shift + S

      if (isPrintScreen || isMacScreenshot || isWinSnippingTool) {
        e.preventDefault();
        toast.error('تم إنهاء الامتحان فوراً لمحاولة التقاط شاشة (Screenshot).');
        if (!hasSubmittedRef.current) {
          handleSubmit(true);
        }
      }
    };
    
    const preventKeyups = (e) => {
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        toast.error('تم إنهاء الامتحان فوراً لمحاولة التقاط شاشة (Screenshot).');
        if (!hasSubmittedRef.current) {
          handleSubmit(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', preventCopyPaste);
    document.addEventListener('cut', preventCopyPaste);
    document.addEventListener('paste', preventCopyPaste);
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventKeydowns);
    document.addEventListener('keyup', preventKeyups);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', preventCopyPaste);
      document.removeEventListener('cut', preventCopyPaste);
      document.removeEventListener('paste', preventCopyPaste);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventKeydowns);
      document.removeEventListener('keyup', preventKeyups);
    };
  }, [results, loading]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const setAnswer = (questionId, value) => {
    setAnswers((prev) => {
      const newAnswers = { ...prev, [questionId]: value };
      if (exam?.id) localStorage.setItem(`exam_answers_${exam.id}`, JSON.stringify(newAnswers));
      return newAnswers;
    });
  };

  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (hasSubmittedRef.current) return;

    if (!autoSubmit) {
      const answeredCount = Object.keys(answers).filter((k) => answers[k] !== '').length;
      const unanswered = questions.length - answeredCount;

      if (unanswered > 0) {
        if (!window.confirm(`لم تجب على ${unanswered} سؤال. هل تريد التسليم؟`)) {
          return;
        }
      }
    }

    hasSubmittedRef.current = true;
    setSubmitting(true);
    clearInterval(timerRef.current);

    try {
      // Prepare answers for the RPC function
      const answersArray = questions.map((q) => ({
        question_id: q.id,
        answer: answers[q.id] ?? '',
      }));

      const { data, error } = await supabase.rpc('submit_and_grade_exam', {
        p_exam_id: exam.id,
        p_student_name: profile?.full_name || 'طالب',
        p_answers: answersArray,
      });

      if (error) throw error;

      setResults(data);
      
      // Clear localStorage once submitted
      if (exam?.id) {
        localStorage.removeItem(`exam_answers_${exam.id}`);
        localStorage.removeItem(`exam_time_${exam.id}`);
        localStorage.removeItem(`exam_warnings_${exam.id}`);
      }

      if (autoSubmit) {
        toast.info('انتهى الوقت! تم تسليم الامتحان تلقائياً.');
      } else {
        toast.success('تم تسليم الامتحان بنجاح!');
      }
    } catch (err) {
      console.error('Submit error:', err);
      hasSubmittedRef.current = false;

      if (err.message?.includes('مسبقاً')) {
        toast.error('لقد قمت بتسليم هذا الامتحان مسبقاً');
        navigate('/student');
      } else {
        toast.error('حدث خطأ في تسليم الامتحان. حاول مرة أخرى.');
      }
    } finally {
      setSubmitting(false);
    }
  }, [answers, questions, exam, profile]);

  // Loading state
  if (loading) return <Spinner size={36} />;

  // Results view
  if (results) {
    const percentage = results.percentage || 0;
    const isPassing = percentage >= 50;

    return (
      <div className="container animate-fade-in" style={{ paddingTop: '40px', paddingBottom: '40px', maxWidth: '700px' }}>
        {/* Score Card */}
        <Card className="text-center mb-6" style={{ padding: '40px' }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: isPassing ? 'var(--success-soft)' : 'var(--danger-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            {isPassing ? (
              <CheckCircle size={48} style={{ color: 'var(--success)' }} />
            ) : (
              <AlertTriangle size={48} style={{ color: 'var(--danger)' }} />
            )}
          </div>

          <h2 className="mb-2">تم تسليم الامتحان</h2>
          <p className="text-muted mb-6">{exam?.title}</p>

          <div className="result-score" style={{ color: isPassing ? 'var(--success)' : 'var(--danger)' }}>
            {results.total_score} / {results.max_score}
          </div>

          <div className="result-bar" style={{ maxWidth: '300px', margin: '20px auto' }}>
            <div
              className="result-bar-fill"
              style={{
                width: `${percentage}%`,
                background: isPassing ? 'var(--success)' : 'var(--danger)',
              }}
            />
          </div>

          <Badge variant={isPassing ? 'success' : 'danger'} style={{ fontSize: '16px', padding: '8px 24px' }}>
            {percentage}%
          </Badge>
        </Card>

        {/* Detailed Answers */}
        <h3 className="mb-4" style={{ fontSize: '1.1rem' }}>تفاصيل الإجابات</h3>
        <div className="flex flex-col gap-4 stagger-children">
          {(results.answers || []).map((answer, i) => (
            <Card key={i}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="question-number-badge" style={{ width: '28px', height: '28px', fontSize: '12px' }}>
                    {i + 1}
                  </span>
                  <Badge variant="default">
                    {answer.question_type === 'mcq' ? 'اختيار' : answer.question_type === 'true_false' ? 'صح/خطأ' : 'مقالي'}
                  </Badge>
                </div>
                <Badge variant={answer.is_correct ? 'success' : 'danger'}>
                  {answer.score} / {answer.max_score}
                </Badge>
              </div>

              <div className="font-bold mb-2 ql-editor" style={{ padding: 0, overflow: 'visible', minHeight: 'auto' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(answer.question_text) }} />

              <div className="text-muted mb-2" style={{ fontSize: '14px' }}>
                <strong>إجابتك: </strong>
                {answer.question_type === 'true_false'
                  ? (answer.student_answer === 'true' ? 'صح' : 'خطأ')
                  : answer.student_answer || '(لم تجب)'}
              </div>

              {answer.correct_answer && !answer.is_correct && (
                <div className="text-success mb-2" style={{ fontSize: '14px' }}>
                  <strong>الإجابة الصحيحة: </strong>{answer.correct_answer}
                </div>
              )}

              {answer.feedback && (
                <div className={`answer-feedback ${answer.is_correct ? 'answer-correct' : 'answer-wrong'}`}>
                  {answer.feedback}
                </div>
              )}
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button onClick={() => navigate('/student')} size="lg">
            العودة للرئيسية
          </Button>
        </div>
      </div>
    );
  }

  // Exam-taking view
  const isTimeLow = timeLeft < 300; // Less than 5 minutes
  const answeredCount = Object.keys(answers).filter((k) => answers[k] !== '' && answers[k] !== undefined).length;

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '16px', paddingBottom: '40px', maxWidth: '800px', userSelect: 'none' }}>
      {/* Sticky Header */}
      <div className="exam-header mb-6">
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{exam?.title}</h3>
          <span className="text-muted" style={{ fontSize: '13px' }}>{answeredCount} / {questions.length} تمت الإجابة</span>
        </div>
        <div className={`timer ${isTimeLow ? 'timer-warning' : ''}`}>
          <Clock size={20} />
          {formatTime(timeLeft)}
        </div>
      </div>

      {cheatingWarnings > 0 && (
        <div className="mb-4 p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={20} />
          <span>لقد قمت بالخروج من صفحة الامتحان {cheatingWarnings} مرات. سيتم سحب الامتحان بعد 3 مرات!</span>
        </div>
      )}

      {/* Questions */}
      <div className="flex flex-col gap-6">
        {questions.map((q, i) => (
          <div key={q.id} className="exam-question-card animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <span className="question-number-badge">{i + 1}</span>
                <Badge variant="default">
                  {q.type === 'mcq' ? 'اختيار من متعدد' : q.type === 'true_false' ? 'صح وخطأ' : 'سؤال مقالي'}
                </Badge>
              </div>
              <Badge variant="brand">{q.points} {q.points === 1 ? 'درجة' : 'درجات'}</Badge>
            </div>

            <div className="mb-4 ql-editor" style={{ padding: 0, fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.8, overflow: 'visible', minHeight: 'auto' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(q.text) }} />

            {/* MCQ Options */}
            {q.type === 'mcq' && (
              <div className="flex flex-col gap-3">
                {q.options.map((opt, optIndex) => (
                  <label
                    key={optIndex}
                    className={`exam-option ${answers[q.id] === String(optIndex) ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={String(optIndex)}
                      checked={answers[q.id] === String(optIndex)}
                      onChange={() => setAnswer(q.id, String(optIndex))}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            {/* True/False */}
            {q.type === 'true_false' && (
              <div className="flex gap-4">
                <label
                  className={`exam-option ${answers[q.id] === 'true' ? 'selected' : ''}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value="true"
                    checked={answers[q.id] === 'true'}
                    onChange={() => setAnswer(q.id, 'true')}
                  />
                  صح ✓
                </label>
                <label
                  className={`exam-option ${answers[q.id] === 'false' ? 'selected' : ''}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value="false"
                    checked={answers[q.id] === 'false'}
                    onChange={() => setAnswer(q.id, 'false')}
                  />
                  خطأ ✗
                </label>
              </div>
            )}

            {/* Essay */}
            {q.type === 'essay' && (
              <textarea
                className="input-field textarea"
                rows={5}
                placeholder="اكتب إجابتك هنا..."
                value={answers[q.id] || ''}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                style={{ width: '100%' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Submit Bar */}
      <div style={{
        position: 'sticky',
        bottom: '20px',
        marginTop: '32px',
        background: 'var(--bg-secondary)',
        padding: '16px 24px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <span className="font-bold">{answeredCount} / {questions.length}</span>
          <span className="text-muted" style={{ marginRight: '8px' }}>سؤال</span>
        </div>
        <Button
          variant="success"
          size="lg"
          onClick={() => handleSubmit(false)}
          isLoading={submitting}
        >
          <Send size={18} />
          تسليم الامتحان
        </Button>
      </div>
    </div>
  );
};

export default TakeExam;
