import type { Stats } from '../types/reminder';
import './Statistics.css';

interface StatisticsProps {
  stats: Stats;
  accentColor: string;
}

export const Statistics = ({ stats, accentColor }: StatisticsProps) => {
  return (
    <div className={`statistics-dashboard theme-${accentColor}`}>
      <div className="section-header">
        <h3>Statistics</h3>
      </div>
      <div className="stats-grid">
        <div className="stat-card total-created">
          <div className="stat-value">{stats.totalCreated}</div>
          <div className="stat-label">Total Created</div>
        </div>
        
        <div className="stat-card todo">
          <div className="stat-value">{stats.todo}</div>
          <div className="stat-label">To Do</div>
        </div>

        <div className="stat-card in-progress">
          <div className="stat-value">{stats.inProgress}</div>
          <div className="stat-label">In Progress</div>
        </div>

        <div className="stat-card done">
          <div className="stat-value">{stats.done}</div>
          <div className="stat-label">Done</div>
        </div>

        <div className="stat-card overdue">
          <div className="stat-value">{stats.overdue}</div>
          <div className="stat-label">Overdue</div>
        </div>

        <div className="stat-card total-deleted">
          <div className="stat-value">{stats.totalDeleted}</div>
          <div className="stat-label">Deleted</div>
        </div>
      </div>
    </div>
  );
};
