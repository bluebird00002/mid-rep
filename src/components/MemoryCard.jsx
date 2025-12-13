import React from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Tag,
  Trash2,
  Edit,
  Image as ImageIcon,
  Clock,
  Circle,
} from "lucide-react";
import "./MemoryCard.css";

function MemoryCard({ memory, onEdit, onDelete }) {
  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderContent = () => {
    switch (memory.type) {
      case "table":
        const hasColumns =
          memory.columns &&
          Array.isArray(memory.columns) &&
          memory.columns.length > 0;
        const hasRows =
          memory.rows && Array.isArray(memory.rows) && memory.rows.length > 0;

        if (!hasColumns && !hasRows) {
          return <p className="memory-text empty-table">Empty table</p>;
        }

        return (
          <div className="memory-table">
            {memory.content && memory.content !== "Table" && (
              <h4 className="table-title">{memory.content}</h4>
            )}
            <table>
              {hasColumns && (
                <thead>
                  <tr>
                    {memory.columns.map((col, idx) => (
                      <th key={idx}>{col}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {hasRows &&
                  memory.rows.map((row, idx) => (
                    <tr key={idx}>
                      {Array.isArray(row) ? (
                        row.map((cell, cellIdx) => (
                          <td key={cellIdx}>{cell}</td>
                        ))
                      ) : (
                        <td>{String(row)}</td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        );

      case "list":
        const hasItems =
          memory.items &&
          Array.isArray(memory.items) &&
          memory.items.length > 0;

        if (!hasItems) {
          return <p className="memory-text empty-list">Empty list</p>;
        }

        return (
          <div className="memory-list-container">
            {memory.content && memory.content !== "List" && (
              <h4 className="list-title">{memory.content}</h4>
            )}
            <ul className="memory-list">
              {memory.items.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        );

      case "timeline":
        const hasEvents =
          memory.events &&
          Array.isArray(memory.events) &&
          memory.events.length > 0;

        if (!hasEvents) {
          return <p className="memory-text empty-timeline">Empty timeline</p>;
        }

        return (
          <div className="memory-timeline-container">
            {memory.content && memory.content !== "Timeline" && (
              <h4 className="timeline-title">
                <Clock size={14} className="timeline-title-icon" />
                {memory.content}
              </h4>
            )}
            <div className="memory-timeline">
              {memory.events.map((event, idx) => (
                <div key={idx} className="timeline-event">
                  <div className="timeline-marker">
                    <Circle size={8} className="marker-dot" />
                    {idx < memory.events.length - 1 && (
                      <div className="marker-line"></div>
                    )}
                  </div>
                  <div className="timeline-content">
                    {event.time && (
                      <span className="timeline-time">
                        <Clock size={10} />
                        {event.time}
                      </span>
                    )}
                    <span className="timeline-description">
                      {event.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "image":
        return (
          <div className="memory-image">
            {memory.image_url && (
              <div className="photo-card">
                <img
                  className="photo-img"
                  src={memory.image_url}
                  alt={memory.description || "Memory"}
                />
                {memory.description && (
                  <div className="polaroid-caption">{memory.description}</div>
                )}
              </div>
            )}
          </div>
        );

      default:
        return <p className="memory-text">{memory.content}</p>;
    }
  };

  // Determine whether this memory should span the full grid width
  const isLongMemory = () => {
    try {
      const threshold = 300; // characters
      if (!memory) return false;
      if (memory.type === "image") return false;

      // Calculate approximate content size
      let size = 0;
      if (typeof memory.content === "string") size += memory.content.length;
      if (memory.type === "list" && Array.isArray(memory.items))
        size += memory.items.join(" ").length;
      if (memory.type === "table") {
        if (Array.isArray(memory.columns)) size += memory.columns.join(" ").length;
        if (Array.isArray(memory.rows))
          size += memory.rows.map((r) => (Array.isArray(r) ? r.join(" ") : String(r))).join(" ").length;
      }
      if (memory.type === "timeline" && Array.isArray(memory.events))
        size += memory.events.map((e) => e.description || "").join(" ").length;

      return size > threshold;
    } catch (e) {
      return false;
    }
  };

  const fullWidthClass = isLongMemory() ? " memory-card--full" : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={"memory-card" + fullWidthClass}
    >
      <div className="memory-header">
        <div className="memory-id">#{memory.id}</div>
        <div className="memory-actions">
          <button
            onClick={() => onEdit(memory)}
            className="action-btn edit-btn"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={() => onDelete(memory.id)}
            className="action-btn delete-btn"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="memory-content">{renderContent()}</div>

      <div className="memory-footer">
        <div className="memory-meta">
          <span className="meta-item">
            <Calendar size={12} />
            {formatDate(memory.created_at)}
          </span>
          {memory.category && (
            <span className="meta-item category">{memory.category}</span>
          )}
          {memory.has_image && (
            <span className="meta-item">
              <ImageIcon size={12} />
              Image
            </span>
          )}
        </div>
        {memory.tags && memory.tags.length > 0 && (
          <div className="memory-tags">
            {memory.tags.map((tag, idx) => (
              <span key={idx} className="tag">
                <Tag size={10} />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default MemoryCard;
