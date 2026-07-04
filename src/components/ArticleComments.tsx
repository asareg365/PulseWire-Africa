import React, { useState, useEffect } from 'react';
import { Comment } from '../types';
import { getCommentsForArticle, addCommentToArticle } from '../lib/db';
import { auth } from '../lib/firebase';
import { Send, User, MessageSquare, Check, ShieldAlert, Reply, CornerDownRight } from 'lucide-react';

interface ArticleCommentsProps {
  articleId: string;
  navigate: (path: string) => void;
}

export default function ArticleComments({ articleId, navigate }: ArticleCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Threaded reply state
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyName, setReplyName] = useState('');

  useEffect(() => {
    async function loadComments() {
      try {
        const list = await getCommentsForArticle(articleId);
        setComments(list);
      } catch (err) {
        console.error('Failed to load article comments:', err);
      }
    }
    loadComments();
    setSubmitted(false);
  }, [articleId]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      const displayName = currentUser ? (currentUser.displayName || currentUser.email?.split('@')[0] || 'Contributor') : (name.trim() || 'Anonymous Reader');
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=f1f5f9&color=dc2626&bold=true&size=128`;

      const newComment: Comment = {
        id: `comment-${Date.now()}`,
        articleId,
        authorId: currentUser ? currentUser.uid : 'guest',
        authorName: displayName,
        authorAvatar: avatarUrl,
        content: text.trim(),
        createdAt: new Date().toISOString(),
        approved: true // Auto-approve
      };

      await addCommentToArticle(articleId, newComment);
      setSubmitted(true);
      setText('');
      setName('');
      
      // Reload comments list
      const updatedList = await getCommentsForArticle(articleId);
      setComments(updatedList);
    } catch (err) {
      console.error('Error submitting comment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent, parentComment: Comment) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      const displayName = currentUser ? (currentUser.displayName || currentUser.email?.split('@')[0] || 'Contributor') : (replyName.trim() || 'Anonymous Reader');
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=f1f5f9&color=dc2626&bold=true&size=128`;

      // If parentComment already has a parentId, we group it under that same parentId (keeping nested threads to max 2 levels)
      const targetParentId = parentComment.parentId || parentComment.id;
      const targetReplyTo = parentComment.authorName;

      const newReply: Comment = {
        id: `comment-${Date.now()}`,
        articleId,
        authorId: currentUser ? currentUser.uid : 'guest',
        authorName: displayName,
        authorAvatar: avatarUrl,
        content: replyText.trim(),
        createdAt: new Date().toISOString(),
        approved: true,
        parentId: targetParentId,
        replyTo: targetReplyTo
      };

      await addCommentToArticle(articleId, newReply);
      setReplyText('');
      setReplyName('');
      setReplyingToId(null);
      
      // Reload comments list
      const updatedList = await getCommentsForArticle(articleId);
      setComments(updatedList);
    } catch (err) {
      console.error('Error submitting reply:', err);
    } finally {
      setLoading(false);
    }
  };

  // Grouping comments for threaded rendering
  const rootComments = comments.filter(c => !c.parentId);
  const replies = comments.filter(c => !!c.parentId);

  // Group replies by parentId
  const repliesMap = new Map<string, Comment[]>();
  replies.forEach(reply => {
    const parentId = reply.parentId!;
    if (!repliesMap.has(parentId)) {
      repliesMap.set(parentId, []);
    }
    repliesMap.get(parentId)!.push(reply);
  });

  // Sort root comments descending by date
  const sortedRootComments = [...rootComments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Get sorted replies for a comment
  const getSortedReplies = (parentId: string) => {
    const list = repliesMap.get(parentId) || [];
    return [...list].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  };

  return (
    <div className="border-t border-gray-100 dark:border-gray-900 pt-10 mt-10">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6 font-sans">
        <MessageSquare className="h-5 w-5 text-red-600" />
        Discussion ({comments.length})
      </h3>

      {/* Comment Form */}
      <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-900 rounded-xl p-5 mb-8">
        <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-mono block mb-3">Join the Conversation</span>
        
        {submitted ? (
          <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2 font-semibold">
            <Check className="h-4 w-4 text-emerald-500 shrink-0" />
            Your comment was posted successfully! Thank you for participating.
            <button 
              onClick={() => setSubmitted(false)}
              className="ml-auto text-xs font-bold font-mono underline hover:text-emerald-600 cursor-pointer"
            >
              Add Another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitComment} className="space-y-4">
            {!auth.currentUser && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-xs rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                Commenting anonymously? <button type="button" onClick={() => navigate('/login')} className="font-bold underline">Create an account</button> to save your preferences and manage comments.
              </div>
            )}
            {!auth.currentUser && (
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Your Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Kwabena Boateng"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Comment</label>
              <textarea 
                rows={3}
                placeholder="Share your opinion on this article... Keep discussion civil."
                value={text}
                onChange={e => setText(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-mono leading-relaxed flex items-center gap-1.5 max-w-xs">
                <ShieldAlert className="h-3 w-3 text-red-500" />
                Comments are reviewed under PulseWire Fact-Checking guidelines.
              </span>
              <button 
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 dark:disabled:bg-gray-800 rounded-lg flex items-center gap-1.5 transition-colors shrink-0 shadow-sm cursor-pointer"
              >
                {loading ? 'Posting...' : 'Post Comment'}
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Comments List */}
      <div className="space-y-6">
        {sortedRootComments.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-500 dark:text-gray-400 text-sm font-sans">
            No comments yet. Be the first to express your voice!
          </div>
        ) : (
          sortedRootComments.map((comm) => (
            <div key={comm.id} className="p-4 border border-gray-100 dark:border-gray-900/50 hover:border-gray-200 dark:hover:border-gray-800 bg-white dark:bg-gray-950/20 rounded-xl transition-all shadow-xs">
              <div className="flex gap-4">
                <img 
                  src={comm.authorAvatar} 
                  alt={comm.authorName} 
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-800" 
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white font-sans">{comm.authorName}</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(comm.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-sans">{comm.content}</p>
                  
                  {/* Reply trigger button */}
                  <div className="flex items-center gap-4 mt-2">
                    <button
                      onClick={() => {
                        setReplyingToId(replyingToId === comm.id ? null : comm.id);
                        setReplyText('');
                        setReplyName('');
                      }}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 font-mono font-bold transition-colors cursor-pointer"
                    >
                      <Reply className="h-3.5 w-3.5" />
                      <span>Reply</span>
                    </button>
                  </div>

                  {/* Reply Form under root comment */}
                  {replyingToId === comm.id && (
                    <form onSubmit={(e) => handleSubmitReply(e, comm)} className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-xl space-y-3">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider font-mono block">
                        Replying to @{comm.authorName}
                      </span>
                      
                      {!auth.currentUser && (
                        <div>
                          <input 
                            type="text" 
                            placeholder="Your Name"
                            value={replyName}
                            onChange={e => setReplyName(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                            required
                          />
                        </div>
                      )}

                      <div>
                        <textarea 
                          rows={2}
                          placeholder="Write your reply..."
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                          required
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button 
                          type="button"
                          onClick={() => {
                            setReplyingToId(null);
                            setReplyText('');
                            setReplyName('');
                          }}
                          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-700 font-mono cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          disabled={loading}
                          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 rounded-lg flex items-center gap-1 font-mono shadow-sm cursor-pointer"
                        >
                          {loading ? 'Posting...' : 'Post Reply'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Threaded Replies */}
              {getSortedReplies(comm.id).length > 0 && (
                <div className="mt-4 pl-4 md:pl-8 border-l border-gray-100 dark:border-gray-900 space-y-4 ml-4 md:ml-6">
                  {getSortedReplies(comm.id).map((reply) => (
                    <div key={reply.id} className="flex gap-3 py-2 border-t border-gray-50/50 dark:border-gray-900/30 first:border-t-0">
                      <img 
                        src={reply.authorAvatar} 
                        alt={reply.authorName} 
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-800" 
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs text-gray-900 dark:text-white font-sans">{reply.authorName}</span>
                            {reply.replyTo && (
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono bg-gray-100 dark:bg-gray-900 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <CornerDownRight className="h-2.5 w-2.5" />
                                replying to @{reply.replyTo}
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-gray-400 font-mono">
                            {new Date(reply.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-sans">{reply.content}</p>
                        
                        {/* Reply to a reply */}
                        <div className="flex items-center gap-4 mt-1.5">
                          <button
                            onClick={() => {
                              setReplyingToId(replyingToId === reply.id ? null : reply.id);
                              setReplyText('');
                              setReplyName('');
                            }}
                            className="flex items-center gap-1 text-[10px] text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 font-mono font-bold transition-colors cursor-pointer"
                          >
                            <Reply className="h-3 w-3" />
                            <span>Reply</span>
                          </button>
                        </div>

                        {/* Nested Reply Form inside replies */}
                        {replyingToId === reply.id && (
                          <form onSubmit={(e) => handleSubmitReply(e, reply)} className="mt-3 p-3 bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-xl space-y-3">
                            <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider font-mono block">
                              Replying to @{reply.authorName}
                            </span>
                            
                            {!auth.currentUser && (
                              <div>
                                <input 
                                  type="text" 
                                  placeholder="Your Name"
                                  value={replyName}
                                  onChange={e => setReplyName(e.target.value)}
                                  className="w-full px-3 py-1 text-[11px] rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                                  required
                                />
                              </div>
                            )}

                            <div>
                              <textarea 
                                rows={2}
                                placeholder="Write your reply..."
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                                required
                              />
                            </div>

                            <div className="flex justify-end gap-2">
                              <button 
                                type="button"
                                onClick={() => {
                                  setReplyingToId(null);
                                  setReplyText('');
                                  setReplyName('');
                                }}
                                className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-700 font-mono cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button 
                                type="submit"
                                disabled={loading}
                                className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 rounded-lg flex items-center gap-1 font-mono shadow-sm cursor-pointer"
                              >
                                {loading ? 'Posting...' : 'Post Reply'}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
