import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { X, Loader2, Sparkles, Mic } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants';

// --- TYPES FOR SPEECH RECOGNITION ---
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Define the Handle type for parent components
export interface VoiceInputHandle {
  start: () => void;
}

interface VoiceInputProps {
  onSuccess: (data: { 
    amount: number; 
    category: string; 
    note: string; 
    type: 'expense' | 'income';
    walletType: string;
  }) => void;
  onError: (message: string) => void;
}

const VoiceInput = forwardRef<VoiceInputHandle, VoiceInputProps>(({ onSuccess, onError }, ref) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // Expose start method to parent via ref
  useImperativeHandle(ref, () => ({
    start: () => {
      handleStartListening();
    }
  }));

  // --- 1. INITIALIZE SPEECH RECOGNITION ---
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'vi-VN'; // Vietnamese
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        handleProcessAI(text);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        
        // FIX: Avoid JSON.stringify(event) to prevent "Converting circular structure to JSON" error
        const errorType = event.error || 'unknown';

        // Logic xử lý lỗi chi tiết
        if (errorType === 'no-speech') {
          // Người dùng im lặng -> Nhắc nhở nhẹ nhàng
          onError('Không nghe thấy gì, thử lại nhé');
        } else if (errorType === 'network') {
          // Lỗi mạng
          onError('Lỗi mạng, vui lòng kiểm tra kết nối');
        } else if (errorType === 'not-allowed') {
          // Chưa cấp quyền
          onError('Vui lòng cấp quyền Microphone để sử dụng tính năng này.');
        } else {
          // Các lỗi kỹ thuật khác -> Log console, không làm phiền người dùng bằng Alert
          console.error('Voice Recognition Error:', errorType);
        }
      };

      recognitionRef.current = recognition;
    }
  }, [onError]);

  const handleStartListening = () => {
    if (!recognitionRef.current) {
      alert('Trình duyệt của bạn không hỗ trợ chức năng thu âm.');
      return;
    }
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error(e);
      // Restart if already started (edge case)
      recognitionRef.current.stop();
      setTimeout(() => recognitionRef.current.start(), 200);
    }
  };

  const handleStopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // --- 2. GEMINI AI PROCESSING ---
  const handleProcessAI = async (text: string) => {
    if (!text) return;
    setIsProcessing(true);

    try {
      const API_KEY = process.env.API_KEY || "";
      if (!API_KEY) {
        throw new Error("Missing API Key");
      }

      const ai = new GoogleGenAI({ apiKey: API_KEY });
      const expenseCats = EXPENSE_CATEGORIES.join(', ');
      const incomeCats = INCOME_CATEGORIES.join(', ');
      
      const prompt = `
        Analyze text: "${text}"
        Extract JSON object with these fields:
        1. "amount": number (convert k/m/tr/lít/củ to zeros. Example: "35k" -> 35000).
        2. "type": string ("income" if keywords: lương, thưởng, bán, lãi, biếu, tặng, thu...; else "expense").
        3. "category": string (Best match from list:
           - If expense: ${expenseCats}, Khác.
           - If income: ${incomeCats}, Khác).
        4. "walletType": string (detect source: "bank" (ngân hàng, ck, chuyển khoản, mb, vcb...), "ewallet" (momo, ví, zalopay, apple pay), default "cash" (tiền mặt)).
        5. "note": string (Remove amount, currency, wallet keywords, and category name from text. Keep only the specific description. Capitalize first letter. Example: "Bún bò 40k ngân hàng" -> "Bún bò"; "Lương tháng 2 10 triệu" -> "Tháng 2").
        
        Return ONLY raw JSON. No markdown block.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const rawText = response.text;
      const jsonString = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(jsonString);

      const finalData = {
        amount: typeof data.amount === 'number' ? data.amount : 0,
        category: typeof data.category === 'string' ? data.category : 'Khác',
        note: typeof data.note === 'string' ? data.note : text,
        type: (data.type === 'income' ? 'income' : 'expense') as 'expense' | 'income',
        walletType: typeof data.walletType === 'string' ? data.walletType : 'cash'
      };

      onSuccess(finalData);

    } catch (error) {
      console.error("AI Error:", error);
      onError("Không thể phân tích dữ liệu. Vui lòng thử lại.");
      // Fallback
      onSuccess({ amount: 0, category: 'Khác', note: text, type: 'expense', walletType: 'cash' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {(isListening || isProcessing) && (
        <div className="fixed inset-0 z-[10000] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in p-6 text-center">
          
          <button 
            onClick={handleStopListening} 
            className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={32} />
          </button>

          {/* Visualizer */}
          <div className="relative mb-8">
            {isProcessing ? (
              <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center animate-pulse">
                <Sparkles size={48} className="text-blue-500 animate-spin-slow" />
              </div>
            ) : (
              <div className="relative w-24 h-24 flex items-center justify-center">
                 {/* CSS Wave Animation */}
                 <span className="absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-20 animate-ping"></span>
                 <span className="absolute inline-flex h-20 w-20 rounded-full bg-blue-500 opacity-30 animate-ping animation-delay-500"></span>
                 <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/40">
                    <Mic size={40} className="text-white" />
                 </div>
              </div>
            )}
          </div>

          <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
            {isProcessing ? "Đang phân tích..." : "Đang nghe..."}
          </h3>
          
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-md min-h-[3rem] font-medium">
            {transcript || (isProcessing ? "AI đang đọc dữ liệu..." : "Nói: \"Ăn trưa 50 nghìn\"...")}
          </p>

          {isProcessing && (
            <div className="mt-4 flex items-center gap-2 text-blue-500 text-sm font-semibold">
              <Loader2 size={16} className="animate-spin" />
              <span>Gemini đang xử lý</span>
            </div>
          )}

        </div>
      )}

      <style>{`
        .animate-spin-slow { animation: spin 3s linear infinite; }
        .animation-delay-500 { animation-delay: 0.5s; }
      `}</style>
    </>
  );
});

VoiceInput.displayName = 'VoiceInput';

export default VoiceInput;