import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, Image as ImageIcon, MoveUp, MoveDown } from 'lucide-react';
import { motion } from 'motion/react';

interface HeroSlide {
  id: number;
  title: string;
  subtitle: string;
  image_url: string;
  order_index: number;
  is_active: number;
}

export function HeroSliderManagement({ fetchWithAuth }: { fetchWithAuth: any }) {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    order_index: 0,
    is_active: 1
  });

  const fetchSlides = async () => {
    try {
      const res = await fetchWithAuth('/api/hero-slides');
      if (res.ok) {
        const data = await res.json();
        setSlides(data);
      }
    } catch (error) {
      console.error('Error fetching slides:', error);
    }
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingId ? `/api/hero-slides/${editingId}` : '/api/hero-slides';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsAdding(false);
        setEditingId(null);
        setFormData({ title: '', subtitle: '', image_url: '', order_index: 0, is_active: 1 });
        fetchSlides();
      }
    } catch (err) {
      console.error('Error saving slide:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this slide?')) return;
    try {
      await fetchWithAuth(`/api/hero-slides/${id}`, {
        method: 'DELETE'
      });
      fetchSlides();
    } catch (err) {
      console.error('Error deleting slide:', err);
    }
  };

  const handleEdit = (slide: HeroSlide) => {
    setEditingId(slide.id);
    setFormData({
      title: slide.title,
      subtitle: slide.subtitle,
      image_url: slide.image_url,
      order_index: slide.order_index,
      is_active: slide.is_active
    });
    setIsAdding(true);
  };

  const handleToggleActive = async (slide: HeroSlide) => {
    try {
      const res = await fetchWithAuth(`/api/hero-slides/${slide.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ...slide,
          is_active: slide.is_active === 1 ? 0 : 1 
        })
      });
      if (res.ok) {
        fetchSlides();
      }
    } catch (err) {
      console.error('Error toggling slide status:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Hero Slider Management</h2>
          <p className="text-slate-500">Manage the slides displayed on the home page hero section.</p>
        </div>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setFormData({ title: '', subtitle: '', image_url: '', order_index: slides.length });
          }}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Slide
        </button>
      </div>

      {isAdding && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Title</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Image URL</label>
                <input
                  type="url"
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={formData.image_url}
                  onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Subtitle</label>
                <textarea
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={formData.subtitle}
                  onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Order Index</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={formData.order_index}
                  onChange={e => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2 flex flex-col justify-center">
                <label className="text-sm font-medium text-slate-700">Active Status</label>
                <div className="flex items-center gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_active: formData.is_active === 1 ? 0 : 1 })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      formData.is_active === 1 ? 'bg-emerald-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.is_active === 1 ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-sm font-medium ${formData.is_active === 1 ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {formData.is_active === 1 ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-xl hover:bg-emerald-700 transition-colors disabled:bg-emerald-400"
              >
                {loading ? 'Saving...' : 'Save Slide'}
                <Save className="w-5 h-5" />
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {slides.map((slide) => (
          <div key={slide.id} className={`bg-white p-4 rounded-2xl border flex items-center gap-6 group transition-all ${slide.is_active === 1 ? 'border-slate-200' : 'border-slate-100 opacity-75'}`}>
            <div className="w-32 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 relative">
              <img src={slide.image_url} alt={slide.title} className={`w-full h-full object-cover ${slide.is_active === 1 ? '' : 'grayscale'}`} />
              {slide.is_active === 0 && (
                <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider bg-slate-900/60 px-2 py-1 rounded">Inactive</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className={`font-bold truncate ${slide.is_active === 1 ? 'text-slate-900' : 'text-slate-500'}`}>{slide.title}</h4>
                {slide.is_active === 1 ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                )}
              </div>
              <p className="text-sm text-slate-500 truncate">{slide.subtitle}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  Order: {slide.order_index}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Status</span>
                <button
                  onClick={() => handleToggleActive(slide)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    slide.is_active === 1 ? 'bg-emerald-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      slide.is_active === 1 ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(slide)}
                  className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(slide.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {slides.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
            <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No slides found. Add your first slide to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
