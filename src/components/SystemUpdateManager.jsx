import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemUpdateService } from '../services/systemUpdateService';
import { githubService } from '../services/githubService';
import { aiService } from '../services/aiService';
import { useAuth } from '../context/AuthContext';
import { Bot, Loader2, Plus, RefreshCw, Trash2, Edit3, Github } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SystemUpdateManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Form State
  const [content, setContent] = useState('');
  const [type, setType] = useState('feature');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: updates = [], isLoading } = useQuery({
    queryKey: ['allSystemUpdates'],
    queryFn: () => systemUpdateService.getAllUpdates(),
  });

  const generateAIContent = async () => {
    setIsGenerating(true);
    try {
      const commits = await githubService.getRecentCommits(15);
      if (commits.length === 0) {
        toast('No recent commits found.', { icon: 'ℹ️' });
        setIsGenerating(false);
        return;
      }
      
      const summary = await aiService.summarizeCommits(commits);
      setContent(summary);
      setType('feature');
      toast.success('Generated summary from GitHub commits!');
    } catch (error) {
      toast.error(error.message || 'Failed to generate AI summary');
    } finally {
      setIsGenerating(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data) => systemUpdateService.createUpdate(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['allSystemUpdates']);
      queryClient.invalidateQueries(['activeSystemUpdates']);
      setContent('');
      toast.success('Update broadcasted successfully!');
    },
    onError: (err) => toast.error(err.message)
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => systemUpdateService.toggleUpdateStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries(['allSystemUpdates']);
      queryClient.invalidateQueries(['activeSystemUpdates']);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => systemUpdateService.deleteUpdate(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['allSystemUpdates']);
      queryClient.invalidateQueries(['activeSystemUpdates']);
    }
  });

  const handlePost = () => {
    if (!content.trim()) return;
    createMutation.mutate({
      content,
      type,
      user_id: user.id
    });
  };

  return (
    <div className="bg-gray-1 border border-gray-4 p-4 sm:p-6 rounded-xl shadow-lg mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-12 flex items-center gap-2">
            System Updates Banner
          </h2>
          <p className="text-xs text-gray-9 mt-0.5">
            Manage the "What's New" banner shown on the dashboard.
          </p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2 bg-gray-2 hover:bg-gray-3 border border-gray-4 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
        >
          {isOpen ? 'Close Manager' : <><Edit3 size={16} /> Manage Updates</>}
        </button>
      </div>

      {isOpen && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
          {/* Create New Box */}
          <div className="bg-gray-2 rounded-xl p-4 border border-gray-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-gray-12">New Update Content</label>
              <button 
                type="button"
                onClick={generateAIContent}
                disabled={isGenerating}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-600 bg-blue-500/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <><Bot size={14} /> <Github size={14}/></>}
                {isGenerating ? 'Analyzing Commits...' : 'AI Summarize via GitHub'}
              </button>
            </div>
            
            <textarea
              className="w-full bg-gray-1 border border-gray-4 rounded-lg p-3 text-sm text-gray-12 focus:border-purple-500 min-h-[100px] outline-none"
              placeholder="What changed? Use AI or type manually..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            <div className="flex items-center justify-between mt-3">
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value)}
                className="bg-gray-1 border border-gray-4 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:border-purple-500"
              >
                <option value="feature">🚀 New Feature</option>
                <option value="fix">🔧 System Fix</option>
                <option value="announcement">📣 Announcement</option>
              </select>

              <button
                onClick={handlePost}
                disabled={!content.trim() || createMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-md disabled:bg-gray-4 disabled:text-gray-8 transition-colors flex items-center gap-2"
              >
                {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Post Banner
              </button>
            </div>
          </div>

          {/* History List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-11 uppercase tracking-widest pl-1">History</h3>
            {isLoading ? (
              <div className="flex justify-center p-4"><Loader2 className="animate-spin text-gray-8" /></div>
            ) : updates.length === 0 ? (
              <p className="text-sm text-gray-9 italic pl-1">No past updates found.</p>
            ) : (
              updates.map(update => (
                <div key={update.id} className="flex items-start gap-3 bg-gray-1 border border-gray-3 rounded-lg p-3">
                  <div className="pt-1">
                    <button
                      onClick={() => toggleMutation.mutate({ id: update.id, isActive: !update.is_active })}
                      className={`w-10 h-6 rounded-full transition-colors relative ${update.is_active ? 'bg-green-500' : 'bg-gray-4'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${update.is_active ? 'left-5' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-bold text-gray-10 uppercase">{update.type} • {new Date(update.created_at).toLocaleDateString()}</p>
                      <button 
                        onClick={() => {
                          if(confirm('Delete this update record?')) {
                            deleteMutation.mutate(update.id);
                          }
                        }}
                        className="text-gray-8 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{update.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
