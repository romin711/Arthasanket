import React from 'react';

function Card({ children, className = '', interactive = true }) {
  const interactiveClasses = interactive
    ? 'transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-xl'
    : '';

  return (
    <section
      className={`rounded-2xl border border-slate-200/90 bg-white/88 p-4 shadow-[0_14px_34px_-20px_rgba(15,23,42,0.45)] backdrop-blur-md dark:border-slate-700/80 dark:bg-[#16232b]/82 ${interactiveClasses} ${className}`}
    >
      {children}
    </section>
  );
}

export default Card;
