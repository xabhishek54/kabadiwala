import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedLocalPriceCache, type LocalPriceCache } from '../../data/local/db';
import { AudioButton } from '../../components/AudioButton';
import { TrendingUp, TrendingDown, Minus, ShieldCheck, Store, MapPin, Cpu, ArrowRight } from 'lucide-react';

export const PriceBoardPage: React.FC = () => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    seedLocalPriceCache();
  }, []);

  const prices = useLiveQuery(() => db.priceCache.toArray(), []) || [];

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'PCB': return '🔌';
      case 'BATTERY': return '🔋';
      case 'CABLE': return '🧵';
      case 'LCD_PANEL': return '🖥️';
      case 'CRT': return '📺';
      case 'MOTOR_MAGNET': return '🧲';
      case 'MIXED_PLASTIC': return '♻️';
      default: return '📦';
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-4">
      {/* Header Banner */}
      <div className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-brand-600 mb-1">
            <MapPin size={14} />
            <span>{t('priceBoard.district')}</span>
          </div>
          <h2 className="text-xl font-bold text-stone-900 leading-tight">
            {t('priceBoard.title')}
          </h2>
        </div>
        <div className="bg-brand-50 px-3 py-1.5 rounded-full border border-brand-500/20 text-brand-700 text-xs font-bold">
          ताज़ा दर
        </div>
      </div>

      {/* Differentiator Feature 12 Promo Card: Critical Minerals Impact Dashboard */}
      <NavLink
        to="/minerals"
        className="bg-stone-900 text-white rounded-card p-3.5 border border-stone-800 shadow-soft flex items-center justify-between hover:bg-stone-850 transition-colors group"
      >
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-900 flex items-center justify-center font-bold">
            <Cpu size={20} />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-400">Critical Minerals Impact</div>
            <div className="text-[11px] text-stone-300 font-medium">Lithium, Cobalt & Neodymium Recovery</div>
          </div>
        </div>
        <ArrowRight size={18} className="text-amber-400 group-hover:translate-x-1 transition-transform" />
      </NavLink>

      {/* Category Price List */}
      <div className="space-y-3">
        {prices.map((item: LocalPriceCache) => {
          const categoryName = t(`categories.${item.category}`, { defaultValue: item.category });
          const audioSpeech = t('priceBoard.audioPrice', { category: categoryName, price: item.current_price });

          return (
            <div
              key={item.category}
              onClick={() => setSelectedCategory(selectedCategory === item.category ? null : item.category)}
              className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft hover:shadow-elevated transition-all cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/50 flex items-center justify-center text-2xl shadow-sm">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 text-base leading-tight">
                      {categoryName}
                    </h3>
                    <p className="text-xs text-stone-500 font-medium">{item.sub_category}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <div className="text-xl font-black text-brand-600 tracking-tight">
                      ₹{item.current_price}
                      <span className="text-xs font-semibold text-stone-500 ml-0.5">/किग्रा</span>
                    </div>
                    <div className="flex items-center justify-end space-x-1 text-[11px] font-semibold text-stone-500">
                      {item.trend_direction === 'up' && (
                        <span className="text-emerald-600 flex items-center"><TrendingUp size={12} className="mr-0.5" /> बढ़ रहा</span>
                      )}
                      {item.trend_direction === 'down' && (
                        <span className="text-rose-600 flex items-center"><TrendingDown size={12} className="mr-0.5" /> गिर रहा</span>
                      )}
                      {item.trend_direction === 'flat' && (
                        <span className="text-stone-500 flex items-center"><Minus size={12} className="mr-0.5" /> स्थिर</span>
                      )}
                    </div>
                  </div>

                  <AudioButton textToSpeak={audioSpeech} size={18} />
                </div>
              </div>

              {/* Informal vs Formal Price Comparison Card (Differentiator Feature) */}
              <div className="mt-3 pt-3 border-t border-stone-100 grid grid-cols-2 gap-2">
                <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-2.5 flex items-center space-x-2">
                  <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                      {t('priceBoard.formalLabel')}
                    </div>
                    <div className="text-sm font-extrabold text-emerald-700">
                      ₹{item.current_price} <span className="text-[10px] font-normal text-emerald-600">/kg</span>
                    </div>
                  </div>
                </div>

                <div className="bg-stone-100/70 border border-stone-200 rounded-xl p-2.5 flex items-center space-x-2">
                  <Store size={18} className="text-stone-500 shrink-0" />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-stone-600 tracking-wider">
                      {t('priceBoard.informalLabel')}
                    </div>
                    <div className="text-sm font-bold text-stone-700">
                      ₹{item.informal_reference_price} <span className="text-[10px] font-normal text-stone-500">/kg</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
