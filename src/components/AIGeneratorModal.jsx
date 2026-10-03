import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card, Button, Input, Textarea, Spinner } from './ui';
import { Sparkles, Upload, X, CheckSquare, Square } from 'lucide-react';
import { useToast } from './Toast';

const AIGeneratorModal = ({ isOpen, onClose, onAddQuestions, apiKey }) => {
  const [mode, setMode] = useState('text'); // 'text' or 'image'
  const [inputText, setInputText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imageBase64, setImageBase64] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  
  const [loading, setLoading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  
  const [chatInput, setChatInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  
  const fileInputRef = useRef(null);
  const toast = useToast();

  if (!isOpen) return null;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الملف يجب أن يكون أقل من 10 ميجابايت');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      // Get base64 without the data:image/jpeg;base64, prefix
      const base64String = reader.result.split(',')[1];
      setImageBase64(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (mode === 'text' && !inputText.trim()) {
      return toast.error('الرجاء إدخال النص أولاً');
    }
    if (mode === 'image' && !imageBase64) {
      return toast.error('الرجاء رفع صورة أولاً');
    }

    setLoading(true);
    setGeneratedQuestions([]);
    setSelectedIndices(new Set());

    try {
      const prompt = `استخرج المحتوى التعليمي من هذا ${mode === 'image' ? 'الملف/الصورة' : 'النص'} وقم بإنشاء ${numQuestions} أسئلة اختيار من متعدد (MCQ) باللغة العربية. 
المتطلبات:
1. يجب أن يكون الرد فقط عبارة عن مصفوفة JSON صالحة.
2. لا تقم بإضافة أي نصوص أخرى أو علامات Markdown (مثل \`\`\`json).
3. كل كائن في المصفوفة يجب أن يحتوي على:
- "text": نص السؤال.
- "options": مصفوفة تحتوي على 4 خيارات بالظبط.
- "correct_answer": الرقم الدليلي (index) للإجابة الصحيحة (0, 1, 2, أو 3).

مثال على الرد المطلوب:
[
  {
    "text": "ما هي عاصمة مصر؟",
    "options": ["الإسكندرية", "القاهرة", "الجيزة", "الأقصر"],
    "correct_answer": "1"
  }
]`;

      const parts = [{ text: prompt }];
      
      if (mode === 'image' && imageBase64) {
        parts.push({
          inline_data: {
            mime_type: imageFile.type,
            data: imageBase64
          }
        });
      } else if (mode === 'text') {
        parts.push({ text: `\n\nالنص:\n${inputText}` });
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error:', data);
        throw new Error(data.error?.message || 'فشل الاتصال بالذكاء الاصطناعي');
      }

      const aiText = data.candidates[0].content.parts[0].text;
      
      // Clean markdown if AI still adds it
      const cleanJson = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsedQuestions = JSON.parse(cleanJson);
      
      if (!Array.isArray(parsedQuestions)) {
        throw new Error('التنسيق المستلم غير صحيح');
      }

      setGeneratedQuestions(parsedQuestions);
      // Select all by default
      setSelectedIndices(new Set(parsedQuestions.map((_, i) => i)));
      toast.success('تم توليد الأسئلة بنجاح!');

    } catch (error) {
      console.error('Generation Error:', error);
      toast.error(error.message || 'حدث خطأ أثناء توليد الأسئلة. تأكد من صحة النص أو الصورة.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!chatInput.trim()) return;

    setIsRefining(true);
    try {
      const prompt = `الأسئلة الحالية (بصيغة JSON):\n${JSON.stringify(generatedQuestions)}\n\nطلب تعديل من المستخدم:\n${chatInput}\n\nالرجاء تعديل الأسئلة الحالية أو إضافة أسئلة جديدة بناءً على طلب المستخدم.\nالمتطلبات:\n1. يجب أن يكون الرد فقط عبارة عن مصفوفة JSON صالحة.\n2. لا تقم بإضافة أي نصوص أخرى أو علامات Markdown.\n3. كل كائن في المصفوفة يجب أن يحتوي على نفس الهيكل السابق: text, options, correct_answer.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'فشل الاتصال بالذكاء الاصطناعي');

      const aiText = data.candidates[0].content.parts[0].text;
      const cleanJson = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedQuestions = JSON.parse(cleanJson);
      
      setGeneratedQuestions(parsedQuestions);
      setSelectedIndices(new Set(parsedQuestions.map((_, i) => i)));
      setChatInput('');
      toast.success('تم تنفيذ التعديل بنجاح!');
    } catch (error) {
      console.error('Refine Error:', error);
      toast.error('حدث خطأ أثناء تعديل الأسئلة.');
    } finally {
      setIsRefining(false);
    }
  };

  const toggleSelect = (index) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setSelectedIndices(newSet);
  };

  const handleAddSelected = () => {
    const questionsToAdd = generatedQuestions.filter((_, i) => selectedIndices.has(i));
    onAddQuestions(questionsToAdd);
    onClose();
  };

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <Card style={{ 
        width: '100%', maxWidth: '800px', maxHeight: '90vh', 
        display: 'flex', flexDirection: 'column', padding: '24px',
        position: 'relative'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '24px', left: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          <X size={24} />
        </button>

        <div className="flex items-center gap-3 mb-6 text-brand">
          <Sparkles size={28} />
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>المساعد الذكي لإنشاء الأسئلة</h2>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
          
          {generatedQuestions.length === 0 && !loading && (
            <div className="animate-fade-in">
              <div className="flex gap-4 mb-6">
                <Button 
                  variant={mode === 'text' ? 'primary' : 'outline'} 
                  onClick={() => setMode('text')}
                  style={{ flex: 1 }}
                >
                  📝 إدخال نص
                </Button>
                <Button 
                  variant={mode === 'image' ? 'primary' : 'outline'} 
                  onClick={() => setMode('image')}
                  style={{ flex: 1 }}
                >
                  🖼️ رفع صورة/ملف
                </Button>
              </div>

              {mode === 'text' ? (
                <Textarea 
                  placeholder="انسخ والصق محتوى الدرس هنا..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  style={{ minHeight: '200px' }}
                />
              ) : (
                <div 
                  style={{ 
                    border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)',
                    padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                    background: 'var(--bg-secondary)', marginBottom: '16px'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={40} className="text-muted mx-auto mb-4" />
                  <p>اضغط لاختيار صورة أو ملف PDF (أو قم بالسحب هنا)</p>
                  <p className="text-muted mt-2" style={{ fontSize: '13px' }}>يدعم ملفات PDF وصور الدروس والملازم (JPG, PNG)</p>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    onChange={handleImageUpload}
                  />
                  {imageFile && (
                    <div className="mt-4 text-brand font-bold">تم اختيار: {imageFile.name}</div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 mt-6">
                <div style={{ flex: 1 }}>
                  <label className="input-label" style={{ display: 'block', marginBottom: '8px' }}>عدد الأسئلة المطلوبة</label>
                  <Input 
                    type="number" 
                    min={1} max={20} 
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(e.target.value)}
                    style={{ marginBottom: 0 }}
                  />
                </div>
                <Button onClick={handleGenerate} size="lg" style={{ marginTop: '30px' }}>
                  <Sparkles size={18} />
                  توليد الأسئلة الآن
                </Button>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
              <Spinner size={48} className="text-brand mb-4" />
              <h3 className="mb-2">جاري تحليل المحتوى بالذكاء الاصطناعي...</h3>
              <p className="text-muted">هذا قد يستغرق بضع ثوانٍ</p>
            </div>
          )}

          {generatedQuestions.length > 0 && !loading && (
            <div className="animate-fade-in">
              <h3 className="mb-4">تم توليد {generatedQuestions.length} أسئلة:</h3>
              <div className="flex flex-col gap-4">
                {generatedQuestions.map((q, i) => {
                  const isSelected = selectedIndices.has(i);
                  return (
                    <Card key={i} style={{ 
                      padding: '16px', 
                      border: isSelected ? '2px solid var(--brand)' : '1px solid var(--border-color)',
                      opacity: isSelected ? 1 : 0.6,
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }} onClick={() => toggleSelect(i)}>
                      <div className="flex gap-4">
                        <div style={{ color: isSelected ? 'var(--brand)' : 'var(--text-muted)' }}>
                          {isSelected ? <CheckSquare size={24} /> : <Square size={24} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 className="mb-3 font-bold">{q.text}</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {q.options.map((opt, optIdx) => (
                              <div key={optIdx} style={{
                                padding: '8px', 
                                borderRadius: '4px',
                                background: String(q.correct_answer) === String(optIdx) ? 'var(--success-soft)' : 'var(--bg-secondary)',
                                color: String(q.correct_answer) === String(optIdx) ? 'var(--success-color)' : 'inherit',
                                fontSize: '14px'
                              }}>
                                {optIdx + 1}. {opt} {String(q.correct_answer) === String(optIdx) && '✓'}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
              
              {/* Chatbot Interface */}
              <div className="mt-6 p-4" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                <label className="input-label mb-2" style={{ display: 'block' }}>المساعد الذكي (Chatbot)</label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="اطلب من الذكاء الاصطناعي تعديل الأسئلة أو إضافة المزيد..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    style={{ marginBottom: 0, flex: 1 }}
                    onKeyPress={(e) => e.key === 'Enter' && handleRefine()}
                  />
                  <Button onClick={handleRefine} isLoading={isRefining}>
                    إرسال 🪄
                  </Button>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => {
                  setGeneratedQuestions([]);
                }}>
                  توليد مرة أخرى
                </Button>
                <Button onClick={handleAddSelected} disabled={selectedIndices.size === 0}>
                  إضافة ({selectedIndices.size}) أسئلة للامتحان
                </Button>
              </div>
            </div>
          )}

        </div>
      </Card>
    </div>,
    document.body
  );
};

export default AIGeneratorModal;
