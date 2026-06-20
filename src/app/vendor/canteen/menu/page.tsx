"use client";

import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Edit3, Trash2, ToggleLeft, ToggleRight, 
  Upload, Sparkles, Check, RefreshCw, Plus, X 
} from 'lucide-react';
import { apiGet, apiPost } from '../../../../lib/api';

interface DishItem {
  id: string;
  item_name: string;
  category: string;
  price: number;
  is_veg: boolean;
  calories: number;
  prep_time_mins: number;
  is_available: boolean;
}

const INITIAL_DISHES: DishItem[] = [
  { id: '1', item_name: 'Masala Dosa', category: 'Meals', price: 80, is_veg: true, calories: 350, prep_time_mins: 12, is_available: true },
  { id: '2', item_name: 'Cold Coffee', category: 'Beverages', price: 60, is_veg: true, calories: 180, prep_time_mins: 5, is_available: true },
  { id: '3', item_name: 'Veg Biryani', category: 'Meals', price: 130, is_veg: true, calories: 520, prep_time_mins: 20, is_available: true },
  { id: '4', item_name: 'Samosa (2pc)', category: 'Snacks', price: 30, is_veg: true, calories: 260, prep_time_mins: 3, is_available: true },
  { id: '5', item_name: 'Gulab Jamun', category: 'Desserts', price: 50, is_veg: true, calories: 290, prep_time_mins: 2, is_available: true }
];

