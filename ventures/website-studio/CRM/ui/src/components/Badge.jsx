import React from 'react';
import { priorityVariant, priorityLabel } from '../utils';

export default function Badge({ variant = 'default', children, className = '' }) {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {children}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  return (
    <Badge variant={priorityVariant(priority)}>
      {priorityLabel(priority)}
    </Badge>
  );
}

export function SignalBadge({ quality }) {
  const variants = { high: 'emerald', medium: 'amber', low: 'default' };
  const labels = { high: 'HIGH', medium: 'MED', low: 'LOW' };
  return (
    <Badge variant={variants[quality?.toLowerCase()] || 'default'}>
      {labels[quality?.toLowerCase()] || quality?.toUpperCase()}
    </Badge>
  );
}
