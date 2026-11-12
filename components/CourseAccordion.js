'use client';
import { useState } from 'react';

export default function CourseAccordion({ modules }) {
  const [activeModule, setActiveModule] = useState(null);

  const toggleModule = (id) => {
    setActiveModule(activeModule === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {modules.map((mod) => {
        const isOpen = activeModule === mod.id;
        
        return (
          <div 
            key={mod.id} 
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all"
          >
            {/* Clickable Header Bar */}
            <button 
              onClick={() => toggleModule(mod.id)}
              className="w-full p-6 text-left flex justify-between items-center hover:bg-slate-50/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#4F8EF7]"
            >
              <div>
                <h3 className="font-poppins font-bold text-lg text-slate-800">{mod.title}</h3>
                <p className="text-xs text-slate-400 mt-1">⏱️ Duration: {mod.duration}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg font-medium text-slate-600">
                  {mod.status}
                </span>
                <span className="text-xl text-slate-400 transform transition-transform duration-200">
                  {isOpen ? '▲' : '▼'}
                </span>
              </div>
            </button>

            {/* Expandable Workspace Content */}
            {isOpen && (
              <div className="p-6 border-t border-slate-100 bg-slate-50/30 space-y-6 animate-fadeIn">
                
                {/* 1. Dynamic Video Render Segment */}
                {mod.contentType === 'video' && mod.videoUrl && (
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-bull-bg shadow-sm">
                    <iframe 
                      className="absolute top-0 left-0 w-full h-full"
                      src={mod.videoUrl} 
                      title={mod.title}
                      allowFullScreen
                    ></iframe>
                  </div>
                )}

                {/* 2. core lesson Text Material */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#4F8EF7]">Lesson Content</h4>
                  <p className="text-slate-700 text-sm leading-relaxed">{mod.content}</p>
                </div>

                {/* 3. Assigned Action Activity Task block */}
                {mod.activity && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">🎯 Assigned Activity</h4>
                    <p className="text-sm text-emerald-950 font-medium">{mod.activity}</p>
                  </div>
                )}

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}