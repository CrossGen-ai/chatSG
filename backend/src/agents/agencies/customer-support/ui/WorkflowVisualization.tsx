/**
 * Workflow Visualization Component
 * 
 * React component for visualizing customer support workflow progress
 * and stage transitions in real-time.
 */

import React from 'react';
import { WorkflowStage, CustomerSentiment, IssueCategory } from '../workflow';

/**
 * Props for WorkflowVisualization component
 */
interface WorkflowVisualizationProps {
    currentStage: WorkflowStage;
    customerSentiment: CustomerSentiment;
    issueCategory: IssueCategory;
    progress: number; // 0-100
    stageTransitions?: Array<{
        from: WorkflowStage;
        to: WorkflowStage;
        timestamp: string;
    }>;
    isCompleted: boolean;
    escalated: boolean;
    sessionId: string;
    onStageClick?: (stage: WorkflowStage) => void;
}

/**
 * Individual stage component
 */
interface StageProps {
    stage: WorkflowStage;
    isActive: boolean;
    isCompleted: boolean;
    isEscalated: boolean;
    onClick?: () => void;
}

const StageComponent: React.FC<StageProps> = ({ 
    stage, 
    isActive, 
    isCompleted, 
    isEscalated, 
    onClick 
}) => {
    const getStageIcon = (stage: WorkflowStage): string => {
        switch (stage) {
            case 'intake': return '📝';
            case 'sentiment_analysis': return '😊';
            case 'issue_classification': return '🏷️';
            case 'resolution': return '🔧';
            case 'summary': return '📋';
            case 'completed': return '✅';
            case 'escalation': return '🚨';
            default: return '❓';
        }
    };

    const getStageLabel = (stage: WorkflowStage): string => {
        switch (stage) {
            case 'intake': return 'Intake';
            case 'sentiment_analysis': return 'Sentiment Analysis';
            case 'issue_classification': return 'Issue Classification';
            case 'resolution': return 'Resolution';
            case 'summary': return 'Summary';
            case 'completed': return 'Completed';
            case 'escalation': return 'Escalation';
            default: return stage;
        }
    };

    const getStageStyle = (): React.CSSProperties => {
        const baseStyle: React.CSSProperties = {
            padding: '12px 16px',
            margin: '4px',
            borderRadius: '8px',
            border: '2px solid',
            backgroundColor: '#f8f9fa',
            cursor: onClick ? 'pointer' : 'default',
            transition: 'all 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '120px',
            textAlign: 'center'
        };

        if (isEscalated) {
            return {
                ...baseStyle,
                borderColor: '#dc3545',
                backgroundColor: '#fff5f5',
                color: '#dc3545'
            };
        }

        if (isActive) {
            return {
                ...baseStyle,
                borderColor: '#007bff',
                backgroundColor: '#e3f2fd',
                color: '#007bff',
                fontWeight: 'bold'
            };
        }

        if (isCompleted) {
            return {
                ...baseStyle,
                borderColor: '#28a745',
                backgroundColor: '#f0fff4',
                color: '#28a745'
            };
        }

        return {
            ...baseStyle,
            borderColor: '#6c757d',
            color: '#6c757d'
        };
    };

    return (
        <div 
            style={getStageStyle()}
            onClick={onClick}
            role={onClick ? 'button' : 'presentation'}
            tabIndex={onClick ? 0 : -1}
        >
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>
                {getStageIcon(stage)}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 'normal' }}>
                {getStageLabel(stage)}
            </div>
        </div>
    );
};

/**
 * Progress bar component
 */
interface ProgressBarProps {
    progress: number;
    escalated: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, escalated }) => {
    return (
        <div style={{ 
            width: '100%', 
            backgroundColor: '#e9ecef', 
            borderRadius: '4px',
            height: '8px',
            marginBottom: '16px',
            overflow: 'hidden'
        }}>
            <div 
                style={{
                    width: `${progress}%`,
                    height: '100%',
                    backgroundColor: escalated ? '#dc3545' : '#28a745',
                    transition: 'width 0.3s ease'
                }}
            />
        </div>
    );
};

/**
 * Status indicators component
 */
interface StatusIndicatorsProps {
    sentiment: CustomerSentiment;
    category: IssueCategory;
    escalated: boolean;
}

