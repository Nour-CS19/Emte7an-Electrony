import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Spinner } from '../components/ui';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import 'react-quill-new/dist/quill.snow.css';
import DOMPurify from 'dompurify';

const ReviewExam = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    fetchReviewData();
  }, [submissionId]);

  const fetchReviewData = async () => {
    try {
      // Fetch Submission + Exam Info
      const { data: subData, error: subError } = await supabase
        .from('submissions')
        .select(`
          *,
          exam:exams ( title, show_results )
        `)
        .eq('id', submissionId)
        .single();

      if (subError) throw subError;
      
      // If teacher hid results, block it (unless we want to allow it anyway, but we should respect show_results)
      if (subData.exam && subData.exam.show_results === false) {
        setSubmission({ hidden: true });
        return;
      }

      setSubmission(subData);

      // Fetch Answers + Questions
      const { data: ansData, error: ansError } = await supabase
        .from('answers')
        .select(`
          *,
          question:questions ( text, type, correct_answer, options )
        `)
        .eq('submission_id', submissionId)
        .order('question_id'); // We might want to order by order_index, but we have to join for it

      if (ansError) throw ansError;
      setAnswers(ansData || []);
    } catch (err) {
      console.error('Error fetching review:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner size={36} />;

  if (submission?.hidden) {
    return (
      <div className="container py-8 text-center">
        <h2 className="mb-4">عذراً</h2>
        <p>لقد قام المعلم بإخفاء نتائج هذا الامتحان.</p>
        <Button onClick={() => navigate('/student')} className="mt-4">العودة للرئيسية</Button>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="container py-8 text-center">
        <h2 className="mb-4">خطأ</h2>
        <p>لم يتم العثور على نتيجة الامتحان.</p>
        <Button onClick={() => navigate('/student')} className="mt-4">العودة للرئيسية</Button>
      </div>
    );
  }

  const percentage = submission.max_score > 0 ? (submission.total_score / submission.max_score) * 100 : 0;
  const isPassing = percentage >= 50;

  return (
    <div className="container animate-fade-in py-8" style={{ maxWidth: '700px' }}>
      
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/student')} className="btn btn-ghost" style={{ padding: '8px' }}>
          <ArrowRight size={22} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>مراجعة الامتحان</h2>
        </div>
      </div>

      {/* Score Card */}
      <Card className="text-center mb-6" style={{ padding: '40px' }}>
        <div style={{
          width: '100px', height: '100px', borderRadius: '50%',
          background: isPassing ? 'var(--success-soft)' : 'var(--danger-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
        }}>
          {isPassing ? (
            <CheckCircle size={48} style={{ color: 'var(--success)' }} />
          ) : (
            <AlertTriangle size={48} style={{ color: 'var(--danger)' }} />
          )}
        </div>

        <h2 className="mb-2">نتيجة الامتحان</h2>
        <p className="text-muted mb-6">{submission.exam?.title}</p>

        <div className="result-score" style={{ color: isPassing ? 'var(--success)' : 'var(--danger)' }}>
          {submission.total_score} / {submission.max_score}
        </div>

        <div className="result-bar" style={{ maxWidth: '300px', margin: '20px auto' }}>
          <div className="result-bar-fill" style={{ width: `${percentage}%`, background: isPassing ? 'var(--success)' : 'var(--danger)' }} />
        </div>

        <Badge variant={isPassing ? 'success' : 'danger'} style={{ fontSize: '16px', padding: '8px 24px' }}>
          {percentage.toFixed(1)}%
        </Badge>
      </Card>

      {/* Detailed Answers */}
      <h3 className="mb-4" style={{ fontSize: '1.1rem' }}>تفاصيل الإجابات</h3>
      <div className="flex flex-col gap-4">
        {answers.map((ans, i) => (
          <Card key={ans.id}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className="question-number-badge" style={{ width: '28px', height: '28px', fontSize: '12px' }}>
                  {i + 1}
                </span>
                <Badge variant="default">
                  {ans.question?.type === 'mcq' ? 'اختيار' : ans.question?.type === 'true_false' ? 'صح/خطأ' : 'مقالي'}
                </Badge>
              </div>
              <Badge variant={ans.is_correct ? 'success' : 'danger'}>
                {ans.score} / {ans.max_score}
              </Badge>
            </div>

            <div className="font-bold mb-4 ql-editor" style={{ padding: 0, overflow: 'visible', minHeight: 'auto' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ans.question?.text || '') }} />

            <div className="text-muted mb-2" style={{ fontSize: '14px' }}>
              <strong>إجابتك: </strong>
              {ans.question?.type === 'true_false'
                ? (ans.student_answer === 'true' ? 'صح' : 'خطأ')
                : (ans.question?.type === 'mcq' && Array.isArray(ans.question?.options)
                    ? ans.question.options[Number(ans.student_answer)] || ans.student_answer
                    : ans.student_answer) || '(لم تجب)'}
            </div>

            {!ans.is_correct && ans.question?.correct_answer && (
              <div className="text-success mb-2" style={{ fontSize: '14px' }}>
                <strong>الإجابة الصحيحة: </strong>
                {ans.question?.type === 'true_false' 
                  ? (ans.question?.correct_answer === 'true' ? 'صح' : 'خطأ')
                  : (ans.question?.type === 'mcq' && Array.isArray(ans.question?.options)
                      ? (ans.question.correct_answer.match(/^[0-9]+$/) 
                          ? ans.question.options[Number(ans.question.correct_answer)]
                          : ans.question.correct_answer)
                      : ans.question.correct_answer)}
              </div>
            )}

            {ans.feedback && (
              <div className={`answer-feedback ${ans.is_correct ? 'answer-correct' : 'answer-wrong'}`}>
                {ans.feedback}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ReviewExam;
