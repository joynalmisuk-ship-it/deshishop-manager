import React, { useState, useEffect } from 'react';
import { LogIn, Monitor, ShieldCheck, Zap, Check, X, CreditCard, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Language, translations } from '../translations';

interface HomeProps {
  onLoginClick: () => void;
  onRegisterClick: (plan?: string, paymentId?: number) => void;
  lang: Language;
  onLangToggle: () => void;
}

interface HeroSlide {
  id: number;
  title: string;
  subtitle: string;
  image_url: string;
}

export function Home({ onLoginClick, onRegisterClick, lang, onLangToggle }: HomeProps) {
  const t = translations[lang];
  const [view, setView] = useState<'main' | 'about' | 'contact' | 'terms'>('main');
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [transactionId, setTransactionId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    fetch('/api/hero-slides')
      .then(res => res.json())
      .then(data => setSlides(data))
      .catch(err => console.error('Failed to fetch slides:', err));
  }, []);

  useEffect(() => {
    if (slides.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [slides]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  const plans = [
    {
      name: 'Free Trial',
      price: '0',
      duration: '1 Month',
      features: ['Basic Ledger', 'Single Shop', 'History Tracking', 'Daily Reports'],
      limitations: ['No Multi-shop', 'No AI Assistant'],
      buttonText: 'Start Free Trial',
      color: 'bg-slate-100',
      textColor: 'text-slate-900'
    },
    {
      name: 'Standard',
      price: '180',
      duration: 'Monthly',
      features: ['Full Ledger Access', 'Single Shop Only', 'Inventory Management', 'Customer Dues', 'History & Reports'],
      limitations: ['No Multi-shop Support'],
      buttonText: 'Buy Standard',
      color: 'bg-emerald-600',
      textColor: 'text-white',
      popular: true
    },
    {
      name: 'Premium',
      price: '450',
      duration: 'Monthly',
      features: ['All Features Included', 'Multi-shop Support', 'AI Assistant Access', 'Advanced Analytics', 'Priority Support'],
      limitations: [],
      buttonText: 'Buy Premium',
      color: 'bg-slate-900',
      textColor: 'text-white'
    }
  ];

  const handlePlanSelect = (plan: any) => {
    if (plan.price === '0') {
      onRegisterClick(plan.name);
    } else {
      setSelectedPlan(plan);
      setShowPayment(true);
      setError(null);
      setTransactionId('');
    }
  };

  const handleVerifyPayment = async () => {
    if (!transactionId) {
      setError('Please enter the Transaction ID from your SMS.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planName: selectedPlan.name,
          amount: parseFloat(selectedPlan.price),
          transactionId,
          paymentMethod: 'bKash/Nagad'
        })
      });

      const data = await response.json();

      if (data.success) {
        setShowPayment(false);
        onRegisterClick(selectedPlan.name, data.paymentId);
      } else {
        setError(data.error || 'Verification failed. Please check your Transaction ID.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePayOnline = async () => {
    setIsVerifying(true);
    setError(null);
    try {
      const response = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planName: selectedPlan.name,
          amount: parseFloat(selectedPlan.price)
        })
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to initiate online payment. Please use manual method.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 py-4 px-12 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('main')}>
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <Monitor className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">{t.shopManagementSystem}</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onLangToggle}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-all flex items-center gap-2"
          >
            {lang === 'en' ? 'বাংলা' : 'English'}
          </button>
          <button 
            onClick={onLoginClick}
            className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <LogIn className="w-4 h-4" />
            {t.loginNow}
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center w-full">
        <AnimatePresence mode="wait">
          {view === 'main' ? (
            <motion.div
              key="main-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              {/* Hero Section with Slider */}
              <div className="relative w-full h-[600px] overflow-hidden bg-slate-900">
                <AnimatePresence mode="wait">
                  {slides.length > 0 ? (
                    <motion.div
                      key={slides[currentSlide].id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8 }}
                      className="absolute inset-0"
                    >
                      {/* Background Image with Overlay */}
                      <div 
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[10s] scale-110"
                        style={{ 
                          backgroundImage: `url(${slides[currentSlide].image_url})`,
                          animation: 'zoom 20s infinite alternate'
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent" />
                      
                      {/* Content */}
                      <div className="relative h-full max-w-7xl mx-auto px-12 flex flex-col justify-center items-start text-left">
                        <motion.div
                          initial={{ opacity: 0, x: -50 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3, duration: 0.6 }}
                          className="max-w-2xl space-y-6"
                        >
                          <div className="inline-block px-4 py-1.5 bg-emerald-600 text-white rounded-full text-sm font-semibold mb-4">
                            Shop Management System v2.0
                          </div>
                          <h2 className="text-6xl font-bold text-white leading-tight">
                            {slides[currentSlide].title}
                          </h2>
                          <p className="text-xl text-slate-300 leading-relaxed">
                            {slides[currentSlide].subtitle}
                          </p>
                          
                          <div className="pt-8 flex flex-row gap-4">
                            <button 
                              onClick={() => onRegisterClick()}
                              className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-xl hover:shadow-emerald-500/20 flex items-center justify-center gap-3"
                            >
                              {t.getStarted}
                              <Zap className="w-5 h-5" />
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-white">Loading...</div>
                  )}
                </AnimatePresence>

                {/* Slider Controls */}
                {slides.length > 1 && (
                  <>
                    <button 
                      onClick={prevSlide}
                      className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all z-20"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={nextSlide}
                      className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all z-20"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>

                    {/* Indicators */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                      {slides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentSlide(idx)}
                          className={`h-1.5 rounded-full transition-all ${
                            currentSlide === idx ? 'w-8 bg-emerald-500' : 'w-2 bg-white/30'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Pricing Section */}
              <div className="max-w-7xl mx-auto w-full px-6 py-20 text-center">
                <h3 className="text-3xl font-bold text-slate-900 mb-4">Choose Your Plan</h3>
                <p className="text-slate-500 mb-12">Select the best package for your business needs</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {plans.map((plan, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`relative p-8 rounded-3xl border ${plan.popular ? 'border-emerald-500 shadow-xl scale-105 z-10' : 'border-slate-200 shadow-sm'} bg-white flex flex-col text-left`}
                    >
                      {plan.popular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                          Most Popular
                        </div>
                      )}
                      <h4 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h4>
                      <div className="flex items-baseline gap-1 mb-6">
                        <span className="text-4xl font-black text-slate-900">৳{plan.price}</span>
                        <span className="text-slate-500 text-sm">/{plan.duration}</span>
                      </div>
                      
                      <div className="space-y-4 mb-8 flex-1">
                        {plan.features.map((f, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-600 text-sm">{f}</span>
                          </div>
                        ))}
                        {plan.limitations.map((l, i) => (
                          <div key={i} className="flex items-start gap-3 opacity-50">
                            <X className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-500 text-sm line-through">{l}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => handlePlanSelect(plan)}
                        className={`w-full py-4 rounded-2xl font-bold transition-all ${
                          plan.popular 
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200' 
                            : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200'
                        }`}
                      >
                        {plan.buttonText}
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Features Grid */}
              <div className="max-w-7xl mx-auto px-6 pb-20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                  <FeatureCard 
                    icon={Zap} 
                    title={t.fastTransactions} 
                    desc="Keep track of bKash, Nagad, Rocket, and recharge instantly. Staff can easily enter data." 
                  />
                  <FeatureCard 
                    icon={ShieldCheck} 
                    title={t.adminControl} 
                    desc="Staff management, backup, and all reports viewable from the admin panel." 
                  />
                  <FeatureCard 
                    icon={Monitor} 
                    title={t.secureAccess} 
                    desc="Role-based access control ensures your data is only visible to authorized personnel." 
                  />
                </div>
              </div>
            </motion.div>
          ) : view === 'about' ? (
            <motion.div
              key="about-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl w-full px-6 py-20"
            >
              <h2 className="text-4xl font-bold text-slate-900 mb-8">{t.about}</h2>
              <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                <p className="text-lg text-slate-600 leading-relaxed">
                  {t.aboutDesc}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-800">Our Mission</h3>
                    <p className="text-slate-500">To empower local shop owners with digital tools that simplify business management and increase profitability.</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-800">Our Vision</h3>
                    <p className="text-slate-500">To become the leading business management platform for retail shops in Bangladesh.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : view === 'contact' ? (
            <motion.div
              key="contact-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl w-full px-6 py-20"
            >
              <h2 className="text-4xl font-bold text-slate-900 mb-8">{t.contact}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 space-y-8">
                  <p className="text-slate-600">{t.contactDesc}</p>
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                        <Monitor className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</p>
                        <p className="text-slate-700 font-bold">{t.supportEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                        <p className="text-slate-700 font-bold">{t.supportPhone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Office</p>
                        <p className="text-slate-700 font-bold">{t.officeAddress}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100">
                  <form className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">{t.name}</label>
                      <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder={t.name} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Email</label>
                      <input type="email" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Email" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Message</label>
                      <textarea rows={4} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Your message..."></textarea>
                    </div>
                    <button type="button" className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
                      Send Message
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="terms-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl w-full px-6 py-20"
            >
              <h2 className="text-4xl font-bold text-slate-900 mb-8">{t.terms}</h2>
              <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 space-y-8">
                <p className="text-lg text-slate-600 leading-relaxed">
                  {t.termsDesc}
                </p>
                <div className="space-y-6 text-slate-500">
                  <h3 className="text-xl font-bold text-slate-800">1. Acceptance of Terms</h3>
                  <p>By accessing and using DeshiShop Manager, you accept and agree to be bound by the terms and provision of this agreement.</p>
                  
                  <h3 className="text-xl font-bold text-slate-800">2. Use of Service</h3>
                  <p>You agree to use the service only for lawful purposes and in a way that does not infringe the rights of, restrict or inhibit anyone else's use and enjoyment of the service.</p>
                  
                  <h3 className="text-xl font-bold text-slate-800">3. Privacy Policy</h3>
                  <p>Your use of the service is also governed by our Privacy Policy. Please review our Privacy Policy, which also governs the Site and informs users of our data collection practices.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPayment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-emerald-600 p-6 text-white text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold">Payment Gateway</h3>
                <p className="text-emerald-100 text-sm">Secure Checkout for {selectedPlan?.name}</p>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-600 font-medium">Amount to Pay:</span>
                  <span className="text-2xl font-black text-slate-900">৳{selectedPlan?.price}</span>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Payment Method</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="flex flex-col items-center gap-2 p-4 border-2 border-emerald-500 bg-emerald-50 rounded-2xl transition-all">
                      <div className="w-10 h-10 bg-pink-500 rounded-lg flex items-center justify-center text-white font-bold">bk</div>
                      <span className="text-xs font-bold">bKash</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 p-4 border border-slate-200 hover:border-emerald-200 rounded-2xl transition-all">
                      <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold">Ng</div>
                      <span className="text-xs font-bold">Nagad</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Please send <strong>৳{selectedPlan?.price}</strong> to <strong>01700000000</strong> (Personal) using bKash or Nagad. Then enter the Transaction ID below.
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-200"></span>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-slate-400 font-bold">Or Pay Online</span>
                    </div>
                  </div>

                  <button
                    onClick={handlePayOnline}
                    disabled={isVerifying}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isVerifying ? (
                      <RefreshCcw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    Pay with SSLCommerz (Online)
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-200"></span>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-slate-400 font-bold">Manual Verification</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Transaction ID</label>
                    <input 
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. TRX987654321"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-mono uppercase"
                    />
                  </div>

                  {error && (
                    <p className="text-red-500 text-xs font-medium ml-1">{error}</p>
                  )}
                </div>

                <div className="pt-2 flex gap-3">
                  <button 
                    onClick={() => setShowPayment(false)}
                    disabled={isVerifying}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleVerifyPayment}
                    disabled={isVerifying}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCcw className="w-4 h-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Payment'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-12 grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Monitor className="text-white w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-800">{t.shopManagementSystem}</h4>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              {t.aboutDesc}
            </p>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Quick Links</h4>
            <ul className="space-y-2">
              <li><button onClick={() => setView('main')} className="text-slate-500 hover:text-emerald-600 text-sm transition-colors">{t.welcome}</button></li>
              <li><button onClick={() => setView('about')} className="text-slate-500 hover:text-emerald-600 text-sm transition-colors">{t.about}</button></li>
              <li><button onClick={() => setView('contact')} className="text-slate-500 hover:text-emerald-600 text-sm transition-colors">{t.contact}</button></li>
              <li><button onClick={() => setView('terms')} className="text-slate-500 hover:text-emerald-600 text-sm transition-colors">{t.terms}</button></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Contact Info</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-slate-500 text-sm">
                <Monitor className="w-4 h-4 text-emerald-600" />
                {t.supportEmail}
              </li>
              <li className="flex items-center gap-3 text-slate-500 text-sm">
                <Zap className="w-4 h-4 text-emerald-600" />
                {t.supportPhone}
              </li>
              <li className="flex items-center gap-3 text-slate-500 text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                {t.officeAddress}
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-100 text-center text-slate-400 text-xs">
          <p>© {new Date().getFullYear()} DeshiShop Manager. {t.allRightsReserved}</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-left hover:shadow-md transition-all"
    >
      <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 text-emerald-600">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-500 leading-relaxed text-sm">{desc}</p>
    </motion.div>
  );
}
