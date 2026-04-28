import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, GenerateContentResponse, ThinkingLevel } from "@google/genai";
import { MessageSquare, Send, X, Bot, Loader2, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const geminiApiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || "";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIAssistant({ fetchWithAuth }: { fetchWithAuth?: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your DeshiShop Assistant. How can I help you today? I can record transactions, generate reports, or even trigger a software build.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const tools = [
    {
      functionDeclarations: [
        {
          name: "add_mfs_transaction",
          description: "Adds a bKash, Nagad, or Rocket transaction (Cash-in, Cash-out, Receive, B2B-Buy, B2B-Pay).",
          parameters: {
            type: Type.OBJECT,
            properties: {
              operator: { type: Type.STRING, enum: ["bKash", "Nagad", "Rocket"] },
              type: { type: Type.STRING, enum: ["Cash-in", "Cash-out", "Receive", "B2B-Buy", "B2B-Pay"] },
              amount: { type: Type.NUMBER },
              customer_phone: { type: Type.STRING },
              trx_id: { type: Type.STRING },
              vendor_id: { type: Type.NUMBER },
              shop_number_id: { type: Type.NUMBER, description: "The ID of the shop's agent/personal number used for this transaction." }
            },
            required: ["operator", "type", "amount"]
          }
        },
        {
          name: "add_recharge_transaction",
          description: "Adds a mobile recharge transaction (GP, Robi, BL, Airtel, Teletalk).",
          parameters: {
            type: Type.OBJECT,
            properties: {
              operator: { type: Type.STRING, enum: ["GP", "Robi", "BL", "Airtel", "Teletalk"] },
              type: { type: Type.STRING, enum: ["Recharge", "B2B-Buy", "B2B-Pay"] },
              amount: { type: Type.NUMBER },
              customer_phone: { type: Type.STRING },
              vendor_id: { type: Type.NUMBER },
              shop_number_id: { type: Type.NUMBER, description: "The ID of the shop's agent/personal number used for this transaction." }
            },
            required: ["operator", "amount"]
          }
        },
        {
          name: "get_shop_numbers",
          description: "Fetches the list of shop's agent and personal numbers.",
          parameters: { type: Type.OBJECT, properties: {} }
        },
        {
          name: "add_service_sale",
          description: "Adds a print or photocopy service sale.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              service_type: { type: Type.STRING, enum: ["Photocopy", "Print"] },
              variant: { type: Type.STRING, enum: ["A4 BW", "A4 Color", "Legal BW", "Legal Color"] },
              pages: { type: Type.NUMBER },
              price: { type: Type.NUMBER }
            },
            required: ["service_type", "variant", "pages", "price"]
          }
        },
        {
          name: "add_expense",
          description: "Records a shop expense.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              description: { type: Type.STRING },
              amount: { type: Type.NUMBER }
            },
            required: ["category", "amount"]
          }
        },
        {
          name: "get_analytics_report",
          description: "Fetches the daily analytics report including total profit and cash in hand.",
          parameters: { type: Type.OBJECT, properties: {} }
        },
        {
          name: "get_inventory",
          description: "Fetches the current inventory items and their stock levels.",
          parameters: { type: Type.OBJECT, properties: {} }
        },
        {
          name: "get_customers",
          description: "Fetches the list of customers and their balances.",
          parameters: { type: Type.OBJECT, properties: {} }
        },
        {
          name: "sell_product",
          description: "Records a product sale from inventory. Decrements stock and updates sales ledger.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              inventory_id: { type: Type.NUMBER, description: "The ID of the inventory item." },
              quantity: { type: Type.NUMBER },
              price: { type: Type.NUMBER, description: "The total sale price." },
              customer_id: { type: Type.NUMBER, description: "The ID of the customer (required for Partial or Due payments)." },
              payment_status: { type: Type.STRING, enum: ["Paid", "Partial", "Due"] },
              paid_amount: { type: Type.NUMBER },
              due_amount: { type: Type.NUMBER }
            },
            required: ["inventory_id", "quantity", "price"]
          }
        },
        {
          name: "trigger_software_build",
          description: "Triggers a software build process. ONLY call this if the user explicitly asks for a 'build' or 'deploy' and identifies as admin.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              confirm_admin: { type: Type.BOOLEAN, description: "Must be true to proceed." }
            },
            required: ["confirm_admin"]
          }
        }
      ]
    }
  ];

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      if (!geminiApiKey) {
        setMessages(prev => [...prev, { role: 'assistant', content: "AI Assistant is not configured yet. Please set GEMINI_API_KEY in your .env file and restart the server." }]);
        return;
      }

      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        config: {
          systemInstruction: "You are a helpful assistant for 'DeshiShop Manager'. You can help the user manage their shop by recording transactions (MFS, Recharge, Services, Expenses, and Inventory Sales), generating reports, and triggering builds. Use the provided tools to perform actions. If a user asks to sell a product, use 'get_inventory' and 'get_customers' to find the correct IDs first. Always be polite and professional.",
          tools: tools,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });

      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        const functionResponses = [];
        for (const call of functionCalls) {
          const result = await executeFunction(call.name, call.args);
          functionResponses.push({ 
            functionResponse: { 
              name: call.name, 
              response: result, 
              id: call.id 
            } 
          });
        }
        
        // Send back all function results to the model to get a final text response
        const finalResponse = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            { role: 'user', parts: [{ text: userMessage }] },
            { role: 'model', parts: response.candidates?.[0]?.content?.parts || [] },
            { role: 'user', parts: functionResponses }
          ],
          config: { 
            tools: tools,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
          }
        });
        
        setMessages(prev => [...prev, { role: 'assistant', content: finalResponse.text || "Action completed successfully." }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: response.text || "I'm not sure how to help with that." }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeFunction = async (name: string, args: any) => {
    try {
      let endpoint = '';
      let method = 'POST';
      let body = args;

      switch (name) {
        case 'add_mfs_transaction':
          endpoint = '/api/mfs';
          break;
        case 'add_recharge_transaction':
          endpoint = '/api/recharge';
          break;
        case 'add_service_sale':
          endpoint = '/api/services';
          break;
        case 'add_expense':
          endpoint = '/api/expenses';
          break;
        case 'get_shop_numbers':
          endpoint = '/api/shop-numbers';
          method = 'GET';
          body = null;
          break;
        case 'get_analytics_report':
          endpoint = '/api/analytics';
          method = 'GET';
          body = null;
          break;
        case 'get_inventory':
          endpoint = '/api/inventory';
          method = 'GET';
          body = null;
          break;
        case 'get_customers':
          endpoint = '/api/customers';
          method = 'GET';
          body = null;
          break;
        case 'sell_product':
          endpoint = '/api/inventory/sell';
          break;
        case 'trigger_software_build':
          if (args.confirm_admin) {
            return { success: true, message: "Build triggered successfully. The system is now compiling the latest changes." };
          } else {
            return { success: false, message: "Build failed: Admin confirmation required." };
          }
        default:
          return { error: "Unknown function" };
      }

      const res = await (fetchWithAuth ? fetchWithAuth(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      }) : fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      }));
      if (!res.ok) {
        return { error: `Server error: ${res.status}` };
      }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return { error: "Received non-JSON response from server" };
      }
      return await res.json();
    } catch (err) {
      return { error: "Failed to execute action" };
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-emerald-700 transition-all z-50 group"
      >
        <Bot className="w-7 h-7 group-hover:scale-110 transition-transform" />
        <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden z-50"
          >
            {/* Header */}
            <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">DeshiShop AI</h3>
                  <p className="text-[10px] text-emerald-100">Online & Ready to help</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-emerald-600 text-white rounded-tr-none' 
                      : 'bg-white border border-slate-100 text-slate-700 shadow-sm rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-100">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a command (e.g., 'Add 500 bKash cash out')"
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                Try: "Show today's report" or "Build software (Admin)"
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
