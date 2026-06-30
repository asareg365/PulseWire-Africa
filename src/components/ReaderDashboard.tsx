import React, { useState } from 'react';
import { Article, Author } from '../types';

interface ReaderDashboardProps {
  navigate: (path: string) => void;
  savedArticles: Article[];
  toggleSaveArticle: (slug: string) => void;
}

export default function ReaderDashboard({ navigate, savedArticles, toggleSaveArticle }: ReaderDashboardProps) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Saved Articles</h1>
      {savedArticles.length === 0 ? (
        <p>No saved articles yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedArticles.map(article => (
            <div key={article.id} className="border p-4 rounded shadow">
              <h2 className="font-bold text-lg">{article.title}</h2>
              <button onClick={() => toggleSaveArticle(article.slug)} className="mt-2 text-red-500">
                Unsave
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
