import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemUpdateService } from '../services/systemUpdateService';
import { Megaphone, Rocket, Wrench } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function SystemUpdateBanner() {
  const { data: updates = [], isLoading } = useQuery({
    queryKey: ['activeSystemUpdates'],
    queryFn: () => systemUpdateService.getActiveUpdates(),
  });

  if (isLoading || updates.length === 0) return null;

  // We'll show the most recent active update prominently, or cycle through them.
  // For simplicity, let's just display the absolute newest one.
  const latestUpdate = updates[0];

  const getIcon = (type) => {
    switch (type) {
      case 'announcement': return <Megaphone className="w-5 h-5 text-blue-500" />;
      case 'feature': return <Rocket className="w-5 h-5 text-purple-500" />;
      case 'fix': return <Wrench className="w-5 h-5 text-green-500" />;
      default: return <Megaphone className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStyles = (type) => {
    switch (type) {
      case 'announcement': return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'feature': return 'bg-purple-50 border-purple-200 text-purple-900';
      case 'fix': return 'bg-green-50 border-green-200 text-green-900';
      default: return 'bg-blue-50 border-blue-200 text-blue-900';
    }
  };

  return (
    <div className={`mb-6 p-4 rounded-xl border flex items-start gap-4 ${getStyles(latestUpdate.type)} animate-in fade-in slide-in-from-top-4 duration-500`}>
      <div className="p-2 bg-white rounded-full shrink-0 shadow-sm border border-gray-100">
        {getIcon(latestUpdate.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-bold text-sm uppercase tracking-wider">
            {latestUpdate.type === 'feature' ? 'New Features' : latestUpdate.type === 'fix' ? 'System Fixes' : 'Announcement'}
          </h3>
          <span className="text-xs font-medium bg-white px-2 py-0.5 rounded-full border border-gray-200/50 shadow-sm text-gray-500">
            {new Date(latestUpdate.created_at).toLocaleDateString()}
          </span>
        </div>
        <div className="text-sm">
          <ReactMarkdown
            components={{
              p: ({node, ...props}) => <p className="mb-2 last:mb-0 opacity-90" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 opacity-90 marker:text-gray-400" {...props} />,
              li: ({node, ...props}) => <li className="mb-1" {...props} />,
              strong: ({node, ...props}) => <strong className="font-bold opacity-100" {...props} />
            }}
          >
            {latestUpdate.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
