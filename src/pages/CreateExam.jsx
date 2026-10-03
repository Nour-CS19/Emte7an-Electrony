import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Textarea, Select, Badge, Spinner } from '../components/ui';
import { Plus, Trash2, ArrowRight, GripVertical, Save, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import AIGeneratorModal from '../components/AIGeneratorModal';

// Generate a unique 6-character exam code
const generateCode = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

const QUESTION_TYPES = [
  { value: 'mcq', label: 'اختيار من متعدد' },
  { value: 'true_false', label: 'صح وخطأ' },
  { value: 'essay', label: 'سؤال مقالي' },
];

const emptyQuestion = (orderIndex) => ({
  id: Date.now() + Math.random(),
  type: 'mcq',
  text: '',
  options: ['', '', '', ''],
  correct_answer: '0',
  points: 1,
  order_index: orderIndex,
});

const CreateExam = ({ isEditing = false }) => {
  const { profile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { examId } = useParams();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [exam, setExam] = useState({
    title: '',
    description: '',
    duration_minutes: 60,
  });
  const [questions, setQuestions] = useState([emptyQuestion(0)]);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  useEffect(() => {
    if (isEditing && examId) {
      loadExamDetails();
    }
  }, [isEditing, examId]);

  const loadExamDetails = async () => {
    try {
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();
      if (examError) throw examError;

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('order_index', { ascending: true });
      if (questionsError) throw questionsError;

      setExam({
        title: examData.title,
        description: examData.description || '',
        duration_minutes: examData.duration_minutes,
      });

      if (questionsData && questionsData.length > 0) {
        setQuestions(questionsData.map(q => ({
          ...emptyQuestion(0),
          ...q,
          options: q.options || ['', '', '', ''],
          correct_answer: String(q.correct_answer)
        })));
      }
    } catch (err) {
      toast.error('حدث خطأ في تحميل بيانات الامتحان');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const updateExam = (field, value) => {
    setExam((prev) => ({ ...prev, [field]: value }));
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion(prev.length)]);
  };

  const handleAddAIQuestions = (aiQuestions) => {
    const newQuestions = aiQuestions.map((q, idx) => ({
      ...emptyQuestion(questions.length + idx),
      type: 'mcq',
      text: `<p>${q.text}</p>`,
      options: q.options,
      correct_answer: String(q.correct_answer),
    }));
    
    // If the first question is completely empty, replace it
    if (questions.length === 1 && !questions[0].text && questions[0].options.every(o => !o)) {
      setQuestions(newQuestions);
    } else {
      setQuestions(prev => [...prev, ...newQuestions]);
    }
  };

  const removeQuestion = (index) => {
    if (questions.length <= 1) {
      toast.error('يجب أن يكون هناك سؤال واحد على الأقل');
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index, field, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  };

  const handleSetCorrectAnswerTF = (qIndex, value) => {
    updateQuestion(qIndex, 'correct_answer', value);
    toast.success('تم حفظ الإجابة بنجاح');
  };

  const handleSetCorrectAnswerMCQ = (qIndex, optIndex, optText) => {
    updateQuestion(qIndex, 'correct_answer', String(optIndex));
    toast.success(`تم حفظ الإجابة: ${optText || `الخيار ${optIndex + 1}`}`);
  };

  const updateOption = (qIndex, optIndex, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const newOptions = [...q.options];
        newOptions[optIndex] = value;
        return { ...q, options: newOptions };
      })
    );
  };

  const addOption = (qIndex) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        return { ...q, options: [...q.options, ''] };
      })
    );
  };

  const removeOption = (qIndex, optIndex) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex || q.options.length <= 2) return q;
        const newOptions = q.options.filter((_, oi) => oi !== optIndex);
        // Adjust correct_answer if needed
        let correctAnswer = parseInt(q.correct_answer);
        if (optIndex < correctAnswer) correctAnswer--;
        else if (optIndex === correctAnswer) correctAnswer = 0;
        return { ...q, options: newOptions, correct_answer: String(correctAnswer) };
      })
    );
  };

  const validate = () => {
    if (!exam.title.trim()) {
      toast.error('الرجاء إدخال عنوان الامتحان');
      return false;
    }
    if (exam.duration_minutes < 1) {
      toast.error('المدة يجب أن تكون دقيقة واحدة على الأقل');
      return false;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const strippedText = q.text.replace(/<[^>]*>?/gm, '').trim();
      if (!strippedText && !q.text.includes('<img') && !q.text.includes('<video')) {
        toast.error(`السؤال ${i + 1}: الرجاء إدخال نص السؤال أو إرفاق صورة/فيديو`);
        return false;
      }
      if (q.type === 'mcq') {
        const filledOptions = q.options.filter((o) => o.trim());
        if (filledOptions.length < 2) {
          toast.error(`السؤال ${i + 1}: يجب إدخال خيارين على الأقل`);
          return false;
        }
      }
      if (q.type === 'essay' && !q.correct_answer.trim()) {
        toast.error(`السؤال ${i + 1}: الرجاء إدخال الإجابة النموذجية`);
        return false;
      }
      if (q.points <= 0) {
        toast.error(`السؤال ${i + 1}: الدرجة يجب أن تكون أكبر من صفر`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      let finalCode = exam.code;
      let currentExamId = examId;

      if (!isEditing) {
        const code = generateCode();
        const { data: existing } = await supabase
          .from('exams')
          .select('id')
          .eq('code', code)
          .single();
        finalCode = existing ? generateCode() : code;

        const { data: examData, error: examError } = await supabase
          .from('exams')
          .insert({
            teacher_id: profile.id,
            title: exam.title.trim(),
            description: exam.description.trim(),
            duration_minutes: Number(exam.duration_minutes),
            code: finalCode,
            is_active: true,
          })
          .select()
          .single();
        if (examError) throw examError;
        currentExamId = examData.id;
      } else {
        const { error: examError } = await supabase
          .from('exams')
          .update({
            title: exam.title.trim(),
            description: exam.description.trim(),
            duration_minutes: Number(exam.duration_minutes),
          })
          .eq('id', currentExamId);
        if (examError) throw examError;

        // Delete old questions to replace them (this might fail if students submitted)
        const { error: delError } = await supabase
          .from('questions')
          .delete()
          .eq('exam_id', currentExamId);
        if (delError) throw new Error('لا يمكن تعديل الأسئلة لأن هناك طلاب امتحنوا هذا الامتحان بالفعل.');
      }

      // Prepare questions for insert
      const questionsToInsert = questions.map((q, i) => {
        const base = {
          exam_id: currentExamId,
          type: q.type,
          text: q.text.trim(),
          points: Number(q.points),
          order_index: i,
        };

        if (q.type === 'mcq') {
          return {
            ...base,
            options: q.options.filter((o) => o.trim()),
            correct_answer: q.correct_answer,
          };
        } else if (q.type === 'true_false') {
          return {
            ...base,
            options: null,
            correct_answer: q.correct_answer,
          };
        } else {
          // essay
          return {
            ...base,
            options: null,
            correct_answer: q.correct_answer,
          };
        }
      });

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      toast.success(isEditing ? 'تم حفظ التعديلات بنجاح!' : `تم إنشاء الامتحان بنجاح! الكود: ${finalCode}`);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error saving exam:', err);
      toast.error(err.message || 'حدث خطأ في حفظ الامتحان');
    } finally {
      setSaving(false);
    }
  };

  const totalPoints = questions.reduce((sum, q) => sum + Number(q.points || 0), 0);

  if (loading) return <Spinner size={36} />;

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '32px', paddingBottom: '48px', maxWidth: '800px' }}>
      {/* Back + Title */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="btn btn-ghost"
          style={{ padding: '8px' }}
        >
          <ArrowRight size={22} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '2px' }}>إنشاء امتحان جديد</h2>
          <p className="text-muted" style={{ fontSize: '14px' }}>أضف الأسئلة وحدد الإجابات الصحيحة والدرجات</p>
        </div>
      </div>

      {/* Exam Details */}
      <Card className="mb-6">
        <h3 className="mb-4" style={{ fontSize: '1.05rem' }}>تفاصيل الامتحان</h3>
        <Input
          label="عنوان الامتحان"
          id="exam-title"
          placeholder="مثال: امتحان الجغرافيا — الصف الأول الثانوي"
          value={exam.title}
          onChange={(e) => updateExam('title', e.target.value)}
          required
        />
        <Textarea
          label="وصف (اختياري)"
          id="exam-desc"
          placeholder="وصف مختصر للامتحان..."
          value={exam.description}
          onChange={(e) => updateExam('description', e.target.value)}
          style={{ minHeight: '70px' }}
        />
        <Input
          label="مدة الامتحان (بالدقائق)"
          id="exam-duration"
          type="number"
          min={1}
          max={300}
          value={exam.duration_minutes}
          onChange={(e) => updateExam('duration_minutes', e.target.value)}
        />
      </Card>

      {/* Questions */}
      <div className="flex justify-between items-center mb-4">
        <h3 style={{ fontSize: '1.05rem' }}>
          الأسئلة ({questions.length}) · <span className="text-brand">{totalPoints} درجة</span>
        </h3>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        {questions.map((q, qIndex) => (
          <div key={q.id} className="question-card animate-fade-in">
            <div className="question-card-header">
              <div className="question-number">
                <span className="question-number-badge">{qIndex + 1}</span>
                <Select
                  id={`q-type-${qIndex}`}
                  options={QUESTION_TYPES}
                  value={q.type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    updateQuestion(qIndex, 'type', newType);
                    if (newType === 'true_false') {
                      updateQuestion(qIndex, 'correct_answer', 'true');
                    } else if (newType === 'mcq') {
                      updateQuestion(qIndex, 'correct_answer', '0');
                      if (!q.options || q.options.length < 2) {
                        updateQuestion(qIndex, 'options', ['', '', '', '']);
                      }
                    } else {
                      updateQuestion(qIndex, 'correct_answer', '');
                    }
                  }}
                  style={{ marginBottom: 0, maxWidth: '200px' }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id={`q-points-${qIndex}`}
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={q.points}
                  onChange={(e) => updateQuestion(qIndex, 'points', e.target.value)}
                  style={{ width: '80px', marginBottom: 0, textAlign: 'center' }}
                  title="الدرجة"
                />
                <span className="text-muted" style={{ fontSize: '13px' }}>درجة</span>
                <Button
                  variant="ghost"
                  onClick={() => removeQuestion(qIndex)}
                  style={{ color: 'var(--danger)', padding: '6px' }}
                  title="حذف السؤال"
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </div>

            {/* Question Text */}
            <div className="mb-6">
              <label className="input-label mb-2 flex justify-between" style={{ display: 'block' }}>
                <span>نص السؤال</span>
                <span className="text-muted" style={{ fontSize: '12px' }}>(يمكنك إضافة صور، روابط، أو تنسيق النص)</span>
              </label>
              <ReactQuill
                theme="snow"
                value={q.text}
                onChange={(content) => updateQuestion(qIndex, 'text', content)}
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'direction': 'rtl' }],
                    ['link', 'image', 'video'],
                    ['clean']
                  ]
                }}
                className="quill-editor"
              />
            </div>

            {/* MCQ Options */}
            {q.type === 'mcq' && (
              <div>
                <label className="input-label mb-2" style={{ display: 'block' }}>الخيارات (حدد الإجابة الصحيحة)</label>
                {q.options.map((opt, optIndex) => (
                  <div key={optIndex} className="option-row">
                    <input
                      type="radio"
                      name={`correct-${qIndex}`}
                      className="option-radio"
                      checked={q.correct_answer === String(optIndex)}
                      onChange={() => handleSetCorrectAnswerMCQ(qIndex, optIndex, opt)}
                      title="اختر كإجابة صحيحة"
                    />
                    <input
                      className="input-field"
                      style={{ flex: 1, marginBottom: 0 }}
                      placeholder={`الخيار ${optIndex + 1}`}
                      value={opt}
                      onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                    />
                    {q.options.length > 2 && (
                      <Button
                        variant="ghost"
                        onClick={() => removeOption(qIndex, optIndex)}
                        style={{ padding: '4px', color: 'var(--text-muted)' }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                ))}
                {q.options.length < 6 && (
                  <Button
                    variant="ghost"
                    onClick={() => addOption(qIndex)}
                    style={{ marginTop: '8px', fontSize: '13px' }}
                  >
                    <Plus size={16} />
                    إضافة خيار
                  </Button>
                )}
              </div>
            )}

            {/* True/False */}
            {q.type === 'true_false' && (
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <label className="input-label mb-2" style={{ display: 'block' }}>الإجابة الصحيحة</label>
                <p className="text-muted mb-4" style={{ fontSize: '13px' }}>
                  💡 قم بكتابة العبارة في صندوق "نص السؤال" بالأعلى، ثم حدد هنا ما إذا كانت العبارة صحيحة أم خاطئة.
                </p>
                <div className="flex gap-4">
                  <div 
                    className="exam-option" 
                    onClick={(e) => {
                      e.preventDefault();
                      handleSetCorrectAnswerTF(qIndex, 'true');
                    }}
                    style={{ 
                      flex: 1, 
                      justifyContent: 'center', 
                      background: q.correct_answer === 'true' || q.correct_answer === true ? 'var(--success-soft)' : 'var(--bg-primary)',
                      border: q.correct_answer === 'true' || q.correct_answer === true ? '2px solid var(--success-color)' : '1px solid var(--border-color)',
                      color: q.correct_answer === 'true' || q.correct_answer === true ? 'var(--success-color)' : 'inherit',
                      fontWeight: q.correct_answer === 'true' || q.correct_answer === true ? 'bold' : 'normal',
                      padding: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    صح ✓
                  </div>
                  <div 
                    className="exam-option" 
                    onClick={(e) => {
                      e.preventDefault();
                      handleSetCorrectAnswerTF(qIndex, 'false');
                    }}
                    style={{ 
                      flex: 1, 
                      justifyContent: 'center',
                      background: q.correct_answer === 'false' || q.correct_answer === false ? 'var(--danger-soft)' : 'var(--bg-primary)',
                      border: q.correct_answer === 'false' || q.correct_answer === false ? '2px solid var(--danger)' : '1px solid var(--border-color)',
                      color: q.correct_answer === 'false' || q.correct_answer === false ? 'var(--danger)' : 'inherit',
                      fontWeight: q.correct_answer === 'false' || q.correct_answer === false ? 'bold' : 'normal',
                      padding: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    خطأ ✗
                  </div>
                </div>
              </div>
            )}

            {/* Essay */}
            {q.type === 'essay' && (
              <div>
                <Textarea
                  label="الإجابة النموذجية (تُستخدم في التصحيح التلقائي)"
                  id={`q-model-${qIndex}`}
                  placeholder="اكتب الإجابة النموذجية هنا... كلما كانت مفصلة، كان التصحيح أدق."
                  value={q.correct_answer}
                  onChange={(e) => updateQuestion(qIndex, 'correct_answer', e.target.value)}
                  style={{ minHeight: '100px' }}
                />
                <p className="text-muted" style={{ fontSize: '12px', marginTop: '-10px' }}>
                  💡 النظام يقارن إجابة الطالب بالنموذجية حسب تطابق الكلمات المفتاحية.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Question Button */}
      <div className="flex gap-4 mb-8">
        <Button variant="outline" onClick={addQuestion} style={{ flex: 1 }} size="lg">
          <Plus size={20} />
          إضافة سؤال جديد
        </Button>
        <Button 
          style={{ flex: 1, background: 'linear-gradient(135deg, #4f46e5, #8b5cf6)', color: '#ffffff', border: 'none' }} 
          size="lg"
          onClick={() => setIsAIModalOpen(true)}
        >
          <Sparkles size={20} color="#ffffff" />
          <span style={{ color: '#ffffff', fontWeight: 'bold' }}>توليد أسئلة بالذكاء الاصطناعي 🪄</span>
        </Button>
      </div>

      <AIGeneratorModal 
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onAddQuestions={handleAddAIQuestions}
        apiKey={import.meta.env.VITE_GEMINI_API_KEY}
      />

      {/* Save */}
      <div className="flex justify-between items-center" style={{ position: 'sticky', bottom: '20px', background: 'var(--bg-secondary)', padding: '16px 24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' }}>
        <div>
          <span className="font-bold">{questions.length} سؤال</span>
          <span className="text-muted" style={{ marginRight: '12px' }}>·</span>
          <span className="text-brand font-bold">{totalPoints} درجة</span>
        </div>
        <Button onClick={handleSave} isLoading={saving} size="lg">
          <Save size={18} />
          {isEditing ? 'حفظ التعديلات' : 'حفظ ونشر الامتحان'}
        </Button>
      </div>
    </div>
  );
};

export default CreateExam;
