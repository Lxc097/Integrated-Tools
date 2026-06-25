import React from 'react';
import { models } from '../data/models.js';
import { HolographicGlobe } from './HolographicGlobe.jsx';

export function CosmicBackdrop() {
  return (
    <div className="cosmic-backdrop" aria-hidden="true">
      <div className="nebula-field" />
      <div className="star-layer star-layer-far" />
      <div className="star-layer star-layer-near" />
      <div className="meteor meteor-one" />
      <div className="meteor meteor-two" />
      <HolographicGlobe models={models} />
    </div>
  );
}