export default function VendorMenuPage() {
  const [dishes, setDishes] = useState<DishItem[]>(INITIAL_DISHES);
  const [csvContent, setCsvContent] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  
  // New dish state
  const [newDish, setNewDish] = useState({
    item_name: '', category: 'Snacks', price: 50, is_veg: true, calories: 250, prep_time_mins: 10
  });

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      const res = await apiGet('/canteen/menu');
      if (res.success && res.menu?.length > 0) {
        setDishes(res.menu);
      }
    } catch (err) {
      console.log('Using initial dishes list');
    }
  };

  const toggleAvailability = (id: string) => {
    setDishes(prev => prev.map(d => d.id === id ? { ...d, is_available: !d.is_available } : d));
  };

  const handleUpdateField = (id: string, field: keyof DishItem, val: any) => {
    setDishes(prev => prev.map(d => d.id === id ? { ...d, [field]: val } : d));
  };

  const handleAddDish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDish.item_name) return;

    const dish: DishItem = {
      id: `d-${Date.now()}`,
      ...newDish,
      is_available: true
    };
    
    setDishes(prev => [...prev, dish]);
    setShowAdd(false);
    setNewDish({ item_name: '', category: 'Snacks', price: 50, is_veg: true, calories: 250, prep_time_mins: 10 });
  };

  // Simulates Excel CSV import logic
  const handleCSVImport = () => {
    if (!csvContent.trim()) return;
    
    try {
      // Expect CSV Format: name,category,price,veg,calories,prepTime
      const lines = csvContent.split('\n').filter(l => l.trim().length > 0);
      const parsedDishes: DishItem[] = [];

      lines.forEach((line, i) => {
        const parts = line.split(',');
        const p0 = parts[0];
        const p1 = parts[1];
        const p2 = parts[2];
        const p3 = parts[3];
        const p4 = parts[4];
        const p5 = parts[5];
        if (p0 !== undefined && p1 !== undefined && p2 !== undefined && p3 !== undefined) {
          parsedDishes.push({
            id: `csv-${Date.now()}-${i}`,
            item_name: p0.trim(),
            category: p1.trim(),
            price: Number(p2) || 50,
            is_veg: p3.trim().toLowerCase() === 'true',
            calories: Number(p4 || '') || 200,
            prep_time_mins: Number(p5 || '') || 8,
            is_available: true
          });
        }
      });

      if (parsedDishes.length > 0) {
        setDishes(prev => [...prev, ...parsedDishes]);
        alert(`Successfully imported ${parsedDishes.length} items from CSV!`);
      }
      setShowImport(false);
      setCsvContent('');
    } catch (e) {
      alert("Error parsing CSV format. Please review guidelines.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-[#13102A]/80 border border-white/5 p-6 rounded-3xl">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingBag className="text-[#A78BFA] w-5 h-5" />
            Menu Catalog Manager
          </h2>
          <p className="text-xs text-[#A78BFA]/70 mt-1">Configure pricing, toggle out-of-stock items, and upload schedules.</p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#13102A] border border-[#6C2BD9]/30 text-xs font-semibold text-[#A78BFA] hover:bg-[#6C2BD9]/20 transition-all"
          >
            <Upload className="w-4 h-4" /> Import Excel CSV
          </button>
          
          <button 
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6C2BD9] to-[#8B5CF6] text-xs font-bold text-white hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" /> Add Dish
          </button>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] text-[#C4B5FD]/50 uppercase tracking-wider border-b border-white/5 bg-[#13102A]/40 text-left">
                <th className="p-4 font-semibold">Dish Name</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold">Price (₹)</th>
                <th className="p-4 font-semibold">Prep (Mins)</th>
                <th className="p-4 font-semibold">Calories (kcal)</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold text-center">Availability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-white">
              {dishes.map((dish) => (
                <tr key={dish.id} className={`hover:bg-white/[0.02] transition-colors ${!dish.is_available ? 'opacity-60' : ''}`}>
                  <td className="p-4 font-bold text-[#A78BFA]">{dish.item_name}</td>
                  <td className="p-4">{dish.category}</td>
                  <td className="p-4">
                    <input 
                      type="number" 
                      value={dish.price}
                      onChange={(e) => handleUpdateField(dish.id, 'price', Number(e.target.value))}
                      className="w-16 bg-[#0D0A1A] border border-[#6C2BD9]/20 rounded px-2 py-1 outline-none focus:border-[#8B5CF6] text-white font-mono text-center font-bold"
                    />
                  </td>
                  <td className="p-4">
                    <input 
                      type="number" 
                      value={dish.prep_time_mins}
                      onChange={(e) => handleUpdateField(dish.id, 'prep_time_mins', Number(e.target.value))}
                      className="w-16 bg-[#0D0A1A] border border-[#6C2BD9]/20 rounded px-2 py-1 outline-none focus:border-[#8B5CF6] text-white font-mono text-center"
                    />
                  </td>
                  <td className="p-4 font-mono">{dish.calories}</td>
                  <td className="p-4 font-semibold text-center sm:text-left">
                    {dish.is_veg ? (
                      <span className="text-emerald-400">Veg 🌱</span>
                    ) : (
                      <span className="text-red-400">Non-Veg 🍗</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => toggleAvailability(dish.id)}
                      className="inline-flex items-center"
                    >
                      {dish.is_available ? (
                        <ToggleRight className="w-8 h-8 text-emerald-400 hover:text-emerald-500 transition-colors" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-white/30 hover:text-white/40 transition-colors" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowImport(false)}>
          <div className="w-full max-w-lg glass-panel rounded-2xl border border-white/10 p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">Import Spreadsheet Dishes (CSV)</h3>
              <button onClick={() => setShowImport(false)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#C4B5FD]/50 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#6C2BD9]/10 border border-[#6C2BD9]/30 rounded-xl text-[10px] text-[#A78BFA] leading-relaxed">
              <strong>Instructions</strong>: Paste raw spreadsheet columns. Ensure one dish per line formatted as: <br />
              <code>Dish Name, Category, Price, isVeg(true/false), Calories, PrepMinutes</code>
            </div>

            <textarea 
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="e.g.&#10;Rajasthani Pyaz Kachori,Snacks,35,true,290,5&#10;Masala Chaas,Beverages,20,true,80,2"
              rows={6}
              className="w-full bg-[#0D0A1A] border border-[#6C2BD9]/30 rounded-xl p-3 text-xs focus:outline-none text-white font-mono resize-none"
            />

            <div className="flex gap-3 mt-2">
              <button onClick={() => setShowImport(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-[#C4B5FD]/70 hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={handleCSVImport} className="flex-1 py-2.5 bg-[#6C2BD9] text-xs font-bold text-white rounded-xl hover:shadow-lg transition-all">Upload Spreadsheet</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Dish Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-md glass-panel rounded-2xl border border-white/10 p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">Add New Dish</h3>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#C4B5FD]/50 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDish} className="space-y-4">
              <div>
                <label className="text-[10px] text-[#C4B5FD]/60 uppercase tracking-wider block mb-1.5 font-bold">Dish Name</label>
                <input 
                  required
                  type="text"
                  value={newDish.item_name}
                  onChange={(e) => setNewDish(prev => ({ ...prev, item_name: e.target.value }))}
                  placeholder="Enter dish name (e.g. Gatte ki Sabzi)"
                  className="w-full px-4 py-2.5 bg-[#0D0A1A] border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#6C2BD9]/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-[#C4B5FD]/60 uppercase tracking-wider block mb-1.5 font-bold">Category</label>
                  <select 
                    value={newDish.category}
                    onChange={(e) => setNewDish(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#0D0A1A] border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#6C2BD9]/50"
                  >
                    <option value="Snacks">Snacks</option>
                    <option value="Meals">Meals</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-[#C4B5FD]/60 uppercase tracking-wider block mb-1.5 font-bold">Price (₹)</label>
                  <input 
                    required
                    type="number"
                    value={newDish.price}
                    onChange={(e) => setNewDish(prev => ({ ...prev, price: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 bg-[#0D0A1A] border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#6C2BD9]/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-[#C4B5FD]/60 uppercase tracking-wider block mb-1.5 font-bold">Prep Time (Mins)</label>
                  <input 
                    required
                    type="number"
                    value={newDish.prep_time_mins}
                    onChange={(e) => setNewDish(prev => ({ ...prev, prep_time_mins: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 bg-[#0D0A1A] border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#6C2BD9]/50"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#C4B5FD]/60 uppercase tracking-wider block mb-1.5 font-bold">Calories (kcal)</label>
                  <input 
                    required
                    type="number"
                    value={newDish.calories}
                    onChange={(e) => setNewDish(prev => ({ ...prev, calories: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 bg-[#0D0A1A] border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#6C2BD9]/50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox"
                  id="isVegCheckbox"
                  checked={newDish.is_veg}
                  onChange={(e) => setNewDish(prev => ({ ...prev, is_veg: e.target.checked }))}
                  className="rounded border-[#6C2BD9]/30 bg-[#0D0A1A] text-[#6C2BD9] focus:ring-0"
                />
                <label htmlFor="isVegCheckbox" className="text-xs text-[#C4B5FD]/80 font-bold select-none cursor-pointer">Vegetarian dish 🌱</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-[#C4B5FD]/70 hover:bg-white/5 transition-all">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-[#6C2BD9] to-[#8B5CF6] text-xs font-bold text-white rounded-xl hover:shadow-lg transition-all">Add to Menu</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