const StatusIndicators: React.FC<StatusIndicatorsProps> = ({ 
    sentiment, 
    category, 
    escalated 
}) => {
    const getSentimentColor = (sentiment: CustomerSentiment): string => {
        switch (sentiment) {
            case 'positive': case 'satisfied': return '#28a745';
            case 'negative': case 'frustrated': return '#dc3545';
            case 'neutral': return '#6c757d';
            default: return '#6c757d';
        }
    };

    const getSentimentIcon = (sentiment: CustomerSentiment): string => {
        switch (sentiment) {
            case 'positive': return '😊';
            case 'satisfied': return '😌';
            case 'negative': return '😞';
            case 'frustrated': return '😤';
            case 'neutral': return '😐';
            default: return '😐';
        }
    };

    const getCategoryIcon = (category: IssueCategory): string => {
        switch (category) {
            case 'billing': return '💰';
            case 'technical': return '🔧';
            case 'account': return '👤';
            case 'cancellation': return '❌';
            case 'escalation': return '🚨';
            case 'general': return '❓';
            default: return '❓';
        }
    };

    return (
        <div style={{ 
            display: 'flex', 
            gap: '16px', 
            marginBottom: '16px',
            flexWrap: 'wrap'
        }}>
            <div style={{
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: '#f8f9fa',
                border: `2px solid ${getSentimentColor(sentiment)}`,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            }}>
                <span>{getSentimentIcon(sentiment)}</span>
                <span style={{ 
                    fontSize: '12px', 
                    color: getSentimentColor(sentiment),
                    fontWeight: 'bold'
                }}>
                    {sentiment.toUpperCase()}
                </span>
            </div>

            <div style={{
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: '#f8f9fa',
                border: '2px solid #007bff',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            }}>
                <span>{getCategoryIcon(category)}</span>
                <span style={{ 
                    fontSize: '12px', 
                    color: '#007bff',
                    fontWeight: 'bold'
                }}>
                    {category.toUpperCase()}
                </span>
            </div>

            {escalated && (
                <div style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#fff5f5',
                    border: '2px solid #dc3545',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <span>🚨</span>
                    <span style={{ 
                        fontSize: '12px', 
                        color: '#dc3545',
                        fontWeight: 'bold'
                    }}>
                        ESCALATED
                    </span>
                </div>
            )}
        </div>
    );
};

/**
 * Timeline component
 */
interface TimelineProps {
    transitions: Array<{
        from: WorkflowStage;
        to: WorkflowStage;
        timestamp: string;
    }>;
}

const Timeline: React.FC<TimelineProps> = ({ transitions }) => {
    const formatTime = (timestamp: string): string => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    };

    return (
        <div style={{ marginTop: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#6c757d' }}>
                Workflow Timeline
            </h4>
            <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                {transitions.map((transition, index) => (
                    <div 
                        key={index}
                        style={{
                            padding: '6px 0',
                            borderBottom: index < transitions.length - 1 ? '1px solid #e9ecef' : 'none',
                            fontSize: '12px',
                            color: '#6c757d'
                        }}
                    >
                        <span style={{ fontWeight: 'bold' }}>
                            {formatTime(transition.timestamp)}
                        </span>
                        {' - '}
                        <span>
                            {transition.from} → {transition.to}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

/**
 * Main WorkflowVisualization component
 */
export const WorkflowVisualization: React.FC<WorkflowVisualizationProps> = ({
    currentStage,
    customerSentiment,
    issueCategory,
    progress,
    stageTransitions = [],
    isCompleted,
    escalated,
    sessionId,
    onStageClick
}) => {
    const allStages: WorkflowStage[] = [
        'intake',
        'sentiment_analysis', 
        'issue_classification',
        'resolution',
        'summary',
        'completed'
    ];

    const completedStages = stageTransitions.map(t => t.from);

    return (
        <div style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '16px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e9ecef',
            maxWidth: '800px'
        }}>
            {/* Header */}
            <div style={{ marginBottom: '16px' }}>
                <h3 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '18px', 
                    color: '#212529' 
                }}>
                    Customer Support Workflow
                </h3>
                <p style={{ 
                    margin: '0', 
                    fontSize: '12px', 
                    color: '#6c757d' 
                }}>
                    Session: {sessionId}
                </p>
            </div>

            {/* Progress Bar */}
            <ProgressBar progress={progress} escalated={escalated} />

            {/* Status Indicators */}
            <StatusIndicators 
                sentiment={customerSentiment}
                category={issueCategory}
                escalated={escalated}
            />

            {/* Workflow Stages */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '16px'
            }}>
                {allStages.map((stage) => (
                    <StageComponent
                        key={stage}
                        stage={stage}
                        isActive={stage === currentStage}
                        isCompleted={completedStages.includes(stage) || stage === currentStage}
                        isEscalated={escalated && (stage === 'escalation' || stage === currentStage)}
                        onClick={onStageClick ? () => onStageClick(stage) : undefined}
                    />
                ))}
            </div>

            {/* Show escalation stage if escalated */}
            {escalated && (
                <div style={{ marginBottom: '16px' }}>
                    <StageComponent
                        stage="escalation"
                        isActive={currentStage === 'escalation'}
                        isCompleted={currentStage === 'escalation' || isCompleted}
                        isEscalated={true}
                        onClick={onStageClick ? () => onStageClick('escalation') : undefined}
                    />
                </div>
            )}

            {/* Timeline */}
            {stageTransitions.length > 0 && (
                <Timeline transitions={stageTransitions} />
            )}

            {/* Completion Message */}
            {isCompleted && (
                <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    backgroundColor: escalated ? '#fff5f5' : '#f0fff4',
                    border: `1px solid ${escalated ? '#dc3545' : '#28a745'}`,
                    borderRadius: '6px',
                    textAlign: 'center',
                    color: escalated ? '#dc3545' : '#28a745',
                    fontWeight: 'bold'
                }}>
                    {escalated 
                        ? '🚨 Workflow Escalated - Human Agent Required'
                        : '✅ Workflow Completed Successfully'
                    }
                </div>
            )}
        </div>
    );
};

export default WorkflowVisualization; 