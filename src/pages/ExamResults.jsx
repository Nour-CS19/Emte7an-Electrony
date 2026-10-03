import React, { useState, useEffect } from 'react';
import { Card, Button, Spinner, EmptyState, Badge, StatCard, Modal } from '../components/ui';
import { ArrowRight, Users, Trophy, BarChart3, Eye, Edit3, Save } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import DOMPurify from 'dompurify';

const ExamResults = () => {
  const { examId } = useParams();
  const { profile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [editingScore, setEditingScore] = useState(null);
  const [newScore, setNewScore] = useState('');

  useEffect(() => {
    fetchExamResults();
  }, [examId]);

  const fetchExamResults = async () => {
    try {
      // Fetch exam
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .eq('teacher_id', profile.id)
        .single();

      if (examError) throw examError;
      setExam(examData);

      // Fetch submissions
      const { data: subs, error: subsError } = await supabase
        .from('submissions')
        .select('*')
        .eq('exam_id', examId)
        .order('submitted_at', { ascending: false });

      if (subsError) throw subsError;
      setSubmissions(subs || []);
    } catch (err) {
      console.error('Error:', err);
      toast.error('حدث خطأ في تحميل النتائج');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const viewSubmissionDetails = async (submission) => {
    setSelectedSubmission(submission);
    setLoadingAnswers(true);

    try {
      const { data, error } = await supabase
        .from('answers')
        .select(`
          *,
          questions:question_id (
            text,
            type,
            options,
            correct_answer,
            points
          )
        `)
        .eq('submission_id', submission.id);

      if (error) throw error;
      setAnswers(data || []);
    } catch (err) {
      toast.error('حدث خطأ في تحميل الإجابات');
    } finally {
      setLoadingAnswers(false);
    }
  };

  const updateAnswerScore = async (answerId, questionMaxScore) => {
    const score = parseFloat(newScore);
    if (isNaN(score) || score < 0 || score > questionMaxScore) {
      toast.error(`الدرجة يجب أن تكون بين 0 و ${questionMaxScore}`);
      return;
    }

    try {
      const { error } = await supabase
        .from('answers')
        .update({ score, is_correct: score > 0 })
        .eq('id', answerId);

      if (error) throw error;

      // Update local state
      const updatedAnswers = answers.map((a) =>
        a.id === answerId ? { ...a, score, is_correct: score > 0 } : a
      );
      setAnswers(updatedAnswers);

      // Recalculate total
      const newTotal = updatedAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
      await supabase
        .from('submissions')
        .update({ total_score: newTotal })
        .eq('id', selectedSubmission.id);

      setSelectedSubmission((prev) => ({ ...prev, total_score: newTotal }));
      setSubmissions((prev) =>
        prev.map((s) => (s.id === selectedSubmission.id ? { ...s, total_score: newTotal } : s))
      );

      setEditingScore(null);
      toast.success('تم تحديث الدرجة');
    } catch (err) {
      toast.error('حدث خطأ في تحديث الدرجة');
    }
  };

  if (loading) return <Spinner size={36} />;

  // Calculate stats
  const avgScore = submissions.length > 0
    ? (submissions.reduce((sum, s) => sum + (s.total_score || 0), 0) / submissions.length).toFixed(1)
    : 0;
  const maxStudentScore = submissions.length > 0
    ? Math.max(...submissions.map((s) => s.total_score || 0))
    : 0;
  const maxPossible = submissions.length > 0 ? submissions[0].max_score : 0;

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '32px', paddingBottom: '32px' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/dashboard')} className="btn btn-ghost" style={{ padding: '8px' }}>
          <ArrowRight size={22} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '2px' }}>{exam?.title}</h2>
          <div className="flex items-center gap-3">
            <span className="text-muted" style={{ fontSize: '14px' }}>كود: </span>
            <Badge variant="brand" style={{ letterSpacing: '2px', fontFamily: 'monospace' }}>{exam?.code}</Badge>
            <Badge variant={exam?.is_active ? 'success' : 'danger'}>
              {exam?.is_active ? 'نشط' : 'متوقف'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-cols-3 mb-8">
        <StatCard
          icon={<Users size={24} />}
          label="عدد التسليمات"
          value={submissions.length}
          color="var(--info)"
        />
        <StatCard
          icon={<BarChart3 size={24} />}
          label="متوسط الدرجات"
          value={`${avgScore} / ${maxPossible}`}
          color="var(--brand-primary)"
        />
        <StatCard
          icon={<Trophy size={24} />}
          label="أعلى درجة"
          value={`${maxStudentScore} / ${maxPossible}`}
          color="var(--success)"
        />
      </div>

      {/* Submissions Table */}
      {submissions.length === 0 ? (
        <EmptyState
          icon={<Users size={36} />}
          title="لا توجد تسليمات بعد"
          description="شارك كود الامتحان مع طلابك وسترى نتائجهم هنا."
        />
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>اسم الطالب</th>
                <th>الدرجة</th>
                <th>النسبة</th>
                <th>تاريخ التسليم</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub, i) => {
                const percentage = sub.max_score > 0 ? ((sub.total_score / sub.max_score) * 100).toFixed(0) : 0;
                return (
                  <tr key={sub.id}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{sub.student_name}</td>
                    <td>
                      <span className="font-bold">{sub.total_score}</span>
                      <span className="text-muted"> / {sub.max_score}</span>
                    </td>
                    <td>
                      <Badge variant={percentage >= 50 ? 'success' : 'danger'}>
                        {percentage}%
                      </Badge>
                    </td>
                    <td className="text-muted">
                      {new Date(sub.submitted_at).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>
                      <Button variant="ghost" size="sm" onClick={() => viewSubmissionDetails(sub)}>
                        <Eye size={16} />
                        تفاصيل
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Submission Details Modal */}
      <Modal
        isOpen={!!selectedSubmission}
        onClose={() => { setSelectedSubmission(null); setEditingScore(null); }}
        title={`إجابات: ${selectedSubmission?.student_name}`}
        size="lg"
      >
        {loadingAnswers ? (
          <Spinner />
        ) : (
          <div className="flex flex-col gap-4">
            {/* Score summary */}
            <div className="flex justify-between items-center" style={{ padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <span className="font-bold">المجموع</span>
              <span>
                <span className="text-brand font-bold" style={{ fontSize: '1.2rem' }}>
                  {selectedSubmission?.total_score}
                </span>
                <span className="text-muted"> / {selectedSubmission?.max_score}</span>
              </span>
            </div>

            {answers.map((answer, i) => (
              <Card key={answer.id} style={{ padding: '24px', borderLeft: `4px solid ${answer.is_correct ? 'var(--success)' : 'var(--danger)'}`, boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className="question-number-badge" style={{ width: '28px', height: '28px', fontSize: '12px' }}>
                      {i + 1}
                    </span>
                    <Badge variant="default">
                      {answer.questions?.type === 'mcq' ? 'اختيار' : answer.questions?.type === 'true_false' ? 'صح/خطأ' : 'مقالي'}
                    </Badge>
                  </div>
                  <Badge variant={answer.is_correct ? 'success' : 'danger'}>
                    {answer.score} / {answer.max_score}
                  </Badge>
                </div>

                <div 
                  className="font-bold mb-4 ql-editor" 
                  style={{ padding: 0, overflow: 'visible', minHeight: 'auto', fontSize: '1.1rem' }} 
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(answer.questions?.text || '') }} 
                />

                <div className="text-muted" style={{ fontSize: '14px', marginBottom: '12px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>إجابة الطالب:</strong>{' '}
                  <span style={{ fontWeight: '500' }}>
                    {answer.questions?.type === 'mcq'
                      ? answer.questions?.options?.[parseInt(answer.student_answer)] || answer.student_answer
                      : answer.questions?.type === 'true_false'
                      ? (answer.student_answer === 'true' ? 'صح' : 'خطأ')
                      : answer.student_answer || '(لم يجب)'}
                  </span>
                </div>

                {!answer.is_correct && answer.questions?.type !== 'essay' && (
                  <div className="text-success mb-2" style={{ fontSize: '14px', padding: '0 12px' }}>
                    <strong>الإجابة الصحيحة: </strong>
                    {answer.questions?.type === 'true_false' 
                      ? (answer.questions?.correct_answer === 'true' ? 'صح' : 'خطأ')
                      : (answer.questions?.type === 'mcq' && answer.questions?.options 
                          ? answer.questions.options[Number(answer.questions.correct_answer)]
                          : answer.questions?.correct_answer)}
                  </div>
                )}

                {answer.feedback && (
                  <div className={`answer-feedback ${answer.is_correct ? 'answer-correct' : 'answer-wrong'}`} style={{ marginTop: '12px' }}>
                    {answer.feedback}
                  </div>
                )}

                {/* Edit score for essay */}
                {answer.questions?.type === 'essay' && (
                  <div className="flex items-center gap-3 mt-4">
                    {editingScore === answer.id ? (
                      <>
                        <input
                          type="number"
                          className="input-field"
                          style={{ width: '80px', marginBottom: 0, padding: '6px 10px' }}
                          value={newScore}
                          onChange={(e) => setNewScore(e.target.value)}
                          min={0}
                          max={answer.max_score}
                          step={0.5}
                        />
                        <Button size="sm" onClick={() => updateAnswerScore(answer.id, answer.max_score)}>
                          <Save size={14} /> حفظ
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingScore(null)}>إلغاء</Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setEditingScore(answer.id); setNewScore(String(answer.score)); }}
                      >
                        <Edit3 size={14} /> تعديل الدرجة
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ExamResults;
