import React from 'react';
import clsx from 'clsx';

export type SkeletonVariant = 'message' | 'chat-list-item' | 'settings-toggle' | 'text' | 'avatar';

interface SkeletonLoaderProps {
  variant?: SkeletonVariant;
  className?: string;
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  variant = 'text', 
  className = '',
  count = 1 
}) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'message':
        return (
          <div className="flex gap-3 p-4">
            {/* Avatar skeleton */}
            <div className="w-8 h-8 rounded-full skeleton-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              {/* Message content skeleton */}
              <div className="h-4 skeleton-pulse rounded w-3/4" />
              <div className="h-4 skeleton-pulse rounded w-1/2" />
              <div className="h-4 skeleton-pulse rounded w-5/6" />
            </div>
          </div>
        );

      case 'chat-list-item':
        return (
          <div className="p-3 space-y-2">
            {/* Title skeleton */}
            <div className="h-5 skeleton-pulse rounded w-3/4" />
            {/* Timestamp skeleton */}
            <div className="h-3 skeleton-pulse rounded w-1/2" />
          </div>
        );

      case 'settings-toggle':
        return (
          <div className="flex items-center justify-between p-2">
            {/* Label skeleton */}
            <div className="h-4 skeleton-pulse rounded w-32" />
            {/* Toggle skeleton */}
            <div className="w-12 h-6 skeleton-pulse rounded-full" />
          </div>
        );

      case 'avatar':
        return (
          <div className="w-8 h-8 rounded-full skeleton-pulse" />
        );

      case 'text':
      default:
        return (
          <div className="space-y-2">
            <div className="h-4 skeleton-pulse rounded w-full" />
            <div className="h-4 skeleton-pulse rounded w-3/4" />
          </div>
        );
    }
  };

  return (
    <div className={clsx('skeleton-loader', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={count > 1 && index < count - 1 ? 'mb-2' : ''}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
};

// Convenience components for common use cases
export const MessageSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <SkeletonLoader variant="message" count={count} />
);

export const ChatListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <SkeletonLoader variant="chat-list-item" count={count} />
);

export const SettingsToggleSkeleton: React.FC<{ count?: number }> = ({ count = 2 }) => (
  <SkeletonLoader variant="settings-toggle" count={count} />
);