import React, { useState } from 'react';
import { Article, Comment } from '../types';

interface ContributorDashboardProps {
  navigate: (path: string) => void;
}

export default function ContributorDashboard({ navigate }: ContributorDashboardProps) {
  const [activeTab, setActiveTab] = useState<'articles' | 'comments'>('articles');
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Contributor Dashboard</h1>
      <div className="flex gap-4 mb-4">
        <button onClick={() => setActiveTab('articles')} className={activeTab === 'articles' ? 'font-bold' : ''}>Articles</button>
        <button onClick={() => setActiveTab('comments')} className={activeTab === 'comments' ? 'font-bold' : ''}>Comments</button>
      </div>
      <div>
        {activeTab === 'articles' && <p>Contributor Articles Management (Placeholder)</p>}
        {activeTab === 'comments' && <p>Contributor Comments Management (Placeholder)</p>}
      </div>
    </div>
  );
}
