import React from 'react';
import { Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

interface ToolExecution {
  id: string;
  toolName: string;
  status: 'starting' | 'running' | 'completed' | 'error';
  parameters?: any;
  result?: any;
  error?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  agentName?: string;
  responseContent?: string;
  formattedResult?: any;
}

interface ToolStatusMessageProps {
  tool: ToolExecution;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export function ToolStatusMessage({ tool, isExpanded, onToggleExpanded }: ToolStatusMessageProps) {
  const getStatusIcon = (status: ToolExecution['status']) => {
    switch (status) {
      case 'starting':
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };
  
  const getStatusText = (tool: ToolExecution) => {
    switch (tool.status) {
      case 'starting':
        return 'Starting...';
      case 'running':
        return 'Running...';
      case 'completed':
        return tool.duration ? `Completed in ${formatDuration(tool.duration)}` : 'Completed';
      case 'error':
        return 'Failed';
    }
  };
  
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };
  
  const formatParameters = (params: any) => {
    if (!params) return 'No parameters';
    try {
      return JSON.stringify(params, null, 2);
    } catch {
      return String(params);
    }
  };
  
  const formatResult = (result: any) => {
    if (!result) return 'No result';
    try {
      const str = JSON.stringify(result, null, 2);
      // Truncate very long results
      if (str.length > 500) {
        return str.substring(0, 500) + '...';
      }
      return str;
    } catch {
      return String(result);
    }
  };
  
  return (
    <div className="flex justify-start mb-2 px-4">
      <div className="max-w-full">
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-lg border border-gray-700/40 overflow-hidden">
          {/* Tool Header - Always visible */}
          <button
            onClick={onToggleExpanded}
            className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700/20 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              {getStatusIcon(tool.status)}
              <span className="text-sm text-gray-300">
                {tool.status === 'starting' || tool.status === 'running' 
                  ? `Using ${tool.toolName}...`
                  : tool.status === 'completed'
                  ? `Used ${tool.toolName}`
                  : `Failed to use ${tool.toolName}`
                }
              </span>
            </div>
            <div className="flex items-center">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </button>
          
          {/* Expanded Details */}
          {isExpanded && (
            <div className="border-t border-gray-700/50">
              {/* Response Content - Show when completed and has content */}
              {tool.status === 'completed' && tool.responseContent && (
                <div className="px-4 py-3">
                  <MarkdownRenderer 
                    content={tool.responseContent} 
                    isStreaming={false}
                    className="text-sm leading-relaxed"
                    darkMode={true}
                  />
                </div>
              )}
              
              <div className="p-4 space-y-3">
              {/* Parameters */}
              {tool.parameters && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">Parameters:</div>
                  <pre className="text-xs bg-gray-900/50 rounded p-2 overflow-x-auto text-gray-200">
                    {formatParameters(tool.parameters)}
                  </pre>
                </div>
              )}
              
              {/* Result */}
              {tool.status === 'completed' && tool.result && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">Result:</div>
                  <pre className="text-xs bg-gray-900/50 rounded p-2 overflow-x-auto text-gray-200">
                    {formatResult(tool.result)}
                  </pre>
                </div>
              )}
              
              {/* Error */}
              {tool.status === 'error' && tool.error && (
                <div>
                  <div className="text-xs text-red-400 mb-1">Error:</div>
                  <pre className="text-xs bg-red-900/30 text-red-300 rounded p-2 overflow-x-auto">
                    {tool.error}
                  </pre>
                </div>
              )}
              
              {/* Timing */}
              {tool.startTime && (
                <div className="text-xs text-gray-500">
                  Started at {new Date(tool.startTime).toLocaleTimeString()}
                  {tool.endTime && tool.duration && (
                    <span> • Duration: {formatDuration(tool.duration)}</span>
                  )}
                </div>
              )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}